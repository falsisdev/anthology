

var API_BASE = 'https://ydfvfdizipanel.ru/public/api';
var API_KEY = '9iQNC5HQwPlaFuJDkhncJ5XTJ8feGXOJatAA';

var API_HEADERS = {
    'hash256': '711bff4afeb47f07ab08a0b07e85d3835e739295e8a6361db77eebd93d96306b',
    'signature': '',
    'User-Agent': 'EasyPlex (Android 14; SM-A546B; Samsung Galaxy A54 5G; tr)',
    'Accept': 'application/json'
};

var STREAM_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'identity',
    'Referer': 'https://ydfvfdizipanel.ru/',
    'Origin': 'https://ydfvfdizipanel.ru',
    'Sec-Fetch-Dest': 'video',
    'Sec-Fetch-Mode': 'no-cors',
    'Sec-Fetch-Site': 'cross-site',
    'DNT': '1'
};

function getApiPaths(mediaType) {
    if (mediaType === 'movie') {
        return { genre: 'media', endpoint: 'detail' };
    }
    return { genre: 'series', endpoint: 'show' };
}

function resolveMediaFireLink(link) {
    return fetch(link)
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var match = html.match(/href="(https:\/\/download\d+\.mediafire\.com[^"]+)"/);
            return match ? match[1] : link;
        })
        .catch(function() { return link; });
}

function buildStreams(videoLinks, title, year) {
    return Promise.all(
        videoLinks.map(function(link) {
            if (link.includes('mediafire.com')) {
                return resolveMediaFireLink(link).then(function(finalUrl) {
                    return {
                        name: 'SineWix - MediaFire',
                        title: title + (year ? ' (' + year + ')' : ''),
                        url: finalUrl,
                        quality: 'HD',
                        size: 'Unknown',
                        headers: STREAM_HEADERS,
                        provider: 'sinewix'
                    };
                });
            }
            return Promise.resolve({
                name: 'SineWix',
                title: title + (year ? ' (' + year + ')' : ''),
                url: link,
                quality: 'HD',
                size: 'Unknown',
                headers: STREAM_HEADERS,
                provider: 'sinewix'
            });
        })
    ).then(function(streams) {
        return streams.filter(function(s) { return s && s.url; });
    });
}

function fetchDetailAndStreams(sinewixId, sinewixItemType, mediaType, seasonNum, episodeNum) {
    var paths = getApiPaths(mediaType);
    var apiUrl = API_BASE + '/' + paths.genre + '/' + paths.endpoint + '/' + sinewixId + '/' + API_KEY;
    console.error('[SineWix] Detail URL:', apiUrl);

    return fetch(apiUrl, { headers: API_HEADERS })
        .then(function(res) { return res.json(); })
        .then(function(item) {
            var title = item.name || item.title || 'SineWix';
            var year = (item.first_air_date || item.release_date || '').substring(0, 4);
            var videoLinks = [];

            if (mediaType === 'movie') {
                videoLinks = (item.videos || []).map(function(v) { return v.link; }).filter(Boolean);
            } else {
                var seasons = item.seasons || [];
                var targetSeason = null;
                for (var i = 0; i < seasons.length; i++) {
                    if (parseInt(seasons[i].season_number) === parseInt(seasonNum)) {
                        targetSeason = seasons[i];
                        break;
                    }
                }
                if (targetSeason) {
                    var episodes = targetSeason.episodes || [];
                    var targetEp = null;
                    for (var j = 0; j < episodes.length; j++) {
                        if (parseInt(episodes[j].episode_number) === parseInt(episodeNum)) {
                            targetEp = episodes[j];
                            break;
                        }
                    }
                    if (targetEp) {
                        videoLinks = (targetEp.videos || []).map(function(v) { return v.link; }).filter(Boolean);
                    }
                }
            }

            console.error('[SineWix] Video links found:', videoLinks.length);
            return buildStreams(videoLinks, title, year);
        });
}

function searchAndFetch(title, mediaType, seasonNum, episodeNum) {
    var searchUrl = API_BASE + '/search/' + encodeURIComponent(title) + '/' + API_KEY;
    console.log('[SineWix] Search URL:', searchUrl);

    return fetch(searchUrl, { headers: API_HEADERS })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            var results = data.search || [];

            var filtered = results.filter(function(item) {
                var t = item.type || '';
                if (mediaType === 'movie') return t.includes('movie');
                return t.includes('serie') || t.includes('anime');
            });

            if (filtered.length === 0) {
                console.log('[SineWix] No results for:', title);
                return [];
            }

            var best = filtered[0];
            console.error('[SineWix] Best match:', best.id, best.type);
            return fetchDetailAndStreams(best.id, best.type, mediaType, seasonNum, episodeNum);
        });
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        var tmdbType = mediaType === 'movie' ? 'movie' : 'tv';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + tmdbType + '/' + tmdbId +
            '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        console.error('[SineWix] Starting for tmdbId:', tmdbId, 'type:', mediaType);

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var title = data.title || data.name || '';
                console.log('[SineWix] TMDB title:', title);
                if (!title) {
                    resolve([]);
                    return;
                }
                return searchAndFetch(title, mediaType, seasonNum, episodeNum);
            })
            .then(function(streams) {
                resolve(streams || []);
            })
            .catch(function(err) {
                console.error('[SineWix] Error:', err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    global.getStreams = getStreams;
}
