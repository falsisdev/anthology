/**
 * NetMirror CloudStream/Nuvio Provider
 * Kotlin & SineWix Mantığıyla Optimize Edilmiştir
 */

var MAIN_URL = 'https://net22.cc';
var NEW_URL = 'https://net52.cc';
var API_KEY = '4ef0d7355d9ffb5151e987764708ce96'; // TMDB API Key

// Kotlin Storage ve Cookie Mantığı
var CONFIG = {
    token: "senin_t_hash_t_tokenini_buraya_yaz", // Tarayıcıdan alınan t_hash_t
    timestamp: Date.now(),
    expiry: 15 * 60 * 60 * 1000 // 15 Saat
};

/**
 * Platforma göre header ve çerez ayarlarını yapar
 */
function getHeaders(type) {
    var ott = (type === 'movie') ? 'nf' : 'pv'; // Kotlin mantığı: nf veya pv
    return {
        'Cookie': 't_hash_t=' + CONFIG.token + '; ott=' + ott + '; hd=on',
        'User-Agent': 'Mozilla/5.0 (Android) ExoPlayer',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': MAIN_URL + '/home'
    };
}

/**
 * Kotlin loadLinks mantığı: Playlist URL'sini çözer
 */
function loadLinks(data) {
    var parsed = JSON.parse(data);
    var ts = Math.floor(Date.now() / 1000);
    
    // Kotlin: /pv/ veya /mobile/hs/ dizin yapısı
    var path = parsed.type === 'movie' ? '/mobile/hs' : '/pv';
    var url = NEW_URL + path + '/playlist.php?id=' + parsed.id + '&t=' + encodeURIComponent(parsed.title) + '&tm=' + ts;

    console.log('[NetMirror] Loading Links:', url);

    return fetch(url, { headers: getHeaders(parsed.type) })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            var item = Array.isArray(data) ? data[0] : data;
            if (!item || !item.sources) return [];

            return item.sources.map(function(s) {
                var videoUrl = s.file;
                if (!videoUrl.startsWith('http')) {
                    videoUrl = NEW_URL + (videoUrl.startsWith('/') ? '' : '/') + videoUrl;
                }

                return {
                    name: 'NetMirror',
                    url: videoUrl,
                    quality: s.label,
                    type: 'hls',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Android) ExoPlayer',
                        'Cookie': 'hd=on', // Kotlin Interceptor gereksinimi
                        'Referer': NEW_URL + '/'
                    }
                };
            });
        });
}

/**
 * Ana Arama Fonksiyonu (Uygulamanın aradığı giriş kapısı)
 */
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        var tmdbType = (mediaType === 'movie') ? 'movie' : 'tv';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + tmdbType + '/' + tmdbId + '?language=tr-TR&api_key=' + API_KEY;

        console.log('[NetMirror] Fetching TMDB:', tmdbId);

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var title = data.title || data.name || '';
                if (!title) return resolve([]);

                // Arama motoru isteği
                var searchUrl = MAIN_URL + '/mobile/hs/search.php?s=' + encodeURIComponent(title) + '&t=' + Math.floor(Date.now()/1000);
                
                return fetch(searchUrl, { headers: getHeaders(mediaType) });
            })
            .then(function(res) { return res.json(); })
            .then(function(searchData) {
                var results = searchData.searchResult || [];
                if (results.length === 0) return resolve([]);

                var bestMatch = results[0];
                // loadLinks için gerekli veriyi hazırlayıp gönderiyoruz
                return loadLinks(JSON.stringify({
                    id: bestMatch.id,
                    title: bestMatch.t,
                    type: mediaType
                }));
            })
            .then(function(streams) {
                resolve(streams || []);
            })
            .catch(function(err) {
                console.error('[NetMirror] Error:', err.message);
                resolve([]);
            });
    });
}

/**
 * KRİTİK: Loglardaki "function not found" hatasını çözen kısım
 */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    // Android Sandbox ortamı için global tanımlamalar
    global.getStreams = getStreams;
    globalThis.getStreams = getStreams;
}
