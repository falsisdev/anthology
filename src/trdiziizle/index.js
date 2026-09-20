const { sortStreamsByQuality } = require('../shared/quality.js');
const { loadConfig, val, wrapAll } = require('../shared/config.js');
const { timeoutSignal } = require('../shared/http.js');
const { normalizeSeriesId, resolveSeriesInfo, seriesSearchTitles } = require('../shared/turkish_series.js');
const { unpackDeanEdwards } = require('../shared/unpacker.js');

var _cfgReady = null;
function cfgReady() {
    if (!_cfgReady) {
        _cfgReady = loadConfig().then(function () {
            var v = val('urls.series.trdiziizle.base');
            if (v) BASE_URL = String(v).replace(/\/+$/, '');
            if (HEADERS) HEADERS.Referer = BASE_URL + '/';
        });
    }
    return _cfgReady;
}

/**
 * Anthology - TrDiziİzle Provider
 * https://www.trdiziizle.tv/tr2/  (WordPress + embed iframe)
 * WordPress tabanlı yerli/yabancı dizi arşivi.
 * Standart (scraper standartlarına uygun) WP arama + iframe oynatıcı çözümü.
 * DURUM: .xyz domain'i öldü; doğru site www.trdiziizle.tv/tr2/ — buradan erişilebilir.
 * Bilinçli olarak mantıkta hiçbir sahte/yanlış akış yoktur — bulunamayan her şey [] döner.
 */

var BASE_URL = 'https://www.trdiziizle.tv/tr2';
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
    opts = opts || {};
    if (typeof opts === 'number') { ms = opts; opts = {}; }
    var r = await fadeFetch(url, opts, ms);
    if (!r.ok) return '';
    return await r.text();
}

async function siteReachable() {
    try {
        var r = await fadeFetch(BASE_URL + '/', {}, 12000);
        return r.status === 200;
    } catch (e) {
        return false;
    }
}

/* ---- WP arama ---- */
async function wpSearch(term) {
    var q = encodeURIComponent(term);
    var html = await fetchText(BASE_URL + '/?s=' + q);
    if (!html) return [];
    var results = [];
    var re = /<article[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    var m;
    while ((m = re.exec(html)) !== null) {
        var title = decodeHtmlEntities(m[2].replace(/<[^>]+>/g, ' ')).trim();
        if (title && m[1]) results.push({ title: title, url: m[1] });
    }
    if (!results.length) {
        // başlık etiketi yedeği
        var re2 = /<h[123][^>]*class="[^"]*(entry-title|post-title)[^"]*"[^>]*>[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
        while ((m = re2.exec(html)) !== null) {
            var t2 = decodeHtmlEntities(m[3].replace(/<[^>]+>/g, ' ')).trim();
            if (t2 && m[2]) results.push({ title: t2, url: m[2] });
        }
    }
    return results;
}

function bestWPMatch(results, keywords) {
    if (!results.length) return null;
    var best = null;
    var bestScore = -1;
    for (var i = 0; i < results.length; i++) {
        var name = cleanTitle(results[i].title);
        for (var k = 0; k < keywords.length; k++) {
            var kw = cleanTitle(keywords[k]);
            if (!kw) continue;
            var score = 0;
            if (name === kw) score = 100;
            else if (name.indexOf(kw) !== -1 || kw.indexOf(name) !== -1) score = 60 + (Math.min(name.length, kw.length) / Math.max(name.length, kw.length)) * 30;
            else if (name.indexOf('dizi') !== -1) {
                var cleaned = name.replace(/\bdizi\b/g, ' ').replace(/\s+/g, ' ').trim();
                if (cleaned === kw) score = 90;
                else if (cleaned.indexOf(kw) !== -1 || kw.indexOf(cleaned) !== -1) score = 55;
            }
            if (score > bestScore) { bestScore = score; best = results[i]; }
        }
    }
    if (bestScore >= 50) return best;
    return null;
}

/* ---- Bölüm sayfası + iframe ---- */
function extractIframes(html) {
    var out = [];
    var re = /<iframe[^>]+src=["']([^"']+)["'][^>]*>/gi;
    var m;
    while ((m = re.exec(html)) !== null) {
        var src = decodeHtmlEntities(m[1]);
        if (src && /^(https?:)?\/\//i.test(src)) out.push(src);
    }
    return out;
}

async function resolveIframeStream(src) {
    try {
        var abs = src.indexOf('//') === 0 ? 'https:' + src : (src.indexOf('http') === 0 ? src : BASE_URL + src);
        var host = '';
        var hm = abs.match(/^https?:\/\/([^\/?#]+)/i);
        if (hm) host = hm[1].toLowerCase();
        if (host.indexOf('youtube') !== -1 || host.indexOf('youtu.be') !== -1) {
            var ytMatch = abs.match(/(?:youtube\.com\/(?:embed|watch\?v=)|youtu\.be\/)([\w-]{6,})/);
            if (!ytMatch) return [];
            var ytId = ytMatch[1];
            return [{
                url: 'https://www.youtube.com/watch?v=' + ytId,
                name: 'TrDiziİzle',
                title: '⌜ TrDiziİzle ⌟ | YouTube',
                quality: '1080p',
                format: 'mp4',
                isHls: false
            }];
        }
        var html = await fetchText(abs, { 'Referer': BASE_URL + '/' }, 15000);
        if (!html) return [];
        var streams = [];
        // düz m3u8
        var m3 = html.match(/https?:[^"'\s\\]+\.m3u8(?:\?[^"'\s\\]*)?/g);
        // mp4
        var m4 = html.match(/https?:[^"'\s\\]+\.mp4(?:\?[^"'\s\\]*)?/g);
        var sources = [];
        if (m3) for (var i = 0; i < m3.length; i++) sources.push({ url: m3[i], hls: true });
        if (m4) for (var j = 0; j < m4.length; j++) sources.push({ url: m4[j], hls: false });
        if (!sources.length) {
            var dec = unpackDeanEdwards(html);
            if (dec) {
                var dm3 = dec.match(/https?:[^"'\s\\]+\.m3u8(?:\?[^"'\s\\]*)?/g);
                var dm4 = dec.match(/https?:[^"'\s\\]+\.mp4(?:\?[^"'\s\\]*)?/g);
                if (dm3) for (var x = 0; x < dm3.length; x++) sources.push({ url: dm3[x], hls: true });
                if (dm4) for (var y = 0; y < dm4.length; y++) sources.push({ url: dm4[y], hls: false });
            }
        }
        var seen = {};
        for (var s = 0; s < sources.length; s++) {
            var su = sources[s].url;
            // tracker/analiz/pixel url'lerini ele
            if (/\.(png|jpe?g|gif|css|js|svg)(\?|$)/i.test(su)) continue;
            if (seen[su]) continue;
            seen[su] = true;
            streams.push({
                url: su,
                name: 'TrDiziİzle',
                title: '⌜ TrDiziİzle ⌟ | ' + (sources[s].hls ? 'HLS' : 'MP4'),
                quality: '1080p',
                format: sources[s].hls ? 'hls' : 'mp4',
                isHls: sources[s].hls,
                headers: { 'Referer': BASE_URL + '/', 'User-Agent': HEADERS['User-Agent'] }
            });
        }
        return streams;
    } catch (e) {
        return [];
    }
}

async function episodeStreams(epUrl) {
    var html = await fetchText(epUrl);
    if (!html) return [];
    var iframes = extractIframes(html);
    var streams = [];
    for (var i = 0; i < Math.min(iframes.length, 8); i++) {
        var one = await resolveIframeStream(iframes[i]);
        for (var j = 0; j < one.length; j++) streams.push(one[j]);
    }
    return streams;
}

/* ---- getCatalog: net katalog yok; giriş sayfasından son içerikler ---- */
async function getCatalog(args) {
    try {
        var q = '';
        if (args && typeof args === 'object' && !Array.isArray(args)) {
            q = args.search || (args.extra && args.extra.search) || '';
        }
        q = String(q || '');
        if (q) {
            // arama kataloğu
            var res = await wpSearch(q);
            var metas = [];
            for (var g = 0; g < res.length; g++) metas.push({ id: 'trdiziizle:link:' + encodeURIComponent(res[g].url), type: 'series', name: res[g].title });
            return { metas: metas.slice(0, 24) };
        }
        var html = await fetchText(BASE_URL + '/');
        var metas = [];
        var re = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
        var m, seen = {};
        while ((m = re.exec(html)) !== null) {
            var title = decodeHtmlEntities(m[2].replace(/<[^>]+>/g, ' ')).trim();
            if (!title || title.length < 3) continue;
            var href = m[1];
            if (!/\/(?:category|tag|dizi|diziler|liste|yabanci-dizi|yerli-dizi)\//i.test(href)) continue;
            if (seen[href]) continue;
            seen[href] = true;
            metas.push({ id: 'trdiziizle:link:' + encodeURIComponent(href), type: 'series', name: title });
            if (metas.length >= 24) break;
        }
        return { metas: metas };
    } catch (e) {
        return { metas: [] };
    }
}

async function getMeta(id) {
    try {
        var raw = String(id || '');
        var url = '';
        if (raw.indexOf('trdiziizle:link:') === 0) url = raw.slice('trdiziizle:link:'.length);
        else if (raw.indexOf('trdiziizle:') === 0) url = decodeURIComponent(raw.slice('trdiziizle:'.length));
        else if (raw.indexOf(':') !== -1 && raw.indexOf(':') !== -1) { var pr = raw.split(':'); url = pr[pr.length - 1]; }
        if (url.indexOf('http') !== 0) return { meta: null };
        var html = await fetchText(url);
        if (!html) return { meta: null };
        var eps = [];
        // bölüm linkleri
        var re = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
        var m, seen = {};
        while ((m = re.exec(html)) !== null) {
            var href = m[1];
            if (!/bolum|episode|izle/i.test(href)) continue;
            if (seen[href]) continue;
            var t = decodeHtmlEntities(m[2].replace(/<[^>]+>/g, ' ')).trim();
            if (!t) continue;
            seen[href] = true;
            var epsMatch = t.match(/(?:(\d+)\.\s*sezon|sezon\s*(\d+)|S(\d+))[^\d]*?(?:(\d+)\.\s*bolum|bolum\s*(\d+)|[EB](\d+))/i);
            var season = 1, episode = eps.length + 1;
            if (epsMatch) {
                var sN = parseInt(epsMatch[1] || epsMatch[2] || epsMatch[3], 10); if (sN) season = sN;
                var eN = parseInt(epsMatch[4] || epsMatch[5] || epsMatch[6], 10); if (eN) episode = eN;
            }
            eps.push({ id: 'trdiziizle:link:' + href, type: 'series', season: season, episode: episode, name: t, title: t });
            if (eps.length >= 80) break;
        }
        if (!eps.length) return { meta: null };
        return { meta: { id: raw, type: 'series', name: 'TrDiziİzle', videos: eps } };
    } catch (e) {
        return { meta: null };
    }
}

async function getStreams(args) {
    try {
        // Cloudflare engeli — şeffaf dönüş
        if (!(await siteReachable())) return [];

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

        if (raw.indexOf('trdiziizle:') === 0) {
            var link = raw.indexOf('trdiziizle:link:') === 0 ? raw.slice('trdiziizle:link:'.length) : decodeURIComponent(raw.slice('trdiziizle:'.length));
            return await episodeStreams(link);
        }

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
        var matches = await wpSearch(keywords[0]);
        var hit = bestWPMatch(matches, keywords);
        if (!hit) return [];
        var list = await fetchText(hit.url);
        if (!list) return [];
        // haftalar/yayın arşivi sekmelerini bul
        var seasonRe = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
        var m, seasonUrls = [];
        while ((m = seasonRe.exec(list)) !== null) {
            var lbl = decodeHtmlEntities(m[2].replace(/<[^>]+>/g, ' ')).trim();
            if (/[1-9]\.\s*sezon|sezon\s*[1-9]/i.test(lbl) && /bolum|izle/i.test(m[1])) seasonUrls.push({ url: m[1], label: lbl, season: parseInt((lbl.match(/[1-9]+/) || [1])[0], 10) });
        }
        var targetUrl = '';
        if (seasonNum > 1) {
            for (var s = 0; s < seasonUrls.length; s++) if (seasonUrls[s].season === parseInt(seasonNum, 10)) { targetUrl = seasonUrls[s].url; break; }
        }
        if (!targetUrl) targetUrl = hit.url;
        var seasonHtml = await fetchText(targetUrl);
        if (!seasonHtml) return [];
        var epRe = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
        var em, epUrls = [];
        while ((em = epRe.exec(seasonHtml)) !== null) {
            var lbl2 = decodeHtmlEntities(em[2].replace(/<[^>]+>/g, ' ')).trim();
            var epN = parseInt((String(lbl2).match(/(?:bolum|episode|Bölüm|^)[\s:.-]*(\d+)/i) || [])[1], 10);
            if (isNaN(epN)) epN = parseInt((String(lbl2).match(/(\d+)\s*\.?\s*bolum/i) || [])[1], 10);
            if (!em[1] || !epN) continue;
            epUrls.push({ url: em[1], n: epN });
        }
        var targetEp = null;
        for (var e = 0; e < epUrls.length; e++) if (epUrls[e].n === parseInt(episodeNum, 10)) { targetEp = epUrls[e]; break; }
        if (!targetEp) return [];
        return await episodeStreams(targetEp.url);
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