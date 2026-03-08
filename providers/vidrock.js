// Vidrock Scraper for Nuvio Local Scrapers
// React Native compatible version - Promise-based approach only
// Extracts streaming links using TMDB ID for Vidrock servers with AES-CBC decryption

// TMDB API Configuration
const TMDB_API_KEY = '439c478a771f35c05022f9feabcca01c';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Vidrock Configuration
const VIDROCK_BASE_URL = 'https://vidrock.net';
const PASSPHRASE = 'x7k9mPqT2rWvY8zA5bC3nF6hJ2lK4mN9';
const USER_AGENT = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36';

// Working headers for Vidrock API
const WORKING_HEADERS = {
    'User-Agent': USER_AGENT,
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Referer': 'https://vidrock.net/',
    'Origin': 'https://vidrock.net',
    'DNT': '1'
};

// Minimal headers for stream playback (only essential headers)
const PLAYBACK_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
    'Referer': 'https://vidrock.net/',
    'Origin': 'https://vidrock.net'
};

// React Native-safe Base64 utilities (no Buffer dependency)
const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

function base64ToBytes(base64) {
    if (!base64) return new Uint8Array(0);
    
    // Remove padding
    let input = String(base64).replace(/=+$/, '');
    let output = '';
    let bc = 0, bs, buffer, idx = 0;
    
    while ((buffer = input.charAt(idx++))) {
        buffer = BASE64_CHARS.indexOf(buffer);
        if (~buffer) {
            bs = bc % 4 ? bs * 64 + buffer : buffer;
            if (bc++ % 4) {
                output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)));
            }
        }
    }
    
    // Convert string to bytes
    const bytes = new Uint8Array(output.length);
    for (let i = 0; i < output.length; i++) {
        bytes[i] = output.charCodeAt(i);
    }
    return bytes;
}

function bytesToBase64(bytes) {
    if (!bytes || bytes.length === 0) return '';
    
    let output = '';
    let i = 0;
    const len = bytes.length;
    
    while (i < len) {
        const a = bytes[i++];
        const b = i < len ? bytes[i++] : 0;
        const c = i < len ? bytes[i++] : 0;
        
        const bitmap = (a << 16) | (b << 8) | c;
        
        output += BASE64_CHARS.charAt((bitmap >> 18) & 63);
        output += BASE64_CHARS.charAt((bitmap >> 12) & 63);
        output += i - 2 < len ? BASE64_CHARS.charAt((bitmap >> 6) & 63) : '=';
        output += i - 1 < len ? BASE64_CHARS.charAt(bitmap & 63) : '=';
    }
    
    return output;
}

// AES-CBC Encryption using server (React Native compatible)
function encryptAesCbc(text, passphrase) {
    console.log('[Vidrock] Starting AES-CBC encryption via server...');
    
    return fetch('https://aesdec.nuvioapp.space/encrypt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            text: text,
            passphrase: passphrase,
            method: 'cbc'
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) throw new Error(data.error);
        console.log('[Vidrock] Server encryption successful');
        return data.encrypted;
    })
    .catch(error => {
        console.error(`[Vidrock] Server encryption failed: ${error.message}`);
        // Fallback: simple base64 encoding (not secure, but functional for testing)
        console.log('[Vidrock] Using fallback encoding...');
        const textBytes = new TextEncoder().encode(text);
        return bytesToBase64(textBytes);
    });
}

// AES-CBC Decryption using server (React Native compatible)
function decryptAesCbc(encryptedB64, passphraseB64) {
    console.log('[Vidrock] Starting AES-CBC decryption via server...');
    
    return fetch('http://localhost:3050/decrypt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            encryptedData: encryptedB64,
            passphrase: passphraseB64,
            method: 'cbc'
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) throw new Error(data.error);
        console.log('[Vidrock] Server decryption successful');
        return data.decrypted;
    })
    .catch(error => {
        console.error(`[Vidrock] Server decryption failed: ${error.message}`);
        throw error;
    });
}

// URL encode function (React Native compatible)
function urlEncode(str) {
    return encodeURIComponent(str);
}

// Validate stream URL accessibility
function validateStreamUrl(url, headers) {
    console.log(`[Vidrock] Validating stream URL: ${url.substring(0, 60)}...`);
    console.log(`[Vidrock] Using headers: ${headers && Object.keys(headers).length > 0 ? 'YES' : 'NO'}`);
    
    return fetch(url, {
        method: 'HEAD',
        headers: headers,
        timeout: 10000
    })
    .then(response => {
        // Accept 200 OK, 206 Partial Content, or 302 redirects
        const isValid = response.ok || response.status === 206 || response.status === 302;
        console.log(`[Vidrock] URL validation result: ${response.status} - ${isValid ? 'VALID' : 'INVALID'} - ${url.substring(0, 40)}...`);
        return isValid;
    })
    .catch(error => {
        console.log(`[Vidrock] URL validation failed: ${error.message} - ${url.substring(0, 40)}...`);
        return false;
    });
}

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
    const defaultHeaders = { ...WORKING_HEADERS };
    
    return fetch(url, {
        method: options.method || 'GET',
        headers: { ...defaultHeaders, ...options.headers },
        ...options
    }).then(function(response) {
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response;
    }).catch(function(error) {
        console.error(`[Vidrock] Request failed for ${url}: ${error.message}`);
        throw error;
    });
}

// Get movie/TV show details from TMDB
function getTMDBDetails(tmdbId, mediaType) {
    const endpoint = mediaType === 'tv' ? 'tv' : 'movie';
    const url = `${TMDB_BASE_URL}/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;
    
    return makeRequest(url)
        .then(function(response) {
            return response.json();
        })
        .then(function(data) {
            const title = mediaType === 'tv' ? data.name : data.title;
            const releaseDate = mediaType === 'tv' ? data.first_air_date : data.release_date;
            const year = releaseDate ? parseInt(releaseDate.split('-')[0]) : null;
            
            return {
                title: title,
                year: year,
                imdbId: data.external_ids?.imdb_id || null
            };
        });
}

// Extract quality from URL or response
function extractQuality(url) {
    if (!url) return 'Unknown';
    
    // Try to extract quality from URL patterns
    const qualityPatterns = [
        /(\d{3,4})p/i,  // 1080p, 720p, etc.
        /(\d{3,4})k/i,  // 1080k, 720k, etc.
        /quality[_-]?(\d{3,4})/i,  // quality-1080, quality_720, etc.
        /res[_-]?(\d{3,4})/i,  // res-1080, res_720, etc.
        /(\d{3,4})x\d{3,4}/i,  // 1920x1080, 1280x720, etc.
    ];

    for (const pattern of qualityPatterns) {
        const match = url.match(pattern);
        if (match) {
            const qualityNum = parseInt(match[1]);
            if (qualityNum >= 240 && qualityNum <= 4320) {
                return `${qualityNum}p`;
            }
        }
    }

    // Additional quality detection based on URL patterns
    if (url.includes('1080') || url.includes('1920')) return '1080p';
    if (url.includes('720') || url.includes('1280')) return '720p';
    if (url.includes('480') || url.includes('854')) return '480p';
    if (url.includes('360') || url.includes('640')) return '360p';
    if (url.includes('240') || url.includes('426')) return '240p';

    return 'Unknown';
}

// Determine if a stream needs headers based on server and URL patterns
function needsHeaders(serverName, url) {
    // Astra server always needs headers (proxy links)
    if (serverName === 'Astra') {
        return true;
    }
    
    // Servers that showed 403 errors need headers
    if (serverName === 'Atlas' && url.includes('hls1.vdrk.site')) {
        return true;
    }
    
    // Luna server needs headers (cdn.niggaflix.xyz returns 403 without headers)
    if (serverName === 'Luna' && url.includes('cdn.niggaflix.xyz')) {
        return true;
    }
    
    // Other servers that might need headers based on domain
    if (url.includes('cdn.vidrock.store') || url.includes('proxy.vidrock.store')) {
        return true;
    }
    
    // Default: no headers needed
    return false;
}

// Fetch and parse Astra server JSON to extract actual streaming links
function parseAstraPlaylist(playlistUrl, serverName, mediaInfo, seasonNum, episodeNum) {
    console.log(`[Vidrock] Fetching Astra playlist: ${playlistUrl}`);
    
    return fetch(playlistUrl, {
        method: 'GET',
        headers: PLAYBACK_HEADERS
    })
    .then(response => response.json())
    .then(data => {
        const streams = [];
        
        if (Array.isArray(data)) {
            data.forEach(item => {
                if (item.url && item.resolution) {
                    const quality = `${item.resolution}p`;
                    
                    // Create media title
                    let mediaTitle = mediaInfo.title || 'Unknown';
                    if (mediaInfo.year) {
                        mediaTitle += ` (${mediaInfo.year})`;
                    }
                    if (seasonNum && episodeNum) {
                        mediaTitle = `${mediaInfo.title} S${String(seasonNum).padStart(2, '0')}E${String(episodeNum).padStart(2, '0')}`;
                    }
                    
                    // Astra streams always need headers
                    const streamHeaders = PLAYBACK_HEADERS;
                    
                    streams.push({
                        name: `Vidrock ${serverName} - ${quality}`,
                        title: mediaTitle,
                        url: item.url,
                        quality: quality,
                        size: 'Unknown',
                        headers: streamHeaders,
                        provider: 'vidrock'
                    });
                    
                    console.log(`[Vidrock] Added ${quality} stream from ${serverName}: ${item.url}`);
                }
            });
        }
        
        return streams;
    })
    .catch(error => {
        console.error(`[Vidrock] Error parsing Astra playlist: ${error.message}`);
        return [];
    });
}

// Process Vidrock API response
function processVidrockResponse(data, mediaInfo, seasonNum, episodeNum) {
    const streams = [];
    const astraPromises = [];
    
    try {
        console.log(`[Vidrock] Processing response:`, JSON.stringify(data, null, 2));
        
        // Check if response has valid streams
        if (!data || typeof data !== 'object') {
            console.log(`[Vidrock] No valid response data found`);
            return Promise.resolve(streams);
        }
        
        // Process each server
        Object.keys(data).forEach(serverName => {
            const source = data[serverName];
            
            if (!source || !source.url) {
                console.log(`[Vidrock] ${serverName}: No URL found`);
                return;
            }
            
            const videoUrl = source.url;
            
            // Check if this is Astra server (returns JSON playlist)
            if (serverName === 'Astra' && videoUrl.includes('cdn.vidrock.store/playlist/')) {
                console.log(`[Vidrock] Detected Astra server, will parse JSON playlist`);
                astraPromises.push(parseAstraPlaylist(videoUrl, serverName, mediaInfo, seasonNum, episodeNum));
                return;
            }
            
            // Extract quality
            let quality = extractQuality(videoUrl);
            
            // Extract language information
            let languageInfo = '';
            if (source.language) {
                languageInfo = ` [${source.language}]`;
            }
            
            // Determine stream type
            let streamType = 'Unknown';
            if (source.type === 'hls' || videoUrl.includes('.m3u8')) {
                streamType = 'HLS';
                if (quality === 'Unknown') {
                    quality = 'Adaptive'; // HLS streams are usually adaptive
                }
            } else if (videoUrl.includes('.mp4')) {
                streamType = 'MP4';
            } else if (videoUrl.includes('.mkv')) {
                streamType = 'MKV';
            }
            
            // Create media title
            let mediaTitle = mediaInfo.title || 'Unknown';
            if (mediaInfo.year) {
                mediaTitle += ` (${mediaInfo.year})`;
            }
            if (seasonNum && episodeNum) {
                mediaTitle = `${mediaInfo.title} S${String(seasonNum).padStart(2, '0')}E${String(episodeNum).padStart(2, '0')}`;
            }
            
            // Determine if this stream needs headers
            const streamHeaders = needsHeaders(serverName, videoUrl) ? PLAYBACK_HEADERS : undefined;
            
            streams.push({
                name: `Vidrock ${serverName}${languageInfo} - ${quality}`,
                title: mediaTitle,
                url: videoUrl,
                quality: quality,
                size: 'Unknown',
                headers: streamHeaders,
                provider: 'vidrock'
            });
            
            console.log(`[Vidrock] Added ${quality}${languageInfo} stream from ${serverName}: ${videoUrl}`);
        });
        
        // Wait for all Astra playlist parsing to complete
        if (astraPromises.length > 0) {
            return Promise.all(astraPromises)
                .then(astraResults => {
                    astraResults.forEach(astraStreams => {
                        streams.push(...astraStreams);
                    });
                    return streams;
                });
        }
        
        return Promise.resolve(streams);
        
    } catch (error) {
        console.error(`[Vidrock] Error processing response: ${error.message}`);
        return Promise.resolve(streams);
    }
}

// Fetch streams from Vidrock API
function fetchFromVidrock(mediaType, tmdbId, mediaInfo, seasonNum, episodeNum) {
    console.log(`[Vidrock] Fetching streams for ${mediaType} ID: ${tmdbId}...`);
    
    // Build item ID for encryption
    let itemId;
    if (mediaType === 'tv' && seasonNum && episodeNum) {
        itemId = `${tmdbId}_${seasonNum}_${episodeNum}`;
    } else {
        itemId = tmdbId.toString();
    }
    
    console.log(`[Vidrock] Item ID to encrypt: ${itemId}`);
    
    // Encrypt the item ID
    return encryptAesCbc(itemId, PASSPHRASE)
        .then(function(encryptedId) {
            console.log(`[Vidrock] Encrypted ID: ${encryptedId.substring(0, 20)}...`);
            
            // URL encode the encrypted ID
            const encodedId = urlEncode(encryptedId);
            
            // Build API URL
            const apiUrl = `${VIDROCK_BASE_URL}/api/${mediaType}/${encodedId}`;
            console.log(`[Vidrock] API URL: ${apiUrl}`);
            
            // Make API request
            return makeRequest(apiUrl);
        })
        .then(function(response) {
            return response.text();
        })
        .then(function(responseText) {
            console.log(`[Vidrock] Response length: ${responseText.length} characters`);
            
            // Try to parse as JSON
            try {
                const data = JSON.parse(responseText);
                // processVidrockResponse now returns a Promise
                return processVidrockResponse(data, mediaInfo, seasonNum, episodeNum);
            } catch (parseError) {
                console.error(`[Vidrock] Invalid JSON response: ${parseError.message}`);
                return Promise.resolve([]);
            }
        })
        .catch(function(error) {
            console.error(`[Vidrock] Error fetching streams: ${error.message}`);
            return [];
        });
}

// Main function to extract streaming links for Nuvio
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    console.log(`[Vidrock] Starting extraction for TMDB ID: ${tmdbId}, Type: ${mediaType}${mediaType === 'tv' ? `, S:${seasonNum}E:${episodeNum}` : ''}`);
    
    return new Promise((resolve, reject) => {
        // First, fetch media details from TMDB
        getTMDBDetails(tmdbId, mediaType)
            .then(function(mediaInfo) {
                console.log(`[Vidrock] TMDB Info: "${mediaInfo.title}" (${mediaInfo.year || 'N/A'})`);
                
                // Fetch streams from Vidrock
                return fetchFromVidrock(mediaType, tmdbId, mediaInfo, seasonNum, episodeNum);
            })
            .then(function(streams) {
                // Remove duplicate streams by URL
                const uniqueStreams = [];
                const seenUrls = new Set();
                streams.forEach(stream => {
                    if (!seenUrls.has(stream.url)) {
                        seenUrls.add(stream.url);
                        uniqueStreams.push(stream);
                    }
                });
                
                console.log(`[Vidrock] Total streams found: ${uniqueStreams.length}`);
                
                // Sort streams by quality (highest first)
                const getQualityValue = (quality) => {
                    const q = quality.toLowerCase().replace(/p$/, ''); // Remove trailing 'p'
                    
                    // Handle specific quality names
                    if (q === '4k' || q === '2160') return 2160;
                    if (q === '1440') return 1440;
                    if (q === '1080') return 1080;
                    if (q === '720') return 720;
                    if (q === '480') return 480;
                    if (q === '360') return 360;
                    if (q === '240') return 240;
                    
                    // Handle unknown quality (put at end)
                    if (q === 'unknown') return 0;
                    
                    // Try to parse as number
                    const numQuality = parseInt(q);
                    if (!isNaN(numQuality) && numQuality > 0) {
                        return numQuality;
                    }
                    
                    // Default for unrecognized qualities
                    return 1;
                };
                
                uniqueStreams.sort((a, b) => {
                    const qualityA = getQualityValue(a.quality);
                    const qualityB = getQualityValue(b.quality);
                    return qualityB - qualityA;
                });
                
                resolve(uniqueStreams);
            })
            .catch(function(error) {
                console.error(`[Vidrock] Error fetching media details: ${error.message}`);
                resolve([]); // Return empty array on error for Nuvio compatibility
            });
    });
}

// Export for React Native compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    global.getStreams = getStreams;
}
