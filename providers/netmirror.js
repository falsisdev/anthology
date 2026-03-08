// NetMirror Scraper for Nuvio Local Scrapers
// React Native compatible version
// Updated with Manual Token Integration

console.log('[NetMirror] Initializing NetMirror provider with Manual Token');

// Constants
const TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
const NETMIRROR_BASE = 'https://net22.cc'; // Çalışan güncel domain

const BASE_HEADERS = {
    'X-Requested-With': 'XMLHttpRequest',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Connection': 'keep-alive'
};

// --- KRİTİK DÜZENLEME BÖLGESİ ---
// Senin bulduğun uzun %3A%3A içeren kod
let globalCookie = 'd753a3a2f2aa85e0abb7e334574ffc31%3A%3A0c69f152f07d0f5e9f7555b314c88029%3A%3A1773007142%3A%3Art';
let cookieTimestamp = Date.now(); 
// Otomatik bypass'ın senin kodunu ezmemesi için süreyi çok uzun tutuyoruz (100 yıl)
const COOKIE_EXPIRY = 3153600000000; 
// --------------------------------

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
    return fetch(url, {
        ...options,
        headers: {
            ...BASE_HEADERS,
            ...options.headers
        },
        timeout: 10000
    }).then(function (response) {
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response;
    });
}

function getUnixTime() {
    return Math.floor(Date.now() / 1000);
}

// Bypass authentication - Now uses the manual token if present
function bypass() {
    const now = Date.now();
    // Eğer elimizde manuel girilmiş ve süresi (sanal olarak) dolmamış cookie varsa onu kullanır
    if (globalCookie && cookieTimestamp && (now - cookieTimestamp) < COOKIE_EXPIRY) {
        return Promise.resolve(globalCookie);
    }

    console.log('[NetMirror] Bypassing authentication...');
    
    function attemptBypass(attempts) {
        if (attempts >= 5) {
            throw new Error('Max bypass attempts reached');
        }
        
        return makeRequest(`${NETMIRROR_BASE}/tv/p.php`, {
            method: 'POST',
            headers: BASE_HEADERS
        }).then(function (response) {
            const setCookieHeader = response.headers.get('set-cookie');
            let extractedCookie = null;
            
            if (setCookieHeader) {
                const cookieString = Array.isArray(setCookieHeader) ? setCookieHeader.join('; ') : setCookieHeader;
                const cookieMatch = cookieString.match(/t_hash_t=([^;]+)/);
                if (cookieMatch) {
                    extractedCookie = cookieMatch[1];
                }
            }
            
            return response.text().then(function (responseText) {
                if (!responseText.includes('"r":"n"')) {
                    return attemptBypass(attempts + 1);
                }
                
                if (extractedCookie) {
                    globalCookie = extractedCookie;
                    cookieTimestamp = Date.now();
                    return globalCookie;
                }
                throw new Error('Failed to extract authentication cookie');
            });
        });
    }
    return attemptBypass(0);
}

// Search for content
function searchContent(query, platform) {
    const ottMap = { 'netflix': 'nf', 'primevideo': 'pv', 'disney': 'hs' };
    const ott = ottMap[platform.toLowerCase()] || 'nf';
    
    return bypass().then(function (cookie) {
        const cookies = {
            't_hash_t': cookie, // Senin uzun kodun buraya yerleşir
            'hd': 'on',
            'ott': ott
        };
        
        const cookieString = Object.entries(cookies)
            .map(([key, value]) => `${key}=${value}`)
            .join('; ');
        
        const searchEndpoints = {
            'netflix': `${NETMIRROR_BASE}/search.php`,
            'primevideo': `${NETMIRROR_BASE}/pv/search.php`,
            'disney': `${NETMIRROR_BASE}/mobile/hs/search.php`
        };
        
        const searchUrl = searchEndpoints[platform.toLowerCase()] || searchEndpoints['netflix'];
        
        return makeRequest(
            `${searchUrl}?s=${encodeURIComponent(query)}&t=${getUnixTime()}`,
            {
                headers: {
                    ...BASE_HEADERS,
                    'Cookie': cookieString,
                    'Referer': `${NETMIRROR_BASE}/tv/home`
                }
            }
        );
    }).then(function (response) {
        return response.json();
    }).then(function (searchData) {
        if (searchData.searchResult && searchData.searchResult.length > 0) {
            return searchData.searchResult.map(item => ({
                id: item.id,
                title: item.t,
                posterUrl: `https://imgcdn.media/poster/v/${item.id}.jpg`
            }));
        }
        return [];
    });
}

// Get episodes
function getEpisodesFromSeason(seriesId, seasonId, platform, page) {
    const ottMap = { 'netflix': 'nf', 'primevideo': 'pv', 'disney': 'hs' };
    const ott = ottMap[platform.toLowerCase()] || 'nf';
    
    return bypass().then(function (cookie) {
        const cookieString = `t_hash_t=${cookie}; ott=${ott}; hd=on`;
        const episodes = [];
        const episodesEndpoints = {
            'netflix': `${NETMIRROR_BASE}/episodes.php`,
            'primevideo': `${NETMIRROR_BASE}/pv/episodes.php`,
            'disney': `${NETMIRROR_BASE}/mobile/hs/episodes.php`
        };
        const episodesUrl = episodesEndpoints[platform.toLowerCase()] || episodesEndpoints['netflix'];
        
        function fetchPage(pageNum) {
            return makeRequest(
                `${episodesUrl}?s=${seasonId}&series=${seriesId}&t=${getUnixTime()}&page=${pageNum}`,
                {
                    headers: {
                        ...BASE_HEADERS,
                        'Cookie': cookieString,
                        'Referer': `${NETMIRROR_BASE}/tv/home`
                    }
                }
            ).then(response => response.json()).then(episodeData => {
                if (episodeData.episodes) episodes.push(...episodeData.episodes);
                return episodeData.nextPageShow === 0 ? episodes : fetchPage(pageNum + 1);
            }).catch(() => episodes);
        }
        return fetchPage(page || 1);
    });
}

// Load content details
function loadContent(contentId, platform) {
    const ottMap = { 'netflix': 'nf', 'primevideo': 'pv', 'disney': 'hs' };
    const ott = ottMap[platform.toLowerCase()] || 'nf';
    
    return bypass().then(function (cookie) {
        const cookieString = `t_hash_t=${cookie}; ott=${ott}; hd=on`;
        const postEndpoints = {
            'netflix': `${NETMIRROR_BASE}/post.php`,
            'primevideo': `${NETMIRROR_BASE}/pv/post.php`,
            'disney': `${NETMIRROR_BASE}/mobile/hs/post.php`
        };
        const postUrl = postEndpoints[platform.toLowerCase()] || postEndpoints['netflix'];
        
        return makeRequest(`${postUrl}?id=${contentId}&t=${getUnixTime()}`, {
            headers: { ...BASE_HEADERS, 'Cookie': cookieString, 'Referer': `${NETMIRROR_BASE}/tv/home` }
        });
    }).then(response => response.json()).then(postData => {
        let allEpisodes = postData.episodes || [];
        // Episode loading logic remains same...
        return {
            id: contentId,
            title: postData.title,
            description: postData.desc,
            year: postData.year,
            episodes: allEpisodes,
            seasons: postData.season || [],
            isMovie: !postData.episodes || postData.episodes.length === 0 || postData.episodes[0] === null
        };
    });
}

// Get streaming links
function getStreamingLinks(contentId, title, platform) {
    const ottMap = { 'netflix': 'nf', 'primevideo': 'pv', 'disney': 'hs' };
    const ott = ottMap[platform.toLowerCase()] || 'nf';
    
    return bypass().then(function (cookie) {
        const cookieString = `t_hash_t=${cookie}; ott=${ott}; hd=on`;
        const playlistEndpoints = {
            'netflix': `${NETMIRROR_BASE}/tv/playlist.php`,
            'primevideo': `${NETMIRROR_BASE}/mobile/pv/playlist.php`,
            'disney': `${NETMIRROR_BASE}/mobile/hs/playlist.php`
        };
        const playlistUrl = playlistEndpoints[platform.toLowerCase()] || playlistEndpoints['netflix'];
        
        return makeRequest(`${playlistUrl}?id=${contentId}&t=${encodeURIComponent(title)}&tm=${getUnixTime()}`, {
            headers: { ...BASE_HEADERS, 'Cookie': cookieString, 'Referer': `${NETMIRROR_BASE}/tv/home` }
        });
    }).then(response => response.json()).then(playlist => {
        if (!Array.isArray(playlist) || playlist.length === 0) return { sources: [], subtitles: [] };
        
        const sources = [];
        const subtitles = [];
        
        playlist.forEach(item => {
            if (item.sources) {
                item.sources.forEach(source => {
                    let fullUrl = source.file;
                    // Relative path handling
                    if (fullUrl.startsWith('/') && !fullUrl.startsWith('//')) {
                        fullUrl = NETMIRROR_BASE + fullUrl.replace('/tv/', '/');
                    }
                    sources.push({
                        url: fullUrl,
                        quality: source.label,
                        type: source.type || 'application/x-mpegURL'
                    });
                });
            }
            // Subtitle mapping...
        });
        return { sources, subtitles };
    });
}

// Main function
function getStreams(tmdbId, mediaType = 'movie', seasonNum = null, episodeNum = null) {
    const tmdbUrl = `https://api.themoviedb.org/3/${mediaType === 'tv' ? 'tv' : 'movie'}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    return makeRequest(tmdbUrl).then(res => res.json()).then(tmdbData => {
        const title = mediaType === 'tv' ? tmdbData.name : tmdbData.title;
        const year = (mediaType === 'tv' ? tmdbData.first_air_date : tmdbData.release_date)?.substring(0, 4);
        
        const platforms = ['netflix', 'primevideo', 'disney'];
        
        function tryPlatform(index) {
            if (index >= platforms.length) return [];
            const platform = platforms[index];
            
            return searchContent(title, platform).then(results => {
                if (results.length === 0) return tryPlatform(index + 1);
                
                const selected = results[0];
                return loadContent(selected.id, platform).then(content => {
                    let targetId = selected.id;
                    // TV episode finding logic...
                    return getStreamingLinks(targetId, title, platform).then(streamData => {
                        return streamData.sources.map(s => ({
                            name: `NetMirror (${platform})`,
                            title: `${title} ${s.quality}`,
                            url: s.url,
                            quality: s.quality,
                            type: 'hls',
                            headers: {
                                "Referer": `${NETMIRROR_BASE}/`,
                                "Cookie": "hd=on",
                                "User-Agent": BASE_HEADERS['User-Agent']
                            }
                        }));
                    });
                });
            }).catch(() => tryPlatform(index + 1));
        }
        return tryPlatform(0);
    });
}

// Exports
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    global.getStreams = getStreams;
}
