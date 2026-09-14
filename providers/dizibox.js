/**
 * Anthology - DiziBox Provider
 * Yabancı dizi arşivi, güncel bölümler kataloğu ve Molystream/Sheila üzerinden doğrudan 1080p HLS akışları.
 */

var CONFIG = (typeof require !== 'undefined' ? (function(){ try { return require('./config'); } catch(e) { return require('./urls'); } })() : null) || (typeof globalThis !== 'undefined' ? (globalThis.CONFIG || globalThis.URLS) : null) || {};
var URLS = CONFIG.urls || CONFIG;
var BASE_URL = (URLS.dizibox && URLS.dizibox.base) || 'https://www.dizibox.live';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
    'User-Agent': (CONFIG.headers && CONFIG.headers.desktop_user_agent) || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Cookie': 'LockUser=true; isTrustedUser=true; dbxu=1744054959089',
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

async function resolveTmdbInfo(id, mediaType) {
    try {
        let cleanId = String(id || '').trim();
        if (cleanId.includes(':')) cleanId = cleanId.split(':')[0];

        let numericId = null;
        let title = '';
        let origTitle = '';

        if (cleanId.startsWith('tt')) {
            const findRes = await fetch(`https://api.themoviedb.org/3/find/${cleanId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`);
            if (findRes.ok) {
                const fData = await findRes.json();
                const item = (mediaType === 'tv' || mediaType === 'series')
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
            const type = (mediaType === 'tv' || mediaType === 'series') ? 'tv' : 'movie';
            const tRes = await fetch(`https://api.themoviedb.org/3/${type}/${numericId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
            if (tRes.ok) {
                const tData = await tRes.json();
                title = tData.name || tData.title || title;
                origTitle = tData.original_name || tData.original_title || origTitle;
            }
        }

        return { title, origTitle, numericId };
    } catch (e) {
        return { title: '', origTitle: '', numericId: id };
    }
}

async function getCatalog(args) {
    try {
        const query = (args && args.search) || (args && args.extra && args.extra.search) || (args && args.query) || '';
        
        if (query) {
            const sRes = await fetch(`${BASE_URL}/wp-admin/admin-ajax.php?s=${encodeURIComponent(query)}&action=dwls_search`, { headers: HEADERS });
            if (!sRes.ok) return { metas: [] };
            const sJson = await sRes.json();
            const results = sJson.results || [];
            
            const metas = results.map(r => {
                let poster = r.attachment_thumbnail || '';
                if (poster && poster.includes('-220x140')) {
                    poster = poster.replace('-220x140', '-200x290');
                }
                return {
                    id: `dizibox:show:${r.post_name || r.ID}`,
                    type: 'tv',
                    name: r.post_title,
                    poster: poster,
                    background: poster,
                    genres: ['Yabancı Dizi', 'DiziBox'],
                    description: (r.post_excerpt || r.post_title).replace(/<[^>]+>/g, '').trim()
                };
            });
            return { metas };
        }

        // Popular series from homepage and /tum-bolumler/
        const res = await fetch(`${BASE_URL}/`, { headers: HEADERS });
        if (!res.ok) return { metas: [] };
        const html = await res.text();

        const cardRegex = /<article class="article-episode-card[^"]*"[\s\S]*?<a href="([^"]*)"[^>]*title="([^"]*)"[\s\S]*?<b class=['"]series-name[^'"]*['"]>([\s\S]*?)<\/b>[\s\S]*?<img[^>]+data-src=['"]([^'"]*)['"]/gi;
        const metas = [];
        const seen = new Set();
        let m;

        while ((m = cardRegex.exec(html)) !== null) {
            const url = m[1];
            const epSlug = url.replace(BASE_URL, '').replace(/^\//, '').replace(/\/$/, '');
            const showSlug = epSlug.replace(/-\d+-sezon.*$/, '').replace(/-\d+-bolum.*$/, '').replace(/-izle.*$/, '');
            const seriesName = m[3].replace(/<[^>]+>/g, '').trim();
            let poster = m[4].replace('-220x140', '-200x290');

            if (!showSlug || seen.has(showSlug)) continue;
            seen.add(showSlug);

            metas.push({
                id: `dizibox:show:${showSlug}`,
                type: 'tv',
                name: seriesName,
                poster: poster.startsWith('http') ? poster : `${BASE_URL}${poster}`,
                background: poster.startsWith('http') ? poster : `${BASE_URL}${poster}`,
                genres: ['Yabancı Dizi', 'DiziBox'],
                description: `${seriesName} - DiziBox Yabancı Dizi Arşivi`
            });
        }

        return { metas };
    } catch (e) {
        return { metas: [] };
    }
}

async function getMeta(args) {
    try {
        const rawId = (typeof args === 'string') ? args : (args && args.id ? args.id : '');
        if (!rawId) return { meta: null };

        if (rawId.startsWith('dizibox:ep:')) {
            const epSlug = rawId.replace('dizibox:ep:', '');
            const epUrl = `${BASE_URL}/${epSlug}/`;
            const res = await fetch(epUrl, { headers: HEADERS });
            if (!res.ok) return { meta: null };
            const html = await res.text();

            const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<title>([^<]+)<\/title>/i);
            const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : 'DiziBox Bölüm';

            const ogImg = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
            const posterMatch = html.match(/class="figure-link"[\s\S]*?data-src=['"]([^'"]*)['"]/i);
            let poster = ogImg ? ogImg[1] : (posterMatch ? posterMatch[1] : '');
            if (poster && poster.includes('-220x140')) poster = poster.replace('-220x140', '-200x290');
            if (!poster) poster = 'https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png';

            const epNumMatch = title.match(/(\d+)\s*\.?\s*bölüm/i);
            const seasonNumMatch = title.match(/(\d+)\s*\.?\s*sezon/i);
            const epNum = epNumMatch ? parseInt(epNumMatch[1]) : 1;
            const seasonNum = seasonNumMatch ? parseInt(seasonNumMatch[1]) : 1;

            return {
                meta: {
                    id: rawId,
                    type: 'tv',
                    name: title,
                    poster,
                    background: poster,
                    description: `${title} - DiziBox`,
                    genres: ['Yabancı Dizi', 'DiziBox'],
                    videos: [{
                        id: rawId,
                        title,
                        season: seasonNum,
                        episode: epNum
                    }]
                }
            };
        }

        if (rawId.startsWith('dizibox:show:')) {
            const showSlug = rawId.replace('dizibox:show:', '');
            const showUrl = `${BASE_URL}/diziler/${showSlug}/`;
            const res = await fetch(showUrl, { headers: HEADERS });
            if (!res.ok) return { meta: null };
            const html = await res.text();

            const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<title>([^<]+)<\/title>/i);
            const rawTitle = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : 'DiziBox Dizi';
            const title = rawTitle.replace(/\s*izle\s*$/i, '').trim();

            const ogImg = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
            let poster = ogImg ? ogImg[1] : '';
            if (!poster) poster = 'https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png';

            const epMatches = [...html.matchAll(/<a href="([^"]*bolum[^"]*izle[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)];
            const videos = [];
            const seen = new Set();

            for (const ep of epMatches) {
                const epUrl = ep[1];
                const epSlug = epUrl.replace(BASE_URL, '').replace(/^\//, '').replace(/\/$/, '');
                if (!epSlug || seen.has(epSlug)) continue;

                const epText = ep[2].replace(/<[^>]+>/g, '').trim();
                if (!epText.toLowerCase().includes('bölüm') && !epText.toLowerCase().includes('sezon')) continue;
                seen.add(epSlug);

                const epNumMatch = epText.match(/(\d+)\s*\.?\s*bölüm/i) || epSlug.match(/-(\d+)-bolum/i);
                const sNumMatch = epText.match(/(\d+)\s*\.?\s*sezon/i) || epSlug.match(/-(\d+)-sezon/i);

                const epNum = epNumMatch ? parseInt(epNumMatch[1]) : 1;
                const sNum = sNumMatch ? parseInt(sNumMatch[1]) : 1;

                videos.push({
                    id: `dizibox:ep:${epSlug}`,
                    title: epText || `${sNum}. Sezon ${epNum}. Bölüm`,
                    season: sNum,
                    episode: epNum
                });
            }

            videos.sort((a, b) => (a.season - b.season) || (a.episode - b.episode));

            return {
                meta: {
                    id: rawId,
                    type: 'tv',
                    name: title,
                    poster: poster,
                    background: poster,
                    description: `${title} - DiziBox Arşivi`,
                    genres: ['Yabancı Dizi', 'DiziBox'],
                    videos
                }
            };
        }

        return { meta: null };
    } catch (e) {
        return { meta: null };
    }
}

function safeB64Decode(str) {
    try {
        if (typeof atob === 'function') return atob(str);
        if (typeof Buffer !== 'undefined') return Buffer.from(str, 'base64').toString('utf-8');
    } catch (e) {}
    return '';
}


async function extractMolystreamFromEpisodePage(epUrl) {
    try {
        const epRes = await fetch(epUrl, { headers: HEADERS });
        if (!epRes.ok) return [];
        const epHtml = await epRes.text();

        // 1. Discover all server tabs from select dropdown or standard /2/ /3/ URLs
        const selectMatch = epHtml.match(/<select[^>]+class=["'][^']*linkpages[^']*["'][^>]*>([\s\S]*?)<\/select>/i);
        let tabUrls = selectMatch 
            ? [...selectMatch[1].matchAll(/<option[^>]+(?:href|value)=["']([^"']+)["'][^>]*>/gi)].map(m => m[1])
            : [];
        
        const resolvedEpUrl = epRes.url || epUrl;
        if (!tabUrls.includes(resolvedEpUrl)) {
            tabUrls.unshift(resolvedEpUrl);
        }
        if (tabUrls.length <= 1) {
            const cleanBase = resolvedEpUrl.replace(/\/$/, '');
            tabUrls.push(`${cleanBase}/2/`, `${cleanBase}/3/`);
        }

        const streams = [];
        const seenUrls = new Set();

        for (const tabUrl of tabUrls) {
            try {
                const pRes = await fetch(tabUrl, { headers: { ...HEADERS, Referer: epUrl } });
                if (!pRes.ok) continue;
                const pHtml = await pRes.text();
                const iframes = [...pHtml.matchAll(/<iframe[^>]+src=["']([^"']+)["']/gi)].map(m => m[1]);

                for (const ifr of iframes) {
                    let src = ifr;
                    if (src.startsWith('//')) src = 'https:' + src;
                    else if (src.startsWith('/')) src = BASE_URL + src;

                    // Source A: VidMoly via moly.php (Tab 2 - Moly+) -> master yerine en yüksek varyant
                    if (src.includes('moly.php')) {
                        try {
                            const mRes = await fetch(src, { headers: { ...HEADERS, Referer: tabUrl } });
                            if (mRes.ok) {
                                const mHtml = await mRes.text();
                                const unescapeMatch = mHtml.match(/unescape\(["']([^"']+)/);
                                if (unescapeMatch) {
                                    const rawB64 = decodeURIComponent(unescapeMatch[1]);
                                    const decoded = safeB64Decode(rawB64);
                                    const vmMatch = decoded.match(/https?:\/\/[^\s"'\\]*vidmoly\.[a-z0-9]+\/embed-[a-zA-Z0-9_-]+\.html/i);
                                    if (vmMatch) {
                                        const vmRes = await fetch(vmMatch[0], { headers: { ...HEADERS, Referer: BASE_URL + '/' } });
                                        if (vmRes.ok) {
                                            const vmHtml = await vmRes.text();
                                            const m3u8Match = vmHtml.match(/file:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i);
                                            if (m3u8Match && !seenUrls.has(m3u8Match[1])) {
                                                seenUrls.add(m3u8Match[1]);
                                                const vmHeaders = {
                                                    'User-Agent': HEADERS['User-Agent'],
                                                    'Referer': 'https://vidmoly.biz/'
                                                };
                                                streams.push({
                                                    name: 'DiziBox',
                                                    title: '⌜ DiziBox ⌟ | VidMoly (1080p HLS)',
                                                    url: m3u8Match[1],
                                                    quality: '1080p',
                                                    provider: 'dizibox',
                                                    headers: vmHeaders,
                                                    format: 'hls',
                                                    isHls: true,
                                                    behaviorHints: {
                                                        notWebReady: true,
                                                        proxyHeaders: {
                                                            request: vmHeaders
                                                        }
                                                    }
                                                });
                                            }
                                        }
                                    }
                                }
                            }
                        } catch (e) {}
                    }

                    // Source B: Haydi player (Odnok / OK.ru)
                    if (src.includes('haydi.php')) {
                        try {
                            const vParam = src.match(/[?&]v=([^&#]+)/);
                            if (vParam) {
                                const decodedOkUrl = safeB64Decode(decodeURIComponent(vParam[1]));
                                if (decodedOkUrl && decodedOkUrl.includes('ok.ru')) {
                                    const okIdMatch = decodedOkUrl.match(/video(?:embed)?\/(\d+)/);
                                    if (okIdMatch) {
                                        const okWorkerUrl = `http://movie.okru.workers.dev/?ID=${okIdMatch[1]}`;
                                        if (!seenUrls.has(okWorkerUrl)) {
                                            seenUrls.add(okWorkerUrl);
                                            streams.push({
                                                name: 'DiziBox',
                                                title: '⌜ DiziBox ⌟ | Odnok (1080p Direct)',
                                                url: okWorkerUrl,
                                                quality: '1080p',
                                                provider: 'dizibox',
                                                format: 'mp4',
                                                isHls: false
                                            });
                                        }
                                    }
                                }
                            }
                        } catch (e) {}
                    }


                    // Source C: Any direct MP4 or M3U8 in page or intermediate page
                    const directMatches = [...pHtml.matchAll(/(https?:\/\/[^"'\s\\]+\.(?:m3u8|mp4)[^"'\s\\]*)/gi)];
                    for (const dm of directMatches) {
                        const dUrl = dm[1];
                        if (dUrl.includes('preview') || dUrl.includes('.jpg') || dUrl.includes('.png')) continue;
                        if (!seenUrls.has(dUrl)) {
                            seenUrls.add(dUrl);
                            const directHeaders = { 'User-Agent': HEADERS['User-Agent'], 'Referer': src };
                            const isHls = dUrl.includes('.m3u8');
                            streams.push({
                                name: 'DiziBox',
                                title: `⌜ DiziBox ⌟ | Direct (${isHls ? 'HLS' : 'MP4'})`,
                                url: dUrl,
                                quality: '1080p',
                                provider: 'dizibox',
                                headers: directHeaders,
                                format: isHls ? 'hls' : 'mp4',
                                isHls: isHls,
                                behaviorHints: {
                                    notWebReady: true,
                                    proxyHeaders: {
                                        request: directHeaders
                                    }
                                }
                            });
                        }
                    }
                }
            } catch (e) {}
        }

        // Sort streams: Direct unbroken MP4s (Odnok, direct MP4) first, then 1080p down
        streams.sort((a, b) => {
            const aIsDirectMp4 = (a.format === 'mp4' || (!a.isHls && a.url && a.url.includes('.mp4') && !a.url.includes('.m3u8'))) ? 1 : 0;
            const bIsDirectMp4 = (b.format === 'mp4' || (!b.isHls && b.url && b.url.includes('.mp4') && !b.url.includes('.m3u8'))) ? 1 : 0;
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
            return getStreams(tmdbIdOrArgs.id, mediaType, seasonNum, episodeNum);
        }

        if (typeof tmdbIdOrArgs === 'string' && tmdbIdOrArgs.startsWith('dizibox:show:')) {
            const showMeta = await getMeta(tmdbIdOrArgs);
            if (showMeta && showMeta.meta && Array.isArray(showMeta.meta.videos) && showMeta.meta.videos.length > 0) {
                return await getStreams(showMeta.meta.videos[0].id);
            }
        }

        if (typeof tmdbIdOrArgs === 'string' && tmdbIdOrArgs.startsWith('dizibox:ep:')) {
            const slug = tmdbIdOrArgs.replace('dizibox:ep:', '');
            const epUrl = `${BASE_URL}/${slug}/`;
            return await extractMolystreamFromEpisodePage(epUrl);
        }

        const season = parseInt(seasonNum) || 1;
        const episode = parseInt(episodeNum) || 1;

        const info = await resolveTmdbInfo(tmdbIdOrArgs, mediaType);
        const searchTitles = [info.origTitle, info.title].filter(Boolean);
        if (searchTitles.length === 0) return [];

        for (const title of searchTitles) {
            // Strategy 1: Use regular site search (POST to homepage) - more reliable than AJAX
            let results = [];
            try {
                const form = new URLSearchParams();
                form.append('s', title);
                const sRes = await fetch(`${BASE_URL}/`, {
                    method: 'POST',
                    headers: Object.assign({}, HEADERS, { 'Content-Type': 'application/x-www-form-urlencoded' }),
                    body: form.toString(),
                    signal: AbortSignal.timeout(15000)
                });
                if (sRes.ok) {
                    const sHtml = await sRes.text();
                    // Parse search results from HTML
                    const resultMatches = [...sHtml.matchAll(/<a[^>]+href="([^"]*\/diziler\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)];
                    for (const m of resultMatches) {
                        const url = m[1];
                        const postTitle = m[2].replace(/<[^>]+>/g, '').trim();
                        if (url && postTitle) {
                            const postName = url.replace(BASE_URL + '/diziler/', '').replace(/\/$/, '');
                            results.push({ post_title: postTitle, permalink: url, post_name: postName });
                        }
                    }
                }
            } catch (e) {}

            // Strategy 2: Fallback to AJAX search if HTML search fails
            if (results.length === 0) {
                try {
                    const sRes = await fetch(`${BASE_URL}/wp-admin/admin-ajax.php?s=${encodeURIComponent(title)}&action=dwls_search`, {
                        headers: HEADERS,
                        signal: AbortSignal.timeout(10000)
                    });
                    if (sRes.ok) {
                        const sJson = await sRes.json();
                        results = sJson.results || [];
                    }
                } catch (e) {}
            }

            if (results.length === 0) continue;

            const cleanTarget = ultraClean(title);
            let matchedShow = null;

            // Exact match
            for (const r of results) {
                const rTitle = ultraClean(r.post_title);
                if (rTitle === cleanTarget) {
                    matchedShow = r;
                    break;
                }
            }

            // Partial match
            if (!matchedShow) {
                for (const r of results) {
                    const rTitle = ultraClean(r.post_title);
                    if (rTitle.includes(cleanTarget) || cleanTarget.includes(rTitle)) {
                        matchedShow = r;
                        break;
                    }
                }
            }

            // Fuzzy match: check individual words
            if (!matchedShow) {
                const targetWords = cleanTarget.split(/[^a-z0-9]+/).filter(w => w.length > 2);
                for (const r of results) {
                    const rTitle = ultraClean(r.post_title);
                    const rWords = rTitle.split(/[^a-z0-9]+/).filter(w => w.length > 2);
                    const matches = targetWords.filter(tw => rWords.some(rw => rw.includes(tw) || tw.includes(rw))).length;
                    if (matches >= Math.min(2, targetWords.length)) {
                        matchedShow = r;
                        break;
                    }
                }
            }

            // Fallback to first result
            if (!matchedShow && results.length > 0) {
                matchedShow = results[0];
            }

            if (!matchedShow) continue;

            // Strategy 1: Fetch show page to find matching season & episode link
            let targetEpUrl = null;
            if (matchedShow.permalink) {
                try {
                    const showRes = await fetch(matchedShow.permalink, { headers: HEADERS, signal: AbortSignal.timeout(15000) });
                    if (showRes.ok) {
                        const showHtml = await showRes.text();
                        const epMatches = [...showHtml.matchAll(/<a href="([^"]*bolum[^"]*izle[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)];

                        const sRegex = new RegExp(`(?:^|\\s|\\.)${season}\\.?\\s*(?:sezon|\\. sezon)`, 'i');
                        const eRegex = new RegExp(`(?:^|\\s|\\.)${episode}\\.?\\s*(?:bölüm|\\. bölüm)`, 'i');

                        for (const ep of epMatches) {
                            const epText = ep[2].toLowerCase();
                            if (sRegex.test(epText) && eRegex.test(epText)) {
                                targetEpUrl = ep[1];
                                break;
                            }
                        }
                    }
                } catch (e) {}
            }

            // Strategy 2: Direct predictable URL pattern
            if (!targetEpUrl && matchedShow.post_name) {
                const baseSlug = matchedShow.post_name.replace(/-izle.*$/, '').replace(/-\d+$/, '');
                targetEpUrl = `${BASE_URL}/${baseSlug}-${season}-sezon-${episode}-bolum-izle/`;
            }

            // Strategy 3: Try alternative slug patterns
            if (!targetEpUrl && matchedShow.post_name) {
                const altSlugs = [
                    `${matchedShow.post_name}-${season}-sezon-${episode}-bolum-izle/`,
                    `${matchedShow.post_name.replace(/-izle.*$/, '')}-${season}-sezon-${episode}-bolum-izle/`
                ];
                for (const altSlug of altSlugs) {
                    const testUrl = `${BASE_URL}/${altSlug}`;
                    try {
                        const testRes = await fetch(testUrl, { headers: HEADERS, signal: AbortSignal.timeout(8000) });
                        if (testRes.ok && testRes.url.includes('bolum')) {
                            targetEpUrl = testRes.url;
                            break;
                        }
                    } catch (e) {}
                }
            }

            if (targetEpUrl) {
                const streams = await extractMolystreamFromEpisodePage(targetEpUrl);
                if (streams.length > 0) return streams;
            }
        }

        return [];
    } catch (e) {
        return [];
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams, getMeta, getCatalog };
}
if (typeof globalThis !== 'undefined') {
    globalThis.getStreams = getStreams;
    globalThis.getMeta = getMeta;
    globalThis.getCatalog = getCatalog;
}
