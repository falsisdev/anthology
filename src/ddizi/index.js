const { sortStreamsByQuality } = require("../shared/quality.js");
const { loadConfig, val, wrapAll } = require("../shared/config.js");
const { timeoutSignal } = require("../shared/http.js");

var _cfgReady = null;
function cfgReady() {
    if (!_cfgReady) {
        _cfgReady = loadConfig().then(function () {
            var v;
            v = val('urls.series.ddizi.base'); if (v) BASE_URL = String(v).replace(/\/+$/, '');
            if (HEADERS) HEADERS.Referer = BASE_URL + '/';
        });
    }
    return _cfgReady;
}

/**
 * Anthology - DDizi Provider
 * Yerli dizi arşivi, güncel bölümler kataloğu ve doğrudan Ciner/Yandex CDN MP4/HLS ve resmi yayın akışları.
 */

var BASE_URL = 'https://www.ddizi.im';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/'
};

async function resolveYouTubeMp4(ytId) {
    try {
        const key = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';
        const res = await fetch(`https://www.youtube.com/youtubei/v1/player?key=${key}`, {
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
            }),
            signal: timeoutSignal(3500)
        });

        if (res.ok) {
            const data = await res.json();
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
                    const formats = data.streamingData.formats.filter(f => f.url && (f.mimeType || '').includes('mp4'));
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

function getValidTmdbKey() {
    if (typeof TMDB_API_KEY === 'string' && TMDB_API_KEY.length === 32 && !TMDB_API_KEY.startsWith('http')) {
        return TMDB_API_KEY;
    }
    return '500330721680edb6d5f7f12ba7cd9023';
}

const KNOWN_SERIES = {
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
        const queries = [];
        if (season > 1) {
            queries.push(`${title} ${season}. Sezon ${episode}. Bölüm`);
            if (cumEpisode && cumEpisode !== episode) {
                queries.push(`${title} ${cumEpisode}. Bölüm`);
            }
        }
        queries.push(`${title} ${episode}. Bölüm`);

        const key = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';
        for (const query of queries) {
            try {
                const res = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, {
                    headers: {
                        'User-Agent': HEADERS['User-Agent']
                    },
                    signal: timeoutSignal(3500)
                });
                if (!res.ok) continue;
                const html = await res.text();
                const vidMatches = [...html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)].map(m => m[1]);
                const uniqueVids = [...new Set(vidMatches)].slice(0, 3);

                for (const ytId of uniqueVids) {
                    try {
                        const pRes = await fetch(`https://www.youtube.com/youtubei/v1/player?key=${key}`, {
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
                        const data = await pRes.json();
                        const duration = parseInt((data.videoDetails && data.videoDetails.lengthSeconds) || '0');
                        const vTitle = (data.videoDetails && data.videoDetails.title) || '';

                        // Duration must be at least 15 minutes (900 seconds) for a full episode
                        if (duration >= 900) {
                            const streams = [];
                            if (data.streamingData && data.streamingData.hlsManifestUrl) {
                                streams.push({
                                    name: 'DDizi',
                                    title: `⌜ DDizi ⌟ | Resmi YouTube HLS (${vTitle.slice(0, 50)})`,
                                    url: data.streamingData.hlsManifestUrl,
                                    quality: '1080p',
                                    provider: 'ddizi',
                                    format: 'hls',
                                    isHls: true,
                                    headers: {
                                        'User-Agent': 'com.google.android.youtube/20.10.38 (Linux; U; Android 11) gzip'
                                    }
                                });
                            }
                            if (data.streamingData && data.streamingData.formats) {
                                const formats = data.streamingData.formats.filter(f => f.url && (f.mimeType || '').includes('mp4'));
                                if (formats.length > 0) {
                                    streams.push({
                                        name: 'DDizi',
                                        title: `⌜ DDizi ⌟ | Resmi YouTube MP4 (${formats[0].qualityLabel || '720p'})`,
                                        url: formats[0].url,
                                        quality: formats[0].qualityLabel || '720p',
                                        provider: 'ddizi',
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
                                name: 'DDizi',
                                title: `⌜ DDizi ⌟ | YouTube (${vTitle.slice(0, 50)})`,
                                ytId: ytId,
                                provider: 'ddizi'
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
        let cleanId = String(id || '').trim();
        if (cleanId.includes(':')) cleanId = cleanId.split(':')[0];

        let numericId = null;
        let title = '';
        let origTitle = '';
        let seasons = [];

        // 1. Check known Turkish series dictionary for zero-network instantaneous matching
        if (KNOWN_SERIES[cleanId]) {
            title = KNOWN_SERIES[cleanId].title;
            origTitle = KNOWN_SERIES[cleanId].title;
            if (KNOWN_SERIES[cleanId].tmdb) numericId = KNOWN_SERIES[cleanId].tmdb;
        }

        const isTv = (mediaType === 'tv' || mediaType === 'series' || mediaType === 'show' || String(id || '').includes(':'));
        const apiKey = getValidTmdbKey();

        if (cleanId.startsWith('tt')) {
            try {
                const findRes = await fetch(`https://api.themoviedb.org/3/find/${cleanId}?api_key=${apiKey}&external_source=imdb_id`);
                if (findRes.ok) {
                    const fData = await findRes.json();
                    const item = isTv
                        ? (fData.tv_results && fData.tv_results[0])
                        : (fData.movie_results && fData.movie_results[0]);
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
                const type = isTv ? 'tv' : 'movie';
                const tRes = await fetch(`https://api.themoviedb.org/3/${type}/${numericId}?api_key=${apiKey}&language=tr-TR`);
                if (tRes.ok) {
                    const tData = await tRes.json();
                    title = tData.name || tData.title || title;
                    origTitle = tData.original_name || tData.original_title || origTitle;
                    seasons = tData.seasons || [];
                }
            } catch (e) {}
        }

        return { title, origTitle, numericId, seasons };
    } catch (e) {
        const fallbackTitle = (KNOWN_SERIES[String(id || '').trim()] && KNOWN_SERIES[String(id || '').trim()].title) || '';
        return { title: fallbackTitle, origTitle: fallbackTitle, numericId: id, seasons: [] };
    }
}

async function getCatalog(args) {
    try {
        const query = (args && args.search) || (args && args.extra && args.extra.search) || (args && args.query) || '';
        let url = `${BASE_URL}/`;
        let options = { headers: HEADERS };

        if (query) {
            const form = new URLSearchParams();
            form.append('arama', query);
            url = `${BASE_URL}/arama/`;
            options = {
                method: 'POST',
                headers: Object.assign({}, HEADERS, { 'Content-Type': 'application/x-www-form-urlencoded' }),
                body: form.toString()
            };
        }

        const res = await fetch(url, options);
        if (!res.ok) return { metas: [] };
        const html = await res.text();

        let metas = [];
        const seen = new Set();

        const seriesMatches = [...html.matchAll(/<a href="([^"]*\/diziler\/([^"]*))"[^>]*>([\s\S]*?)<\/a>/gi)];
        for (const m of seriesMatches) {
            const slug = m[2].replace(/\/$/, '');
            const title = m[3].replace(/<[^>]+>/g, '').trim();
            if (!slug || seen.has(slug) || title.length < 2) continue;
            seen.add(slug);

            metas.push({
                id: `ddizi:show:${slug}`,
                type: 'tv',
                name: title,
                poster: 'https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png',
                background: 'https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png',
                genres: ['Yerli Dizi', 'DDizi'],
                description: `${title} - DDizi Yerli Dizi Arşivi`
            });
        }

        if (query) {
            const cleanQuery = ultraClean(query);
            const filtered = metas.filter(m => ultraClean(m.name).includes(cleanQuery) || ultraClean(m.id).includes(cleanQuery));
            if (filtered.length > 0) {
                metas = filtered;
            }
        }

        // Fetch posters for first 15 shows in parallel
        const topShows = metas.slice(0, 15);
        await Promise.all(topShows.map(async s => {
            try {
                const sSlug = s.id.replace('ddizi:show:', '');
                const sRes = await fetch(`${BASE_URL}/diziler/${sSlug}`, { headers: HEADERS });
                if (sRes.ok) {
                    const sHtml = await sRes.text();
                    const pMatch = sHtml.match(/class="[^"]*(?:dizi-resmi|img-back-cat)[^"]*"[\s\S]*?(?:data-src|src)="([^"]*)"/i);
                    if (pMatch) {
                        const pUrl = pMatch[1].startsWith('http') ? pMatch[1] : `${BASE_URL}${pMatch[1]}`;
                        s.poster = pUrl;
                        s.background = pUrl;
                    }
                }
            } catch (e) {}
        }));

        return { metas };
    } catch (e) {
        return { metas: [] };
    }
}

async function getMeta(args) {
    try {
        const rawId = (typeof args === 'string') ? args : (args && args.id ? args.id : '');
        if (!rawId) return { meta: null };

        if (rawId.startsWith('ddizi:ep:')) {
            const epSlug = rawId.replace('ddizi:ep:', '');
            const epUrl = `${BASE_URL}/izle/${epSlug}`;
            const res = await fetch(epUrl, { headers: HEADERS });
            if (!res.ok) return { meta: null };
            const html = await res.text();

            const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<title>([^<]+)<\/title>/i);
            const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').replace(/\s*izle\s*$/i, '').trim() : 'DDizi Bölüm';

            const posterMatch = html.match(/class="[^"]*(?:dizi-resmi|img-back-cat)[^"]*"[\s\S]*?(?:data-src|src)="([^"]*)"/i);
            const poster = posterMatch ? (posterMatch[1].startsWith('http') ? posterMatch[1] : `${BASE_URL}${posterMatch[1]}`) : 'https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png';

            const epNumMatch = title.match(/(\d+)\s*\.?\s*bölüm/i);
            const epNum = epNumMatch ? parseInt(epNumMatch[1]) : 1;

            return {
                meta: {
                    id: rawId,
                    type: 'tv',
                    name: title,
                    poster,
                    background: poster,
                    description: `${title} - DDizi`,
                    genres: ['Yerli Dizi', 'DDizi'],
                    videos: [{
                        id: rawId,
                        title,
                        season: 1,
                        episode: epNum
                    }]
                }
            };
        }

        if (rawId.startsWith('ddizi:show:')) {
            const showSlug = rawId.replace('ddizi:show:', '');
            const showUrl = `${BASE_URL}/diziler/${showSlug}`;
            const res = await fetch(showUrl, { headers: HEADERS });
            if (!res.ok) return { meta: null };
            const html = await res.text();

            const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<title>([^<]+)<\/title>/i);
            const rawTitle = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').replace(/\s*son\s*bölüm\s*izle.*$/i, '').replace(/\s*\|.*$/i, '').trim() : 'DDizi';
            const title = rawTitle.replace(/\s*Full\s*.*$/i, '').trim() || rawTitle;

            const posterMatch = html.match(/class="[^"]*(?:dizi-resmi|img-back-cat)[^"]*"[\s\S]*?(?:data-src|src)="([^"]*)"/i);
            const poster = posterMatch ? (posterMatch[1].startsWith('http') ? posterMatch[1] : `${BASE_URL}${posterMatch[1]}`) : 'https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png';

            const pageLinks = [...html.matchAll(/href="([^"]*sayfa-\d+)"/g)];
            const pagesToFetch = [];
            for (const p of pageLinks) {
                const pUrl = p[1].startsWith('http') ? p[1] : `${BASE_URL}${p[1].startsWith('/') ? '' : '/'}${p[1]}`;
                if (!pagesToFetch.includes(pUrl) && pUrl !== showUrl) {
                    pagesToFetch.push(pUrl);
                }
            }

            let allHtmls = [html];
            for (const pUrl of pagesToFetch) {
                try {
                    const pRes = await fetch(pUrl, { headers: HEADERS });
                    if (pRes.ok) allHtmls.push(await pRes.text());
                } catch (e) {}
            }

            const epMatches = [];
            for (const phtml of allHtmls) {
                epMatches.push(...phtml.matchAll(/<a href="([^"]*\/izle\/([^"]*))"[^>]*>([\s\S]*?)<\/a>/gi));
            }

            const videos = [];
            const seen = new Set();

            const slugPart = (showSlug.split('/')[1] || showSlug).replace(/-\d+-son-bolum.*$/i, '').replace(/-izle.*$/i, '');
            const baseSlugKey = ultraClean(slugPart);
            const titleKey = ultraClean(title);

            for (const ep of epMatches) {
                const epSlug = ep[2];
                if (!epSlug || seen.has(epSlug)) continue;

                const epTitle = ep[3].replace(/<[^>]+>/g, '').trim();
                const epClean = ultraClean(epSlug + ' ' + epTitle);

                // Ensure episode belongs to this show
                if (baseSlugKey && !epClean.includes(baseSlugKey) && titleKey && !epClean.includes(titleKey)) {
                    continue;
                }

                seen.add(epSlug);

                const epNumMatch = epTitle.match(/(\d+)\s*\.?\s*bölüm/i) || epSlug.match(/-(\d+)-bolum/i);
                const epNum = epNumMatch ? parseInt(epNumMatch[1]) : 1;

                videos.push({
                    id: `ddizi:ep:${epSlug.replace(/\/$/, '')}`,
                    title: epTitle || `${epNum}. Bölüm`,
                    season: 1,
                    episode: epNum
                });
            }

            videos.sort((a, b) => (a.season - b.season) || (a.episode - b.episode));

            return {
                meta: {
                    id: rawId,
                    type: 'tv',
                    name: title,
                    poster,
                    background: poster,
                    description: `${title} - DDizi Dizi Arşivi`,
                    genres: ['Yerli Dizi', 'DDizi'],
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
        const epRes = await fetch(epUrl, { headers: HEADERS });
        if (!epRes.ok) return [];
        const epHtml = await epRes.text();

        const iframes = [...epHtml.matchAll(/<iframe[^>]+src=["']([^"']+)["']/gi)];
        const streams = [];

        for (const ifr of iframes) {
            let src = ifr[1];
            if (src.startsWith('//')) src = 'https:' + src;
            else if (src.startsWith('/')) src = BASE_URL + src;

            // Type 1: Direct player (Ciner CDN, Yandex, etc.)
            if (src.includes('/player/oynat/')) {
                const pRes = await fetch(src, { headers: { ...HEADERS, Referer: epUrl } });
                if (!pRes.ok) continue;
                const pHtml = await pRes.text();

                const videoMatches = [
                    ...[...pHtml.matchAll(/https?:\/\/[^\s"'<>\\]+\.(?:mp4|m3u8)[^\s"'<>\\]*/gi)].map(m => m[0]),
                    ...[...pHtml.matchAll(/file\s*:\s*["'](https?:\\\/\\\/[^"']+|https?:[^"']+)["']/gi)].map(m => m[1].replace(/\\\//g, '/'))
                ];
                const seenStreamUrls = new Set();
                for (const rawVUrl of videoMatches) {
                    const vUrl = rawVUrl.trim();
                    if (!vUrl || seenStreamUrls.has(vUrl)) continue;
                    seenStreamUrls.add(vUrl);
                    if (vUrl.includes('preview/') || vUrl.includes('image/') || vUrl.includes('.svg') || vUrl.includes('.jpg') || vUrl.includes('.png')) continue;

                    let quality = '1080p';
                    if (vUrl.includes('720') || vUrl.includes('itag=22')) quality = '720p';
                    else if (vUrl.includes('480')) quality = '480p';
                    else if (vUrl.includes('360') || vUrl.includes('itag=18')) quality = '360p';

                    let server = 'CDN';
                    let streamHeaders = { 'User-Agent': HEADERS['User-Agent'] };
                    if (vUrl.includes('googlevideo')) {
                        const durMatch = vUrl.match(/[?&]dur=([0-9.]+)/);
                        if (durMatch && parseFloat(durMatch[1]) < 300) continue;
                        server = 'Google Direct';
                    } else if (vUrl.includes('ciner.com.tr')) {
                        server = 'Ciner CDN';
                        streamHeaders['Referer'] = 'https://www.ciner.com.tr/';
                    } else if (vUrl.includes('yandex')) {
                        server = 'Yandex';
                        streamHeaders['Referer'] = 'https://yadi.sk/';
                    } else if (vUrl.includes('twimg')) {
                        server = 'Fast CDN';
                        streamHeaders['Referer'] = 'https://twitter.com/';
                        streamHeaders['Origin'] = 'https://twitter.com';
                    } else if (vUrl.includes('tabii.com')) {
                        server = 'Tabii CDN';
                        streamHeaders['Referer'] = 'https://www.tabii.com/';
                    } else if (vUrl.includes('akamaized')) {
                        server = 'Akamai';
                        streamHeaders['Referer'] = src;
                    } else {
                        streamHeaders['Referer'] = src;
                    }

                    // Keep master.m3u8 intact for ExoPlayer adaptive sync (prevents 3s chunk freezing)
                    var isMp4 = vUrl.toLowerCase().includes('.mp4');
                    var isHls = !isMp4;
                    streams.push({
                        name: 'DDizi',
                        title: `⌜ DDizi ⌟ | ${server} (${quality}${isMp4 ? ' MP4' : ' HLS'})`,
                        url: vUrl,
                        quality,
                        provider: 'ddizi',
                        headers: streamHeaders,
                        format: isMp4 ? 'mp4' : 'hls',
                        isHls: isHls,
                        behaviorHints: {
                            notWebReady: true,
                            proxyHeaders: {
                                request: streamHeaders
                            }
                        }
                    });
                }
            }

            // Type 2: Dailymotion player
            if (src.includes('daily.php') || src.includes('dailymotion.com')) {
                const dmMatch = src.match(/(?:daily\.php\?id=|video\/)([a-zA-Z0-9]+)/);
                if (dmMatch) {
                    try {
                        const dmRes = await fetch(`https://www.dailymotion.com/player/metadata/video/${dmMatch[1]}`);
                        if (dmRes.ok) {
                            const dmData = await dmRes.json();
                            const autoQual = dmData.qualities && dmData.qualities.auto && dmData.qualities.auto[0];
                            if (autoQual && autoQual.url) {
                                const dmHeaders = {
                                    'User-Agent': HEADERS['User-Agent'],
                                    'Referer': 'https://www.dailymotion.com/'
                                };
streams.push({
                                name: 'DDizi',
                                title: '⌜ DDizi ⌟ | Dailymotion (1080p HLS)',
                                url: autoQual.url,
                                quality: '1080p',
                                provider: 'ddizi',
                                headers: dmHeaders,
                                format: 'hls',
                                isHls: true,
                                behaviorHints: {
                                    notWebReady: true,
                                    proxyHeaders: {
                                        request: dmHeaders
                                    }
                                }
                            });
                            }
                        }
                    } catch (e) {}
                }
            }

            // Type 3: Official YouTube player — extract direct MP4 stream via Innertube / Invidious, or provide native ytId
            if (src.includes('youtube.php') || src.includes('/player/telif/') || src.includes('youtube.com') || src.includes('youtu.be')) {
                const ytMatch = src.match(/(?:youtube\.php\?id=|v=|youtu\.be\/|\/embed\/)([a-zA-Z0-9_-]{11})/);
                if (ytMatch) {
                    const ytId = ytMatch[1];
                    let foundDirectMp4 = false;

                    // 1. Direct Innertube Android MP4 (fast, official, IP-matched)
                    const ytStream = await resolveYouTubeMp4(ytId);
                    if (ytStream && ytStream.url) {
                        foundDirectMp4 = true;
                        const isHls = !!ytStream.isHls;
                        const fmt = ytStream.format || (isHls ? 'hls' : 'mp4');
                        const qualLabel = isHls ? `HLS (${ytStream.quality})` : `MP4 (${ytStream.quality})`;
                        streams.push({
                            name: 'DDizi',
                            title: `⌜ DDizi ⌟ | YouTube ${qualLabel}`,
                            url: ytStream.url,
                            quality: ytStream.quality,
                            provider: 'ddizi',
                            headers: ytStream.headers,
                            format: fmt,
                            isHls: isHls,
                            behaviorHints: {
                                notWebReady: true,
                                proxyHeaders: {
                                    request: ytStream.headers
                                }
                            }
                        });
                    }

                    // 2. Invidious fallback if Innertube did not resolve
                    if (!foundDirectMp4) {
                        const invInstances = [
                            'https://invidious.f5.si',
                            'https://inv.nadeko.net',
                            'https://invidious.nerdvpn.de'
                        ];
                        for (const inst of invInstances) {
                            try {
                                const invRes = await fetch(`${inst}/api/v1/videos/${ytId}?fields=formatStreams,title`, {
                                    headers: { 'User-Agent': HEADERS['User-Agent'] },
                                    signal: timeoutSignal(2500)
                                });
                                if (!invRes.ok) continue;
                                const invData = await invRes.json();
                                const formats = (invData.formatStreams || []).filter(f => f.url && f.container === 'mp4');
                                if (formats.length > 0) {
                                    formats.sort((a, b) => (parseInt(b.quality) || 0) - (parseInt(a.quality) || 0));
                                    for (const fmt of formats.slice(0, 1)) {
                                        const ytHeaders = { 'User-Agent': HEADERS['User-Agent'] };
                                        streams.push({
                                            name: 'DDizi',
                                            title: `⌜ DDizi ⌟ | YouTube MP4 (${fmt.qualityLabel || fmt.quality || 'HD'})`,
                                            url: fmt.url,
                                            quality: fmt.qualityLabel || '720p',
                                            provider: 'ddizi',
                                            headers: ytHeaders,
                                            format: 'mp4',
                                            isHls: false,
                                            behaviorHints: {
                                                notWebReady: true,
                                                proxyHeaders: {
                                                    request: ytHeaders
                                                }
                                            }
                                        });
                                    }
                                    break;
                                }
                            } catch (e) {}
                        }
                    }

                    // 3. Native Stremio / Nuvio YouTube player fallback
                    streams.push({
                        name: 'DDizi',
                        title: '⌜ DDizi ⌟ | YouTube (Resmi Yayın)',
                        ytId: ytId,
                        provider: 'ddizi'
                    });
                }
            }
        }

        // Generic fallback: extract MP4/M3U8 from any iframe
        if (streams.length === 0) {
            for (const ifr of iframes) {
                let src = ifr[1];
                if (src.startsWith('//')) src = 'https:' + src;
                else if (src.startsWith('/')) src = BASE_URL + src;
                if (src.includes('youtube') || src.includes('youtu.be') || src.includes('daily')) continue;
                
                try {
                    const pRes = await fetch(src, { headers: { ...HEADERS, Referer: epUrl } });
                    if (!pRes.ok) continue;
                    const pHtml = await pRes.text();
                    
                    const videoMatches = [...pHtml.matchAll(/https?:\/\/[^\s"'<>\\]+\.(?:mp4|m3u8)[^\s"'<>\\]*/gi)];
                    for (const vm of videoMatches) {
                        const vUrl = vm[0].trim();
                        if (vUrl.includes('preview/') || vUrl.includes('.jpg') || vUrl.includes('.png')) continue;
                        const fallbackHeaders = { 'User-Agent': HEADERS['User-Agent'], 'Referer': src };
                        const isHls = vUrl.includes('.m3u8');
                        streams.push({
                            name: 'DDizi',
                            title: `⌜ DDizi ⌟ | Alternatif Kaynak`,
                            url: vUrl,
                            provider: 'ddizi',
                            headers: fallbackHeaders,
                            format: isHls ? 'hls' : 'mp4',
                            isHls: isHls,
                            behaviorHints: {
                                notWebReady: true,
                                proxyHeaders: {
                                    request: fallbackHeaders
                                }
                            }
                        });
                    }
                } catch (e) {}
            }
        }

        // Sort streams: Direct unbroken MP4s (Ciner, Yandex) first, then 1080p down
        streams.sort((a, b) => {
            const aIsDirectMp4 = (a.url && a.url.includes('.mp4')) ? 1 : 0;
            const bIsDirectMp4 = (b.url && b.url.includes('.mp4')) ? 1 : 0;
            if (bIsDirectMp4 !== aIsDirectMp4) return bIsDirectMp4 - aIsDirectMp4;
            const aQ = parseInt(a.quality) || 0;
            const bQ = parseInt(b.quality) || 0;
            return bQ - aQ;
        });

        return streams;
    } catch (e) {
        return [];
    }
}

async function getStreams(tmdbIdOrArgs, mediaType, seasonNum, episodeNum) {
    try {
        if (typeof tmdbIdOrArgs === 'object' && tmdbIdOrArgs && tmdbIdOrArgs.id) {
            return getStreams(
                tmdbIdOrArgs.id,
                mediaType || tmdbIdOrArgs.type,
                seasonNum || tmdbIdOrArgs.season,
                episodeNum || tmdbIdOrArgs.episode
            );
        }

        if (typeof tmdbIdOrArgs === 'string' && tmdbIdOrArgs.startsWith('ddizi:show:')) {
            const showMeta = await getMeta(tmdbIdOrArgs);
            if (showMeta && showMeta.meta && Array.isArray(showMeta.meta.videos) && showMeta.meta.videos.length > 0) {
                return await getStreams(showMeta.meta.videos[0].id);
            }
        }

        if (typeof tmdbIdOrArgs === 'string' && tmdbIdOrArgs.startsWith('ddizi:ep:')) {
            const slug = tmdbIdOrArgs.replace('ddizi:ep:', '');
            const epUrl = `${BASE_URL}/izle/${slug}`;
            return await extractStreamsFromEpisodePage(epUrl);
        }

        let id = tmdbIdOrArgs;
        let season = parseInt(seasonNum) || 1;
        let episode = parseInt(episodeNum) || 1;

        if (typeof id === 'string' && id.includes(':')) {
            const parts = id.split(':');
            id = parts[0];
            if (parts.length >= 3) {
                season = parseInt(parts[1]) || season;
                episode = parseInt(parts[2]) || episode;
            }
        }

        const info = await resolveTmdbInfo(id, mediaType || 'tv');
        const searchTitles = [info.title, info.origTitle].filter(Boolean);
        if (searchTitles.length === 0) return [];

        let cumEpisode = episode;
        if (season > 1 && Array.isArray(info.seasons) && info.seasons.length > 0) {
            let sum = 0;
            for (let s = 1; s < season; s++) {
                const sObj = info.seasons.find(x => x.season_number === s);
                if (sObj && sObj.episode_count) {
                    sum += sObj.episode_count;
                }
            }
            if (sum > 0) {
                cumEpisode = sum + episode;
            }
        }

        const candidateNums = (cumEpisode !== episode) ? [cumEpisode, episode] : [episode];

        for (const title of searchTitles) {
            const form = new URLSearchParams();
            form.append('arama', title);

            const sRes = await fetch(`${BASE_URL}/arama/`, {
                method: 'POST',
                headers: Object.assign({}, HEADERS, { 'Content-Type': 'application/x-www-form-urlencoded' }),
                body: form.toString()
            });
            if (!sRes.ok) continue;
            const sHtml = await sRes.text();

            const leftMatch = sHtml.match(/class=["']left_sidebar["'][^>]*>([\s\S]*?)class=["']right_sidebar["']/i);
            const contentToSearch = leftMatch ? leftMatch[1] : (sHtml.split(/class=["']right_sidebar["']/i)[0] || sHtml);

            const seriesMatches = [...contentToSearch.matchAll(/<a href="([^"]*\/diziler\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)];
            if (seriesMatches.length === 0) continue;

            const cleanTarget = ultraClean(title);
            let matchedShowHref = null;

            // 1. Exact match on title text (sm[3])
            for (const sm of seriesMatches) {
                const sName = (sm[3] || '').replace(/<[^>]+>/g, '').trim();
                if (ultraClean(sName) === cleanTarget) {
                    matchedShowHref = sm[1];
                    break;
                }
            }

            // 2. Exact match on slug without ID (sm[2])
            if (!matchedShowHref) {
                for (const sm of seriesMatches) {
                    const slugOnly = (sm[2] || '').split('/').pop().replace(/-\d+-son-bolum.*$/i, '').replace(/-izle.*$/i, '');
                    if (ultraClean(slugOnly) === cleanTarget) {
                        matchedShowHref = sm[1];
                        break;
                    }
                }
            }

            // 3. Starts with or contains match
            if (!matchedShowHref) {
                for (const sm of seriesMatches) {
                    const sName = (sm[3] || '').replace(/<[^>]+>/g, '').trim();
                    const sClean = ultraClean(sName);
                    if (sClean.startsWith(cleanTarget) || cleanTarget.startsWith(sClean) || sClean.includes(cleanTarget)) {
                        matchedShowHref = sm[1];
                        break;
                    }
                }
            }

            if (!matchedShowHref) continue;
            if (!matchedShowHref.startsWith('http')) matchedShowHref = `${BASE_URL}${matchedShowHref.startsWith('/') ? '' : '/'}${matchedShowHref}`;

            // Check pages (starting with main page, then sayfa-N if not found)
            const pagesToCheck = [matchedShowHref];
            const showRes = await fetch(matchedShowHref, { headers: HEADERS });
            if (!showRes.ok) continue;
            const showHtml = await showRes.text();

            const pageLinks = [...showHtml.matchAll(/href="([^"]*sayfa-(\d+)[^"]*)"/g)];
            const sortedPages = pageLinks.map(p => {
                let pUrl = p[1];
                if (!pUrl.startsWith('http')) pUrl = `${BASE_URL}${pUrl.startsWith('/') ? '' : '/'}${pUrl}`;
                return { url: pUrl, num: parseInt(p[2]) };
            }).sort((a, b) => b.num - a.num); // Check oldest pages first for early episodes
            for (const sp of sortedPages) {
                if (!pagesToCheck.includes(sp.url)) pagesToCheck.push(sp.url);
            }

            for (const pageUrl of pagesToCheck.slice(0, 30)) {
                const pRes = (pageUrl === matchedShowHref) ? { ok: true, text: () => Promise.resolve(showHtml) } : await fetch(pageUrl, { headers: HEADERS });
                if (!pRes.ok) continue;
                const pHtml = await pRes.text();

                const leftEpMatch = pHtml.match(/class=["']left_sidebar["'][^>]*>([\s\S]*?)class=["']right_sidebar["']/i);
                const pageContent = leftEpMatch ? leftEpMatch[1] : (pHtml.split(/class=["']right_sidebar["']/i)[0] || pHtml);

                const epMatches = [...pageContent.matchAll(/<a href="([^"]*\/izle\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)];
                if (epMatches.length === 0) continue;

                let targetEpUrl = null;

                for (const num of candidateNums) {
                    const epRegex = new RegExp(`(?:^|\\s|\\.|-)${num}\\.?\\s*bölüm`, 'i');
                    const epSlugRegex = new RegExp(`-${num}-bolum`, 'i');

                    for (const ep of epMatches) {
                        const epText = ep[2].replace(/<[^>]+>/g, '').toLowerCase().replace(/\s+/g, ' ');
                        const epLink = ep[1].toLowerCase();
                        if (epRegex.test(epText) || epSlugRegex.test(epLink)) {
                            targetEpUrl = ep[1];
                            break;
                        }
                    }
                    if (targetEpUrl) break;
                }

                // If season > 1, also try explicit season+episode pattern
                if (!targetEpUrl && season > 1) {
                    const seasonRegex = new RegExp(`${season}\\.?\\s*sezon\\s*${episode}\\.?\\s*bölüm`, 'i');
                    const seasonSlugRegex = new RegExp(`(?:sezon-${season}-bolum-${episode}|${season}-sezon-${episode}-bolum)`, 'i');
                    for (const ep of epMatches) {
                        const epText = ep[2].replace(/<[^>]+>/g, '').toLowerCase().replace(/\s+/g, ' ');
                        const epLink = ep[1].toLowerCase();
                        if (seasonRegex.test(epText) || seasonSlugRegex.test(epLink)) {
                            targetEpUrl = ep[1];
                            break;
                        }
                    }
                }

                if (targetEpUrl) {
                    if (!targetEpUrl.startsWith('http')) targetEpUrl = `${BASE_URL}${targetEpUrl.startsWith('/') ? '' : '/'}${targetEpUrl}`;
                    const streams = await extractStreamsFromEpisodePage(targetEpUrl);
                    if (streams.length > 0) return streams;
                }
            }
        }

        // Fallback: If no streams found from DDizi (e.g. video removed due to DMCA/telif like Son Yaz), search official YouTube full episode
        if (searchTitles.length > 0) {
            const mainTitle = searchTitles[0];
            const ytStreams = await resolveOfficialYouTubeFallback(mainTitle, season, episode, cumEpisode);
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
