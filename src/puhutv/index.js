const { sortStreamsByQuality } = require('../shared/quality.js');
const { loadConfig, val, wrapAll } = require('../shared/config.js');
const { timeoutSignal } = require('../shared/http.js');
const { normalizeSeriesId, resolveSeriesInfo, seriesSearchTitles } = require('../shared/turkish_series.js');

var _cfgReady = null;
function cfgReady() {
    if (!_cfgReady) {
        _cfgReady = loadConfig().then(function () {
            var v = val('urls.series.puhutv.base');
            if (v) BASE_URL = String(v).replace(/\/+$/, '');
            if (HEADERS) HEADERS.Referer = BASE_URL + '/';
        });
    }
    return _cfgReady;
}

/**
 * Anthology - PuhuTV Provider
 * https://puhutv.com/
 * Yerli diziler & filmler: Next.js __NEXT_DATA__ + Doğuş DYG video API
 * (PublisherId=29, SecretKey=NtvApiSecret2014*) => HLS + WebVTT altyazıları.
 * Kimlik çözümü TAMAMEN dinamiktir (katalog eşleşmesi + TMDB alias) — sabit ID haritası YOK.
 */

var BASE_URL = 'https://puhutv.com';
var DYG_API = 'https://dygvideo.dygdigital.com/api/video_info';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
    'Referer': BASE_URL + '/'
};

var useTimeoutSignal = timeoutSignal;

function asciiFold(s) {
    s = String(s || '');
    try { if (typeof s.normalize === 'function') s = s.normalize('NFD'); } catch (e) {}
    s = s.replace(/[\u0300-\u036f]/g, '');
    var map = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'İ': 'I', 'ö': 'o', 'ş': 's', 'ü': 'u', 'â': 'a', 'î': 'i', 'û': 'u' };
    var out = '';
    var lower = s.toLowerCase();
    for (var i = 0; i < lower.length; i++) {
        var ch = lower.charAt(i);
        out += (map[ch] !== undefined ? map[ch] : ch);
    }
    return out;
}

function cleanTitle(t) {
    return asciiFold(String(t || ''))
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

function slugify(s) {
    return asciiFold(s)
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .trim();
}

function decodeHtmlEntities(str) {
    if (!str) return '';
    return String(str)
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&nbsp;/g, ' ')
        .replace(/&#(\d+);/g, function (m, d) { return String.fromCharCode(parseInt(d, 10)); });
}

function fadeFetch(url, opts, ms) {
    opts = opts || {};
    opts.signal = useTimeoutSignal(ms || 15000);
    opts.headers = opts.headers || {};
    if (!opts.headers['User-Agent']) opts.headers['User-Agent'] = HEADERS['User-Agent'];
    return fetch(url, opts);
}

async function fetchText(url, opts, ms) {
    var r = await fadeFetch(url, opts, ms);
    if (!r.ok) return '';
    return await r.text();
}

async function fetchJson(url, opts, ms) {
    var t = await fetchText(url, opts, ms);
    if (!t) return null;
    try { return JSON.parse(t); } catch (e) { return null; }
}

function pagePropsFrom(html) {
    var m = String(html || '').match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/i);
    if (!m) return null;
    try {
        var nd = JSON.parse(m[1]);
        return (nd && nd.props && nd.props.pageProps) || null;
    } catch (e) { return null; }
}

/**
 * Katalog sayfası (yerli-diziler / filmler) -> içerik listesi.
 * items: [{ name, detaySlug, watchSlug, poster, type, year }]
 */
async function fetchCatalogPage(pageSlug) {
    var html = await fetchText(BASE_URL + '/' + pageSlug);
    var pp = pagePropsFrom(html);
    if (!pp || !pp.data) return [];
    var root = pp.data.data || pp.data;
    var containers = root.container_items || [];
    var items = [];
    function push(it) {
        if (!it) return;
        var name = decodeHtmlEntities(it.display_name || it.name || '');
        if (!name) return;
        items.push({
            name: name,
            detaySlug: (it.meta && it.meta.slug) || '',
            watchSlug: it.to_watch_asset_slug || it.content_slug || '',
            poster: it.image_vertical_mobile || it.image || '',
            type: it.type === 'title_movie' ? 'movie' : 'series',
            year: (it.meta && it.meta.productionDate) || ''
        });
    }
    for (var c = 0; c < containers.length; c++) {
        var group = containers[c].items || containers[c].titles || [];
        for (var i = 0; i < group.length; i++) push(group[i]);
    }
    var seen = {};
    var out = [];
    for (var j = 0; j < items.length; j++) {
        var key = items[j].detaySlug || slugify(items[j].name);
        if (seen[key]) continue;
        seen[key] = true;
        out.push(items[j]);
    }
    return out;
}

function bestCatalogMatch(items, keywords) {
    if (!items.length) return null;
    var best = null;
    var bestScore = -1;
    for (var i = 0; i < items.length; i++) {
        var name = cleanTitle(items[i].name);
        for (var k = 0; k < keywords.length; k++) {
            var kw = cleanTitle(keywords[k]);
            if (!kw) continue;
            var score = 0;
            if (name === kw) score = 100;
            else if (name.indexOf(kw) !== -1 || kw.indexOf(name) !== -1) score = 60 + (Math.min(name.length, kw.length) / Math.max(name.length, kw.length)) * 30;
            else {
                var tA = name.split(' ');
                var tB = kw.split(' ');
                var hits = 0;
                for (var a = 0; a < tA.length; a++) for (var b = 0; b < tB.length; b++) if (tA[a].length > 1 && tA[a] === tB[b]) { hits++; break; }
                score = hits / Math.max(tA.length, tB.length);
            }
            if (score > bestScore) { bestScore = score; best = items[i]; }
        }
    }
    if (bestScore >= 0.5) return best;
    return null;
}

async function fetchDetail(detaySlug) {
    if (!detaySlug) return null;
    var candidates = [String(detaySlug)];
    if (candidates[0].indexOf('http') !== 0) {
        candidates.push(detaySlug + '-detay');
        candidates.push(detaySlug + '-1-sezon-bolumleri');
        candidates[0] = BASE_URL + '/' + detaySlug;
    }
    for (var ci = 0; ci < candidates.length; ci++) {
        var url = candidates[ci].indexOf('http') === 0 ? candidates[ci] : BASE_URL + '/' + candidates[ci];
        var html = await fetchText(url);
        if (!html) continue;
        var pp = pagePropsFrom(html);
        if (!pp) continue;
        var d = (pp.details && pp.details.data) || (pp.movieAssets && pp.movieAssets.data) || null;
        if (!d) continue;
        var detail = {
            name: decodeHtmlEntities(d.display_name || d.name || ''),
            poster: d.image || d.image_vertical_mobile || '',
            seasons: [],
            videoId: d.video_id || ''
        };
        function addSeason(sObj) {
            var eps = [];
            var arr = sObj.episodes || [];
            for (var i = 0; i < arr.length; i++) {
                var e = arr[i];
                eps.push({
                    name: decodeHtmlEntities(e.display_name || e.name || ''),
                    slug: e.slug || '',
                    videoId: e.video_id || '',
                    position: (e.meta && e.meta.position) || i + 1,
                    image: e.image || ''
                });
            }
            detail.seasons.push({ name: sObj.name || '', episodes: eps });
        }
        var ed = pp.episodeData && pp.episodeData.data;
        if (Array.isArray(ed) && ed.length) {
            for (var k = 0; k < ed.length; k++) addSeason(ed[k]);
        } else if (ed && ed.episodes) {
            addSeason(ed);
        }
        return detail;
    }
    return null;
}

function findEpisode(detail, season, episode) {
    if (!detail || !detail.seasons || !detail.seasons.length) return null;
    var fallback = null;
    for (var s = 0; s < detail.seasons.length; s++) {
        var eps = detail.seasons[s].episodes;
        for (var e = 0; e < eps.length; e++) {
            if (eps[e].position === episode) {
                if (!fallback) fallback = eps[e];
                if (detail.seasons.length === 1 || s + 1 === season) return eps[e];
            }
        }
    }
    return fallback;
}

async function dygVideo(videoId) {
    var url = DYG_API + '?akamai=true&PublisherId=29&ReferenceId=' + encodeURIComponent(videoId) + '&SecretKey=NtvApiSecret2014*';
    var data = await fetchJson(url, {}, 20000);
    if (!data || !data.data || !data.data.flavors) return null;
    var fl = data.data.flavors;
    var hls = fl.hls || '';
    var mp4s = [];
    for (var k in fl) {
        if (!Object.prototype.hasOwnProperty.call(fl, k)) continue;
        var v = fl[k];
        if (typeof v === 'string' && /\.mp4(?:\?|$)/i.test(v)) mp4s.push(v);
    }
    var tracks = [];
    var tr = data.data.tracks;
    if (Array.isArray(tr)) {
        for (var i = 0; i < Math.min(tr.length, 20); i++) {
            var t = tr[i];
            var sUrl = t && (t.url || t.file || t.src || '');
            if (sUrl) {
                var lang = String(t.lang || t.language || 'tr').toLowerCase().slice(0, 2);
                tracks.push({
                    id: 'puhutv-sub-' + (i + 1),
                    url: sUrl,
                    file: sUrl,
                    link: sUrl,
                    lang: lang,
                    language: lang === 'en' ? 'English' : lang === 'tr' ? 'Türkçe' : lang.toUpperCase(),
                    label: (t.label || lang).toString(),
                    name: (t.label || lang).toString(),
                    title: (t.label || lang).toString(),
                    format: 'vtt',
                    type: 'text/vtt',
                    mimeType: 'text/vtt'
                });
            }
        }
    }
    return { hls: hls, mp4s: mp4s, tracks: tracks };
}

async function buildStreams(label, videoId) {
    var streams = [];
    var r = await dygVideo(videoId);
    if (!r) return streams;
    var base = '⌜ PuhuTV ⌟ | ' + label;
    var headers = { 'Referer': BASE_URL + '/', 'User-Agent': HEADERS['User-Agent'] };
    if (r.hls) {
        streams.push({ url: r.hls, name: 'PuhuTV', title: base + ' [HLS]', quality: '1080p', format: 'hls', isHls: true, headers: headers, subtitles: r.tracks });
    }
    for (var m = 0; m < r.mp4s.length; m++) {
        streams.push({ url: r.mp4s[m], name: 'PuhuTV', title: base + ' [MP4]', quality: '1080p', format: 'mp4', isHls: false, headers: headers, subtitles: r.tracks });
    }
    return streams;
}

async function getCatalog(args) {
    try {
        var q = '';
        if (args && typeof args === 'object' && !Array.isArray(args)) {
            q = args.search || (args.extra && args.extra.search) || '';
        }
        q = String(q || '');
        var pages = ['yerli-diziler', 'filmler'];
        var metas = [];
        var seen = {};
        var cq = cleanTitle(q);
        for (var p = 0; p < pages.length; p++) {
            var items = await fetchCatalogPage(pages[p]);
            for (var i = 0; i < items.length; i++) {
                var it = items[i];
                var key = slugify(it.name);
                if (seen[key]) continue;
                if (cq && cleanTitle(it.name).indexOf(cq) === -1) continue;
                seen[key] = true;
                metas.push({
                    id: (it.type === 'movie' ? 'puhutv:movie:' : 'puhutv:show:') + key,
                    type: it.type === 'movie' ? 'movie' : 'series',
                    name: it.name,
                    poster: it.poster,
                    year: it.year
                });
            }
        }
        return { metas: metas };
    } catch (e) {
        return { metas: [] };
    }
}

async function getMeta(id) {
    try {
        var raw = String(id || '');
        var type = 'series';
        var detailSlug = '';
        if (raw.indexOf(':') !== -1) {
            var pr = raw.split(':');
            detailSlug = pr[pr.length - 1];
            if (pr.indexOf('movie') !== -1) type = 'movie';
        }
        if (!detailSlug) return { meta: null };
        var detail = await fetchDetail(detailSlug);
        if (!detail || (!detail.name && !detail.seasons.length && !detail.videoId)) return { meta: null };
        if (type === 'movie') {
            if (!detail.videoId) return { meta: { id: raw, type: 'movie', name: detail.name, poster: detail.poster, videos: [] } };
            return { meta: { id: raw, type: 'movie', name: detail.name, poster: detail.poster, videos: [{ id: raw + ':video', type: 'movie', name: detail.name, title: detail.name }] } };
        }
        var videos = [];
        for (var s = 0; s < detail.seasons.length; s++) {
            var seasonName = detail.seasons[s].name || '';
            var sNum = parseInt((String(seasonName).match(/(\d+)/) || [])[1], 10) || (s + 1);
            for (var e = 0; e < detail.seasons[s].episodes.length; e++) {
                var ep = detail.seasons[s].episodes[e];
                videos.push({
                    id: 'puhutv:ep:' + detailSlug + ':' + sNum + ':' + ep.position,
                    type: 'series',
                    season: sNum,
                    episode: ep.position,
                    name: ep.name,
                    title: (seasonName ? seasonName + ' ' : '') + ep.name,
                    releaseInfo: String(sNum) + 'x' + (ep.position < 10 ? '0' + ep.position : ep.position),
                    thumbnail: ep.image
                });
                if (videos.length >= 60) break;
            }
            if (videos.length >= 60) break;
        }
        return { meta: { id: 'puhutv:show:' + detailSlug, type: 'series', name: detail.name, poster: detail.poster, videos: videos } };
    } catch (e) {
        return { meta: null };
    }
}

async function getStreams(args) {
    try {
        var tmdbId, mediaType = 'tv', seasonNum, episodeNum;
        if (args && typeof args === 'object' && !Array.isArray(args)) {
            tmdbId = args.id;
            mediaType = args.type || mediaType;
            seasonNum = args.season;
            episodeNum = args.episode;
        } else {
            tmdbId = arguments[0];
            mediaType = arguments[1] || mediaType;
            seasonNum = arguments[2];
            episodeNum = arguments[3];
        }

        var raw = String(tmdbId || '');
        var idNorm = normalizeSeriesId(raw);
        if (!seasonNum && idNorm.season > 0) seasonNum = idNorm.season;
        if (!episodeNum && idNorm.episode > 0) episodeNum = idNorm.episode;

        // Dahili puhutv id'leri
        if (raw.indexOf('puhutv:') === 0) {
            var parts = raw.split(':');
            var detaySlug = parts[parts.length - 1];
            var sNum = parseInt(parts[parts.length - 2], 10) || 1;
            var eNum = parseInt(parts[parts.length - 1], 10) || 1;
            var detail = await fetchDetail(detaySlug);
            if (detail && detail.videoId) return await buildStreams(detail.name, detail.videoId);
            var ep = findEpisode(detail, sNum, eNum);
            if (!ep || !ep.videoId) return [];
            return await buildStreams((detail.name || '') + ' S' + sNum + 'E' + String(eNum).padStart(2, '0'), ep.videoId);
        }

        var season = parseInt(seasonNum) || 1;
        var episode = parseInt(episodeNum) || 1;

        // Dinamik kimlik çözümü (TMDB alias'ları üzerinden)
        var info;
        if (idNorm.kind === 'title') {
            info = { title: idNorm.id, origTitle: idNorm.id, aliases: [], kind: 'title', type: 'tv' };
        } else {
            info = await resolveSeriesInfo(raw, mediaType, TMDB_API_KEY);
            if (!info || (!info.title && !info.origTitle)) {
                if (idNorm.kind === 'title') info = { title: idNorm.id, origTitle: idNorm.id, aliases: [], kind: 'title', type: 'tv' };
                else return [];
            }
        }
        var keywords = seriesSearchTitles(info);
        var isMovie = mediaType === 'movie' || info.type === 'movie';

        var pages = isMovie ? ['filmler'] : ['yerli-diziler'];
        var items = await fetchCatalogPage(pages[0]);
        var hit = bestCatalogMatch(items, keywords);
        if (!hit) return [];
        var dSlug = hit.detaySlug || hit.watchSlug;
        var detail = await fetchDetail(dSlug);
        if (detail && detail.videoId && isMovie) {
            return await buildStreams(hit.name, detail.videoId);
        }
        if (!detail || !detail.seasons.length) return [];
        var mEpisode = findEpisode(detail, season, episode);
        if (mEpisode && mEpisode.videoId) {
            return await buildStreams(hit.name + ' S' + season + 'E' + String(episode).padStart(2, '0'), mEpisode.videoId);
        }
        // Sezon detay sayfasında yoksa per-season sayfası dene (behzat-c-1-sezon-bolumleri)
        if (season > 1 && dSlug) {
            var baseSlug = slugify(hit.name);
            var detail2 = await fetchDetail(baseSlug + '-' + season + '-sezon-bolumleri');
            var ep2 = findEpisode(detail2, season, episode);
            if (ep2 && ep2.videoId) return await buildStreams(hit.name + ' S' + season + 'E' + String(episode).padStart(2, '0'), ep2.videoId);
        }
        return [];
    } catch (e) {
        return [];
    }
}

var _origGetStreams = getStreams;
getStreams = async function () {
    var res = await _origGetStreams.apply(this, arguments);
    return sortStreamsByQuality(res);
};

if (typeof module !== 'undefined') module.exports = wrapAll({ getStreams: getStreams, getCatalog: getCatalog, getMeta: getMeta }, cfgReady);
if (typeof globalThis !== 'undefined') {
    globalThis.getStreams = getStreams;
    globalThis.getCatalog = getCatalog;
    globalThis.getMeta = getMeta;
}