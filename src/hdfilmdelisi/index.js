const { sortStreamsByQuality } = require("../shared/quality.js");
const { loadConfig, val, wrapAll } = require("../shared/config.js");

var _cfgReady = null;
function cfgReady() {
    if (!_cfgReady) {
        _cfgReady = loadConfig().then(function () {
            var v;
            v = val('urls.movies.hdfilmdelisi.base'); if (v) BASE_URL = String(v).replace(/\/+$/, '');
            if (HEADERS) HEADERS.Referer = BASE_URL + '/';
        });
    }
    return _cfgReady;
}

/**
 * Anthology - HDFilmDelisi Provider
 * https://hdfilmdelisi.one
 * JSON API (api/films, api/search) + VidMody şifreli oynatıcı üzerinden HLS akışları.
 * Kaynak: Cloudstream HDFilmDelisi/VidMody mantığının Nuvio JS uyarlaması.
 */

var BASE_URL = 'https://hdfilmdelisi.one';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
    'Referer': BASE_URL + '/'
};

var VIDMODY_HEADERS = {
    'User-Agent': HEADERS['User-Agent'],
    'Referer': 'https://pl.vixolity.com/',
    'Origin': 'https://pl.vixolity.com'
};

var VIXOLITY_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Referer': 'https://pl.vixolity.com/',
    'Origin': 'https://pl.vixolity.com',
    'Accept': '*/*'
};

function ultraClean(str) {
    if (!str) return '';
    return str.toString().toLowerCase()
        .replace(/[ıİ]/g, 'i').replace(/[üÜ]/g, 'u').replace(/[öÖ]/g, 'o')
        .replace(/[şŞ]/g, 's').replace(/[ğĞ]/g, 'g').replace(/[çÇ]/g, 'c')
        .replace(/[^a-z0-9]/g, '')
        .trim();
}

function fetchWithTimeout(url, options, ms) {
    var opts = options || {};
    try {
        if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) {
            opts.signal = AbortSignal.timeout(ms || 15000);
        }
    } catch (e) {}
    return fetch(url, opts);
}

async function resolveTmdbInfo(id, mediaType) {
    try {
        var cleanId = String(id || '').trim().replace(/^(?:movie|tv|series|tmdb|imdb):+/i, '');
        if (cleanId.includes(':')) cleanId = cleanId.split(':')[0];
        var title = '';
        var origTitle = '';
        var imdbId = '';
        if (cleanId.startsWith('tt')) {
            imdbId = cleanId;
            var findRes = await fetchWithTimeout('https://api.themoviedb.org/3/find/' + cleanId + '?api_key=' + TMDB_API_KEY + '&external_source=imdb_id', {}, 10000);
            if (findRes.ok) {
                var fd = await findRes.json();
                var match = (mediaType === 'tv' || mediaType === 'series')
                    ? (fd.tv_results && fd.tv_results[0])
                    : (fd.movie_results && fd.movie_results[0]);
                if (!match) match = (fd.movie_results && fd.movie_results[0]) || (fd.tv_results && fd.tv_results[0]);
                if (match) {
                    title = match.name || match.title || '';
                    origTitle = match.original_name || match.original_title || '';
                }
            }
        } else {
            var type = (mediaType === 'tv' || mediaType === 'series') ? 'tv' : 'movie';
            var tRes = await fetchWithTimeout('https://api.themoviedb.org/3/' + type + '/' + cleanId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR', {}, 10000);
            if (tRes.ok) {
                var td = await tRes.json();
                title = td.name || td.title || '';
                origTitle = td.original_name || td.original_title || '';
                if (td.imdb_id) imdbId = td.imdb_id;
            }
            if (!imdbId && (mediaType === 'tv' || mediaType === 'series')) {
                var extRes = await fetchWithTimeout('https://api.themoviedb.org/3/tv/' + cleanId + '/external_ids?api_key=' + TMDB_API_KEY, {}, 6000);
                if (extRes.ok) {
                    var extData = await extRes.json();
                    if (extData && extData.imdb_id) imdbId = extData.imdb_id;
                }
            }
        }
        return { title: title, origTitle: origTitle, imdbId: imdbId };
    } catch (e) {
        return { title: '', origTitle: '', imdbId: '' };
    }
}

async function apiSearch(query) {
    try {
        var res = await fetchWithTimeout(BASE_URL + '/api/search?q=' + encodeURIComponent(query), {
            headers: { 'User-Agent': HEADERS['User-Agent'], 'Referer': BASE_URL + '/' }
        }, 15000);
        if (!res.ok) return [];
        var data = await res.json();
        return (data && (data.results || data.films)) || [];
    } catch (e) {
        return [];
    }
}

function pickBest(results, title) {
    if (!results || results.length === 0) return null;
    var cleanTarget = ultraClean(title);
    var nameOf = function(r) { return r.baslik || r.orijinalBaslik || r.title || ''; };
    for (var i = 0; i < results.length; i++) {
        if (ultraClean(nameOf(results[i])) === cleanTarget) return results[i];
    }
    for (var j = 0; j < results.length; j++) {
        var c = ultraClean(nameOf(results[j]));
        if (c.includes(cleanTarget) || cleanTarget.includes(c)) return results[j];
    }
    return results[0];
}

/* VidMody şifre çözümü: hex->char, ters çevir, base64 çöz, bayt çıkar, \xNN kaçışları */
function vidmodyDecrypt(hex, key) {
    try {
        var sb = '';
        for (var i = 0; i < hex.length; i += 2) {
            sb += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
        }
        var rev = sb.split('').reverse().join('');
        var decoded;
        if (typeof Buffer !== 'undefined') {
            decoded = Buffer.from(rev, 'base64');
        } else if (typeof atob === 'function') {
            var bin = atob(rev);
            decoded = [];
            for (var k = 0; k < bin.length; k++) decoded.push(bin.charCodeAt(k));
        } else {
            return '';
        }
        var out = '';
        for (var b = 0; b < decoded.length; b++) {
            var byte = typeof decoded[b] === 'number' ? decoded[b] : decoded.charCodeAt(b);
            out += String.fromCharCode((byte - key + 256) % 256);
        }
        return out.replace(/\\x([0-9a-fA-F]{2})/g, function(m, h) {
            return String.fromCharCode(parseInt(h, 16));
        });
    } catch (e) {
        return '';
    }
}

async function extractVidmodyFile(pageUrl) {
    try {
        var res = await fetchWithTimeout(pageUrl, { headers: HEADERS }, 15000);
        if (!res.ok) return null;
        var html = await res.text();
        var vm = html.match(/https?:[\\/]+player\.vidmody\.com[\\/][a-zA-Z0-9=\\/]+/);
        if (!vm) return null;
        var playerUrl = vm[0].split('\\').join('/');
        var pRes = await fetchWithTimeout(playerUrl, {
            headers: { 'User-Agent': HEADERS['User-Agent'], 'Referer': pageUrl }
        }, 15000);
        if (!pRes.ok) return null;
        var pHtml = await pRes.text();
        var dMatch = pHtml.match(/(?:decrypt|\))\s*\(\s*["']([0-9a-fA-F]+)["']\s*,\s*(\d+)\s*\)/);
        if (!dMatch) return null;
        var block = vidmodyDecrypt(dMatch[1], parseInt(dMatch[2]));
        var fMatch = block.match(/file:\s*['"](https?:\/\/[^'"]+)['"]/);
        if (!fMatch) return null;
        var subs = [];
        var subRe = /https?:\/\/[^\s"'\\]+\.vtt/gi;
        var sm;
        var seen = new Set();
        while ((sm = subRe.exec(pHtml + ' ' + block)) !== null) {
            if (seen.has(sm[0]) || /thumb/i.test(sm[0])) continue;
            seen.add(sm[0]);
            var lang = /tur/i.test(sm[0]) ? 'tur' : 'eng';
            subs.push({ id: lang, lang: lang, url: sm[0] });
        }
        return { file: fMatch[1], playerUrl: playerUrl, subtitles: subs };
    } catch (e) {
        return null;
    }
}

function parseVixolitySubtitles(playlistText) {
    var subs = [];
    var subRe = /#EXT-X-MEDIA:TYPE=SUBTITLES.*?NAME="([^"]+)".*?LANGUAGE="([^"]+)".*?URI="([^"]+)"/gi;
    var sm;
    var seen = new Set();
    while ((sm = subRe.exec(playlistText)) !== null) {
        var name = sm[1];
        var lang = sm[2].toLowerCase();
        var uri = sm[3];
        if (seen.has(uri)) continue;
        seen.add(uri);
        subs.push({
            id: lang,
            lang: lang === 'tr' ? 'tur' : lang === 'en' ? 'eng' : lang,
            language: lang,
            label: name,
            name: name,
            title: name,
            url: uri,
            format: 'vtt',
            type: 'text/vtt',
            headers: VIXOLITY_HEADERS
        });
    }
    return subs;
}

function toVixolityStream(url, subtitles, isSeries, sNum, eNum) {
    var tag = isSeries ? ('S' + (sNum || 1) + 'E' + (eNum || 1) + ' • [TR Dublaj & Altyazılı]') : '[TR Dublaj & Altyazılı]';
    return {
        name: 'HDFilmDelisi',
        title: '⌜ HDFilmDelisi ⌟ | Vixolity • ' + tag + ' (1080p HLS)',
        url: url,
        quality: '1080p',
        provider: 'hdfilmdelisi',
        headers: VIXOLITY_HEADERS,
        format: 'hls',
        isHls: true,
        behaviorHints: { notWebReady: true, proxyHeaders: { request: VIXOLITY_HEADERS } },
        subtitles: subtitles || []
    };
}

function toStream(file, subtitles) {
    var isHls = /\.m3u8/i.test(file) || file.includes('vixolity.com/vs/') || file.includes('vidmody.com/vs/');
    var headers = file.includes('vixolity.com')
        ? VIXOLITY_HEADERS
        : (isHls && file.includes('vidmody.com')
            ? { 'User-Agent': HEADERS['User-Agent'], 'Referer': 'https://vidmody.com/' }
            : { 'User-Agent': HEADERS['User-Agent'], 'Referer': 'https://player.vidmody.com/' });
    return {
        name: 'HDFilmDelisi',
        title: '⌜ HDFilmDelisi ⌟ | 1080p HLS',
        url: file,
        quality: '1080p',
        provider: 'hdfilmdelisi',
        headers: headers,
        format: 'hls',
        isHls: true,
        behaviorHints: { notWebReady: true, proxyHeaders: { request: headers } },
        subtitles: subtitles || []
    };
}

async function getCatalog(args) {
    try {
        var query = (args && args.search) || (args && args.extra && args.extra.search) || (args && args.query) || '';
        var url = query
            ? (BASE_URL + '/api/search?q=' + encodeURIComponent(query))
            : (BASE_URL + '/api/films?page=1&sort=newest&limit=20');
        var res = await fetchWithTimeout(url, { headers: { 'User-Agent': HEADERS['User-Agent'] } }, 15000);
        if (!res.ok) return { metas: [] };
        var data = await res.json();
        var items = data.results || data.films || [];
        var metas = items.slice(0, 30).map(function(f) {
            var title = f.baslik || f.title || 'Film';
            return {
                id: 'hdfilmdelisi:movie:' + (f.slug || f.id),
                type: 'movie',
                name: title + (f.yayinYili ? ' (' + f.yayinYili + ')' : ''),
                poster: f.afis || 'https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png',
                background: f.afis || 'https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png',
                genres: [(f.kategoriler && f.kategoriler[0] && f.kategoriler[0].ad) || 'Film', 'HDFilmDelisi'],
                description: (f.orijinalBaslik || title) + ' - HDFilmDelisi'
            };
        });
        return { metas: metas };
    } catch (e) {
        return { metas: [] };
    }
}

async function getMeta(args) {
    try {
        var rawId = (typeof args === 'string') ? args : (args && args.id ? args.id : '');
        if (!rawId || !rawId.startsWith('hdfilmdelisi:')) return { meta: null };
        var slug = rawId.split(':').slice(2).join(':');
        var pageUrl = BASE_URL + '/film/' + slug;
        var res = await fetchWithTimeout(pageUrl, { headers: HEADERS }, 15000);
        if (!res.ok) return { meta: null };
        var html = await res.text();
        var titleMatch = html.match(/<title>([^<]+)<\/title>/i);
        var title = titleMatch ? titleMatch[1].split('|')[0].split('-')[0].trim() : 'HDFilmDelisi';
        var ogImg = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
        var poster = ogImg ? ogImg[1] : 'https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png';
        return {
            meta: {
                id: rawId, type: 'movie', name: title, poster: poster, background: poster,
                description: title + ' - HDFilmDelisi',
                genres: ['Film', 'HDFilmDelisi'],
                videos: [{ id: rawId, title: title, released: new Date().toISOString().split('T')[0] }]
            }
        };
    } catch (e) {
        return { meta: null };
    }
}

async function getStreams(tmdbIdOrArgs, mediaType, seasonNum, episodeNum) {
    try {
        var id = tmdbIdOrArgs;
        var isSeries = mediaType === 'tv' || mediaType === 'series';
        var s = seasonNum || 1;
        var e = episodeNum || 1;

        if (typeof tmdbIdOrArgs === 'object' && tmdbIdOrArgs && tmdbIdOrArgs.id) {
            id = tmdbIdOrArgs.id;
            if (tmdbIdOrArgs.type) isSeries = tmdbIdOrArgs.type === 'tv' || tmdbIdOrArgs.type === 'series';
            if (tmdbIdOrArgs.season) s = tmdbIdOrArgs.season;
            if (tmdbIdOrArgs.episode) e = tmdbIdOrArgs.episode;
        }

        var streams = [];
        var seenUrls = new Set();

        // 1. Direct slug access
        if (typeof id === 'string' && id.startsWith('hdfilmdelisi:movie:')) {
            var slug = id.split(':').slice(2).join(':');
            var apiRes = await fetchWithTimeout(BASE_URL + '/api/films/' + slug, { headers: HEADERS }, 10000);
            if (apiRes.ok) {
                var fData = await apiRes.json();
                if (fData && fData.imdbId && fData.imdbId.startsWith('tt')) {
                    var directVix = 'https://ha.vixolity.com/vs/' + fData.imdbId;
                    var vr = await fetchWithTimeout(directVix, { headers: VIXOLITY_HEADERS }, 8000);
                    if (vr.ok) {
                        var vt = await vr.text();
                        var subs = parseVixolitySubtitles(vt);
                        streams.push(toVixolityStream(directVix, subs, false));
                        seenUrls.add(directVix);
                    }
                }
            }
            var found = await extractVidmodyFile(BASE_URL + '/film/' + slug);
            if (found && !seenUrls.has(found.file)) {
                streams.push(toStream(found.file, found.subtitles));
                seenUrls.add(found.file);
            }
            if (streams.length > 0) return streams;
        }

        // 2. Resolve TMDB Info (includes imdbId)
        var info = await resolveTmdbInfo(id, isSeries ? 'tv' : 'movie');

        // 3. Direct Vixolity HLS via IMDb ID (Dual Audio TR/EN + Subtitles)
        if (info && info.imdbId && info.imdbId.startsWith('tt')) {
            var vixUrl = isSeries
                ? 'https://ha.vixolity.com/vs/' + info.imdbId + '/s' + s + '/e' + (e < 10 ? '0' + e : e)
                : 'https://ha.vixolity.com/vs/' + info.imdbId;

            var vRes = await fetchWithTimeout(vixUrl, { headers: VIXOLITY_HEADERS }, 8000);
            if (vRes.ok) {
                var vTxt = await vRes.text();
                if (vTxt.includes('#EXTM3U')) {
                    var vSubs = parseVixolitySubtitles(vTxt);
                    streams.push(toVixolityStream(vixUrl, vSubs, isSeries, s, e));
                    seenUrls.add(vixUrl);
                }
            }
        }

        // 4. Fallback search on HDFilmDelisi API
        var searchTitles = [info.title, info.origTitle].filter(Boolean);
        for (var t = 0; t < searchTitles.length; t++) {
            var results = await apiSearch(searchTitles[t]);
            if (!results || results.length === 0) continue;
            var best = pickBest(results, searchTitles[t]);
            if (!best || !best.slug) continue;

            if (best.imdbId && best.imdbId.startsWith('tt') && !seenUrls.has('https://ha.vixolity.com/vs/' + best.imdbId)) {
                var sUrl = 'https://ha.vixolity.com/vs/' + best.imdbId;
                var sRes = await fetchWithTimeout(sUrl, { headers: VIXOLITY_HEADERS }, 8000);
                if (sRes.ok) {
                    var sTxt = await sRes.text();
                    if (sTxt.includes('#EXTM3U')) {
                        var sSubs = parseVixolitySubtitles(sTxt);
                        streams.push(toVixolityStream(sUrl, sSubs, false));
                        seenUrls.add(sUrl);
                    }
                }
            }

            var vf = await extractVidmodyFile(BASE_URL + '/film/' + best.slug);
            if (vf && !seenUrls.has(vf.file)) {
                streams.push(toStream(vf.file, vf.subtitles));
                seenUrls.add(vf.file);
            }
            if (streams.length > 0) break;
        }

        return streams;
    } catch (e) {
        return [];
    }
}

// ── Universal Quality Sorter ──────────────────────────────────────────
if (typeof getStreams === "function") {
    var _origGetStreams = getStreams;
    getStreams = async function() {
        var res = await _origGetStreams.apply(this, arguments);
        return sortStreamsByQuality(res);
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = wrapAll({ getStreams, getMeta, getCatalog }, cfgReady);
}
if (typeof globalThis !== 'undefined') {
    globalThis.getStreams = getStreams;
    globalThis.getMeta = getMeta;
    globalThis.getCatalog = getCatalog;
}
