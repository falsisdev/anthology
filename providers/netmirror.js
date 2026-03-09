var NET_MAIN = 'https://net22.cc';
var NET_PLAYLIST = 'https://net52.cc';
var NET_VIDEO = 'http://net52.cc'; // SSL Hatasını aşmak için HTTP zorlaması

var NET_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ExoPlayer',
    'Referer': 'https://net22.cc/',
    'X-Requested-With': 'XMLHttpRequest'
};

// 1. Arama Fonksiyonu (SineWix'teki searchAndFetch mantığı)
function searchNetMirror(title) {
    var ts = Math.floor(Date.now() / 1000);
    var searchUrl = NET_MAIN + '/search.php?s=' + encodeURIComponent(title) + '&t=' + ts;
    console.log('[NetMirror] Arama URL:', searchUrl);

    return fetch(searchUrl, { headers: NET_HEADERS })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            var results = data.searchResult || [];
            if (results.length === 0) {
                console.log('[NetMirror] Sonuç bulunamadı:', title);
                return null;
            }
            // En yakın sonucu döndür
            return results[0]; 
        });
}

// 2. Link Ayıklama (SineWix'teki fetchDetailAndStreams mantığı)
function fetchNetMirrorStreams(netId, mediaType) {
    // TV kanalı ise /tv/playlist.php, değilse /playlist.php
    var isTv = (mediaType === 'tv' || mediaType === 'live');
    var endpoint = isTv ? '/tv/playlist.php' : '/playlist.php';
    var url = NET_PLAYLIST + endpoint + '?id=' + netId;

    console.log('[NetMirror] Playlist Sorgusu:', url);

    return fetch(url, { headers: NET_HEADERS })
        .then(function(res) { return res.json(); })
        .then(function(json) {
            var item = Array.isArray(json) ? json[0] : json;
            if (!item || !item.sources) return [];

            return item.sources.map(function(s) {
                var videoPath = s.file; // /tv/hls/152.m3u8... veya /hls/41.m3u8...
                
                // Link birleştirme ve SSL Bypass
                var finalUrl = NET_VIDEO + (videoPath.startsWith('/') ? '' : '/') + videoPath;
                finalUrl = finalUrl.replace('https://', 'http://');

                return {
                    name: 'NetMirror',
                    title: 'NetMirror - ' + s.label,
                    url: finalUrl,
                    quality: s.label || 'HD',
                    size: 'Unknown',
                    headers: NET_HEADERS,
                    provider: 'netmirror'
                };
            });
        });
}

// 3. Ana Giriş Noktası (Nuvio'nun çağırdığı getStreams)
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        var tmdbType = (mediaType === 'movie') ? 'movie' : 'tv';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + tmdbType + '/' + tmdbId + 
                     '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        console.log('[NetMirror] TMDB Sorgulanıyor:', tmdbId);

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var title = data.title || data.name || '';
                if (!title) {
                    resolve([]);
                    return;
                }
                // NetMirror'da ara
                return searchNetMirror(title);
            })
            .then(function(bestMatch) {
                if (!bestMatch) {
                    resolve([]);
                    return;
                }
                // Bulunan ID ile linkleri getir
                return fetchNetMirrorStreams(bestMatch.id, mediaType);
            })
            .then(function(streams) {
                resolve(streams || []);
            })
            .catch(function(err) {
                console.error('[NetMirror] Kritik Hata:', err.message);
                resolve([]);
            });
    });
}

// Nuvio/CloudStream Export Yapısı
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
