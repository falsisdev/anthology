const { sortStreamsByQuality } = require("../shared/quality.js");
const { loadConfig, val, wrapAll } = require("../shared/config.js");

var _cfgReady = null;
function cfgReady() {
    if (!_cfgReady) {
        _cfgReady = loadConfig().then(function () {
            var v;
            v = val('urls.movies.liderfilmizle.base'); if (v) BASE_URL = String(v).replace(/\/+$/, '');
            v = val('urls.movies.liderfilmizle.play_base'); if (v) PLAY_BASE = String(v).replace(/\/+$/, '');
            if (HEADERS) HEADERS.Referer = BASE_URL + '/';
        });
    }
    return _cfgReady;
}

/**
 * Anthology - LiderFilm Provider
 * https://liderfilmizle.vip
 * Yerli & yabancı film ve diziler.
 * play.liderfilm.cc /vod/ (JWPlayer) ve /embed- (Dizipal/ag2m4 HLS) üzerinden
 * 1080p doğrudan HLS (.m3u8) akışları ve senkronize WebVTT altyazıları sunar.
 */

var BASE_URL = 'https://liderfilmizle.vip';
var PLAY_BASE = 'https://play.liderfilm.cc';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

var HEADERS = {
    'User-Agent': UA,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
    'Referer': BASE_URL + '/'
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
            opts.signal = AbortSignal.timeout(ms || 12000);
        }
    } catch (e) {}
    return fetch(url, opts);
}

async function resolveTmdbInfo(id, mediaType) {
    try {
        var cleanId = String(id || '').trim();
        if (cleanId.includes(':')) cleanId = cleanId.split(':')[0];
        var numericId = null;
        var title = '';
        var origTitle = '';

        if (cleanId.startsWith('tt')) {
            var findRes = await fetchWithTimeout('https://api.themoviedb.org/3/find/' + cleanId + '?api_key=' + TMDB_API_KEY + '&external_source=imdb_id', {}, 10000);
            if (findRes.ok) {
                var fd = await findRes.json();
                var match = (mediaType === 'tv' || mediaType === 'series')
                    ? (fd.tv_results && fd.tv_results[0])
                    : (fd.movie_results && fd.movie_results[0]);
                var item = match || (fd.movie_results && fd.movie_results[0]) || (fd.tv_results && fd.tv_results[0]);
                if (item) {
                    title = item.name || item.title || '';
                    origTitle = item.original_name || item.original_title || '';
                    numericId = item.id;
                }
            }
        } else if (/^\d+$/.test(cleanId)) {
            numericId = cleanId;
            var type = (mediaType === 'tv' || mediaType === 'series') ? 'tv' : 'movie';
            var tRes = await fetchWithTimeout('https://api.themoviedb.org/3/' + type + '/' + numericId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR', {}, 10000);
            if (tRes.ok) {
                var td = await tRes.json();
                title = td.name || td.title || '';
                origTitle = td.original_name || td.original_title || '';
            }
        } else {
            title = cleanId;
        }
        return { title: title, origTitle: origTitle, numericId: numericId };
    } catch (e) {
        return { title: String(id || ''), origTitle: '', numericId: id };
    }
}

async function searchLider(query) {
    if (!query) return [];
    try {
        var res = await fetchWithTimeout(BASE_URL + '/api/search.php?q=' + encodeURIComponent(query), {
            headers: {
                'User-Agent': UA,
                'Referer': BASE_URL + '/'
            }
        }, 8000);
        if (!res.ok) return [];
        var data = await res.json().catch(function() { return null; });
        return (data && Array.isArray(data.results)) ? data.results : [];
    } catch (e) {
        return [];
    }
}

async function resolveSourceStream(sourceUrl, pageUrl) {
    try {
        if (!sourceUrl || sourceUrl.includes('youtube.com')) return null;

        // 1. Durum: VOD Oynatıcı (/vod/...)
        if (sourceUrl.includes('/vod/')) {
            var vRes = await fetchWithTimeout(sourceUrl, {
                headers: { 'User-Agent': UA, 'Referer': pageUrl }
            }, 15000);
            if (!vRes.ok) return null;
            var vHtml = await vRes.text();

            var sourceMatch = vHtml.match(/file:\s*["'](\/player\/stream\.php\?url=[^"']+)["']/i) ||
                              vHtml.match(/sources:\s*\[\s*\{\s*file:\s*["']([^"']+)["']/i);
            if (!sourceMatch) return null;

            var streamPath = sourceMatch[1].replace(/\\/g, '');
            var streamUrl = streamPath.startsWith('http') ? streamPath : new URL(streamPath, sourceUrl).href;

            // Altyazıları ayıkla
            var subtitles = [];
            var trackRe = /file:\s*["']([^"']+\.vtt[^"']*)["']\s*,\s*label:\s*["']([^"']+)["']/gi;
            var tm;
            var subIdx = 0;
            while ((tm = trackRe.exec(vHtml)) !== null) {
                var subUrl = tm[1].replace(/\\/g, '');
                var label = tm[2];
                var lowerLabel = label.toLowerCase();
                var lang = 'tr';
                if (lowerLabel.includes('ing') || lowerLabel.includes('eng')) lang = 'en';
                subtitles.push({
                    id: 'lider_sub_' + (subIdx++),
                    url: subUrl,
                    file: subUrl,
                    lang: lang === 'tr' ? 'tur' : 'eng',
                    language: lang,
                    label: label,
                    format: 'vtt',
                    type: 'text/vtt',
                    mimeType: 'text/vtt'
                });
            }

            return {
                streamUrl: streamUrl,
                quality: '1080p',
                subtitles: subtitles,
                headers: { 'User-Agent': UA, 'Referer': sourceUrl }
            };
        }

        // 2. Durum: Embed Oynatıcı (/embed-...)
        var pRes = await fetchWithTimeout(sourceUrl, {
            headers: { 'User-Agent': UA, 'Referer': pageUrl }
        }, 15000);
        if (!pRes.ok) return null;
        var pHtml = await pRes.text();

        var ifrMatch = pHtml.match(/<iframe[^>]+src=["']([^"']+)["']/i);
        if (!ifrMatch) return null;
        var innerEmbedUrl = ifrMatch[1];

        var innerRes = await fetchWithTimeout(innerEmbedUrl, {
            headers: { 'User-Agent': UA, 'Referer': sourceUrl }
        }, 15000);
        if (!innerRes.ok) return null;
        var innerHtml = await innerRes.text();

        var dlMatch = innerHtml.match(/fetch\(['"](\/dl\?[^'"]+)['"]\)/);
        if (!dlMatch) return null;
        var dlPath = dlMatch[1];
        var dlUrl = new URL(dlPath, innerEmbedUrl).href;
        var innerOrigin = new URL(innerEmbedUrl).origin;

        // x.ag2m4 / cdn77 /dl endpoint'i Origin başlığı bekler
        var dlRes = await fetchWithTimeout(dlUrl, {
            headers: {
                'User-Agent': UA,
                'Referer': innerEmbedUrl,
                'Origin': innerOrigin
            }
        }, 15000);
        if (!dlRes.ok) return null;
        var dlData = await dlRes.json().catch(function() { return null; });
        if (dlData && dlData.url) {
            return {
                streamUrl: dlData.url,
                quality: '1080p',
                subtitles: [],
                headers: { 'User-Agent': UA, 'Referer': innerOrigin + '/' }
            };
        }

        return null;
    } catch (e) {
        return null;
    }
}

async function extractStreamsFromPage(pageUrl) {
    try {
        var res = await fetchWithTimeout(pageUrl, {
            headers: { 'User-Agent': UA, 'Referer': BASE_URL + '/' }
        }, 10000);
        if (!res.ok) return [];
        var html = await res.text();

        var vsMatch = html.match(/window\._vs\s*=\s*['"]([^'"]+)['"]/);
        if (!vsMatch) return [];

        var sources = [];
        try {
            var decoded = typeof Buffer !== 'undefined'
                ? Buffer.from(vsMatch[1], 'base64').toString('utf-8')
                : atob(vsMatch[1]);
            sources = JSON.parse(decoded);
        } catch (e) {
            return [];
        }

        var streams = [];
        for (var i = 0; i < sources.length; i++) {
            var src = sources[i];
            if (!src.url || src.id === 'trailer' || src.url.includes('youtube.com')) continue;
            var resolved = await resolveSourceStream(src.url, pageUrl);
            if (resolved && resolved.streamUrl) {
                var playUrl = resolved.streamUrl.includes('#') ? resolved.streamUrl : (resolved.streamUrl + '#.m3u8');
                streams.push({
                    name: 'LiderFilm',
                    title: 'LiderFilm - ' + resolved.quality + ' [TR / DUAL]',
                    url: playUrl,
                    quality: resolved.quality,
                    format: 'hls',
                    isHls: true,
                    contentLanguage: ['tr'],
                    headers: resolved.headers,
                    behaviorHints: {
                        headers: resolved.headers
                    },
                    subtitles: resolved.subtitles || []
                });
            }
        }
        return streams;
    } catch (e) {
        return [];
    }
}

async function getStreams(tmdbIdOrArgs, mediaType, seasonNum, episodeNum) {
    try {
        var rawId = tmdbIdOrArgs;
        var sNum = seasonNum || 1;
        var eNum = episodeNum || 1;
        var mType = mediaType || 'movie';

        if (typeof tmdbIdOrArgs === 'object' && tmdbIdOrArgs !== null) {
            rawId = tmdbIdOrArgs.id || tmdbIdOrArgs.url || '';
            mType = tmdbIdOrArgs.type || tmdbIdOrArgs.mediaType || mType;
            sNum = tmdbIdOrArgs.season || tmdbIdOrArgs.seasonNum || sNum;
            eNum = tmdbIdOrArgs.episode || tmdbIdOrArgs.episodeNum || eNum;
        }

        rawId = String(rawId || '').trim();

        // 1. Doğrudan URL verilmişse (Örn: https://liderfilmizle.vip/dizi/sumud/sezon-1/bolum-1)
        if (rawId.startsWith('http://') || rawId.startsWith('https://')) {
            return await extractStreamsFromPage(rawId);
        }

        // 2. Katalog slug ID'si verilmişse (liderfilm:tv:sumud veya liderfilm:movie:captain-nova veya liderfilm:tv:sumud:1:5)
        if (rawId.startsWith('liderfilm:')) {
            var parts = rawId.split(':');
            var type = parts[1];
            var slug = parts[2];
            if (parts[3] && /^\d+$/.test(parts[3])) sNum = parseInt(parts[3], 10);
            if (parts[4] && /^\d+$/.test(parts[4])) eNum = parseInt(parts[4], 10);
            var pageUrl = (type === 'tv' || type === 'series')
                ? (BASE_URL + '/dizi/' + slug + '/sezon-' + sNum + '/bolum-' + eNum)
                : (BASE_URL + '/' + slug);
            return await extractStreamsFromPage(pageUrl);
        }

        // 3. TMDB veya başlık araması
        var tmdb = await resolveTmdbInfo(rawId, mType);
        var titlesToSearch = [tmdb.title, tmdb.origTitle].filter(Boolean);
        if (titlesToSearch.length === 0 && rawId) titlesToSearch.push(rawId);

        var bestMatch = null;
        var isSeries = (mType === 'tv' || mType === 'series');

        for (var i = 0; i < titlesToSearch.length; i++) {
            var q = titlesToSearch[i];
            var results = await searchLider(q);
            if (!results || results.length === 0) continue;

            var typeFiltered = results.filter(function(r) {
                return isSeries ? (r.type === 'series') : (r.type === 'movie');
            });
            var pool = typeFiltered.length > 0 ? typeFiltered : results;

            var targetClean = ultraClean(q);
            for (var j = 0; j < pool.length; j++) {
                var r = pool[j];
                if (ultraClean(r.title) === targetClean || ultraClean(r.original_title) === targetClean) {
                    bestMatch = r;
                    break;
                }
            }
            if (!bestMatch && pool[0]) {
                bestMatch = pool[0];
            }
            if (bestMatch) break;
        }

        if (!bestMatch || !bestMatch.slug) return [];

        var targetPageUrl = isSeries
            ? (BASE_URL + '/dizi/' + bestMatch.slug + '/sezon-' + sNum + '/bolum-' + eNum)
            : (BASE_URL + '/' + bestMatch.slug);

        return await extractStreamsFromPage(targetPageUrl);
    } catch (e) {
        return [];
    }
}

async function getCatalog(args) {
    try {
        var catalogId = (args && args.id) || 'anthology_liderfilm_movies';
        var searchQuery = (args && (args.search || (args.extra && args.extra.search))) || '';

        // Arama yapılıyorsa
        if (searchQuery) {
            var results = await searchLider(searchQuery);
            var searchMetas = results.map(function(r) {
                var isTv = r.type === 'series';
                return {
                    id: 'liderfilm:' + (isTv ? 'tv' : 'movie') + ':' + r.slug,
                    type: isTv ? 'tv' : 'movie',
                    name: r.title || r.original_title || r.slug,
                    poster: r.poster || '',
                    description: r.year ? String(r.year) : '',
                    releaseInfo: r.year ? String(r.year) : undefined
                };
            });
            return { metas: searchMetas };
        }

        // Kategori / Keşfet vitrini
        var isSeries = catalogId.includes('series') || catalogId.includes('dizi');
        var pageUrl = isSeries
            ? (BASE_URL + '/diziler/?sayfa=1')
            : (BASE_URL + '/kesfet/filmler/?sayfa=1');

        var res = await fetchWithTimeout(pageUrl, { headers: { 'User-Agent': UA } }, 10000);
        if (!res.ok) return { metas: [] };
        var html = await res.text();

        var metas = [];
        var seenSlugs = new Set();

        if (isSeries) {
            // Series card regex
            var sRe = /<a\s+href="\/dizi\/([^"\/]+)"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"[^>]+alt="([^"]+)"/gi;
            var sm;
            while ((sm = sRe.exec(html)) !== null) {
                var sSlug = sm[1];
                if (seenSlugs.has(sSlug)) continue;
                seenSlugs.add(sSlug);
                metas.push({
                    id: 'liderfilm:tv:' + sSlug,
                    type: 'tv',
                    name: sm[3].trim(),
                    poster: sm[2]
                });
            }
        } else {
            // Movie card regex
            var mRe = /<a\s+href="\/([^"\/]+)"\s+class="movie-card"[\s\S]*?<img[^>]+src="([^"]+)"[^>]+alt="([^"]+)"/gi;
            var mm;
            while ((mm = mRe.exec(html)) !== null) {
                var mSlug = mm[1];
                if (seenSlugs.has(mSlug) || mSlug === 'diziler' || mSlug === 'kesfet') continue;
                seenSlugs.add(mSlug);
                metas.push({
                    id: 'liderfilm:movie:' + mSlug,
                    type: 'movie',
                    name: mm[3].trim(),
                    poster: mm[2]
                });
            }
        }

        return { metas: metas };
    } catch (e) {
        return { metas: [] };
    }
}

async function getMeta(args) {
    try {
        var rawId = (args && (args.id || args)) || '';
        if (!rawId.startsWith('liderfilm:')) return null;

        var parts = rawId.split(':');
        var type = parts[1];
        var slug = parts[2];
        var isTv = (type === 'tv' || type === 'series');

        var pageUrl = isTv ? (BASE_URL + '/dizi/' + slug) : (BASE_URL + '/' + slug);
        var res = await fetchWithTimeout(pageUrl, { headers: { 'User-Agent': UA } }, 10000);
        if (!res.ok) return null;
        var html = await res.text();

        var titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<title>([\s\S]*?)<\/title>/i);
        var title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').replace(/izle.*$/i, '').trim() : slug;

        var descMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
        var desc = descMatch ? descMatch[1] : '';

        var posterMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]*)"/i);
        var poster = posterMatch ? posterMatch[1] : '';

        var meta = {
            id: rawId,
            type: isTv ? 'tv' : 'movie',
            name: title,
            poster: poster,
            background: poster,
            description: desc
        };

        if (isTv) {
            var videos = [];
            var epRe = /href="\/dizi\/[^"\/]+\/sezon-(\d+)\/bolum-(\d+)"[^>]*class="episode-thumb"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"[^>]*>[\s\S]*?<span class="episode-number">([^<]+)<\/span>/gi;
            var em;
            var seenEp = new Set();
            while ((em = epRe.exec(html)) !== null) {
                var season = parseInt(em[1], 10);
                var episode = parseInt(em[2], 10);
                var epKey = season + '_' + episode;
                if (seenEp.has(epKey)) continue;
                seenEp.add(epKey);
                videos.push({
                    id: rawId + ':' + season + ':' + episode,
                    title: em[4].trim(),
                    season: season,
                    episode: episode,
                    thumbnail: em[3]
                });
            }
            if (videos.length > 0) meta.videos = videos;
        }

        return { meta: meta };
    } catch (e) {
        return null;
    }
}

// ── Universal Quality Sorter ──────────────────────────────────────────
if (typeof getStreams === 'function') {
    var _origGetStreams = getStreams;
    getStreams = async function() {
        var res = await _origGetStreams.apply(this, arguments);
        return sortStreamsByQuality(res);
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = wrapAll({ getStreams, getCatalog, getMeta }, cfgReady);
}
