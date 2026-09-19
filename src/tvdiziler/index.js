const { sortStreamsByQuality } = require('../shared/quality.js');
const { loadConfig, val, wrapAll } = require('../shared/config.js');
const { timeoutSignal } = require('../shared/http.js');

var _cfgReady = null;
function cfgReady() {
    if (!_cfgReady) {
        _cfgReady = loadConfig().then(function () {
            var v = val('urls.series.tvdiziler.base');
            if (v) BASE_URL = String(v).replace(/\/+$/, '');
            if (HEADERS) HEADERS.Referer = BASE_URL + '/';
        });
    }
    return _cfgReady;
}

/**
 * Anthology - TvDiziler Provider
 * https://tvdiziler.tv/
 * Yerli TV dizileri arşivi üzerinden 1080p HLS (Twitter Amplify), doğrudan MP4 (Ciner/CDN) ve YouTube akışları.
 */

var BASE_URL = 'https://tvdiziler.tv';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
    'Referer': BASE_URL + '/'
};

function safeFetch(url, options, ms) {
    options = options || {};
    ms = ms || 10000;
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
        try {
            var https = require('https');
            var http = require('http');
            var u = new URL(url);
            var mod = u.protocol === 'http:' ? http : https;
            return new Promise(function (resolve, reject) {
                var req = mod.request({
                    hostname: u.hostname,
                    port: u.port || (u.protocol === 'http:' ? 80 : 443),
                    path: u.pathname + u.search,
                    method: options.method || 'GET',
                    headers: options.headers || {}
                }, function (res) {
                    var data = '';
                    res.on('data', function (chunk) { data += chunk; });
                    res.on('end', function () {
                        resolve({
                            ok: res.statusCode >= 200 && res.statusCode < 300,
                            status: res.statusCode,
                            headers: res.headers,
                            text: async function () { return data; },
                            json: async function () { return JSON.parse(data); }
                        });
                    });
                });
                req.setTimeout(ms, function () {
                    req.destroy(new Error('Request timeout'));
                });
                req.on('error', reject);
                if (options.body) req.write(options.body);
                req.end();
            });
        } catch (e) {}
    }

    if (!options.signal) {
        options.signal = timeoutSignal(ms);
    }
    return fetch(url, options);
}

async function resolveYouTubeMp4(ytId) {
    try {
        var key = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';
        var res = await safeFetch('https://www.youtube.com/youtubei/v1/player?key=' + key, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'com.google.android.youtube/20.10.38 (Linux; U; Android 11) gzip'
            },
            body: JSON.stringify({
                context: {
                    client: {
                        clientName: 'ANDROID',
                        clientVersion: '20.10.38'
                    }
                },
                videoId: ytId
            })
        }, 3500);

        if (res.ok) {
            var data = await res.json();
            if (data.streamingData) {
                if (data.streamingData.hlsManifestUrl) {
                    return {
                        url: data.streamingData.hlsManifestUrl,
                        quality: '1080p',
                        isHls: true,
                        format: 'hls',
                        headers: {
                            'User-Agent': 'com.google.android.youtube/20.10.38 (Linux; U; Android 11) gzip'
                        }
                    };
                }
                if (data.streamingData.formats) {
                    var formats = data.streamingData.formats.filter(function (f) {
                        return f.url && (f.mimeType || '').includes('mp4');
                    });
                    if (formats.length > 0) {
                        return {
                            url: formats[0].url,
                            quality: formats[0].qualityLabel || '360p',
                            isHls: false,
                            format: 'mp4',
                            headers: {
                                'User-Agent': 'com.google.android.youtube/20.10.38 (Linux; U; Android 11) gzip'
                            }
                        };
                    }
                }
            }
        }
    } catch (e) {}
    return null;
}

function ultraClean(str) {
    if (!str) return '';
    return str.toString().toLowerCase()
        .replace(/[ıİ]/g, 'i').replace(/[üÜ]/g, 'u').replace(/[öÖ]/g, 'o')
        .replace(/[şŞ]/g, 's').replace(/[ğĞ]/g, 'g').replace(/[çÇ]/g, 'c')
        .replace(/[âÂ]/g, 'a').replace(/[îÎ]/g, 'i').replace(/[ûÛ]/g, 'u')
        .replace(/[^a-z0-9]/g, '')
        .trim();
}

function getValidTmdbKey() {
    if (typeof TMDB_API_KEY === 'string' && TMDB_API_KEY.length === 32 && !TMDB_API_KEY.startsWith('http')) {
        return TMDB_API_KEY;
    }
    return '500330721680edb6d5f7f12ba7cd9023';
}

var KNOWN_SERIES = {
    '213194': { title: 'Kızılcık Şerbeti', imdb: 'tt22262500' },
    'tt22262500': { title: 'Kızılcık Şerbeti', tmdb: '213194' },
    '115464': { title: 'Son Yaz', imdb: 'tt13410526' },
    'tt13410526': { title: 'Son Yaz', tmdb: '115464' },
    '111685': { title: 'Gönül Dağı', imdb: 'tt13247072' },
    'tt13247072': { title: 'Gönül Dağı', tmdb: '111685' },
    '245914': { title: 'Bahar', imdb: 'tt30825316' },
    'tt30825316': { title: 'Bahar', tmdb: '245914' },
    '119806': { title: 'Teşkilat', imdb: 'tt13853174' },
    'tt13853174': { title: 'Teşkilat', tmdb: '119806' },
    '241020': { title: 'Kızıl Goncalar', imdb: 'tt29584347' },
    'tt29584347': { title: 'Kızıl Goncalar', tmdb: '241020' },
    '210865': { title: 'Yalı Çapkını', imdb: 'tt21815598' },
    'tt21815598': { title: 'Yalı Çapkını', tmdb: '210865' },
    '243832': { title: 'İnci Taneleri', imdb: 'tt30397500' },
    'tt30397500': { title: 'İnci Taneleri', tmdb: '243832' },
    '274880': { title: 'Uzak Şehir', imdb: 'tt33479007' },
    'tt33479007': { title: 'Uzak Şehir', tmdb: '274880' },
    '74823': { title: 'Çukur', imdb: 'tt7366338' },
    'tt7366338': { title: 'Çukur', tmdb: '74823' },
    '6455': { title: 'Kurtlar Vadisi', imdb: 'tt0411008' },
    'tt0411008': { title: 'Kurtlar Vadisi', tmdb: '6455' },
    '69629': { title: 'İçerde', imdb: 'tt6506306' },
    'tt6506306': { title: 'İçerde', tmdb: '69629' },
    '30981': { title: 'Ezel', imdb: 'tt1826959' },
    'tt1826959': { title: 'Ezel', tmdb: '30981' },
    '2224': { title: 'Yaprak Dökümü', imdb: 'tt0496438' },
    'tt0496438': { title: 'Yaprak Dökümü', tmdb: '2224' },
    '2695': { title: 'Aşk-ı Memnu', imdb: 'tt0846548' },
    'tt0846548': { title: 'Aşk-ı Memnu', tmdb: '2695' }
};

async function resolveOfficialYouTubeFallback(title, season, episode, cumEpisode) {
    try {
        var queries = [];
        if (season > 1) {
            queries.push(title + ' ' + season + '. Sezon ' + episode + '. Bölüm');
            if (cumEpisode && cumEpisode !== episode) {
                queries.push(title + ' ' + cumEpisode + '. Bölüm');
            }
        }
        queries.push(title + ' ' + episode + '. Bölüm');

        var key = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';
        for (var query of queries) {
            try {
                var res = await safeFetch('https://www.youtube.com/results?search_query=' + encodeURIComponent(query), {
                    headers: {
                        'User-Agent': HEADERS['User-Agent']
                    },
                    signal: timeoutSignal(3500)
                });
                if (!res.ok) continue;
                var html = await res.text();
                var vidMatches = [...html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)].map(function (m) { return m[1]; });
                var uniqueVids = [...new Set(vidMatches)].slice(0, 3);

                for (var ytId of uniqueVids) {
                    try {
                        var pRes = await safeFetch('https://www.youtube.com/youtubei/v1/player?key=' + key, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'User-Agent': 'com.google.android.youtube/20.10.38 (Linux; U; Android 11) gzip'
                            },
                            body: JSON.stringify({
                                context: { client: { clientName: 'ANDROID', clientVersion: '20.10.38' } },
                                videoId: ytId
                            }),
                            signal: timeoutSignal(3000)
                        });
                        if (!pRes.ok) continue;
                        var data = await pRes.json();
                        var duration = parseInt((data.videoDetails && data.videoDetails.lengthSeconds) || '0');
                        var vTitle = (data.videoDetails && data.videoDetails.title) || '';

                        // Duration must be at least 15 minutes (900 seconds) for a full episode
                        if (duration >= 900) {
                            var streams = [];
                            if (data.streamingData && data.streamingData.hlsManifestUrl) {
                                streams.push({
                                    name: 'TvDiziler',
                                    title: '⌜ TvDiziler ⌟ | Resmi YouTube HLS (' + vTitle.slice(0, 50) + ')',
                                    url: data.streamingData.hlsManifestUrl,
                                    quality: '1080p',
                                    provider: 'tvdiziler',
                                    format: 'hls',
                                    isHls: true,
                                    headers: {
                                        'User-Agent': 'com.google.android.youtube/20.10.38 (Linux; U; Android 11) gzip'
                                    }
                                });
                            }
                            if (data.streamingData && data.streamingData.formats) {
                                var formats = data.streamingData.formats.filter(function (f) { return f.url && (f.mimeType || '').includes('mp4'); });
                                if (formats.length > 0) {
                                    streams.push({
                                        name: 'TvDiziler',
                                        title: '⌜ TvDiziler ⌟ | Resmi YouTube MP4 (' + (formats[0].qualityLabel || '720p') + ')',
                                        url: formats[0].url,
                                        quality: formats[0].qualityLabel || '720p',
                                        provider: 'tvdiziler',
                                        format: 'mp4',
                                        isHls: false,
                                        headers: {
                                            'User-Agent': 'com.google.android.youtube/20.10.38 (Linux; U; Android 11) gzip'
                                        }
                                    });
                                }
                            }
                            // Native Stremio / Nuvio YouTube player fallback
                            streams.push({
                                name: 'TvDiziler',
                                title: '⌜ TvDiziler ⌟ | YouTube (' + vTitle.slice(0, 50) + ')',
                                ytId: ytId,
                                provider: 'tvdiziler'
                            });
                            if (streams.length > 0) return streams;
                        }
                    } catch (e) {}
                }
            } catch (e) {}
        }
    } catch (e) {}
    return null;
}

async function resolveTmdbInfo(id, mediaType) {
    try {
        var cleanId = String(id || '').trim();
        if (cleanId.includes(':')) cleanId = cleanId.split(':')[0];

        var numericId = null;
        var title = '';
        var origTitle = '';
        var seasons = [];

        // 1. Check known Turkish series dictionary for zero-network instantaneous matching
        if (KNOWN_SERIES[cleanId]) {
            title = KNOWN_SERIES[cleanId].title;
            origTitle = KNOWN_SERIES[cleanId].title;
            if (KNOWN_SERIES[cleanId].tmdb) numericId = KNOWN_SERIES[cleanId].tmdb;
        }

        var isTv = (mediaType === 'tv' || mediaType === 'series' || mediaType === 'show' || String(id || '').includes(':'));
        var apiKey = getValidTmdbKey();

        if (cleanId.startsWith('tt')) {
            try {
                var findRes = await safeFetch('https://api.themoviedb.org/3/find/' + cleanId + '?api_key=' + apiKey + '&external_source=imdb_id');
                if (findRes.ok) {
                    var fData = await findRes.json();
                    var item = (mediaType === 'movie')
                        ? (fData.movie_results && fData.movie_results[0])
                        : (fData.tv_results && fData.tv_results[0]);
                    if (item) {
                        numericId = item.id;
                        title = item.name || item.title || title;
                        origTitle = item.original_name || item.original_title || origTitle;
                    }
                }
            } catch (e) {}
        } else {
            numericId = numericId || cleanId;
        }

        if (numericId && (!title || !origTitle || seasons.length === 0)) {
            try {
                var type = (mediaType === 'movie') ? 'movie' : 'tv';
                var tRes = await safeFetch('https://api.themoviedb.org/3/' + type + '/' + numericId + '?api_key=' + apiKey + '&language=tr-TR');
                if (tRes.ok) {
                    var tData = await tRes.json();
                    title = tData.name || tData.title || title;
                    origTitle = tData.original_name || tData.original_title || origTitle;
                    seasons = tData.seasons || [];
                }
            } catch (e) {}
        }

        return { title: title, origTitle: origTitle, numericId: numericId, seasons: seasons };
    } catch (e) {
        var fallbackTitle = (KNOWN_SERIES[String(id || '').trim()] && KNOWN_SERIES[String(id || '').trim()].title) || '';
        return { title: fallbackTitle, origTitle: fallbackTitle, numericId: id, seasons: [] };
    }
}

async function searchTvDiziler(query) {
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
        if (!res.ok) {
            res = await safeFetch(searchUrl, {
                method: 'GET',
                headers: {
                    'User-Agent': HEADERS['User-Agent'],
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json, text/javascript, */*; q=0.01',
                    'Referer': BASE_URL + '/'
                }
            });
        }
        if (!res.ok) return [];
        var json = await res.json();
        if (!json || !json.data) return [];

        var items = [];
        var cardRegex = /<a[^>]+href=["'](?:https:\/\/tvdiziler\.tv\/)?(dizi\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
        var m;
        while ((m = cardRegex.exec(json.data)) !== null) {
            var slug = m[1];
            var inner = m[2];
            var titleMatch = inner.match(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/i);
            var title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : '';
            var imgMatch = inner.match(/(?:data-src|src)=["']([^"']+)["']/i);
            var poster = imgMatch ? (imgMatch[1].startsWith('http') ? imgMatch[1] : BASE_URL + '/' + imgMatch[1].replace(/^\/+/, '')) : '';
            if (slug && title) {
                items.push({ slug: slug, title: title, poster: poster });
            }
        }
        return items;
    } catch (e) {
        return [];
    }
}

async function getCatalog(args) {
    try {
        var query = (args && args.search) || (args && args.extra && args.extra.search) || (args && args.query) || '';
        if (query) {
            var results = await searchTvDiziler(query);
            var metas = results.map(function (r) {
                return {
                    id: 'tvdiziler:show:' + r.slug,
                    type: 'tv',
                    name: r.title,
                    poster: r.poster || 'https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png',
                    background: r.poster || 'https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png',
                    genres: ['Yerli Dizi', 'TvDiziler'],
                    description: r.title + ' - TvDiziler'
                };
            });
            return { metas: metas };
        }

        var res = await safeFetch(BASE_URL + '/dizi-izle', { headers: HEADERS });
        if (!res.ok) return { metas: [] };
        var html = await res.text();
        var cardRegex = /<a[^>]+href=["'](?:https:\/\/tvdiziler\.tv\/)?(dizi\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
        var metas = [];
        var seen = new Set();
        var m;
        while ((m = cardRegex.exec(html)) !== null) {
            var slug = m[1];
            if (!slug || seen.has(slug)) continue;
            seen.add(slug);
            var inner = m[2];
            var titleMatch = inner.match(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/i);
            var title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : '';
            if (!title) continue;
            var imgMatch = inner.match(/(?:data-src|src)=["']([^"']+)["']/i);
            var poster = imgMatch ? (imgMatch[1].startsWith('http') ? imgMatch[1] : BASE_URL + '/' + imgMatch[1].replace(/^\/+/, '')) : 'https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png';
            metas.push({
                id: 'tvdiziler:show:' + slug,
                type: 'tv',
                name: title,
                poster: poster,
                background: poster,
                genres: ['Yerli Dizi', 'TvDiziler'],
                description: title + ' - TvDiziler'
            });
            if (metas.length >= 50) break;
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

        if (rawId.startsWith('tvdiziler:ep:')) {
            var epSlug = rawId.replace('tvdiziler:ep:', '');
            var epUrl = BASE_URL + '/' + epSlug.replace(/^\/+/, '');
            var res = await safeFetch(epUrl, { headers: HEADERS });
            if (!res.ok) return { meta: null };
            var html = await res.text();

            var titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<title>([^<]+)<\/title>/i);
            var title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : 'TvDiziler Bölüm';
            var ogImg = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
            var poster = ogImg ? ogImg[1] : 'https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png';

            var numMatch = title.match(/(\d+)\s*\.?\s*bölüm/i) || epSlug.match(/-(\d+)-bolum/i);
            var epNum = numMatch ? parseInt(numMatch[1]) : 1;

            return {
                meta: {
                    id: rawId,
                    type: 'tv',
                    name: title,
                    poster: poster,
                    background: poster,
                    description: title + ' - TvDiziler',
                    genres: ['Yerli Dizi', 'TvDiziler'],
                    videos: [{
                        id: rawId,
                        title: title,
                        season: 1,
                        episode: epNum
                    }]
                }
            };
        }

        if (rawId.startsWith('tvdiziler:show:')) {
            var showSlug = rawId.replace('tvdiziler:show:', '');
            var showUrl = BASE_URL + '/' + showSlug.replace(/^\/+/, '');
            var res = await safeFetch(showUrl, { headers: HEADERS });
            if (!res.ok) return { meta: null };
            var html = await res.text();

            var titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<title>([^<]+)<\/title>/i);
            var rawTitle = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : 'TvDiziler';
            var title = rawTitle.replace(/\s*\(?\d{4}\)?\s*$/i, '').trim() || rawTitle;

            var ogImg = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
            var poster = ogImg ? ogImg[1] : 'https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png';

            var ogDesc = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
                           html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
            var description = ogDesc ? ogDesc[1] : (title + ' - TvDiziler Arşivi');

            var epRegex = /<a data-navigo class="truncate" href="([^"]+)">Bölüm <data[^>]*>([^<]+)<\/data><\/a>\s*<h6[^>]*>\s*<a[^>]*itemprop="name">([^<]+)<\/a>/gi;
            var videos = [];
            var seen = new Set();
            var em;

            while ((em = epRegex.exec(html)) !== null) {
                var href = em[1];
                if (seen.has(href)) continue;
                seen.add(href);

                var epNum = parseInt(em[2]) || 0;
                var epTitle = em[3].trim();

                var sMatch = epTitle.match(/(\d+)\s*\.?\s*sezon\s*(\d+)\s*\.?\s*bölüm/i);
                var season = 1;
                var episode = epNum;
                if (sMatch) {
                    season = parseInt(sMatch[1]);
                    episode = parseInt(sMatch[2]);
                }

                videos.push({
                    id: 'tvdiziler:ep:' + href,
                    title: epTitle || (epNum + '. Bölüm'),
                    season: season,
                    episode: episode
                });
            }

            if (videos.length === 0) {
                var fbRegex = /<a[^>]+href=["'](?:https:\/\/tvdiziler\.tv\/)?([a-zA-Z0-9_-]*bolum[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
                var fbm;
                while ((fbm = fbRegex.exec(html)) !== null) {
                    var href = fbm[1];
                    if (seen.has(href)) continue;
                    seen.add(href);
                    var epText = fbm[2].replace(/<[^>]+>/g, '').trim();
                    var numMatch = epText.match(/(\d+)\s*\.?\s*bölüm/i) || href.match(/-(\d+)-bolum/i);
                    var epNum = numMatch ? parseInt(numMatch[1]) : 1;
                    videos.push({
                        id: 'tvdiziler:ep:' + href,
                        title: epText || (epNum + '. Bölüm'),
                        season: 1,
                        episode: epNum
                    });
                }
            }

            videos.sort(function (a, b) { return (a.season - b.season) || (a.episode - b.episode); });

            return {
                meta: {
                    id: rawId,
                    type: 'tv',
                    name: title,
                    poster: poster,
                    background: poster,
                    description: description,
                    genres: ['Yerli Dizi', 'TvDiziler'],
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
        var streams = [];
        var seenUrls = new Set();

        // 1. data-hhs and data-hs elements (JWPlayer ply endpoints, YouTube, and multi-parts)
        var btnRegex = /<[a-zA-Z0-9]+[^>]+(?:data-hhs|data-hs)=["']([^"']+)["'][^>]*>([\s\S]*?)<\/[a-zA-Z0-9]+>/gi;
        var bm;
        while ((bm = btnRegex.exec(html)) !== null) {
            var rawHhs = bm[1];
            var label = bm[2].replace(/<[^>]+>/g, '').trim() || 'Tek Parça';
            var parts = rawHhs.split(',').map(function (s) { return s.trim(); }).filter(Boolean);

            for (var item of parts) {
                // Case A: /vid/ply/
                if (item.startsWith('/vid/ply/') || item.includes('/vid/ply/')) {
                    var plyUrl = item.startsWith('http') ? item : (BASE_URL + (item.startsWith('/') ? '' : '/') + item);
                    try {
                        var plyRes = await safeFetch(plyUrl, {
                            headers: Object.assign({}, HEADERS, { Referer: epUrl })
                        });
                        if (plyRes.ok) {
                            var plyHtml = await plyRes.text();
                            var srcMatch = plyHtml.match(/sources\s*:\s*\[\s*\{[^}]*file\s*:\s*["']([^"']+)["']/i) ||
                                             plyHtml.match(/file\s*:\s*["']([^"']+)["']/i);
                            if (srcMatch) {
                                var streamUrl = srcMatch[1].replace(/\\\/|\//g, function (m) { return m === '\\/' ? '/' : m; }).replace(/\\\//g, '/');
                                if (!seenUrls.has(streamUrl)) {
                                    seenUrls.add(streamUrl);
                                    var isHls = streamUrl.includes('.m3u8');
                                    var quality = '1080p';
                                    if (streamUrl.includes('720') || streamUrl.includes('1280x720')) quality = '720p';
                                    else if (streamUrl.includes('480')) quality = '480p';
                                    else if (streamUrl.includes('360')) quality = '360p';

                                    var streamHeaders = {
                                        'User-Agent': HEADERS['User-Agent']
                                    };
                                    if (streamUrl.includes('twimg.com')) {
                                        streamHeaders['Referer'] = 'https://twitter.com/';
                                        streamHeaders['Origin'] = 'https://twitter.com';
                                    } else if (streamUrl.includes('ciner.com.tr')) {
                                        streamHeaders['Referer'] = 'https://www.ciner.com.tr/';
                                    } else {
                                        streamHeaders['Referer'] = BASE_URL + '/';
                                    }

                                    streams.push({
                                        name: 'TvDiziler',
                                        title: '⌜ TvDiziler ⌟ | ' + label + ' (' + (isHls ? 'HLS' : 'MP4') + ' ' + quality + ')',
                                        url: streamUrl,
                                        quality: quality,
                                        format: isHls ? 'hls' : 'mp4',
                                        isHls: isHls,
                                        provider: 'tvdiziler',
                                        headers: streamHeaders,
                                        behaviorHints: {
                                            notWebReady: true,
                                            proxyHeaders: {
                                                request: streamHeaders
                                            }
                                        }
                                    });
                                }
                            }
                        }
                    } catch (e) {}
                }

                // Case B: YouTube
                var ytMatch = item.match(/(?:git\.php\?id=|v=|youtu\.be\/|\/embed\/)([a-zA-Z0-9_-]{11})/);
                if (ytMatch) {
                    var ytId = ytMatch[1];
                    if (!seenUrls.has(ytId)) {
                        seenUrls.add(ytId);

                        var ytStream = await resolveYouTubeMp4(ytId);
                        if (ytStream && ytStream.url) {
                            var isHls = !!ytStream.isHls;
                            var fmt = ytStream.format || (isHls ? 'hls' : 'mp4');
                            var qualLabel = isHls ? ('HLS ' + ytStream.quality) : ('MP4 ' + ytStream.quality);
                            streams.push({
                                name: 'TvDiziler',
                                title: '⌜ TvDiziler ⌟ | ' + (label || 'YouTube') + ' (' + qualLabel + ')',
                                url: ytStream.url,
                                quality: ytStream.quality,
                                format: fmt,
                                isHls: isHls,
                                provider: 'tvdiziler',
                                headers: ytStream.headers,
                                behaviorHints: {
                                    notWebReady: true,
                                    proxyHeaders: {
                                        request: ytStream.headers
                                    }
                                }
                            });
                        }

                        // Native Stremio / Nuvio YouTube player fallback
                        streams.push({
                            name: 'TvDiziler',
                            title: '⌜ TvDiziler ⌟ | YouTube (' + (label || 'Resmi') + ')',
                            ytId: ytId,
                            provider: 'tvdiziler'
                        });
                    }
                }
            }
        }

        // 2. Direct iframes in page
        var ifrRegex = /<iframe[^>]+src=["']([^"']+)["']/gi;
        var im;
        while ((im = ifrRegex.exec(html)) !== null) {
            var src = im[1];
            if (src.startsWith('//')) src = 'https:' + src;
            var ytMatch = src.match(/(?:embed\/|v=)([a-zA-Z0-9_-]{11})/);
            if (ytMatch && !seenUrls.has(ytMatch[1])) {
                var ifrYtId = ytMatch[1];
                seenUrls.add(ifrYtId);

                var ifrYtStream = await resolveYouTubeMp4(ifrYtId);
                if (ifrYtStream && ifrYtStream.url) {
                    var ifrIsHls = !!ifrYtStream.isHls;
                    var ifrFmt = ifrYtStream.format || (ifrIsHls ? 'hls' : 'mp4');
                    var ifrQualLabel = ifrIsHls ? ('HLS ' + ifrYtStream.quality) : ('MP4 ' + ifrYtStream.quality);
                    streams.push({
                        name: 'TvDiziler',
                        title: '⌜ TvDiziler ⌟ | YouTube (' + ifrQualLabel + ')',
                        url: ifrYtStream.url,
                        quality: ifrYtStream.quality,
                        format: ifrFmt,
                        isHls: ifrIsHls,
                        provider: 'tvdiziler',
                        headers: ifrYtStream.headers,
                        behaviorHints: {
                            notWebReady: true,
                            proxyHeaders: {
                                request: ifrYtStream.headers
                            }
                        }
                    });
                }

                streams.push({
                    name: 'TvDiziler',
                    title: '⌜ TvDiziler ⌟ | YouTube (Resmi)',
                    ytId: ifrYtId,
                    provider: 'tvdiziler'
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
        if (typeof tmdbIdOrArgs === 'object' && tmdbIdOrArgs && tmdbIdOrArgs.id) {
            return getStreams(tmdbIdOrArgs.id, mediaType || tmdbIdOrArgs.type, seasonNum || tmdbIdOrArgs.season, episodeNum || tmdbIdOrArgs.episode);
        }

        if (typeof tmdbIdOrArgs === 'string' && tmdbIdOrArgs.startsWith('tvdiziler:ep:')) {
            var epSlug = tmdbIdOrArgs.replace('tvdiziler:ep:', '');
            var epUrl = BASE_URL + '/' + epSlug.replace(/^\/+/, '');
            return await extractStreamsFromEpisodePage(epUrl);
        }

        var id = tmdbIdOrArgs;
        var season = parseInt(seasonNum) || 1;
        var episode = parseInt(episodeNum) || 1;

        if (typeof id === 'string' && id.includes(':')) {
            var parts = id.split(':');
            id = parts[0];
            if (parts.length >= 3) {
                season = parseInt(parts[1]) || season;
                episode = parseInt(parts[2]) || episode;
            }
        }

        var info = await resolveTmdbInfo(id, mediaType);
        var searchTitles = [info.title, info.origTitle].filter(Boolean);
        if (searchTitles.length === 0) return [];

        // Compute cumulative episode count for series with multiple seasons
        var cumEpisode = episode;
        if (season > 1 && Array.isArray(info.seasons) && info.seasons.length > 0) {
            var sum = 0;
            for (var s = 1; s < season; s++) {
                var sObj = info.seasons.find(function (x) { return x.season_number === s; });
                if (sObj && sObj.episode_count) {
                    sum += sObj.episode_count;
                }
            }
            if (sum > 0) {
                cumEpisode = sum + episode;
            }
        }

        for (var title of searchTitles) {
            var cleanQuery = title.replace(/\s*\(\d{4}\).*$/, '').trim();
            var results = await searchTvDiziler(cleanQuery);
            if (results.length === 0) continue;

            var cleanTarget = ultraClean(cleanQuery);
            var matchedShow = null;

            // 1. Exact clean match
            for (var r of results) {
                var rClean = ultraClean(r.title);
                if (rClean === cleanTarget) {
                    matchedShow = r;
                    break;
                }
            }

            // 2. Contains match
            if (!matchedShow) {
                for (var r of results) {
                    var rClean = ultraClean(r.title);
                    if (rClean.includes(cleanTarget) || cleanTarget.includes(rClean)) {
                        matchedShow = r;
                        break;
                    }
                }
            }

            // 3. Fallback to first result
            if (!matchedShow && results.length > 0) {
                matchedShow = results[0];
            }

            if (!matchedShow || !matchedShow.slug) continue;

            var showUrl = BASE_URL + '/' + matchedShow.slug.replace(/^\/+/, '');
            var sRes = await safeFetch(showUrl, { headers: HEADERS });
            if (!sRes.ok) continue;
            var sHtml = await sRes.text();

            var epRegex = /<a data-navigo class="truncate" href="([^"]+)">Bölüm <data[^>]*>([^<]+)<\/data><\/a>\s*<h6[^>]*>\s*<a[^>]*itemprop="name">([^<]+)<\/a>/gi;
            var episodes = [];
            var em;
            while ((em = epRegex.exec(sHtml)) !== null) {
                episodes.push({
                    href: em[1],
                    epNum: parseInt(em[2]) || 0,
                    title: em[3].trim()
                });
            }

            if (episodes.length === 0) {
                var fbRegex = /<a[^>]+href=["'](?:https:\/\/tvdiziler\.tv\/)?([a-zA-Z0-9_-]*bolum[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
                var fbm;
                var seen = new Set();
                while ((fbm = fbRegex.exec(sHtml)) !== null) {
                    var href = fbm[1];
                    if (seen.has(href)) continue;
                    seen.add(href);
                    var epText = fbm[2].replace(/<[^>]+>/g, '').trim();
                    var numMatch = epText.match(/(\d+)\s*\.?\s*bölüm/i) || href.match(/-(\d+)-bolum/i);
                    episodes.push({
                        href: href,
                        epNum: numMatch ? parseInt(numMatch[1]) : 0,
                        title: epText
                    });
                }
            }

            if (episodes.length === 0) continue;

            var targetEp = null;

            // Strategy 1: Explicit Season + Episode in title (e.g. "4.Sezon 15.Bölüm")
            var seasonEpRegex = new RegExp('(?:^|\\D)' + season + '\\s*\\.?\\s*sezon\\s*' + episode + '\\s*\\.?\\s*bölüm', 'i');
            for (var ep of episodes) {
                if (seasonEpRegex.test(ep.title) || seasonEpRegex.test(ep.href)) {
                    targetEp = ep;
                    break;
                }
            }

            // Strategy 2: Cumulative episode number match (e.g. S2E1 -> Ep 30)
            if (!targetEp && cumEpisode) {
                for (var ep of episodes) {
                    if (ep.epNum === cumEpisode) {
                        targetEp = ep;
                        break;
                    }
                    var epCumSlug = new RegExp('-' + cumEpisode + '-bolum', 'i');
                    if (epCumSlug.test(ep.href)) {
                        targetEp = ep;
                        break;
                    }
                }
            }

            // Strategy 3: Raw episode number match (e.g. Ep 1)
            if (!targetEp) {
                for (var ep of episodes) {
                    if (ep.epNum === episode) {
                        targetEp = ep;
                        break;
                    }
                    var epSlug = new RegExp('-' + episode + '-bolum', 'i');
                    if (epSlug.test(ep.href)) {
                        targetEp = ep;
                        break;
                    }
                }
            }

            if (targetEp) {
                var epUrl = BASE_URL + '/' + targetEp.href.replace(/^\/+/, '');
                var streams = await extractStreamsFromEpisodePage(epUrl);
                if (streams.length > 0) return streams;
            }
        }

        // Fallback: If no streams found from TvDiziler (e.g. video removed due to DMCA/telif like Son Yaz), search official YouTube full episode
        if (searchTitles.length > 0) {
            var mainTitle = searchTitles[0];
            var ytStreams = await resolveOfficialYouTubeFallback(mainTitle, season, episode, cumEpisode);
            if (ytStreams && ytStreams.length > 0) {
                return ytStreams;
            }
        }

        return [];
    } catch (e) {
        return [];
    }
}

// ── Universal Quality Sorter ──────────────────────────────────────────
if (typeof getStreams === 'function') {
    var _origGetStreams = getStreams;
    getStreams = async function () {
        var res = await _origGetStreams.apply(this, arguments);
        return sortStreamsByQuality(res);
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = wrapAll({ getStreams: getStreams, getMeta: getMeta, getCatalog: getCatalog }, cfgReady);
}
if (typeof globalThis !== 'undefined') {
    globalThis.getStreams = getStreams;
    globalThis.getMeta = getMeta;
    globalThis.getCatalog = getCatalog;
}
