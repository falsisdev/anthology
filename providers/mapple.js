// Mapple Scraper for Nuvio Local Scrapers
// React Native compatible version - Promise-based approach

// Constants
const API_BASE = "https://enc-dec.app/api";
const MAPLE_BASE = "https://mapple.uk";

// Working headers for Mapple requests
const WORKING_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
    "Connection": "keep-alive",
    "Referer": "https://mapple.uk/",
    "Next-Action": "40c2896f5f22d9d6342e5a6d8f4d8c58d69654bacd" // Necessary header
};

// Available sources
const SOURCES = ["mapple", "sakura", "alfa", "oak", "wiggles"];

// Get session ID from enc-dec API
function getSessionId() {
    console.log('[Mapple] Fetching session ID...');

    return fetch(`${API_BASE}/enc-mapple`, {
        method: 'GET',
        headers: WORKING_HEADERS
    }).then(function(response) {
        if (!response.ok) {
            throw new Error(`Session ID API error: ${response.status} ${response.statusText}`);
        }
        return response.json();
    }).then(function(data) {
        if (data && data.result && data.result.sessionId) {
            console.log('[Mapple] Successfully obtained session ID');
            return data.result.sessionId;
        } else {
            throw new Error('Invalid session ID response format');
        }
    }).catch(function(error) {
        console.error(`[Mapple] Failed to get session ID: ${error.message}`);
        throw error;
    });
}

// Build payload for the request
function buildPayload(tmdbId, mediaType, seasonNum, episodeNum, source, sessionId) {
    const payload = [{
        mediaId: tmdbId,
        mediaType: mediaType,
        tv_slug: mediaType === 'tv' ? `${seasonNum}-${episodeNum}` : "",
        source: source,
        sessionId: sessionId
    }];

    return payload;
}

// Parse the response from Mapple API
function parseMappleResponse(responseText) {
    try {
        // The response seems to be JSONP format, take second line and remove "1:" prefix
        const lines = responseText.split('\n');
        if (lines.length < 2) {
            throw new Error('Invalid response format - not enough lines');
        }

        const dataLine = lines[1].replace(/^1:/, '');
        const streamsData = JSON.parse(dataLine);

        return streamsData;
    } catch (error) {
        console.error(`[Mapple] Failed to parse response: ${error.message}`);
        throw error;
    }
}

// M3U8 Parsing Functions (inlined for React Native compatibility)

// Parse M3U8 content and extract quality streams
function parseM3U8(content) {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);
    const streams = [];

    let currentStream = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.startsWith('#EXT-X-STREAM-INF:')) {
            // Parse stream info
            currentStream = {
                bandwidth: null,
                resolution: null,
                codecs: null,
                url: null
            };

            // Extract bandwidth
            const bandwidthMatch = line.match(/BANDWIDTH=(\d+)/);
            if (bandwidthMatch) {
                currentStream.bandwidth = parseInt(bandwidthMatch[1]);
            }

            // Extract resolution
            const resolutionMatch = line.match(/RESOLUTION=(\d+x\d+)/);
            if (resolutionMatch) {
                currentStream.resolution = resolutionMatch[1];
            }

            // Extract codecs
            const codecsMatch = line.match(/CODECS="([^"]+)"/);
            if (codecsMatch) {
                currentStream.codecs = codecsMatch[1];
            }

        } else if (currentStream && !line.startsWith('#')) {
            // This is the URL for the current stream
            currentStream.url = line;
            streams.push(currentStream);
            currentStream = null;
        }
    }

    return streams;
}

// Determine quality from resolution or bandwidth
function getQualityFromStream(stream) {
    if (stream.resolution) {
        const [width, height] = stream.resolution.split('x').map(Number);

        if (height >= 2160) return '4K';
        if (height >= 1440) return '1440p';
        if (height >= 1080) return '1080p';
        if (height >= 720) return '720p';
        if (height >= 480) return '480p';
        if (height >= 360) return '360p';
        return '240p';
    }

    if (stream.bandwidth) {
        const mbps = stream.bandwidth / 1000000;

        if (mbps >= 15) return '4K';
        if (mbps >= 8) return '1440p';
        if (mbps >= 5) return '1080p';
        if (mbps >= 3) return '720p';
        if (mbps >= 1.5) return '480p';
        if (mbps >= 0.8) return '360p';
        return '240p';
    }

    return 'Unknown';
}

// Fetch and parse M3U8 playlist
function resolveM3U8(url, sourceName) {
    console.log(`[Mapple] Resolving M3U8 playlist for ${sourceName}...`);

    // Special handling for Sakura - return master URL directly with "Auto" quality
    if (sourceName === 'sakura') {
        console.log(`[Mapple] Sakura source detected - returning master URL with Auto quality`);
        const capitalizedSource = sourceName.charAt(0).toUpperCase() + sourceName.slice(1);
        return Promise.resolve([{
            name: `Mapple ${capitalizedSource} - Auto`,
            title: "", // Will be filled by caller
            url: url,
            quality: 'Auto',
            size: "Unknown",
            headers: WORKING_HEADERS,
            provider: "mapple"
        }]);
    }

    return fetch(url, {
        method: 'GET',
        headers: WORKING_HEADERS
    }).then(function(response) {
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response.text().then(function(content) {
            console.log(`[Mapple] Fetched M3U8 content (${content.length} bytes) for ${sourceName}`);

            // Check if it's a master playlist (contains #EXT-X-STREAM-INF)
            if (content.includes('#EXT-X-STREAM-INF:')) {
                console.log(`[Mapple] Master playlist detected for ${sourceName} - parsing quality streams...`);

                const streams = parseM3U8(content);
                console.log(`[Mapple] Found ${streams.length} quality streams for ${sourceName}`);

                const resolvedStreams = [];

                for (const stream of streams) {
                    const quality = getQualityFromStream(stream);
                    const capitalizedSource = sourceName.charAt(0).toUpperCase() + sourceName.slice(1);

                    resolvedStreams.push({
                        name: `Mapple ${capitalizedSource} - ${quality}`,
                        title: "", // Will be filled by caller
                        url: stream.url,
                        quality: quality,
                        size: "Unknown",
                        headers: WORKING_HEADERS,
                        provider: "mapple",
                        resolution: stream.resolution,
                        bandwidth: stream.bandwidth,
                        codecs: stream.codecs
                    });
                }

                // Sort by quality (highest first)
                resolvedStreams.sort(function(a, b) {
                    const qualityOrder = { 'Auto': 5, '4K': 4, '1440p': 3, '1080p': 2, '720p': 1, '480p': 0, '360p': -1, '240p': -2, 'Unknown': -3 };
                    return (qualityOrder[b.quality] || -3) - (qualityOrder[a.quality] || -3);
                });

                return resolvedStreams;

            } else if (content.includes('#EXTINF:')) {
                console.log(`[Mapple] Media playlist detected for ${sourceName} - single quality stream`);

                const capitalizedSource = sourceName.charAt(0).toUpperCase() + sourceName.slice(1);
                return [{
                    name: `Mapple ${capitalizedSource} - Unknown`,
                    title: "", // Will be filled by caller
                    url: url,
                    quality: 'Unknown',
                    size: "Unknown",
                    headers: WORKING_HEADERS,
                    provider: "mapple"
                }];

            } else {
                console.log(`[Mapple] Invalid M3U8 content for ${sourceName} - returning master URL`);
                const capitalizedSource = sourceName.charAt(0).toUpperCase() + sourceName.slice(1);
                return [{
                    name: `Mapple ${capitalizedSource} - Unknown`,
                    title: "", // Will be filled by caller
                    url: url,
                    quality: 'Unknown',
                    size: "Unknown",
                    headers: WORKING_HEADERS,
                    provider: "mapple"
                }];
            }
        });
    }).catch(function(error) {
        console.error(`[Mapple] Failed to resolve M3U8 for ${sourceName}: ${error.message}`);

        // Return the original URL if M3U8 parsing fails
        const capitalizedSource = sourceName.charAt(0).toUpperCase() + sourceName.slice(1);
        return [{
            name: `Mapple ${capitalizedSource} - Unknown`,
            title: "", // Will be filled by caller
            url: url,
            quality: 'Unknown',
            size: "Unknown",
            headers: WORKING_HEADERS,
            provider: "mapple"
        }];
    });
}

// Extract streams from parsed data
function extractStreams(streamsData, source, mediaType, seasonNum, episodeNum) {
    const streams = [];

    try {
        // Check if the response was successful
        if (!streamsData.success) {
            console.log(`[Mapple] Source ${source} returned error: ${streamsData.error || 'Unknown error'}`);
            return streams;
        }

        // Check if we have stream data
        if (!streamsData.data || !streamsData.data.stream_url) {
            console.log(`[Mapple] Source ${source} has no stream URL in response`);
            return streams;
        }

        const streamUrl = streamsData.data.stream_url.trim();

        // Skip error messages
        if (streamUrl.includes('Content not found in streaming databases')) {
            console.log(`[Mapple] Source ${source} returned 'content not found' message`);
            return streams;
        }

        console.log(`[Mapple] Found master URL for ${source}: ${streamUrl.substring(0, 60)}...`);

        // For now, return the master URL - we'll resolve it later in the main function
        const capitalizedSource = source.charAt(0).toUpperCase() + source.slice(1);
        streams.push({
            name: `Mapple ${capitalizedSource} - Master`,
            title: "", // Will be filled by caller
            url: streamUrl,
            quality: 'Master',
            size: "Unknown",
            headers: WORKING_HEADERS,
            provider: "mapple",
            source: source
        });

    } catch (error) {
        console.error(`[Mapple] Error extracting streams: ${error.message}`);
    }

    return streams;
}

// Fetch streams for a specific source
function fetchStreamsForSource(tmdbId, mediaType, seasonNum, episodeNum, source, sessionId) {
    console.log(`[Mapple] Fetching streams for source: ${source}`);

    const payload = buildPayload(tmdbId, mediaType, seasonNum, episodeNum, source, sessionId);

    // Build URL
    let url;
    if (mediaType === 'tv') {
        url = `${MAPLE_BASE}/watch/tv/${tmdbId}/${seasonNum}-${episodeNum}`;
    } else {
        url = `${MAPLE_BASE}/watch/movie/${tmdbId}`;
    }

    console.log(`[Mapple] Making request to: ${url}`);

    return fetch(url, {
        method: 'POST',
        headers: {
            ...WORKING_HEADERS,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    }).then(function(response) {
        if (!response.ok) {
            throw new Error(`Mapple API error: ${response.status} ${response.statusText}`);
        }
        return response.text();
    }).then(function(responseText) {
        const streamsData = parseMappleResponse(responseText);
        const masterStreams = extractStreams(streamsData, source, mediaType, seasonNum, episodeNum);

        if (masterStreams.length === 0) {
            return [];
        }

        // Resolve M3U8 playlists to get individual quality streams (PARALLEL within source)
        const resolvePromises = masterStreams.map(function(masterStream) {
            return resolveM3U8(masterStream.url, source);
        });

        return Promise.all(resolvePromises).then(function(resolvedStreamArrays) {
            // Flatten all resolved streams
            const allStreams = [];
            resolvedStreamArrays.forEach(function(streamArray) {
                allStreams.push(...streamArray);
            });
            return allStreams;
        });
    }).catch(function(error) {
        console.error(`[Mapple] Error fetching streams for source ${source}: ${error.message}`);
        return [];
    });
}

// Get TMDB details for title formatting
function getTMDBDetails(tmdbId, mediaType) {
    const TMDB_API_KEY = '439c478a771f35c05022f9feabcca01c';
    const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
    const endpoint = mediaType === 'tv' ? 'tv' : 'movie';
    const url = `${TMDB_BASE_URL}/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}`;

    console.log(`[Mapple] Fetching TMDB details for ${mediaType} ID: ${tmdbId}`);

    return fetch(url, {
        method: 'GET',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    }).then(function(response) {
        if (!response.ok) {
            throw new Error(`TMDB API error: ${response.status}`);
        }
        return response.json();
    }).then(function(data) {
        const title = mediaType === 'tv' ? data.name : data.title;
        const releaseDate = mediaType === 'tv' ? data.first_air_date : data.release_date;
        const year = releaseDate ? parseInt(releaseDate.split('-')[0]) : null;

        return {
            title: title,
            year: year
        };
    }).catch(function(error) {
        console.error(`[Mapple] Failed to get TMDB details: ${error.message}`);
        return { title: 'Unknown Title', year: null };
    });
}

// Main scraping function - Promise-based approach
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    console.log(`[Mapple] Starting scrape for TMDB ID: ${tmdbId}, Type: ${mediaType}${mediaType === 'tv' ? `, S:${seasonNum}E:${episodeNum}` : ''}`);

    // Validate parameters
    if (!tmdbId || !mediaType) {
        console.error('[Mapple] Missing required parameters: tmdbId and mediaType');
        return Promise.resolve([]);
    }

    if (mediaType === 'tv' && (!seasonNum || !episodeNum)) {
        console.error('[Mapple] TV shows require seasonNum and episodeNum');
        return Promise.resolve([]);
    }

    // Get TMDB details first
    return getTMDBDetails(tmdbId, mediaType).then(function(mediaInfo) {
        console.log(`[Mapple] TMDB Info: "${mediaInfo.title}" (${mediaInfo.year || 'N/A'})`);

        // Format title for streams
        let titleWithYear = mediaInfo.title;
        if (mediaInfo.year) {
            titleWithYear += ` (${mediaInfo.year})`;
        }
        if (mediaType === 'tv' && seasonNum && episodeNum) {
            titleWithYear = `${mediaInfo.title} S${String(seasonNum).padStart(2, '0')}E${String(episodeNum).padStart(2, '0')}`;
        }

        // Get session ID once for all sources (PARALLEL OPTIMIZATION)
        console.log('[Mapple] Getting shared session ID for all sources...');
        return getSessionId().then(function(sharedSessionId) {
            console.log('[Mapple] Shared session ID obtained, processing sources in parallel...');

            // Try multiple sources in parallel with shared session
            const sourcePromises = SOURCES.map(function(source) {
                return fetchStreamsForSource(tmdbId, mediaType, seasonNum, episodeNum, source, sharedSessionId);
            });

            return Promise.allSettled(sourcePromises).then(function(results) {
                const allStreams = [];

                results.forEach(function(result, index) {
                    if (result.status === 'fulfilled') {
                        const streams = result.value;
                        console.log(`[Mapple] Source ${SOURCES[index]} returned ${streams.length} streams`);

                        // Add title to each stream
                        streams.forEach(function(stream) {
                            stream.title = titleWithYear;
                        });

                        allStreams.push(...streams);
                    } else {
                        console.error(`[Mapple] Source ${SOURCES[index]} failed: ${result.reason.message}`);
                    }
                });

                // Sort streams by quality (highest first)
                const qualityOrder = ['Auto', '4K', '1440p', '1080p', '720p', '480p', '360p', '240p', 'Unknown'];
                allStreams.sort(function(a, b) {
                    const aIndex = qualityOrder.indexOf(a.quality);
                    const bIndex = qualityOrder.indexOf(b.quality);
                    return aIndex - bIndex;
                });

                console.log(`[Mapple] Total streams found: ${allStreams.length}`);
                return allStreams;
            });
        });
    }).catch(function(error) {
        console.error(`[Mapple] Scraping error: ${error.message}`);
        return [];
    });
}

// Export for React Native compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    global.getStreams = getStreams;
}
