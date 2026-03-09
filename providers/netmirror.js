var NET_NETFLIX = 'https://net22.cc';
var NET_PRIME = 'http://net52.cc'; // SSL hatası için http

var NET_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ExoPlayer',
    'Referer': 'https://net22.cc/',
    'X-Requested-With': 'XMLHttpRequest'
};

function searchNetMirror(title) {
    var ts = Math.floor(Date.now() / 1000);
    // Arama ana sunucudan (net22) yapılır
    var searchUrl = NET_NETFLIX + '/search.php?s=' + encodeURIComponent(title) + '&t=' + ts;
    
    return fetch(searchUrl, { headers: NET_HEADERS })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            var results = data.searchResult || [];
            return results.length > 0 ? results[0] : null;
        });
}

function fetchNetMirrorStreams(netId, mediaType, itemType) {
    // Netflix ise net22, değilse net52 kullan
    var isNetflix = (itemType && itemType.toLowerCase().includes('netflix'));
    var baseUrl = isNetflix ? NET_NETFLIX : NET_PRIME;
    
    var isTv = (mediaType === 'tv' || mediaType === 'live');
    var endpoint = isTv ? '/tv/playlist.php' : '/playlist.php';
    var url = baseUrl + endpoint + '?id=' + netId;

    console.log('[NetMirror] Sunucu:', baseUrl, 'URL:', url);

    return fetch(url, { headers: NET_HEADERS })
        .then(function(res) { return res.json(); })
        .then(function(json) {
            var item = Array.isArray(json) ? json[0] : json;
            if (!item || !item.sources) return [];

            return item.sources.map(function(s) {
                var finalUrl = baseUrl + (s.file.startsWith('/') ? '' : '/') + s.file;
                // SSL hatasını önlemek için net52 linklerini http'ye zorla
                if (baseUrl.includes('net52')) finalUrl = finalUrl.replace('https://', 'http://');

                return {
                    name: isNetflix ? 'NetMirror (Netflix)' : 'NetMirror (Prime)',
                    title: 'NetMirror - ' + s.label,
                    url: finalUrl,
                    quality: s.label || 'HD',
                    headers: NET_HEADERS,
                    provider: 'netmirror'
                };
            });
        });
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        var tmdbType = (mediaType === 'movie') ? 'movie' : 'tv';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + tmdbType + '/' + tmdbId + 
                     '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var title = data.title || data.name || '';
                if (!title) return resolve([]);
                
                return searchNetMirror(title).then(function(bestMatch) {
                    if (!bestMatch) return resolve([]);
                    // Gelen sonucun tipine göre (Netflix/Prime) sunucu seç
                    return fetchNetMirrorStreams(bestMatch.id, mediaType, bestMatch.type);
                });
            })
            .then(function(streams) { resolve(streams || []); })
            .catch(function() { resolve([]); });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
