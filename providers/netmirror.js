/**
 * NetMirror Provider
 * Status: Function Export OK | Logic: Kotlin-based
 */

var MAIN_URL = 'https://net22.cc';
var NEW_URL = 'https://net52.cc';
var TMDB_KEY = '4ef0d7355d9ffb5151e987764708ce96';

// ÖNEMLİ: t_hash_t değerini güncel tutun
var CONFIG = {
    token: "BURAYA_TARAYICIDAN_ALDIGIN_T_HASH_T_GELECEK", 
    timestamp: Date.now()
};

function getHeaders(mediaType) {
    // Kotlin: Movie=nf, Series=pv
    var ott = (mediaType === 'movie') ? 'nf' : 'pv';
    return {
        'Cookie': 't_hash_t=' + CONFIG.token + '; ott=' + ott + '; hd=on',
        'User-Agent': 'Mozilla/5.0 (Android) ExoPlayer',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': MAIN_URL + '/home'
    };
}

async function loadLinks(data) {
    try {
        var parsed = typeof data === 'string' ? JSON.parse(data) : data;
        var ts = Math.floor(Date.now() / 1000);
        // Kotlin: Dizini platforma göre ayarla
        var path = (parsed.type === 'movie') ? '/mobile/hs' : '/pv';
        var url = NEW_URL + path + '/playlist.php?id=' + parsed.id + '&t=' + encodeURIComponent(parsed.title) + '&tm=' + ts;

        console.log('[NetMirror] Linkler çekiliyor:', url);

        var res = await fetch(url, { headers: getHeaders(parsed.type) });
        var json = await res.json();
        var item = Array.isArray(json) ? json[0] : json;

        if (!item || !item.sources) return [];

        return item.sources.map(function(s) {
            var videoUrl = s.file;
            if (!videoUrl.startsWith('http')) {
                videoUrl = NEW_URL + (videoUrl.startsWith('/') ? '' : '/') + videoUrl;
            }
            return {
                name: 'NetMirror',
                url: videoUrl,
                quality: s.label || 'HD',
                type: 'hls',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Android) ExoPlayer',
                    'Cookie': 'hd=on',
                    'Referer': NEW_URL + '/'
                }
            };
        });
    } catch (e) {
        console.error('[NetMirror] Link hatası:', e.message);
        return [];
    }
}
console.log("[NetMirror] TEST: Fonksiyon tetiklendi!");
async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    try {
        console.log('[NetMirror] İşlem başladı. ID:', tmdbId);
        
        var tmdbType = (mediaType === 'movie') ? 'movie' : 'tv';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + tmdbType + '/' + tmdbId + '?language=tr-TR&api_key=' + TMDB_KEY;

        var tmdbRes = await fetch(tmdbUrl);
        var tmdbData = await tmdbRes.json();
        var title = tmdbData.title || tmdbData.name;

        if (!title) return [];

        console.log('[NetMirror] Arama terimi:', title);

        // NetMirror Search API (Kotlin: /search.php)
        var searchPath = (mediaType === 'movie') ? '/mobile/hs' : '/pv';
        var searchUrl = MAIN_URL + searchPath + '/search.php?s=' + encodeURIComponent(title) + '&t=' + Math.floor(Date.now()/1000);
        
        var searchRes = await fetch(searchUrl, { headers: getHeaders(mediaType) });
        var searchData = await searchRes.json();
        
        var results = searchData.searchResult || [];
        if (results.length === 0) {
            console.log('[NetMirror] Sonuç bulunamadı.');
            return [];
        }

        // İlk sonucu al ve linkleri çöz
        return await loadLinks({
            id: results[0].id,
            title: results[0].t,
            type: mediaType
        });

    } catch (err) {
        console.error('[NetMirror] Kritik Hata:', err.message);
        return [];
    }
}

// SineWix örneğindeki çalışan export yapısı
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
    globalThis.getStreams = getStreams;
}
