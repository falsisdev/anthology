// Vidlink Scraper for Nuvio Local Scrapers
// React Native compatible version - Standalone (no external dependencies)
// Converted to Promise-based syntax for sandbox compatibility

// Constants
const TMDB_API_KEY = "68e094699525b18a70bab2f86b1fa706";
const ENC_DEC_API = "https://enc-dec.app/api";
const VIDLINK_API = "https://vidlink.pro/api/b";

// Required headers for Vidlink requests
const VIDLINK_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
    "Connection": "keep-alive",
    "Referer": "https://vidlink.pro/",
    "Origin": "https://vidlink.pro"
};

// Helper function to make HTTP requests with default headers
function makeRequest(url, options = {}) {
    const defaultHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
        'Accept': 'application/json,*/*',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        ...options.headers
    };

    return fetch(url, {
        method: options.method || 'GET',
        headers: defaultHeaders,
        ...options
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response;
    })
    .catch(error => {
        console.error(`[Vidlink] Request failed for ${url}: ${error.message}`);
        throw error;
    });
}

// M3U8 Parsing Functions

// Parse M3U8 content and extract quality streams
function parseM3U8(content, baseUrl) {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);
    const streams = [];
    let currentStream = null;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (line.startsWith('#EXT-X-STREAM-INF:')) {
            currentStream = { bandwidth: null, resolution: null, url: null };
            
            const bandwidthMatch = line.match(/BANDWIDTH=(\d+)/);
            if (bandwidthMatch) {
                currentStream.bandwidth = parseInt(bandwidthMatch[1]);
            }
            
            const resolutionMatch = line.match(/RESOLUTION=(\d+x\d+)/);
            if (resolutionMatch) {
                currentStream.resolution = resolutionMatch[1];
            }
        } else if (currentStream && !line.startsWith('#')) {
            currentStream.url = resolveUrl(line, baseUrl);
            streams.push(currentStream);
            currentStream = null;
        }
    }
    return streams;
}

// Resolve relative URLs against base URL
function resolveUrl(url, baseUrl) {
    if (url.startsWith('http')) {
        return url;
    }
    try {
        return new URL(url, baseUrl).toString();
    } catch (error) {
        console.error(`[Vidlink] Could not resolve URL: ${url} against ${baseUrl}`);
        return url;
    }
}

// Determine quality from resolution
function getQualityFromResolution(resolution) {
    if (!resolution) return 'Auto';
    
    const [width, height] = resolution.split('x').map(Number);
    
    if (height >= 2160) return '4K';
    if (height >= 1440) return '1440p';
    if (height >= 1080) return '1080p';
    if (height >= 720) return '720p';
    if (height >= 480) return '480p';
    if (height >= 360) return '360p';
    return '240p';
}

// Fetch and parse M3U8 playlist to extract quality variants
function fetchAndParseM3U8(playlistUrl, mediaInfo) {
    console.log(`[Vidlink] Fetching M3U8 playlist: ${playlistUrl.substring(0, 80)}...`);
    
    return makeRequest(playlistUrl, { headers: VIDLINK_HEADERS })
        .then(response => response.text())
        .then(m3u8Content => {
            console.log(`[Vidlink] Parsing M3U8 content`);
            const parsedStreams = parseM3U8(m3u8Content, playlistUrl);
            
            if (parsedStreams.length === 0) {
                console.log('[Vidlink] No quality variants found, returning master playlist');
                // Fallback: return the master playlist as Auto quality
                return [{
                    name: 'Vidlink - Auto',
                    title: mediaInfo.title,
                    url: playlistUrl,
                    quality: 'Auto',
                    size: 'ALTYAZILI',    //'Unknown',
                    headers: VIDLINK_HEADERS,
                    provider: 'vidlink'
                }];
            }
            
            console.log(`[Vidlink] Found ${parsedStreams.length} quality variants`);
            
            // Convert parsed streams to Nuvio format
            const streams = parsedStreams.map(stream => {
                const quality = getQualityFromResolution(stream.resolution);
                return {
                    name: `Vidlink - ${quality}`,
                    title: mediaInfo.title,
                    url: stream.url,
                    quality: quality,
                    size: 'ALTYAZILI',    //'Unknown',
                    headers: VIDLINK_HEADERS,
                    provider: 'vidlink'
                };
            });
            
            return streams;
        })
        .catch(error => {
            console.error(`[Vidlink] Error fetching/parsing M3U8: ${error.message}`);
            // Fallback: return the master playlist URL
            return [{
                name: 'Vidlink - Auto',
                title: mediaInfo.title,
                url: playlistUrl,
                quality: 'Auto',
                size: 'ALTYAZILI',    //'Unknown',
                headers: VIDLINK_HEADERS,
                provider: 'vidlink'
            }];
        });
}

// Helper function to get TMDB info
function getTmdbInfo(tmdbId, mediaType) {
    const url = `https://api.themoviedb.org/3/${mediaType === 'tv' ? 'tv' : 'movie'}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    
    return makeRequest(url)
    .then(response => response.json())
    .then(data => {
        const title = mediaType === 'tv' ? data.name : data.title;
        const year = mediaType === 'tv' ? data.first_air_date?.substring(0, 4) : data.release_date?.substring(0, 4);
        
        if (!title) {
            throw new Error('Could not extract title from TMDB response');
        }
        
        console.log(`[Vidlink] TMDB Info: "${title}" (${year})`);
        return { title, year, data };
    });
}

// Encrypt TMDB ID using enc-dec.app API
function encryptTmdbId(tmdbId) {
    console.log(`[Vidlink] Encrypting TMDB ID: ${tmdbId}`);
    
    return makeRequest(`${ENC_DEC_API}/enc-vidlink?text=${tmdbId}`)
    .then(response => response.json())
    .then(data => {
        if (data && data.result) {
            console.log(`[Vidlink] Successfully encrypted TMDB ID`);
            return data.result;
        } else {
            throw new Error('Invalid encryption response format');
        }
    })
    .catch(error => {
        console.error(`[Vidlink] Encryption failed: ${error.message}`);
        throw error;
    });
}


/**
 * Vidlink Scraper - Nuvio Provider
 * Optimized for Language in Quality & Global Export
 */


function extractQuality(streamData) {
    if (!streamData) return 'Unknown';
    const qualityFields = ['quality', 'resolution', 'label', 'name'];
    for (const field of qualityFields) {
        if (streamData[field]) {
            const quality = streamData[field].toString().toLowerCase();
            if (quality.includes('2160') || quality.includes('4k')) return '4K';
            if (quality.includes('1440') || quality.includes('2k')) return '1440p';
            if (quality.includes('1080') || quality.includes('fhd')) return '1080p';
            if (quality.includes('720') || quality.includes('hd')) return '720p';
            if (quality.includes('480') || quality.includes('sd')) return '480p';
            if (quality.includes('360')) return '360p';
            const match = quality.match(/(\d{3,4})[pP]?/);
            if (match) {
                const res = parseInt(match[1]);
                if (res >= 2160) return '4K';
                if (res >= 1080) return '1080p';
                if (res >= 720) return '720p';
                return '480p';
            }
        }
    }
    return 'Unknown';
}


// Yardımcı Fonksiyon: Dil tespiti (Kodun en başında olmalı)
function extractLanguage(data, url = "") {
    try {
        if (!data && !url) return "EN";
        const dataString = data ? JSON.stringify(data) : "";
        const searchString = (dataString + (url || "")).toLowerCase();
        
        if (searchString.includes("turkish") || searchString.includes("dublaj") || 
            searchString.includes(" tr") || searchString.includes("-tr") || 
            searchString.includes("/tr/")) return "TR";
            
        if (searchString.includes("multi") || searchString.includes("dual")) return "MULTI";
    } catch (e) {
        return "EN";
    }
    return "EN";
}

// Process Vidlink API response
function processVidlinkResponse(data, mediaInfo) {
    const streams = [];
    const safeMediaInfo = mediaInfo || { title: 'Unknown' };
    
    try {
        console.log(`[Vidlink] Processing response data`);
        
        // 1. Handle Vidlink's specific response format with stream.qualities
        if (data.stream && data.stream.qualities) {
            Object.entries(data.stream.qualities).forEach(([qualityKey, qualityData]) => {
                if (qualityData.url) {
                    const quality = extractQuality({ quality: qualityKey });
                    const lang = extractLanguage(qualityData, qualityData.url); // DİL TESPİTİ
                    
                    const streamTitle = safeMediaInfo.mediaType === 'tv' && safeMediaInfo.season && safeMediaInfo.episode 
                        ? `${safeMediaInfo.title} S${String(safeMediaInfo.season).padStart(2, '0')}E${String(safeMediaInfo.episode).padStart(2, '0')}`
                        : safeMediaInfo.year 
                            ? `${safeMediaInfo.title} (${safeMediaInfo.year})`
                            : safeMediaInfo.title;
                    
                    streams.push({
                        name: `Vidlink`,
                        title: streamTitle,
                        url: qualityData.url,
                        quality: `${quality} [${lang}]`, // KALİTE + DİL
                        size: 'ALTYAZILI',    //'Unknown',
                        headers: VIDLINK_HEADERS,
                        provider: 'vidlink'
                    });
                }
            });
            
            if (data.stream.playlist) {
                const lang = extractLanguage(data.stream, data.stream.playlist); // PLAYLIST DİL
                const streamTitle = safeMediaInfo.mediaType === 'tv' && safeMediaInfo.season && safeMediaInfo.episode 
                    ? `${safeMediaInfo.title} S${String(safeMediaInfo.season).padStart(2, '0')}E${String(safeMediaInfo.episode).padStart(2, '0')}`
                    : safeMediaInfo.year 
                        ? `${safeMediaInfo.title} (${safeMediaInfo.year})`
                        : safeMediaInfo.title;
                
                streams.push({
                    _isPlaylist: true,
                    url: data.stream.playlist,
                    mediaInfo: { ...safeMediaInfo, title: streamTitle, lang: lang } // DİLİ PASLA
                });
            }
        }
        // 2. Handle playlist-only responses
        else if (data.stream && data.stream.playlist && !data.stream.qualities) {
            const lang = extractLanguage(data.stream, data.stream.playlist);
            const streamTitle = safeMediaInfo.mediaType === 'tv' && safeMediaInfo.season && safeMediaInfo.episode 
                ? `${safeMediaInfo.title} S${String(safeMediaInfo.season).padStart(2, '0')}E${String(safeMediaInfo.episode).padStart(2, '0')}`
                : safeMediaInfo.year 
                    ? `${safeMediaInfo.title} (${safeMediaInfo.year})`
                    : safeMediaInfo.title;
            
            streams.push({
                _isPlaylist: true,
                url: data.stream.playlist,
                mediaInfo: { ...safeMediaInfo, title: streamTitle, lang: lang }
            });
        }
        // 3. Handle single stream URL
        else if (data.url) {
            const quality = extractQuality(data);
            const lang = extractLanguage(data, data.url);
            const streamTitle = safeMediaInfo.mediaType === 'tv' && safeMediaInfo.season && safeMediaInfo.episode 
                ? `${safeMediaInfo.title} S${String(safeMediaInfo.season).padStart(2, '0')}E${String(safeMediaInfo.episode).padStart(2, '0')}`
                : safeMediaInfo.year 
                    ? `${safeMediaInfo.title} (${safeMediaInfo.year})`
                    : safeMediaInfo.title;
            
            streams.push({
                name: `Vidlink`,
                title: streamTitle,
                url: data.url,
                quality: `${quality} [${lang}]`,
               size: 'ALTYAZILI',    //'Unknown',
                headers: VIDLINK_HEADERS,
                provider: 'vidlink'
            });
        }
        // 4. Handle multiple streams array
        else if (data.streams && Array.isArray(data.streams)) {
            data.streams.forEach((stream, index) => {
                if (stream.url) {
                    const quality = extractQuality(stream);
                    const lang = extractLanguage(stream, stream.url);
                    const streamTitle = safeMediaInfo.mediaType === 'tv' && safeMediaInfo.season && safeMediaInfo.episode 
                        ? `${safeMediaInfo.title} S${String(safeMediaInfo.season).padStart(2, '0')}E${String(safeMediaInfo.episode).padStart(2, '0')}`
                        : safeMediaInfo.year 
                            ? `${safeMediaInfo.title} (${safeMediaInfo.year})`
                            : safeMediaInfo.title;
                    
                    streams.push({
                        name: `Vidlink Stream ${index + 1}`,
                        title: streamTitle,
                        url: stream.url,
                        quality: `${quality} [${lang}]`,
                        size: stream.size || 'ALTYAZILI',    //'Unknown',
                        headers: VIDLINK_HEADERS,
                        provider: 'vidlink'
                    });
                }
            });
        }
        
    } catch (error) {
        console.error(`[Vidlink] Error processing response: ${error.message}`);
    }
    
    return streams;
}

// getStreams fonksiyonu aynen kalıyor, sadece processVidlinkResponse içindeki dil geliştirmelerini kullanıyor.
function getStreams(tmdbId, mediaType = 'movie', seasonNum = null, episodeNum = null) {
    console.log(`[Vidlink] Fetching streams for TMDB ID: ${tmdbId}`);
    
    return getTmdbInfo(tmdbId, mediaType)
    .then(tmdbInfo => {
        const { title, year } = tmdbInfo;
        return encryptTmdbId(tmdbId)
        .then(encryptedId => {
            let vidlinkUrl;
            if (mediaType === 'tv' && seasonNum && episodeNum) {
                vidlinkUrl = `${VIDLINK_API}/tv/${encryptedId}/${seasonNum}/${episodeNum}`;
            } else {
                vidlinkUrl = `${VIDLINK_API}/movie/${encryptedId}`;
            }
            
            return makeRequest(vidlinkUrl, { headers: VIDLINK_HEADERS })
            .then(response => response.json())
            .then(data => {
                const mediaInfo = { title, year, mediaType, season: seasonNum, episode: episodeNum };
                const streams = processVidlinkResponse(data, mediaInfo);
                
                if (streams.length === 0) return [];
                
                const playlistStreams = streams.filter(s => s._isPlaylist);
                const directStreams = streams.filter(s => !s._isPlaylist);
                
                if (playlistStreams.length > 0) {
                    const playlistPromises = playlistStreams.map(ps => 
                        fetchAndParseM3U8(ps.url, ps.mediaInfo)
                    );
                    
                    return Promise.all(playlistPromises)
                        .then(parsedStreamArrays => {
                            const allStreams = directStreams.concat(...parsedStreamArrays);
                            const qualityOrder = { '4K': 5, '1440p': 4, '1080p': 3, '720p': 2, '480p': 1, '360p': 0, '240p': -1, 'Auto': -2, 'Unknown': -3 };
                            allStreams.sort((a, b) => (qualityOrder[b.quality.split(' ')[0]] || -3) - (qualityOrder[a.quality.split(' ')[0]] || -3));
                            return allStreams;
                        });
                } else {
                    const qualityOrder = { '4K': 5, '1440p': 4, '1080p': 3, '720p': 2, '480p': 1, '360p': 0, '240p': -1, 'Auto': -2, 'Unknown': -3 };
                    directStreams.sort((a, b) => (qualityOrder[b.quality.split(' ')[0]] || -3) - (qualityOrder[a.quality.split(' ')[0]] || -3));
                    return directStreams;
                }
            });
        });
    })
    .catch(error => {
        console.error(`[Vidlink] Error in getStreams: ${error.message}`);
        return [];
    });
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    global.VidlinkScraperModule = { getStreams };
}
