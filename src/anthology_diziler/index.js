const { sortStreamsByQuality } = require('../shared/quality.js');
const { loadConfig, val, wrapAll } = require('../shared/config.js');
const { timeoutSignal } = require('../shared/http.js');
const { normalizeSeriesId, resolveSeriesInfo, seriesSearchTitles } = require('../shared/turkish_series.js');
const { resolveYouTubeMp4 } = require('../shared/ytmp4.js');

var _cfgReady = null;
function cfgReady() {
    if (!_cfgReady) {
        _cfgReady = loadConfig().then(function () {
            var v;
            v = val('urls.series.anthology_diziler');
            if (v && typeof v === 'object') {
                if (v.now) NOW_BASE = String(v.now).replace(/\/+$/, '');
                if (v.show) SHOW_BASE = String(v.show).replace(/\/+$/, '');
                if (v.kanald) KANALD_BASE = String(v.kanald).replace(/\/+$/, '');
                if (v.atv) ATV_BASE = String(v.atv).replace(/\/+$/, '');
                if (v.star) STAR_BASE = String(v.star).replace(/\/+$/, '');
                if (v.trt1) TRT1_BASE = String(v.trt1).replace(/\/+$/, '');
                if (v.tv2) TV2_BASE = String(v.tv2).replace(/\/+$/, '');
            }
        });
    }
    return _cfgReady;
}

/**
 * Anthology - Dizi (TV Ağları) Provider
 * NOW / Show TV / KanalD / Star TV / ATV / TRT1 resmi yayın arşivlerinden
 * dinamik bölüm akışları. Kimlik çözümü tamamen dinamiktir (TMDB alias + site
 * slug'ları) — sabit dizi haritası YOK.
 */

var NOW_BASE = 'https://www.nowtv.com.tr';
var SHOW_BASE = 'https://www.showtv.com.tr';
var KANALD_BASE = 'https://kanald.com.tr';
var ATV_BASE = 'https://www.atv.com.tr';
var STAR_BASE = 'https://www.startv.com.tr';
var TRT1_BASE = 'https://www.trt1.com.tr';
var TV2_BASE = 'https://www.tv2.com.tr';

var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8'
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

function slugify(s) {
    return asciiFold(s)
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .trim();
}

function cleanTitle(t) {
    return asciiFold(String(t || '')).replace(/[^a-z0-9]+/g, ' ').trim();
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
    return await fetchBody(url, opts, ms);
}

async function fetchBody(url, opts, ms) {
    var r = await fadeFetch(url, opts, ms);
    var t = await r.text().catch(function () { return ''; });
    return r.ok ? t : t;
}

async function fetchJson(url, opts, ms) {
    var t = await fetchText(url, opts, ms);
    if (!t) return null;
    try { return JSON.parse(t); } catch (e) { return null; }
}

function mkStream(url, label, format, isHls, quality, headers) {
    return {
        url: url,
        name: 'Anthology Dizi',
        title: '⌜ Anthology Dizi ⌟ | ' + label,
        quality: quality || '1080p',
        format: format,
        isHls: isHls,
        headers: headers || { 'User-Agent': HEADERS['User-Agent'] }
    };
}

/* ==================== NOW TV ==================== */
async function nowEpisodePage(showSlug, episodeNum) {
    try {
        var html = await fetchText(NOW_BASE + '/' + showSlug + '/bolum/' + episodeNum);
        if (!html) return null;
        var vid = (html.match(/video_id["']?\s*[:=]\s*["']?(\d+)/i) || [])[1];
        if (!vid) return null;
        var r = await fetch(NOW_BASE + '/ajax/stream', {
            method: 'POST',
            headers: {
                'User-Agent': HEADERS['User-Agent'],
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-Requested-With': 'XMLHttpRequest',
                'Origin': NOW_BASE,
                'Referer': NOW_BASE + '/'
            },
            body: 'video_id=' + vid,
            signal: useTimeoutSignal(15000)
        });
        if (!r.ok) return null;
        var j = await r.json().catch(function () { return null; });
        if (!j || j.code !== 200 || !j.video_url) return null;
        return mkStream(j.video_url, 'NOW TV | ' + showSlug + ' EP' + episodeNum, 'hls', true, '1080p', { 'User-Agent': HEADERS['User-Agent'], 'Referer': NOW_BASE + '/' });
    } catch (e) { return null; }
}

/* ==================== Show TV ==================== */
function parseShowHorMedia(html) {
    var m = html.match(/data-hope-video=['"]/i);
    var body = null;
    if (m) {
        var q = m[0][m[0].length - 1];
        var b = html.slice(m.index + m[0].length);
        var out = '', esc = false;
        for (var k2 = 0; k2 < b.length; k2++) {
            var ch = b[k2];
            if (esc) { out += ch; esc = false; }
            else if (ch === '\\') { out += ch; esc = true; }
            else if (ch === q) { break; }
            else out += ch;
        }
        body = out;
    }
    if (body !== null) {
        var j;
        try { j = JSON.parse(body.replace(/&quot;/g, '"')); } catch (e) { j = null; }
        var mm = (j && j.media && j.media.m3u8) || [];
        var src = '';
        for (var k = 0; k < mm.length; k++) {
            if (mm[k] && typeof mm[k].src === 'string') { src = mm[k].src; break; }
            if (typeof mm[k] === 'string') { src = mm[k]; break; }
        }
        if (src) return src;
    }
    var vm = html.match(/https:\/\/vmcdn\.ciner\.com\.tr\/[^"'\s\\]+\.m3u8[^"'\s\\]*/i);
    if (vm) return vm[0];
    return '';
}

async function showEpisodePage(showSlug, seasonNum, episodeNum) {
    try {
        // A) dizi listing sayfasından tam bölüm linkini keşfet (kanal/dizi/tum_bolumler önekli liste 200 döner)
        var listing = await fetchText(SHOW_BASE + '/kanal/dizi/tum_bolumler/' + showSlug);
        if (listing) {
            var slugEsc = String(showSlug).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            var re = new RegExp('(\\/dizi\\/tum_bolumler\\/' + slugEsc + '-sezon-(\\d+)-bolum-(\\d+)-izle\\/\\d+)', 'gi');
            var m, targetUrl = '';
            while ((m = re.exec(listing)) !== null) {
                var sN = parseInt(m[2], 10);
                var eN = parseInt(m[3], 10);
                if (sN === parseInt(seasonNum, 10) && eN === parseInt(episodeNum, 10)) { targetUrl = m[1]; break; }
            }
            if (targetUrl) {
                var html = await fetchText(SHOW_BASE + targetUrl);
                if (html) {
                    var src = parseShowHorMedia(html);
                    if (src) return mkStream(src, 'Show TV | ' + showSlug + ' S' + seasonNum + 'E' + episodeNum, 'hls', true, '1080p', { 'User-Agent': HEADERS['User-Agent'], 'Referer': SHOW_BASE + '/' });
                }
            }
        }
        // B) katalog taraması: listing'den bölüm bilinmiyorsa sitemap/listing içindeki tüm sezonları tara
        var listingAll = await fetchText(SHOW_BASE + '/kanal/dizi/tum_bolumler/' + showSlug);
        if (listingAll) {
            var reAll = new RegExp('(\\/dizi\\/tum_bolumler\\/' + slugEsc + '-sezon-(\\d+)-bolum-(\\d+)-izle\\/\\d+)', 'gi');
            var allM, sBest = null, eBest = null, uBest = '';
            while ((allM = reAll.exec(listingAll)) !== null) {
                var sA = parseInt(allM[2], 10);
                var eA = parseInt(allM[3], 10);
                var wantS = parseInt(seasonNum, 10);
                var wantE = parseInt(episodeNum, 10);
                if (sA === wantS && eA === wantE) { sBest = sA; eBest = eA; uBest = allM[1]; break; }
                if (sA === wantS) {
                    if (sBest === null || Math.abs(eA - wantE) < Math.abs(eBest - wantE)) { sBest = sA; eBest = eA; uBest = allM[1]; }
                }
            }
            if (uBest) {
                var htmlB = await fetchText(SHOW_BASE + uBest);
                if (htmlB) {
                    var srcB = parseShowHorMedia(htmlB);
                    if (srcB) return mkStream(srcB, 'Show TV | ' + showSlug + ' S' + seasonNum + 'E' + episodeNum, 'hls', true, '1080p', { 'User-Agent': HEADERS['User-Agent'], 'Referer': SHOW_BASE + '/' });
                }
            }
        }
    } catch (e) {}
    return null;
}

/* ==================== KanalD ==================== */
async function kanaldEpisode(showSlug, episodeNum) {
    try {
        var urls = [
            KANALD_BASE + '/' + showSlug + '/bolumler/' + showSlug + '-' + episodeNum + '-bolum',
            KANALD_BASE + '/' + showSlug + '/bolumler/' + showSlug + '-son-bolum'
        ];
        for (var i = 0; i < urls.length; i++) {
            var html = await fetchText(urls[i]);
            if (!html) continue;
            var m3 = html.match(/https?:\/\/kanaldvod\.duhnet\.tv\/[^"'\s\\]+\.smil\/playlist\.m3u8[^"'\s\\]*/i);
            if (m3) return mkStream(m3[0], 'KanalD | ' + showSlug + ' EP' + episodeNum, 'hls', true, '1080p', { 'User-Agent': HEADERS['User-Agent'], 'Referer': KANALD_BASE + '/' });
        }
    } catch (e) {}
    return null;
}

/* ==================== Star TV (DYG) ==================== */
async function starResolve(rid) {
    try {
        var reference = 'StarTv_' + rid;
        var url = 'https://dygvideo.dygdigital.com/api/video_info?akamai=true&PublisherId=1&ReferenceId=' + encodeURIComponent(reference) + '&SecretKey=NtvApiSecret2014*';
        var j = await fetchJson(url, {}, 20000);
        if (!j || !j.data || !j.data.flavors || !j.data.flavors.hls) return null;
        var streams = [];
        streams.push(mkStream(j.data.flavors.hls, 'Star TV | ' + reference, 'hls', true, '1080p', { 'User-Agent': HEADERS['User-Agent'], 'Referer': STAR_BASE + '/' }));
        for (var k in j.data.flavors) {
            if (!Object.prototype.hasOwnProperty.call(j.data.flavors, k)) continue;
            var v = j.data.flavors[k];
            if (typeof v === 'string' && /\.mp4(?:\?|$)/i.test(v)) {
                streams.push(mkStream(v, 'Star TV | ' + reference + ' [MP4]', 'mp4', false, '1080p', { 'User-Agent': HEADERS['User-Agent'], 'Referer': STAR_BASE + '/' }));
            }
        }
        return streams;
    } catch (e) { return null; }
}

async function starEpisode(showSlug, episodeNum) {
    try {
        var html = await fetchText(STAR_BASE + '/' + showSlug + '/' + episodeNum + '-bolum-izle');
        if (!html) return null;
        var rid = (html.match(/"referenceId":"([a-f0-9]{24})"/) || [])[1];
        if (!rid) {
            var m = html.match(/referenceId[:"]?\s*["']?([a-f0-9]{24})/);
            if (m) rid = m[1];
        }
        if (!rid) return null;
        return await starResolve(rid);
    } catch (e) { return null; }
}

/* ==================== ATV ==================== */
async function atvEpisode(showSlug, episodeNum) {
    try {
        var html = await fetchText(ATV_BASE + '/' + showSlug + '/' + episodeNum + '-bolum/izle');
        if (!html) return null;
        var vid = (html.match(/name="videoId"\s+value="([^"]+)"/) || [])[1] ||
                  (html.match(/data-video[-]?id["']?\s*[:=]\s*["']?([a-f0-9-]{6,})/i) || [])[1];
        if (!vid) {
            var alt = (html.match(/videoId["']?\s*[:=]\s*["']?([a-f0-9-]{6,})/i) || [])[1];
            if (alt) vid = alt;
        }
        if (!vid) return null;
        var gv = await fetchJson('https://videojs.tmgrup.com.tr/getvideo/0fe2a405-8afa-4238-b429-e5f96aec3a5c/' + vid, { 'Referer': ATV_BASE + '/' }, 15000);
        if (gv && gv.video && gv.video.VideoUrl && gv.video.VideoUrl.indexOf('http') === 0) {
            return mkStream(gv.video.VideoUrl, 'ATV | ' + showSlug + ' EP' + episodeNum, 'hls', true, '1080p', { 'User-Agent': HEADERS['User-Agent'], 'Referer': ATV_BASE + '/' });
        }
    } catch (e) {}
    return null;
}

/* ==================== TV2 (Doğuş) ==================== */
async function tv2Episode(showSlug, episodeNum, seasonNum) {
    try {
        var paths = [
            '/diziler/guncel/' + showSlug + '/bolumler',
            '/programlar/guncel/' + showSlug + '/bolumler'
        ];
        var url, foundPage = '', hadListing = false;
        for (var p = 0; p < paths.length; p++) {
            url = TV2_BASE + paths[p];
            var listing = await fetchText(url);
            if (!listing) continue;
            hadListing = true;
            var re = new RegExp('(\\/diziler\\/guncel\\/' + String(showSlug).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\/bolumler\\/' + String(showSlug).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '-[' + String(episodeNum) + ']+-bolum)', 'gi');
            var m;
            while ((m = re.exec(listing)) !== null) {
                var num = m[1].match(/-(\d+)-bolum$/);
                if (num && parseInt(num[1], 10) === parseInt(episodeNum, 10)) { foundPage = m[1]; break; }
            }
            if (foundPage) break;
        }
        if (!foundPage) return null;
        var html = await fetchText(TV2_BASE + foundPage);
        if (!html) return null;
        var cid = (html.match(/data-id="([a-zA-Z0-9]{20,})"/) || [])[1] ||
                  (html.match(/data-id\s*=\s*"([a-zA-Z0-9]{20,})"/) || [])[1];
        if (!cid) return null;
        var j = await fetchJson(TV2_BASE + '/action/media/' + cid, { 'Referer': TV2_BASE + '/' }, 15000);
        if (!j || j.Status !== 'Success' || !j.Media || !j.Media.Link || !j.Media.Link.SecurePath) return null;
        var secure = j.Media.Link.SecurePath || '';
        var defaultSvc = (j.Media.Link.DefaultServiceUrl || 'https://tv2vod.duhnet.tv').replace(/\/+$/, '');
        var full;
        if (/^https?:/i.test(secure)) full = secure;
        else if (secure.indexOf('//') === 0) full = 'https:' + secure;
        else full = defaultSvc + '/' + secure.replace(/^\/+/, '');
        return mkStream(full, 'TV2 | ' + showSlug + ' EP' + episodeNum, 'hls', true, '1080p', { 'User-Agent': HEADERS['User-Agent'], 'Referer': TV2_BASE + '/' });
    } catch (e) {}
    return null;
}

/* ==================== TRT1 (YouTube resmi tam bölüm) ==================== */
async function trt1Episode(title, episodeNum) {
    try {
        // TRT1'de serbest bölüm yok; yapımcı kanal YouTube resmi tam bölümü
        var query = title + ' ' + episodeNum + '. Bölüm';
        var html = await fetchText('https://www.youtube.com/results?search_query=' + encodeURIComponent(query), { 'User-Agent': HEADERS['User-Agent'] }, 10000);
        if (!html) return null;
        var ids = [];
        var re = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
        var m;
        while ((m = re.exec(html)) !== null) ids.push(m[1]);
        var seen = {};
        for (var i = 0; i < ids.length; i++) {
            if (seen[ids[i]]) continue;
            seen[ids[i]] = true;
            var st = await resolveYouTubeMp4(ids[i]);
            if (st) return [mkStream(st.url, 'TRT1 | ' + title + ' EP' + episodeNum + ' (YouTube)', st.format, st.isHls, st.quality || '1080p', st.headers)];
        }
    } catch (e) {}
    return null;
}

/* ==================== Kimlik çözümü ve ağ rotası ==================== */
function parseRawId(raw) {
    if (raw.indexOf(':') !== -1) {
        var parts = raw.split(':');
        // anthology_diziler:<canal>:<slug>:s:e  -> s,e integer
        var sNum = 1, eNum = 1;
        for (var i = 0; i < parts.length; i++) {
            var n = parseInt(parts[i], 10);
            if (!isNaN(n) && i === parts.length - 1) eNum = n;
            else if (!isNaN(n) && i === parts.length - 2) sNum = n;
        }
        return { slug: decodeURIComponent(parts[parts.length - 1]), sNum: sNum, eNum: eNum };
    }
    return { slug: '', sNum: 1, eNum: 1 };
}

async function resolveNetworks(title, keywords) {
    // Slug adaylarını üret: ham + articlesız + tr fold (site slug'ları fold'lu ve '-' ayraçlı)
    var candidates = [];
    var seen = {};
    function add(s) {
        s = String(s || '').replace(/\s+/g, ' ').trim();
        if (!s || seen[s]) return;
        seen[s] = true;
        candidates.push(slugify(s));
    }
    add(title);
    add(slugify(title));
    for (var i = 0; i < keywords.length; i++) add(keywords[i]);
    // " " ve "-" varyasyonları
    var base = candidates.slice();
    for (var b = 0; b < base.length; b++) {
        var noA = base[b].replace(/^(the|bir)-/, '');
        if (noA !== base[b]) add(noA);
        add(base[b].replace(/-/g, ''));
    }
    return candidates;
}

async function nowEpisodeSitemapSlugs() {
    var sm = await fetchText(NOW_BASE + '/sitemap.xml');
    var subs = sm.match(/<loc>([^<]+sitemap_episodes_[^<]+)<\/loc>/gi) || [];
    var slugs = {};
    for (var i = 0; i < subs.length && i < 8; i++) {
        var uri = decodeHtmlEntities(subs[i].replace(/<\/?loc>/g, ''));
        var sub = await fetchText(uri);
        var re = /<loc>https:\/\/www\.nowtv\.com\.tr\/([^/<]+)\/bolum\/(\d+)<\/loc>/gi;
        var m;
        while ((m = re.exec(sub)) !== null) {
            if (!slugs[m[1]]) slugs[m[1]] = parseInt(m[2], 10);
            else if (parseInt(m[2], 10) > slugs[m[1]]) slugs[m[1]] = parseInt(m[2], 10);
        }
    }
    return slugs;
}

async function getCatalog(args) {
    // Yerli Shelf: NOW güncel bölümler listesi
    try {
        var q = '';
        if (args && typeof args === 'object' && !Array.isArray(args)) {
            q = args.search || (args.extra && args.extra.search) || '';
        }
        q = String(q || '');
        var slugs = await nowEpisodeSitemapSlugs();
        var metas = [];
        if (q) {
            var qf = cleanTitle(q);
            for (var slug in slugs) {
                var tn = decodeHtmlEntities(slug.replace(/-/g, ' '));
                if (cleanTitle(tn).indexOf(qf) === -1) continue;
                metas.push({ id: 'anthology_diziler:now:' + slug, type: 'series', name: tn });
                if (metas.length >= 24) break;
            }
            return { metas: metas };
        }
        // vitrin: NOW ana sayfa + episode sitemap kesişimi (junk linkleri elenir)
        var html = await fetchText(NOW_BASE + '/');
        var junk = ['gizlilik-politikasi', 'dizi-izle', 'program-izle', 'now-haber', 'yayin-akisi', 'uygulama', 'kurumsal', 'canli-yayin', 'iletisim', 'duyurular', 'hakkimizda', 'kullanim-kosullari', 'kvkk', 'cerez-politikasi', 'site-haritasi', 'reklam', 'canli-tv'];
        var re2 = /<a[^>]+href=["']https:\/\/www\.nowtv\.com\.tr\/([^/"']+)/gi;
        var m2, seen2 = {};
        while ((m2 = re2.exec(html)) !== null) {
            var slug2 = m2[1];
            if (junk.indexOf(slug2) !== -1 || /^[0-9]/.test(slug2) || seen2[slug2]) continue;
            if (!slugs[slug2]) continue;
            seen2[slug2] = true;
            var name = decodeHtmlEntities(slug2.replace(/-/g, ' '));
            metas.push({ id: 'anthology_diziler:now:' + slug2, type: 'series', name: name });
            if (metas.length >= 20) break;
        }
        if (!metas.length) {
            // sitemap'teki gerçek diziler → vitrin yedeği
            for (var slug3 in slugs) {
                if (metas.length >= 20) break;
                metas.push({ id: 'anthology_diziler:now:' + slug3, type: 'series', name: decodeHtmlEntities(slug3.replace(/-/g, ' ')) });
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
        if (raw.indexOf('anthology_diziler:') !== 0) return { meta: null };
        var canal = '';
        if (raw.indexOf(':now:') !== -1) canal = 'now';
        else if (raw.indexOf(':show:') !== -1) canal = 'show';
        else if (raw.indexOf(':kanald:') !== -1) canal = 'kanald';
        else if (raw.indexOf(':star:') !== -1) canal = 'star';
        else if (raw.indexOf(':atv:') !== -1) canal = 'atv';
        else if (raw.indexOf(':trt1:') !== -1) canal = 'trt1';
        var marker = 'anthology_diziler:' + canal + ':';
        var rest = raw.slice(marker.length);
        var slug = decodeURIComponent(rest.split(':')[0] || '');
        if (!slug) return { meta: null };
        var name = slug.replace(/-/g, ' ');
        if (canal === 'now') {
            var sm = await fetchText(NOW_BASE + '/sitemap.xml');
            var smSub = (sm.match(/<loc>([^<]+sitemap_episodes[^<]+)<\/loc>/i) || [])[1];
            if (smSub) {
                var sub = await fetchText(smSub);
                var re = new RegExp('<loc>https:\\/\\/www\\.nowtv\\.com\\.tr\\/' + slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\/bolum\\/(\\d+)<\\/loc>', 'gi');
                var m, videos = [];
                while ((m = re.exec(sub)) !== null) videos.push(m[1]);
                videos.sort(function (a, b) { return parseInt(a, 10) - parseInt(b, 10); });
                var eps = [];
                for (var i = 0; i < videos.length && i < 40; i++) {
                    eps.push({ id: 'anthology_diziler:now:' + slug + ':' + Math.max(1, i + 1) + ':' + videos[i], type: 'series', season: 1, episode: i + 1, name: 'Bölüm ' + (i + 1), title: name + ' Bölüm ' + (i + 1), releaseInfo: '1x' + String(i + 1).padStart(2, '0') });
                }
                if (eps.length) return { meta: { id: raw, type: 'series', name: name, videos: eps } };
            }
        }
        return { meta: { id: raw, type: 'series', name: name, videos: [] } };
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
        var season = parseInt(seasonNum) || 1;
        var episode = parseInt(episodeNum) || 1;

        var canal = '';
        var slug = '';
        if (raw.indexOf('anthology_diziler:') === 0) {
            if (raw.indexOf(':now:') !== -1) canal = 'now';
            else if (raw.indexOf(':show:') !== -1) canal = 'show';
            else if (raw.indexOf(':kanald:') !== -1) canal = 'kanald';
            else if (raw.indexOf(':star:') !== -1) canal = 'star';
            else if (raw.indexOf(':atv:') !== -1) canal = 'atv';
            else if (raw.indexOf(':trt1:') !== -1) canal = 'trt1';
            else if (raw.indexOf(':tv2:') !== -1) canal = 'tv2';
            var parsed = parseRawId(raw);
            slug = parsed.slug;
            // anthology_diziler:<c>:<slug> or <c>:<slug>:s:e
            var marker = 'anthology_diziler:' + canal + ':';
            var rest = raw.slice(marker.length);
            var parts = rest.split(':');
            slug = decodeURIComponent(parts[0]);
            for (var i = 1; i < parts.length; i++) {
                var n = parseInt(parts[i], 10);
                if (!isNaN(n) && i === parts.length - 1) episode = n;
                else if (!isNaN(n) && i === parts.length - 2) season = n;
            }
        }

        // Dinamik kimlik
        var info = null;
        if (!slug) {
            if (idNorm.kind === 'title') {
                info = { title: idNorm.id, origTitle: idNorm.id, aliases: [], kind: 'title', type: 'tv' };
            } else {
                info = await resolveSeriesInfo(raw, mediaType, TMDB_API_KEY);
                if (!info || (!info.title && !info.origTitle)) {
                    if (idNorm.kind === 'title') info = { title: idNorm.id, origTitle: idNorm.id, aliases: [], kind: 'title', type: 'tv' };
                    else return [];
                }
            }
        }

        var title = info ? (info.title || info.origTitle) : slug.replace(/-/g, ' ');
        var keywords = info ? seriesSearchTitles(info) : [title];
        var slugs = slug ? [slug] : await resolveNetworks(title, keywords);

        var all = [];
        var nowLabel = info ? title : slug.replace(/-/g, ' ');
        var showSlug = slugs[0];

        if (!canal || canal === 'now') {
            var one = await nowEpisodePage(showSlug, episode);
            if (one) all.push(one);
            // nocturne: NOW bölüm no'ları dizi bazında ardışık (sezon bilinmez); tam sezon için üst sınır denemesi
            if (!one && season > 0) {
                var alt = await nowEpisodePage(showSlug, episode + (season - 1) * 30);
                if (alt) all.push(alt);
            }
        }
        if (!canal || canal === 'show') {
            var so = await showEpisodePage(showSlug, season, episode);
            if (so) all.push(so);
        }
        if (!canal || canal === 'kanald') {
            var ka = await kanaldEpisode(showSlug, episode);
            if (ka) all.push(ka);
        }
        if (!canal || canal === 'star') {
            var st = await starEpisode(showSlug, episode);
            if (st) for (var x = 0; x < st.length; x++) all.push(st[x]);
        }
        if (!canal || canal === 'atv') {
            var at = await atvEpisode(showSlug, episode);
            if (at) all.push(at);
        }
        if (!canal || canal === 'trt1' || (!canal && all.length === 0)) {
            var tr = await trt1Episode(title, episode);
            if (tr) for (var y = 0; y < tr.length; y++) all.push(tr[y]);
        }
        if (!canal || canal === 'tv2') {
            var t2 = await tv2Episode(showSlug, episode);
            if (t2) all.push(t2);
        }

        return all;
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