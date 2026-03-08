// NetMirror Scraper for Nuvio Local Scrapers
// Modern ES6+ version - Async/Await destekli
// Fetches streaming links from net22.cc for Netflix, Prime Video, and Disney+ content

console.log('[NetMirror] Initializing NetMirror provider');

// ==================== CONFIGURATION ====================

const CONFIG = {
    TMDB_API_KEY: "439c478a771f35c05022f9feabcca01c",
    NETMIRROR_BASE: 'https://net22.cc',
    COOKIE_EXPIRY: 54000000, // 15 hours
    MAX_RETRIES: 5
};

const OTT_MAP = {
    'netflix': 'nf',
    'primevideo': 'pv',
    'disney': 'hs'
};

const PLATFORM_ENDPOINTS = {
    'netflix': { search: '/search.php', post: '/post.php', episodes: '/episodes.php' },
    'primevideo': { search: '/pv/search.php', post: '/pv/post.php', episodes: '/pv/episodes.php' },
    'disney': { search: '/mobile/hs/search.php', post: '/mobile/hs/post.php', episodes: '/mobile/hs/episodes.php' }
};

// ==================== STATE ====================

let globalCookie = '';
let cookieTimestamp = 0;

// ==================== UTILITY FUNCTIONS ====================

const getUnixTime = () => Math.floor(Date.now() / 1000);

const createHeaders = (cookie = '', extra = {}) => ({
    'X-Requested-With': 'XMLHttpRequest',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.5',
    'Connection': 'keep-alive',
    ...(cookie && { 'Cookie': cookie }),
    ...extra
});

// ==================== HTTP CLIENT ====================

async function makeRequest(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeout || 10000);
    
    try {
        const response = await fetch(url, {
            ...options,
            headers: createHeaders(options.cookie, options.headers),
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
        const response = await makeRequest(`${CONFIG.NETMIRROR_BASE}/tv/p.php`, {
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
        
        // Başarı kontrolü
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

function getCookieString(platform, cookie) {
    const ott = OTT_MAP[platform.toLowerCase()] || 'nf';
    const cookies = {
        't_hash_t': cookie,
        'user_token': '233123f803cf02184bf6c67e149cdd50',
        'hd': 'on',
        'ott': ott
    };
    return Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
}

// ==================== CONTENT SEARCH ====================

async function searchContent(query, platform) {
    console.log(`[NetMirror] Searching for "${query}" on ${platform}...`);
    
    const cookie = await bypassAuth();
    const cookieStr = getCookieString(platform, cookie);
    const endpoint = PLATFORM_ENDPOINTS[platform.toLowerCase()]?.search || PLATFORM_ENDPOINTS.netflix.search;
    
    const response = await makeRequest(
        `${CONFIG.NETMIRROR_BASE}${endpoint}?s=${encodeURIComponent(query)}&t=${getUnixTime()}`,
        { cookie: cookieStr, headers: { 'Referer': `${CONFIG.NETMIRROR_BASE}/tv/home` } }
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
        posterUrl: `https://imgcdn.media/poster/v/${item.id}.jpg`
    }));
}

// ==================== EPISODE MANAGEMENT ====================

async function getEpisodesFromSeason(seriesId, seasonId, platform, page = 1) {
    const cookie = await bypassAuth();
    const cookieStr = getCookieString(platform, cookie);
    const endpoint = PLATFORM_ENDPOINTS[platform.toLowerCase()]?.episodes || PLATFORM_ENDPOINTS.netflix.episodes;
    
    const episodes = [];
    
    async function fetchPage(pageNum) {
        try {
            const response = await makeRequest(
                `${CONFIG.NETMIRROR_BASE}${endpoint}?s=${seasonId}&series=${seriesId}&t=${getUnixTime()}&page=${pageNum}`,
                { cookie: cookieStr, headers: { 'Referer': `${CONFIG.NETMIRROR_BASE}/tv/home` } }
            );
            
            const data = await response.json();
            
            if (data.episodes) {
                episodes.push(...data.episodes);
            }
            
            if (data.nextPageShow === 0) {
                return episodes;
            }
            
            return fetchPage(pageNum + 1);
            
        } catch (error) {
            console.log(`[NetMirror] Failed to load episodes from season ${seasonId}, page ${pageNum}`);
            return episodes;
        }
    }
    
    return fetchPage(page);
}

// ==================== CONTENT DETAILS ====================

async function loadContent(contentId, platform) {
    console.log(`[NetMirror] Loading content details for ID: ${contentId}`);
    
    const cookie = await bypassAuth();
    const cookieStr = getCookieString(platform, cookie);
    const endpoint = PLATFORM_ENDPOINTS[platform.toLowerCase()]?.post || PLATFORM_ENDPOINTS.netflix.post;
    
    const response = await makeRequest(
        `${CONFIG.NETMIRROR_BASE}${endpoint}?id=${contentId}&t=${getUnixTime()}`,
        { cookie: cookieStr, headers: { 'Referer': `${CONFIG.NETMIRROR_BASE}/tv/home` } }
    );
    
    const postData = await response.json();
    console.log(`[NetMirror] Loaded: ${postData.title}`);
    
    let allEpisodes = postData.episodes || [];
    const isMovie = !postData.episodes?.length || postData.episodes[0] === null;
    
    // TV dizisi ise tüm bölümleri çek
    if (!isMovie && postData.episodes?.length > 0) {
        console.log('[NetMirror] Loading episodes from all seasons...');
        
        // Mevcut sezondan ekstra sayfalar
        if (postData.nextPageShow === 1 && postData.nextPageSeason) {
            const additional = await getEpisodesFromSeason(contentId, postData.nextPageSeason, platform, 2);
            allEpisodes.push(...additional);
        }
        
        // Diğer sezonlar
        if (postData.season?.length > 1) {
            const otherSeasons = postData.season.slice(0, -1);
            
            for (const season of otherSeasons) {
                const seasonEpisodes = await getEpisodesFromSeason(contentId, season.id, platform, 1);
                allEpisodes.push(...seasonEpisodes);
            }
        }
        
        console.log(`[NetMirror] Loaded ${allEpisodes.filter(ep => ep !== null).length} total episodes`);
    }
    
    return {
        id: contentId,
        title: postData.title,
        description: postData.desc,
        year: postData.year,
        episodes: allEpisodes,
        seasons: postData.season || [],
        isMovie
    };
}

// ==================== STREAMING LINKS ====================

async function getStreamingLinks(contentId, title, platform) {
    console.log(`[NetMirror] Getting streaming links for: ${title}`);
    
    const cookie = await bypassAuth();
    const cookieStr = getCookieString(platform, cookie);
    
    const response = await makeRequest(
        `${CONFIG.NETMIRROR_BASE}/tv/playlist.php?id=${contentId}&t=${encodeURIComponent(title)}&tm=${getUnixTime()}`,
        { cookie: cookieStr, headers: { 'Referer': `${CONFIG.NETMIRROR_BASE}/tv/home` } }
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
                let fullUrl = source.file.replace('/tv/', '/');
                if (!fullUrl.startsWith('/')) fullUrl = '/' + fullUrl;
                fullUrl = CONFIG.NETMIRROR_BASE + fullUrl;
                
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
                    let fullSubUrl = track.file;
                    if (track.file.startsWith('/') && !track.file.startsWith('//')) {
                        fullSubUrl = CONFIG.NETMIRROR_BASE + track.file;
                    } else if (track.file.startsWith('//')) {
                        fullSubUrl = 'https:' + track.file;
                    }
                    
                    subtitles.push({
                        url: fullSubUrl,
                        language: track.label
                    });
                });
        }
    });
    
    console.log(`[NetMirror] Found ${sources.length} streaming sources and ${subtitles.length} subtitle tracks`);
    return { sources, subtitles };
}

// ==================== EPISODE FINDER ====================

function findEpisodeId(episodes, season, episode) {
    if (!episodes?.length) {
        console.log('[NetMirror] No episodes found in content data');
        return null;
    }
    
    const validEpisodes = episodes.filter(ep => ep !== null);
    console.log(`[NetMirror] Found ${validEpisodes.length} valid episodes`);
    
    const targetEpisode = validEpisodes.find(ep => {
        let epSeason, epNumber;
        
        if (ep.s && ep.ep) {
            epSeason = parseInt(ep.s.replace('S', ''));
            epNumber = parseInt(ep.ep.replace('E', ''));
        } else if (ep.season && ep.episode) {
            epSeason = parseInt(ep.season);
            epNumber = parseInt(ep.episode);
        } else if (ep.season_number && ep.episode_number) {
            epSeason = parseInt(ep.season_number);
            epNumber = parseInt(ep.episode_number);
        } else {
            return false;
        }
        
        return epSeason === season && epNumber === episode;
    });
    
    if (targetEpisode) {
        console.log(`[NetMirror] Found target episode:`, targetEpisode);
        return targetEpisode.id;
    }
    
    console.log(`[NetMirror] Target episode S${season}E${episode} not found`);
    return null;
}

// ==================== SIMILARITY CALCULATION ====================

function calculateSimilarity(str1, str2) {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    
    if (s1 === s2) return 1.0;
    
    const words1 = s1.split(/\s+/).filter(w => w.length > 0);
    const words2 = s2.split(/\s+/).filter(w => w.length > 0);
    
    if (words2.length <= words1.length) {
        let exactMatches = 0;
        for (const queryWord of words2) {
            if (words1.includes(queryWord)) exactMatches++;
        }
        
        if (exactMatches === words2.length) {
            return 0.95 * (exactMatches / words1.length);
        }
    }
    
    if (s1.startsWith(s2)) return 0.9;
    
    return 0;
}

function filterRelevantResults(searchResults, query) {
    const filtered = searchResults.filter(result => calculateSimilarity(result.title, query) >= 0.7);
    return filtered.sort((a, b) => {
        const simA = calculateSimilarity(a.title, query);
        const simB = calculateSimilarity(b.title, query);
        return simB - simA;
    });
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
    // Önce sadece başlıkla dene
    let searchResults = await searchContent(title, platform);
    
    // Sonuç yoksa ve yıl varsa yıllı dene
    if (!searchResults.length && year) {
        console.log(`[NetMirror] No results for "${title}", trying with year...`);
        searchResults = await searchContent(`${title} ${year}`, platform);
    }
    
    if (!searchResults.length) return null;
    
    // Alakalı sonuçları filtrele
    const relevantResults = filterRelevantResults(searchResults, title);
    if (!relevantResults.length) {
        console.log(`[NetMirror] Found ${searchResults.length} results but none were relevant enough`);
        return null;
    }
    
    const selectedContent = relevantResults[0];
    console.log(`[NetMirror] Selected: ${selectedContent.title} (ID: ${selectedContent.id})`);
    
    const contentData = await loadContent(selectedContent.id, platform);
    let targetContentId = selectedContent.id;
    let episodeData = null;
    
    // TV dizisi için bölüm bul
    if (mediaType === 'tv' && !contentData.isMovie) {
        const validEpisodes = contentData.episodes.filter(ep => ep !== null);
        episodeData = validEpisodes.find(ep => {
            let epSeason, epNumber;
            
            if (ep.s && ep.ep) {
                epSeason = parseInt(ep.s.replace('S', ''));
                epNumber = parseInt(ep.ep.replace('E', ''));
            } else if (ep.season && ep.episode) {
                epSeason = parseInt(ep.season);
                epNumber = parseInt(ep.episode);
            } else if (ep.season_number && ep.episode_number) {
                epSeason = parseInt(ep.season_number);
                epNumber = parseInt(ep.episode_number);
            }
            
            return epSeason === (seasonNum || 1) && epNumber === (episodeNum || 1);
        });
        
        if (episodeData) {
            targetContentId = episodeData.id;
            console.log(`[NetMirror] Found episode ID: ${episodeData.id}`);
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
        const urlQualityMatch = source.url.match(/[?&]q=(\d+p)/i);
        const labelQualityMatch = source.quality?.match(/(\d+p)/i);
        
        if (urlQualityMatch) {
            quality = urlQualityMatch[1];
        } else if (labelQualityMatch) {
            quality = labelQualityMatch[1];
        } else if (source.quality) {
            const normalized = source.quality.toLowerCase();
            if (normalized.includes('1080')) quality = '1080p';
            else if (normalized.includes('720')) quality = '720p';
            else if (normalized.includes('480')) quality = '480p';
            else quality = source.quality;
        }
        
        // Başlık oluştur
        let streamTitle = `${title} ${year ? `(${year})` : ''} ${quality}`;
        if (mediaType === 'tv') {
            const episodeName = episodeData?.t || '';
            streamTitle += ` S${seasonNum}E${episodeNum}`;
            if (episodeName) streamTitle += ` - ${episodeName}`;
        }
        
        // Platform bazlı header'lar
        const isNfOrPv = ['netflix', 'primevideo'].includes(platform.toLowerCase());
        const headers = {
            "Accept": "application/vnd.apple.mpegurl, video/mp4, */*",
            "Origin": "https://net22.cc",
            "Referer": isNfOrPv ? "https://net22.cc/" : "https://net22.cc/tv/home",
            "Cookie": "hd=on",
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/138.0.7204.156 Mobile/15E148 Safari/604.1"
        };
        
        return {
            name: `NetMirror (${platform.charAt(0).toUpperCase() + platform.slice(1)})`,
            title: streamTitle,
            url: source.url,
            quality: quality,
            type: source.type?.includes('mpegURL') ? 'hls' : 'direct',
            headers
        };
    });
    
    // Sırala: Auto önce, sonra kaliteye göre (yüksekten düşüğe)
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

// ES Module
export { getStreams, searchContent, loadContent, getStreamingLinks };

// CommonJS (Node.js uyumluluğu)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams, searchContent, loadContent, getStreamingLinks };
}

// Global (React Native veya tarayıcı)
if (typeof global !== 'undefined') {
    global.NetMirror = { getStreams, searchContent, loadContent, getStreamingLinks };
}
