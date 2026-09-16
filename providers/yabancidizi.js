/**
 * Anthology - YabancıDizi Provider
 * https://yabancidizi.news/
 * Yabancı diziler kataloğu ve doğrudan 1080p HLS master.m3u8 (VidMoly) akışları.
 */

var BASE_URL = 'https://yabancidizi.news';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
    'Referer': BASE_URL + '/'
};

function safeFetch(url, options) {
    options = options || {};
    // Node.js environment fallback for Cloudflare HTTP/1.1 compatibility
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
        try {
            var https = require('https');
            var http = require('http');
            var u = new URL(url);
            var mod = u.protocol === 'http:' ? http : https;
            return new Promise(function(resolve, reject) {
                var req = mod.request({
                    hostname: u.hostname,
                    port: u.port || (u.protocol === 'http:' ? 80 : 443),
                    path: u.pathname + u.search,
                    method: options.method || 'GET',
                    headers: options.headers || {}
                }, function(res) {
                    var data = '';
                    res.on('data', function(chunk) { data += chunk; });
                    res.on('end', function() {
                        resolve({
                            ok: res.statusCode >= 200 && res.statusCode < 300,
                            status: res.statusCode,
                            headers: res.headers,
                            text: async function() { return data; },
                            json: async function() { return JSON.parse(data); }
                        });
                    });
                });
                req.on('error', reject);
                if (options.body) req.write(options.body);
                req.end();
            });
        } catch (e) {}
    }

    // QuickJS / Nuvio native fetch
    return fetch(url, options);
}

function ultraClean(str) {
    if (!str) return '';
    return str.toString().toLowerCase()
        .replace(/[ıİ]/g, 'i').replace(/[üÜ]/g, 'u').replace(/[öÖ]/g, 'o')
        .replace(/[şŞ]/g, 's').replace(/[ğĞ]/g, 'g').replace(/[çÇ]/g, 'c')
        .replace(/[^a-z0-9]/g, '')
        .trim();
}

async function resolveTmdbInfo(id, mediaType) {
    try {
        var cleanId = String(id || '').trim();
        if (cleanId.includes(':')) cleanId = cleanId.split(':')[0];

        var numericId = null;
        var title = '';
        var origTitle = '';

        if (cleanId.startsWith('tt')) {
            var findRes = await safeFetch('https://api.themoviedb.org/3/find/' + cleanId + '?api_key=' + TMDB_API_KEY + '&external_source=imdb_id');
            if (findRes.ok) {
                var fData = await findRes.json();
                var item = (mediaType === 'tv' || mediaType === 'series')
                    ? (fData.tv_results && fData.tv_results[0])
                    : (fData.movie_results && fData.movie_results[0]);
                if (item) {
                    numericId = item.id;
                    title = item.name || item.title || '';
                    origTitle = item.original_name || item.original_title || '';
                }
            }
        } else {
            numericId = cleanId;
        }

        if (numericId && (!title || !origTitle)) {
            var type = (mediaType === 'tv' || mediaType === 'series') ? 'tv' : 'movie';
            var tRes = await safeFetch('https://api.themoviedb.org/3/' + type + '/' + numericId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR');
            if (tRes.ok) {
                var tData = await tRes.json();
                title = tData.name || tData.title || title;
                origTitle = tData.original_name || tData.original_title || origTitle;
            }
        }

        return { title: title, origTitle: origTitle, numericId: numericId };
    } catch (e) {
        return { title: '', origTitle: '', numericId: id };
    }
}

async function searchYabanciDizi(query) {
    try {
        var searchUrl = BASE_URL + '/search?qr=' + encodeURIComponent(query);
        var res = await safeFetch(searchUrl, {
            method: 'POST',
            headers: {
                'User-Agent': HEADERS['User-Agent'],
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'Referer': BASE_URL + '/'
            }
        });
        if (!res.ok) return [];
        var data = await res.json();
        if (data && data.data && Array.isArray(data.data.result)) {
            return data.data.result;
        }
        return [];
    } catch (e) {
        return [];
    }
}

async function getCatalog(args) {
    try {
        var query = (args && args.search) || (args && args.extra && args.extra.search) || (args && args.query) || '';
        
        if (query) {
            var results = await searchYabanciDizi(query);
            var metas = results.map(function(r) {
                var poster = r.s_image ? (r.s_image.startsWith('http') ? r.s_image : BASE_URL + '/uploads/series/' + r.s_image) : '';
                return {
                    id: 'yabancidizi:show:' + r.s_link,
                    type: r.s_type === '1' ? 'movie' : 'tv',
                    name: r.s_name,
                    poster: poster,
                    background: poster,
                    genres: ['Yabancı Dizi', 'YabancıDizi'],
                    description: (r.s_name || '') + ' (' + (r.s_year || '') + ') - YabancıDizi'
                };
            });
            return { metas: metas };
        }

        // Homepage popular series
        var res = await safeFetch(BASE_URL + '/', { headers: HEADERS });
        if (!res.ok) return { metas: [] };
        var html = await res.text();

        var cardRegex = /<a[^>]+href=["'](?:https:\/\/yabancidizi\.news)?\/(?:dizi)\/([^"'/]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
        var metas = [];
        var seen = new Set();
        var m;

        while ((m = cardRegex.exec(html)) !== null) {
            var slug = m[1];
            if (!slug || slug.startsWith('tur/') || seen.has(slug)) continue;
            seen.add(slug);

            var title = m[2].replace(/<[^>]+>/g, '').trim();
            if (!title) continue;

            metas.push({
                id: 'yabancidizi:show:' + slug,
                type: 'tv',
                name: title,
                poster: 'https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png',
                background: 'https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png',
                genres: ['Yabancı Dizi', 'YabancıDizi'],
                description: title + ' - YabancıDizi Arşivi'
            });
        }

        return { metas: metas };
    } catch (e) {
        return { metas: [] };
    }
}

async function getMeta(args) {
    try {
        var rawId = (typeof args === 'string') ? args : (args && args.id ? args.id : '');
        if (!rawId) return { meta: null };

        if (rawId.startsWith('yabancidizi:show:')) {
            var showSlug = rawId.replace('yabancidizi:show:', '');
            var showUrl = BASE_URL + '/dizi/' + showSlug;
            var res = await safeFetch(showUrl, { headers: HEADERS });
            if (!res.ok) return { meta: null };
            var html = await res.text();

            var titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<title>([^<]+)<\/title>/i);
            var title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : 'YabancıDizi';

            var ogImg = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
            var poster = ogImg ? ogImg[1] : 'https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png';

            var epMatches = [...html.matchAll(/(?:dizi\/[^"'\s]*\/)?sezon-(\d+)\/bolum-(\d+)/gi)];
            var videos = [];
            var seen = new Set();

            for (var ep of epMatches) {
                var sNum = parseInt(ep[1]);
                var eNum = parseInt(ep[2]);
                var key = sNum + 'x' + eNum;
                if (seen.has(key)) continue;
                seen.add(key);

                videos.push({
                    id: 'yabancidizi:ep:' + showSlug + ':' + sNum + ':' + eNum,
                    title: sNum + '. Sezon ' + eNum + '. Bölüm',
                    season: sNum,
                    episode: eNum
                });
            }

            videos.sort(function(a, b) { return (a.season - b.season) || (a.episode - b.episode); });

            return {
                meta: {
                    id: rawId,
                    type: 'tv',
                    name: title,
                    poster: poster,
                    background: poster,
                    description: title + ' - YabancıDizi',
                    genres: ['Yabancı Dizi', 'YabancıDizi'],
                    videos: videos
                }
            };
        }

        return { meta: null };
    } catch (e) {
        return { meta: null };
    }
}

async function extractStreamsFromEpisodePage(epUrl) {
    try {
        var epRes = await safeFetch(epUrl, {
            headers: {
                'User-Agent': HEADERS['User-Agent'],
                'Referer': BASE_URL + '/'
            }
        });
        if (!epRes.ok) return [];
        var html = await epRes.text();

        // 1. VidMoly download & embed links directly in page HTML
        var dlRegex = /<a[^>]+href=["'](https?:\/\/vidmoly\.[a-z0-9]+\/dl\/([a-zA-Z0-9_-]+))["'][^>]*>([\s\S]*?)<\/a>/gi;
        var streams = [];
        var seenUrls = new Set();
        var seenIds = new Set();
        var m;

        while ((m = dlRegex.exec(html)) !== null) {
            var vidId = m[2];
            var label = m[3].replace(/<[^>]+>/g, '').trim();

            if (seenIds.has(vidId)) continue;
            seenIds.add(vidId);

            var langText = 'Türkçe Altyazılı';
            if (/dublaj/i.test(label)) langText = 'Türkçe Dublaj';
            else if (/ingilizce/i.test(label)) langText = 'İngilizce Altyazılı';

            var embedUrl = 'https://vidmoly.biz/embed-' + vidId + '.html';
            try {
                var vmRes = await safeFetch(embedUrl, {
                    headers: {
                        'User-Agent': HEADERS['User-Agent'],
                        'Referer': BASE_URL + '/'
                    }
                });
                if (vmRes.ok) {
                    var vmHtml = await vmRes.text();
                    var m3u8Match = vmHtml.match(/file\s*:\s*['"](https?:\/\/[^'"<>]+\.m3u8[^'"<>]*)['"]/i);
                    if (m3u8Match && !seenUrls.has(m3u8Match[1])) {
                        seenUrls.add(m3u8Match[1]);
                        var vmHeaders = {
                            'User-Agent': HEADERS['User-Agent'],
                            'Referer': 'https://vidmoly.biz/'
                        };
                        streams.push({
                            name: 'YabancıDizi',
                            title: '⌜ YabancıDizi ⌟ | VidMoly (' + langText + ' 1080p HLS)',
                            url: m3u8Match[1],
                            quality: '1080p',
                            provider: 'yabancidizi',
                            headers: vmHeaders,
                            behaviorHints: {
                                notWebReady: true,
                                proxyHeaders: {
                                    request: vmHeaders
                                }
                            }
                        });
                    }
                }
            } catch (err) {}
        }

        return streams;
    } catch (e) {
        return [];
    }
}

async function getStreams(tmdbIdOrArgs, mediaType, seasonNum, episodeNum) {
    try {
        if (typeof tmdbIdOrArgs === 'object' && tmdbIdOrArgs && tmdbIdOrArgs.id) {
            return getStreams(tmdbIdOrArgs.id, mediaType || tmdbIdOrArgs.type, seasonNum || tmdbIdOrArgs.season, episodeNum || tmdbIdOrArgs.episode);
        }

        if (typeof tmdbIdOrArgs === 'string' && tmdbIdOrArgs.startsWith('yabancidizi:ep:')) {
            var parts = tmdbIdOrArgs.replace('yabancidizi:ep:', '').split(':');
            var sSlug = parts[0];
            var s = parts[1] || '1';
            var e = parts[2] || '1';
            var epUrl = BASE_URL + '/dizi/' + sSlug + '/sezon-' + s + '/bolum-' + e;
            return await extractStreamsFromEpisodePage(epUrl);
        }

        if (typeof tmdbIdOrArgs === 'string' && tmdbIdOrArgs.startsWith('yabancidizi:show:')) {
            var showMeta = await getMeta(tmdbIdOrArgs);
            if (showMeta && showMeta.meta && Array.isArray(showMeta.meta.videos) && showMeta.meta.videos.length > 0) {
                return await getStreams(showMeta.meta.videos[0].id);
            }
        }

        var season = parseInt(seasonNum) || 1;
        var episode = parseInt(episodeNum) || 1;

        var info = await resolveTmdbInfo(tmdbIdOrArgs, mediaType);
        var searchTitles = [info.origTitle, info.title].filter(Boolean);
        if (searchTitles.length === 0) return [];

        for (var title of searchTitles) {
            var results = await searchYabanciDizi(title);
            if (results.length === 0) continue;

            var cleanTarget = ultraClean(title);
            var matchedShow = null;

            for (var r of results) {
                var rTitle = ultraClean(r.s_name);
                if (rTitle === cleanTarget) {
                    matchedShow = r;
                    break;
                }
            }

            if (!matchedShow) {
                for (var r of results) {
                    var rTitle = ultraClean(r.s_name);
                    if (rTitle.includes(cleanTarget) || cleanTarget.includes(rTitle)) {
                        matchedShow = r;
                        break;
                    }
                }
            }

            if (!matchedShow && results.length > 0) {
                matchedShow = results[0];
            }

            if (!matchedShow || !matchedShow.s_link) continue;

            var targetEpUrl = BASE_URL + '/dizi/' + matchedShow.s_link + '/sezon-' + season + '/bolum-' + episode;
            var streams = await extractStreamsFromEpisodePage(targetEpUrl);
            if (streams.length > 0) return streams;
        }

        return [];
    } catch (e) {
        return [];
    }
}

// ── Universal Quality Sorter ──────────────────────────────────────────
function sortStreamsByQuality(streams) {
    if (!Array.isArray(streams) || streams.length <= 1) return streams || [];
    function getQualityScore(s) {
        if (!s) return 0;
        var score = 0;
        if (s.quality) {
            var q = String(s.quality).toLowerCase().trim();
            if (/\b(4k|2160p?|uhd)\b/.test(q)) score = 2160;
            else if (/\b(2k|1440p?|qhd)\b/.test(q)) score = 1440;
            else if (/\b(1080p?|fhd|full[\s-]?hd)\b/.test(q)) score = 1080;
            else if (/\b(720p?|hd)\b/.test(q)) score = 720;
            else if (/\b(540p?)\b/.test(q)) score = 540;
            else if (/\b(480p?|sd)\b/.test(q)) score = 480;
            else if (/\b(360p?)\b/.test(q)) score = 360;
            else if (/\b(240p?)\b/.test(q)) score = 240;
        }
        if (!score) {
            var text = [s.title, s.name, s.resolution].filter(Boolean).join(" ").toLowerCase();
            if (/\b(4k|2160p|uhd)\b/.test(text)) score = 2160;
            else if (/\b(2k|1440p|qhd)\b/.test(text)) score = 1440;
            else if (/\b(1080p|fhd|full[\s-]?hd)\b/.test(text)) score = 1080;
            else if (/\b(720p)\b/.test(text)) score = 720;
            else if (/\b(540p)\b/.test(text)) score = 540;
            else if (/\b(480p)\b/.test(text)) score = 480;
            else if (/\b(360p)\b/.test(text)) score = 360;
            else if (/\b(240p)\b/.test(text)) score = 240;
            else if (/\b(hd)\b/.test(text) && !/\b(full[\s-]?hd)\b/.test(text)) score = 720;
            else if (/\b(sd)\b/.test(text)) score = 480;
        }
        if (!score && s.url) {
            var u = String(s.url).toLowerCase();
            if (/[\/_.-](2160p?|4k)[\/_.-]/.test(u)) score = 2160;
            else if (/[\/_.-](1440p?|2k)[\/_.-]/.test(u)) score = 1440;
            else if (/[\/_.-](1080p?|fhd)[\/_.-]/.test(u)) score = 1080;
            else if (/[\/_.-](720p?|hd)[\/_.-]/.test(u)) score = 720;
            else if (/[\/_.-](480p?|sd)[\/_.-]/.test(u)) score = 480;
            else if (/[\/_.-](360p?)[\/_.-]/.test(u)) score = 360;
        }
        var isDirectMp4 = s.format === "mp4" || s.type === "mp4" || (!s.isHls && s.url && (s.url.endsWith(".mp4") || s.url.includes(".mp4?")));
        if (isDirectMp4 && score > 0) score += 1;
        return score;
    }
    return streams.slice().sort(function(a, b) {
        return getQualityScore(b) - getQualityScore(a);
    });
}

if (typeof getStreams === "function") {
    var _origGetStreams = getStreams;
    getStreams = async function() {
        var res = await _origGetStreams.apply(this, arguments);
        return sortStreamsByQuality(res);
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams, getMeta: getMeta, getCatalog: getCatalog };
}
if (typeof globalThis !== 'undefined') {
    globalThis.getStreams = getStreams;
    globalThis.getMeta = getMeta;
    globalThis.getCatalog = getCatalog;
}
