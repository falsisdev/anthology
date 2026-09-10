/**
 * Anthology - DiziBox Provider
 * Yabancı dizi arşivi, güncel bölümler kataloğu ve Molystream/Sheila üzerinden doğrudan 1080p HLS akışları.
 */

var BASE_URL = 'https://www.dizibox.live';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
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

async function extractMolystreamFromEpisodePage(epUrl) {
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

            if (!src.includes('king.php') && !src.includes('molystream')) continue;

            try {
                const pRes = await fetch(src, { headers: { ...HEADERS, Referer: epUrl } });
                if (!pRes.ok) continue;
                const pHtml = await pRes.text();

                // Extract molyId from intermediate page
                const molyMatch = pHtml.match(/https?:\/\/[^"'\s]*molystream\.org\/embed\/(?:sheila\/)?([a-zA-Z0-9_-]+)/);
                if (molyMatch) {
                    const molyId = molyMatch[1];
                    const sheilaUrl = `https://dbx.molystream.org/embed/sheila/${molyId}`;
                    const embedPage = `https://dbx.molystream.org/embed/${molyId}`;

                    try {
                        const sRes = await fetch(sheilaUrl, { 
                            headers: { 'User-Agent': HEADERS['User-Agent'], 'Referer': embedPage } 
                        });
                        if (sRes.ok) {
                            const sText = await sRes.text();
                            let finalStreamUrl = `${sheilaUrl}#master.m3u8`;
                            if (sText.trim().startsWith('#EXTM3U')) {
                                const subLine = sText.split('\n').map(l => l.trim()).find(l => l.startsWith('http'));
                                if (subLine) {
                                    finalStreamUrl = `${subLine}#video.m3u8`;
                                }
                            }

                            streams.push({
                                name: 'DiziBox',
                                title: '⌜ DiziBox ⌟ | Molystream (1080p HLS)',
                                url: finalStreamUrl,
                                quality: '1080p',
                                provider: 'dizibox',
                                headers: {
                                    'User-Agent': HEADERS['User-Agent'],
                                    'Referer': embedPage
                                }
                            });
                        }
                    } catch (e) {}
                }
                
                // Also try direct m3u8/mp4 URLs in the intermediate page
                const directMatches = [...pHtml.matchAll(/(https?:\/\/[^"'\s\\]+\.(?:m3u8|mp4)[^"'\s\\]*)/gi)];
                for (const dm of directMatches) {
                    const dUrl = dm[1];
                    if (dUrl.includes('preview') || dUrl.includes('.jpg') || dUrl.includes('.png')) continue;
                    if (streams.some(s => s.url === dUrl)) continue;
                    streams.push({
                        name: 'DiziBox',
                        title: `⌜ DiziBox ⌟ | Direct (${dUrl.includes('.m3u8') ? 'HLS' : 'MP4'})`,
                        url: dUrl,
                        quality: '1080p',
                        provider: 'dizibox',
                        headers: { 'User-Agent': HEADERS['User-Agent'], 'Referer': src }
                    });
                }
            } catch (e) {}
        }

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
            const sRes = await fetch(`${BASE_URL}/wp-admin/admin-ajax.php?s=${encodeURIComponent(title)}&action=dwls_search`, { headers: HEADERS });
            if (!sRes.ok) continue;
            const sJson = await sRes.json();
            const results = sJson.results || [];
            if (results.length === 0) continue;

            const cleanTarget = ultraClean(title);
            let matchedShow = null;

            for (const r of results) {
                const rTitle = ultraClean(r.post_title);
                if (rTitle === cleanTarget) {
                    matchedShow = r;
                    break;
                }
            }

            if (!matchedShow) {
                for (const r of results) {
                    const rTitle = ultraClean(r.post_title);
                    if (rTitle.includes(cleanTarget) || cleanTarget.includes(rTitle)) {
                        matchedShow = r;
                        break;
                    }
                }
            }

            if (!matchedShow && results.length > 0) {
                matchedShow = results[0];
            }

            if (!matchedShow) continue;

            // Strategy 1: Fetch show page to find matching season & episode link
            let targetEpUrl = null;
            if (matchedShow.permalink) {
                const showRes = await fetch(matchedShow.permalink, { headers: HEADERS });
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
            }

            // Strategy 2: Direct predictable URL pattern
            if (!targetEpUrl && matchedShow.post_name) {
                const baseSlug = matchedShow.post_name.replace(/-izle.*$/, '').replace(/-\d+$/, '');
                targetEpUrl = `${BASE_URL}/${baseSlug}-${season}-sezon-${episode}-bolum-izle/`;
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
