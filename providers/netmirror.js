// NetMirror Scraper - CloudStream Kotlin versiyonundan port edilmiştir
// Güncel endpoint: net22.cc / net52.cc
// Fetches streaming links from Netflix, Prime Video, and Disney+ content

console.log('[NetMirror] Initializing NetMirror provider');

// ==================== CONFIGURATION ====================

const CONFIG = {
    TMDB_API_KEY: "439c478a771f35c05022f9feabcca01c",
    MAIN_URL: 'https://net22.cc',
    NEW_URL: 'https://net52.cc',  // Streaming için kullanılan yeni URL
    IMG_CDN: 'https://imgcdn.kim',
    COOKIE_EXPIRY: 54000000, // 15 hours
    MAX_RETRIES: 5,
    USER_TOKEN: '233123f803cf02184bf6c67e149cdd50'
};

const OTT_MAP = {
    'netflix': 'nf',
    'primevideo': 'pv', 
    'disney': 'hs'
};

const PLATFORM_ENDPOINTS = {
    'netflix': { 
        search: '/search.php', 
        post: '/post.php', 
        episodes: '/episodes.php',
        playlist: '/playlist.php'  // /tv/ değil, kök dizinde!
    },
    'primevideo': { 
        search: '/pv/search.php', 
        post: '/pv/post.php', 
        episodes: '/pv/episodes.php',
        playlist: '/pv/playlist.php'
    },
    'disney': { 
        search: '/mobile/hs/search.php', 
        post: '/mobile/hs/post.php', 
        episodes: '/mobile/hs/episodes.php',
        playlist: '/mobile/hs/playlist.php'
    }
};

// ==================== STATE ====================

let globalCookie = '';
let cookieTimestamp = 0;

// ==================== UTILITY FUNCTIONS ====================

const getUnixTime = () => Math.floor(Date.now() / 1000);

const createHeaders = (extra = {}) => ({
    'X-Requested-With': 'XMLHttpRequest',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.5',
    'Connection': 'keep-alive',
    ...extra
});

// ==================== HTTP CLIENT ====================

async function makeRequest(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeout || 15000);
    
    try {
        const headers = createHeaders(options.headers || {});
        if (options.cookie) {
            headers['Cookie'] = options.cookie;
        }
        
        const response = await fetch(url, {
            method: options.method || 'GET',
            headers,
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return response;
    } catch (error) {
        clearTimeout(timeout);
        throw error;
    }
}

// ==================== AUTHENTICATION ====================

async function bypassAuth(attempt = 0) {
    const now = Date.now();
    
    // Cache kontrolü
    if (globalCookie && cookieTimestamp && (now - cookieTimestamp) < CONFIG.COOKIE_EXPIRY) {
        console.log('[NetMirror] Using cached authentication cookie');
        return globalCookie;
    }

    if (attempt >= CONFIG.MAX_RETRIES) {
        throw new Error('Max bypass attempts reached');
    }

    console.log(`[NetMirror] Bypassing authentication... (attempt ${attempt + 1})`);
    
    try {
        // Kotlin kodunda newUrl kullanılıyor bypass için
        const response = await makeRequest(`${CONFIG.NEW_URL}/tv/p.php`, {
            method: 'POST'
        });
        
        const setCookieHeader = response.headers.get('set-cookie');
        const responseText = await response.text();
        
        // Cookie çıkarma
        let extractedCookie = null;
        if (setCookieHeader) {
            const cookieString = Array.isArray(setCookieHeader) 
                ? setCookieHeader.join('; ') 
                : setCookieHeader;
            const match = cookieString.match(/t_hash_t=([^;]+)/);
            if (match) extractedCookie = match[1];
        }
        
        // Başarı kontrolü - Kotlin'de "r":"n" kontrolü var
        if (!responseText.includes('"r":"n"') || !extractedCookie) {
            console.log(`[NetMirror] Bypass attempt ${attempt + 1} failed, retrying...`);
            return bypassAuth(attempt + 1);
        }
        
        globalCookie = extractedCookie;
        cookieTimestamp = Date.now();
        console.log('[NetMirror] Authentication successful');
        
        return globalCookie;
        
    } catch (error) {
        console.error(`[NetMirror] Auth error: ${error.message}`);
        throw error;
    }
}

function getCookieString(platform, cookie, includeUserToken = false) {
    const ott = OTT_MAP[platform.toLowerCase()] || 'nf';
    const cookies = {
        't_hash_t': cookie,
        'ott': ott,
        'hd': 'on'
    };
    
    // Bazı isteklerde user_token da gerekiyor
    if (includeUserToken) {
        cookies['user_token'] = CONFIG.USER_TOKEN;
    }
    
    return Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
}

// ==================== VIDEO TOKEN (YENİ!) ====================

// Kotlin kodunda bu fonksiyon var, muhtemelen şifreleme/token oluşturma için
async function getVideoToken(mainUrl, newUrl, id, cookie) {
    // Bu fonksiyonun tam implementasyonu Kotlin'de görünmüyor
    // Ancak muhtemelen bir hash veya şifreleme işlemi yapıyor
    // Şimdilik basit bir implementasyon:
    
    const timestamp = getUnixTime();
    const str = `${id}${timestamp}${cookie}`;
    
    // Basit bir hash (gerçek implementasyon farklı olabilir)
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    
    return Math.abs(hash).toString(16);
}

// ==================== CONTENT SEARCH ====================

async function searchContent(query, platform) {
    console.log(`[NetMirror] Searching for "${query}" on ${platform}...`);
    
    const cookie = await bypassAuth();
    const cookieStr = getCookieString(platform, cookie);
    const endpoint = PLATFORM_ENDPOINTS[platform.toLowerCase()]?.search || PLATFORM_ENDPOINTS.netflix.search;
    
    const response = await makeRequest(
        `${CONFIG.MAIN_URL}${endpoint}?s=${encodeURIComponent(query)}&t=${getUnixTime()}`,
        { 
            cookie: cookieStr, 
            headers: { 'Referer': `${CONFIG.MAIN_URL}/tv/home` } 
        }
    );
    
    const data = await response.json();
    
    if (!data.searchResult?.length) {
        console.log('[NetMirror] No results found');
        return [];
    }
    
    console.log(`[NetMirror] Found ${data.searchResult.length} results`);
    
    return data.searchResult.map(item => ({
        id: item.id,
        title: item.t,
        posterUrl: `${CONFIG.IMG_CDN}/poster/v/${item.id}.jpg`,
        posterHeaders: { 'Referer': `${CONFIG.MAIN_URL}/home` }
    }));
}

// ==================== EPISODE MANAGEMENT ====================

async function getEpisodesFromSeason(title, seriesId, seasonId, platform, page = 1) {
    const cookie = await bypassAuth();
    const cookieStr = getCookieString(platform, cookie);
    const endpoint = PLATFORM_ENDPOINTS[platform.toLowerCase()]?.episodes || PLATFORM_ENDPOINTS.netflix.episodes;
    
    const episodes = [];
    let currentPage = page;
    
    while (true) {
        try {
            const response = await makeRequest(
                `${CONFIG.MAIN_URL}${endpoint}?s=${seasonId}&series=${seriesId}&t=${getUnixTime()}&page=${currentPage}`,
                { 
                    cookie: cookieStr, 
                    headers: { 'Referer': `${CONFIG.MAIN_URL}/tv/home` } 
                }
            );
            
            const data = await response.json();
            
            if (data.episodes) {
                data.episodes.forEach(ep => {
                    if (ep) {
                        episodes.push({
                            id: ep.id,
                            title: ep.t,
                            episode: parseInt(ep.ep?.replace('E', '') || '0'),
                            season: parseInt(ep.s?.replace('S', '') || '0'),
                            posterUrl: `${CONFIG.IMG_CDN}/epimg/150/${ep.id}.jpg`,
                            runtime: parseInt(ep.time?.replace('m', '') || '0')
                        });
                    }
                });
            }
            
            if (data.nextPageShow === 0) break;
            currentPage++;
            
        } catch (error) {
            console.log(`[NetMirror] Failed to load episodes from season ${seasonId}, page ${currentPage}`);
            break;
        }
    }
    
    return episodes;
}

// ==================== CONTENT DETAILS ====================

async function loadContent(contentId, platform) {
    console.log(`[NetMirror] Loading content details for ID: ${contentId}`);
    
    const cookie = await bypassAuth();
    const cookieStr = getCookieString(platform, cookie, true); // user_token ekle
    const endpoint = PLATFORM_ENDPOINTS[platform.toLowerCase()]?.post || PLATFORM_ENDPOINTS.netflix.post;
    
    const response = await makeRequest(
        `${CONFIG.MAIN_URL}${endpoint}?id=${contentId}&t=${getUnixTime()}`,
        { 
            cookie: cookieStr, 
            headers: { 'Referer': `${CONFIG.MAIN_URL}/tv/home` } 
        }
    );
    
    const data = await response.json();
    console.log(`[NetMirror] Loaded: ${data.title}`);
    
    const isMovie = !data.episodes?.length || data.episodes[0] === null;
    let allEpisodes = [];
    
    // Film değilse bölümleri çek
    if (!isMovie && data.episodes) {
        // Mevcut sezonun bölümleri
        const validEpisodes = data.episodes.filter(ep => ep !== null);
        allEpisodes = validEpisodes.map(ep => ({
            id: ep.id,
            title: ep.t,
            episode: parseInt(ep.ep?.replace('E', '') || '0'),
            season: parseInt(ep.s?.replace('S', '') || '0'),
            posterUrl: `${CONFIG.IMG_CDN}/epimg/150/${ep.id}.jpg`,
            runtime: parseInt(ep.time?.replace('m', '') || '0')
        }));
        
        // Ekstra sayfalar varsa çek
        if (data.nextPageShow === 1 && data.nextPageSeason) {
            const additional = await getEpisodesFromSeason(data.title, contentId, data.nextPageSeason, platform, 2);
            allEpisodes.push(...additional);
        }
        
        // Diğer sezonlar
        if (data.season?.length > 1) {
            const otherSeasons = data.season.slice(0, -1);
            for (const season of otherSeasons) {
                const seasonEpisodes = await getEpisodesFromSeason(data.title, contentId, season.id, platform, 1);
                allEpisodes.push(...seasonEpisodes);
            }
        }
        
        console.log(`[NetMirror] Loaded ${allEpisodes.length} total episodes`);
    }
    
    // Cast ve genre parse et
    const cast = data.cast?.split(',').map(c => c.trim()).filter(c => c) || [];
    const genres = data.genre?.split(',').map(g => g.trim()).filter(g => g) || [];
    const rating = data.match?.replace('IMDb ', '');
    const runtime = data.runtime ? parseInt(data.runtime.toString()) : null;
    
    return {
        id: contentId,
        title: data.title,
        description: data.desc,
        year: parseInt(data.year) || null,
        isMovie,
        episodes: allEpisodes,
        seasons: data.season || [],
        cast,
        genres,
        rating,
        runtime,
        contentRating: data.ua,
        posterUrl: `${CONFIG.IMG_CDN}/poster/v/${contentId}.jpg`,
        backgroundPosterUrl: `${CONFIG.IMG_CDN}/poster/h/${contentId}.jpg`
    };
}

// ==================== STREAMING LINKS (GÜNCELLENMİŞ!) ====================

async function getStreamingLinks(contentId, title, platform) {
    console.log(`[NetMirror] Getting streaming links for: ${title}`);
    
    const cookie = await bypassAuth();
    const cookieStr = getCookieString(platform, cookie);
    
    // Video token al (Kotlin'deki gibi)
    const token = await getVideoToken(CONFIG.MAIN_URL, CONFIG.NEW_URL, contentId, cookie);
    
    // ÖNEMLİ: Kotlin'de NEW_URL kullanılıyor ve endpoint /playlist.php (tv/ değil!)
    const endpoint = PLATFORM_ENDPOINTS[platform.toLowerCase()]?.playlist || '/playlist.php';
    const playlistUrl = `${CONFIG.NEW_URL}${endpoint}?id=${contentId}&t=${encodeURIComponent(title)}&tm=${getUnixTime()}&h=${token}`;
    
    console.log(`[NetMirror] Playlist URL: ${playlistUrl}`);
    
    const response = await makeRequest(
        playlistUrl,
        { 
            cookie: cookieStr, 
            headers: { 'Referer': `${CONFIG.NEW_URL}/` } 
        }
    );
    
    const playlist = await response.json();
    
    if (!Array.isArray(playlist) || !playlist.length) {
        console.log('[NetMirror] No streaming links found');
        return { sources: [], subtitles: [] };
    }
    
    const sources = [];
    const subtitles = [];
    
    playlist.forEach(item => {
        // Video kaynakları
        if (item.sources) {
            item.sources.forEach(source => {
                // URL yapısı - Kotlin'de doğrudan newUrl + file
                let fullUrl = source.file;
                if (fullUrl.startsWith('/')) {
                    fullUrl = CONFIG.NEW_URL + fullUrl;
                } else if (!fullUrl.startsWith('http')) {
                    fullUrl = CONFIG.NEW_URL + '/' + fullUrl;
                }
                
                sources.push({
                    url: fullUrl,
                    quality: source.label,
                    type: source.type || 'application/x-mpegURL'
                });
            });
        }
        
        // Altyazılar
        if (item.tracks) {
            item.tracks
                .filter(track => track.kind === 'captions')
                .forEach(track => {
                    let subUrl = track.file.toString().replace(/\\/g, '');
                    
                    // httpsify fonksiyonu (Kotlin'den)
                    if (subUrl.startsWith('//')) {
                        subUrl = 'https:' + subUrl;
                    } else if (subUrl.startsWith('/') && !subUrl.startsWith('//')) {
                        subUrl = 'https:' + subUrl;
                    }
                    
                    subtitles.push({
                        url: subUrl,
                        language: track.label
                    });
                });
        }
    });
    
    console.log(`[NetMirror] Found ${sources.length} streaming sources and ${subtitles.length} subtitle tracks`);
    return { sources, subtitles };
}

// ==================== MAIN STREAM FETCHER ====================

async function getStreams(tmdbId, mediaType = 'movie', seasonNum = null, episodeNum = null) {
    console.log(`[NetMirror] Fetching streams for TMDB ID: ${tmdbId}, Type: ${mediaType}${seasonNum ? `, S${seasonNum}E${episodeNum}` : ''}`);
    
    try {
        // TMDB'den bilgi al
        const tmdbUrl = `https://api.themoviedb.org/3/${mediaType === 'tv' ? 'tv' : 'movie'}/${tmdbId}?api_key=${CONFIG.TMDB_API_KEY}`;
        const tmdbResponse = await fetch(tmdbUrl);
        const tmdbData = await tmdbResponse.json();
        
        const title = mediaType === 'tv' ? tmdbData.name : tmdbData.title;
        const year = mediaType === 'tv' 
            ? tmdbData.first_air_date?.substring(0, 4) 
            : tmdbData.release_date?.substring(0, 4);
        
        if (!title) {
            throw new Error('Could not extract title from TMDB response');
        }
        
        console.log(`[NetMirror] TMDB Info: "${title}" (${year})`);
        
        // Platform önceliği
        let platforms = ['netflix', 'primevideo', 'disney'];
        if (title.toLowerCase().includes('boys') || title.toLowerCase().includes('prime')) {
            platforms = ['primevideo', 'netflix', 'disney'];
        }
        
        // Platformları dene
        for (const platform of platforms) {
            console.log(`[NetMirror] Trying platform: ${platform}`);
            
            try {
                const result = await trySearchOnPlatform(platform, title, year, mediaType, seasonNum, episodeNum);
                if (result && result.length > 0) {
                    return result;
                }
            } catch (error) {
                console.log(`[NetMirror] Error on ${platform}: ${error.message}, trying next...`);
            }
        }
        
        console.log('[NetMirror] No content found on any platform');
        return [];
        
    } catch (error) {
        console.error(`[NetMirror] Error in getStreams: ${error.message}`);
        return [];
    }
}

async function trySearchOnPlatform(platform, title, year, mediaType, seasonNum, episodeNum) {
    // Ara
    let searchResults = await searchContent(title, platform);
    
    // Sonuç yoksa yıllı dene
    if (!searchResults.length && year) {
        console.log(`[NetMirror] No results for "${title}", trying with year...`);
        searchResults = await searchContent(`${title} ${year}`, platform);
    }
    
    if (!searchResults.length) return null;
    
    // En iyi eşleşmeyi bul
    const normalizedTitle = title.toLowerCase().trim();
    const bestMatch = searchResults.find(r => 
        r.title.toLowerCase().includes(normalizedTitle) ||
        normalizedTitle.includes(r.title.toLowerCase())
    ) || searchResults[0];
    
    console.log(`[NetMirror] Selected: ${bestMatch.title} (ID: ${bestMatch.id})`);
    
    const contentData = await loadContent(bestMatch.id, platform);
    let targetContentId = bestMatch.id;
    let targetEpisode = null;
    
    // TV dizisi için bölüm bul
    if (mediaType === 'tv' && !contentData.isMovie) {
        targetEpisode = contentData.episodes.find(ep => 
            ep.season === (seasonNum || 1) && ep.episode === (episodeNum || 1)
        );
        
        if (targetEpisode) {
            targetContentId = targetEpisode.id;
            console.log(`[NetMirror] Found episode ID: ${targetEpisode.id}`);
        } else {
            console.log(`[NetMirror] Episode S${seasonNum}E${episodeNum} not found`);
            return null;
        }
    }
    
    const streamData = await getStreamingLinks(targetContentId, title, platform);
    if (!streamData.sources?.length) {
        console.log(`[NetMirror] No streaming links found`);
        return null;
    }
    
    // Stream formatına dönüştür
    const streams = streamData.sources.map(source => {
        // Kalite çıkarımı
        let quality = 'HD';
        const qualityMatch = source.quality?.match(/(\d+p)/i);
        if (qualityMatch) quality = qualityMatch[1];
        
        // Başlık oluştur
        let streamTitle = `${title} ${year ? `(${year})` : ''} ${quality}`;
        if (mediaType === 'tv') {
            streamTitle += ` S${seasonNum}E${episodeNum}`;
            if (targetEpisode?.title) {
                streamTitle += ` - ${targetEpisode.title}`;
            }
        }
        
        // Kotlin'deki header'lar
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Android) ExoPlayer',
            'Accept': '*/*',
            'Accept-Encoding': 'identity',
            'Connection': 'keep-alive',
            'Cookie': 'hd=on',
            'Referer': `${CONFIG.NEW_URL}/`
        };
        
        return {
            name: `NetMirror (${platform.charAt(0).toUpperCase() + platform.slice(1)})`,
            title: streamTitle,
            url: source.url,
            quality: quality,
            type: source.type?.includes('mpegURL') ? 'hls' : 'direct',
            headers: headers
        };
    });
    
    // Sırala: Auto önce, sonra kaliteye göre
    streams.sort((a, b) => {
        if (a.quality.toLowerCase() === 'auto') return -1;
        if (b.quality.toLowerCase() === 'auto') return 1;
        
        const parseQ = (q) => {
            const match = q.match(/(\d{3,4})p/i);
            return match ? parseInt(match[1], 10) : 0;
        };
        
        return parseQ(b.quality) - parseQ(a.quality);
    });
    
    console.log(`[NetMirror] Successfully processed ${streams.length} streams from ${platform}`);
    return streams;
}

// ==================== EXPORTS ====================

export { getStreams, searchContent, loadContent, getStreamingLinks };

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams, searchContent, loadContent, getStreamingLinks };
}

if (typeof global !== 'undefined') {
    global.NetMirror = { getStreams, searchContent, loadContent, getStreamingLinks };
}
