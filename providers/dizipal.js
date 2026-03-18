

//var BASE_URL = 'https://dizipal.bar';
//var BASE_URL = 'https://dizipal1542.com';
var BASE_URL = 'https://dizipal2034.com';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': BASE_URL + '/'
};

var STREAM_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5',
    'Accept-Language': 'tr-TR,tr;q=0.9',
    'Accept-Encoding': 'identity',
    'Origin': BASE_URL,
    'Referer': BASE_URL + '/',
    'Sec-Fetch-Dest': 'video',
    'Sec-Fetch-Mode': 'no-cors',
    'Sec-Fetch-Site': 'cross-site',
    'DNT': '1'
};


function findAll(html, pattern) {
    var results = [];
    var regex = new RegExp(pattern, 'gi');
    var match;
    while ((match = regex.exec(html)) !== null) {
        results.push(match);
    }
    return results;
}

function findFirst(html, pattern) {
    var regex = new RegExp(pattern, 'i');
    var match = regex.exec(html);
    return match ? match : null;
}


function searchDiziPal(title, mediaType) {
    var searchUrl = BASE_URL + '/?s=' + encodeURIComponent(title);
    console.log('[DiziPal] Search URL:', searchUrl);

    return fetch(searchUrl, { headers: HEADERS })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var results = [];

           
            var itemPattern = /<div[^>]*class="[^"]*post-item[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;
            var items = findAll(html, '<div[^>]*class="[^"]*post-item[^"]*"[^>]*>[\\s\\S]*?<\\/div>\\s*<\\/div>');

            
            var linkPattern = /<a[^>]+href="(https:\/\/dizipal\.bar\/(?:dizi|film|anime)\/[^"]+)"[^>]*title="([^"]+)"/gi;
            var match;
            while ((match = linkPattern.exec(html)) !== null) {
                var url = match[1];
                var itemTitle = match[2];

               
                var isDizi = url.includes('/dizi/');
                var isFilm = url.includes('/film/');
                var isAnime = url.includes('/anime/');

                var itemType = isDizi ? 'tv' : (isFilm ? 'movie' : (isAnime ? 'tv' : null));
                if (!itemType) continue;

                
                if (mediaType === 'movie' && itemType !== 'movie') continue;
                if (mediaType === 'tv' && itemType === 'movie') continue;

                
                var duplicate = false;
                for (var i = 0; i < results.length; i++) {
                    if (results[i].url === url) { duplicate = true; break; }
                }
                if (!duplicate) {
                    results.push({ title: itemTitle, url: url, type: itemType });
                }
            }

            console.log('[DiziPal] Search results:', results.length);
            return results;
        });
}


function findBestMatch(results, query) {
    if (!results || results.length === 0) return null;

    var queryLower = query.toLowerCase();

    
    for (var i = 0; i < results.length; i++) {
        if (results[i].title.toLowerCase() === queryLower) return results[i];
    }

   
    for (var j = 0; j < results.length; j++) {
        if (results[j].title.toLowerCase().includes(queryLower)) return results[j];
    }

    return results[0];
}


function loadContentPage(url) {
    console.log('[DiziPal] Loading content:', url);

    return fetch(url, { headers: HEADERS })
        .then(function(res) { return res.text(); })
        .then(function(html) {
           
            var iframeMatch = findFirst(html,
                '<iframe[^>]+src="([^"]+)"[^>]*class="[^"]*(?:responsive-player|series-player)[^"]*"'
            ) || findFirst(html,
                'class="[^"]*(?:responsive-player|series-player)[^"]*"[^>]*>[\\s\\S]*?<iframe[^>]+src="([^"]+)"'
            ) || findFirst(html,
                '<div[^>]*id="vast_new"[^>]*>[\\s\\S]*?<iframe[^>]+src="([^"]+)"'
            ) || findFirst(html,
                '<iframe[^>]+src="([^"]+)"'
            );

            var iframeSrc = iframeMatch ? iframeMatch[1] : null;
            console.log('[DiziPal] iframe src:', iframeSrc);
            return iframeSrc;
        });
}


function extractM3u8FromIframe(iframeSrc) {
    if (!iframeSrc) return Promise.resolve(null);

    var iframeUrl = iframeSrc.startsWith('http') ? iframeSrc : BASE_URL + iframeSrc;
    console.log('[DiziPal] Fetching iframe:', iframeUrl);

    return fetch(iframeUrl, {
        headers: Object.assign({}, HEADERS, { 'Referer': BASE_URL + '/' })
    })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var iframeOrigin = iframeUrl.split('/').slice(0, 3).join('/');
            
            var m3uMatch = findFirst(html, 'file:"([^"]+\\.m3u8[^"]*)"');
            if (m3uMatch) {
                console.log('[DiziPal] Found m3u8:', m3uMatch[1]);
                return { url: m3uMatch[1], subtitle: extractSubtitle(html), iframeOrigin: iframeOrigin };
            }

            
            var sourceMatch = findFirst(html, '"file"\\s*:\\s*"([^"]+\\.m3u8[^"]*)"');
            if (sourceMatch) {
                console.log('[DiziPal] Found m3u8 from sources:', sourceMatch[1]);
                return { url: sourceMatch[1], subtitle: extractSubtitle(html), iframeOrigin: iframeOrigin };
            }

            console.log('[DiziPal] No m3u8 found in iframe');
            return null;
        });
}



function parseMasterM3u8(masterUrl, streamHeaders) {
    return fetch(masterUrl, { headers: streamHeaders })
        .then(function(res) { return res.text(); })
        .then(function(m3u8) {
            var lines = m3u8.split('\n');
            var turkishAudioUrl = null;
            var streams = [];

            
            for (var i = 0; i < lines.length; i++) {
                var line = lines[i].trim();
                if (line.includes('TYPE=AUDIO') && line.includes('LANGUAGE="tr"')) {
                    var uriMatch = line.match(/URI="([^"]+)"/);
                    if (uriMatch) turkishAudioUrl = uriMatch[1];
                }
            }

            
            for (var j = 0; j < lines.length; j++) {
                var l = lines[j].trim();
                if (l.startsWith('#EXT-X-STREAM-INF:')) {
                    var nextLine = lines[j + 1] ? lines[j + 1].trim() : '';
                    if (!nextLine || nextLine.startsWith('#')) continue;

                    var resMatch = l.match(/RESOLUTION=(\d+x\d+)/);
                    var resolution = resMatch ? resMatch[1] : '';
                    var quality = '720p';
                    if (resolution.includes('1920')) quality = '1080p';
                    else if (resolution.includes('1280')) quality = '720p';
                    else if (resolution.includes('854')) quality = '480p';
                    else if (resolution.includes('640')) quality = '360p';

                    var streamUrl = nextLine.startsWith('http') ? nextLine : masterUrl.split('/').slice(0, -1).join('/') + '/' + nextLine;
                    streams.push({ url: streamUrl, quality: quality, resolution: resolution });
                }
            }

            return { streams: streams, turkishAudioUrl: turkishAudioUrl };
        })
        .catch(function() { return { streams: [], turkishAudioUrl: null }; });
}

function extractSubtitle(html) {
    var subMatch = findFirst(html, '"subtitle"\\s*:\\s*"([^"]+)"');
    if (!subMatch) return null;
    console.log('[DiziPal] Raw subtitle string:', subMatch[1]);
    return subMatch[1];
}


function getEpisodeUrl(contentUrl, seasonNum, episodeNum) {
   
    var slug = contentUrl.replace(/\/$/, '').split('/dizi/')[1] || '';
    slug = slug.replace(/\/$/, '');
    return BASE_URL + '/bolum/' + slug + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum-izle/';
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        var tmdbType = mediaType === 'movie' ? 'movie' : 'tv';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + tmdbType + '/' + tmdbId +
            '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        console.log('[DiziPal] Starting for tmdbId:', tmdbId, 'type:', mediaType);

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var title = data.title || data.name || '';
                var year = (data.release_date || data.first_air_date || '').substring(0, 4);
                console.log('[DiziPal] TMDB title:', title, 'year:', year);

                if (!title) {
                    resolve([]);
                    return Promise.resolve(null);
                }

                var originalTitle = data.original_title || data.original_name || '';

                return searchDiziPal(title, mediaType)
                    .then(function(results) {
                        if ((!results || results.length === 0) && originalTitle && originalTitle !== title) {
                            console.log('[DiziPal] Trying original title:', originalTitle);
                            return searchDiziPal(originalTitle, mediaType);
                        }
                        return results;
                    })
                    .then(function(results) {
                        var best = findBestMatch(results, title) || findBestMatch(results, originalTitle);
                        if (!best) {
                            console.log('[DiziPal] No match found');
                            return null;
                        }
                        console.log('[DiziPal] Best match:', best.title, best.url);

                       
                        var targetUrl = best.url;
                        if (mediaType === 'tv' && seasonNum && episodeNum) {
                            targetUrl = getEpisodeUrl(best.url, seasonNum, episodeNum);
                        }

                        return loadContentPage(targetUrl)
                            .then(function(iframeSrc) {
                                return extractM3u8FromIframe(iframeSrc);
                            })
                            .then(function(result) {
                                if (!result || !result.url) return [];

                                var subtitles = [];
                                if (result.subtitle) {
                                    result.subtitle.split(',').forEach(function(sub) {
                                        sub = sub.trim();
                                        if (!sub) return;
                                        var subLang = sub.match(/\[([^\]]+)\]/);
                                        var subUrl = sub.replace(/\[[^\]]+\]/, '').trim();
                                        var label = 'türkçee';
                                        if (subLang) {
                                            var l = subLang[1].toLowerCase();
                                            if (l.includes('tur') || l.includes('tr') || l.includes('türk')) label = 'türkçee';
                                            else if (l.includes('ing') || l.includes('en')) label = 'ingilizcee';
                                            else label = subLang[1];
                                        } else {
                                           
                                            if (sub.includes('_tur')) label = 'türkçee';
                                            else if (sub.includes('_eng')) label = 'ingilizcee';
                                            subUrl = sub;
                                        }
                                        if (subUrl) subtitles.push({ label: label, url: subUrl });
                                    });
                                }

                                var streamHeaders = Object.assign({}, STREAM_HEADERS, {
                                    'Referer': (result.iframeOrigin || BASE_URL) + '/',
                                    'Origin': result.iframeOrigin || BASE_URL
                                });

                               
                                return parseMasterM3u8(result.url, streamHeaders)
                                    .then(function(parsed) {
                                        var streams = [];

                                        if (parsed.turkishAudioUrl && parsed.streams.length > 0) {
                                            
                                            parsed.streams.forEach(function(s) {
                                                streams.push({
                                                    name: '⌜ DiziPal ⌟ | TR Dublaj | ' + s.quality,
                                                    title: title + (year ? ' (' + year + ')' : '') + ' · ' + s.quality,
                                                    url: s.url,
                                                    quality: s.quality,
                                                    size: 'Unknown',
                                                    headers: streamHeaders,
                                                    subtitles: subtitles,
                                                    provider: 'dizipal'
                                                });
                                            });
                                        }

                                       
                                        streams.push({
                                            name: '⌜ DiziPal ⌟ | Altyazılı',
                                            title: title + (year ? ' (' + year + ')' : ''),
                                            url: result.url,
                                            quality: '720p',
                                            size: 'Unknown',
                                            headers: streamHeaders,
                                            subtitles: subtitles,
                                            provider: 'dizipal'
                                        });

                                        return streams;
                                    });
                            });
                    });
            })
            .then(function(streams) {
                resolve(streams || []);
            })
            .catch(function(err) {
                console.error('[DiziPal] Error:', err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    global.getStreams = getStreams;
}
