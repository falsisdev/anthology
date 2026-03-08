/**
 * NetMirror Provider - Fixed & Stabilized
 * TR Engel Aşma ve Timeout Düzeltmesi
 */

var MAIN_URL = 'https://net25.cc'; 
var NEW_URL = 'https://net52.cc';
var TMDB_KEY = '1b3113663c9004682ed61086cf967c44';

var CONFIG = {
    token: "", 
    timestamp: 0
};

// Token alırken oluşan 'Cancelled' hatasını engellemek için geliştirilmiş fonksiyon
async function ensureToken() {
    const now = Date.now();
    if (CONFIG.token && (now - CONFIG.timestamp) < 1800000) {
        return CONFIG.token;
    }

    try {
        console.log('[NetMirror] Token alınıyor...');
        // Timeout ekleyerek uygulamanın asılı kalmasını engelliyoruz
        var res = await fetch(MAIN_URL + '/tv/p.php', {
            method: 'POST',
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'X-Requested-With': 'XMLHttpRequest'
            },
            timeout: 5000 // 5 saniye sınırı
        });
        
        var setCookie = res.headers.get('set-cookie');
        if (setCookie) {
            var match = setCookie.match(/t_hash_t=([^;]+)/);
            if (match) {
                CONFIG.token = match[1];
                CONFIG.timestamp = now;
                console.log('[NetMirror] Token OK.');
                return CONFIG.token;
            }
        }
    } catch (e) {
        console.log('[NetMirror] Token hatası (Sistem meşgul olabilir):', e.message);
    }
    return CONFIG.token;
}

function getHeaders(mediaType, token) {
    var ott = (mediaType === 'movie') ? 'nf' : 'pv';
    return {
        'Cookie': 't_hash_t=' + token + '; ott=' + ott + '; hd=on',
        'User-Agent': 'Mozilla/5.0 (Android 14) ExoPlayer', // Android 14 uyumlu UA
        'X-Requested-With': 'XMLHttpRequest',
                'Referer': MAIN_URL + '/tv/home'
    };
}

async function loadLinks(data, token) {
    try {
        var parsed = typeof data === 'string' ? JSON.parse(data) : data;
        var ts = Math.floor(Date.now() / 1000);
        
        // Kotlin dizin yapısı düzeltildi
        var path = (parsed.type === 'movie') ? '/mobile/hs' : '/mobile/pv';
        var url = MAIN_URL + path + '/playlist.php?id=' + parsed.id + '&t=' + encodeURIComponent(parsed.title) + '&tm=' + ts;

        console.log('[NetMirror] Linkler alınıyor...');

        var res = await fetch(url, { 
            headers: getHeaders(parsed.type, token),
            timeout: 8000 
        });
        var json = await res.json();
        var item = Array.isArray(json) ? json[0] : json;

        if (!item || !item.sources) return [];

        return item.sources.map(function(s) {
            var videoUrl = s.file;
            if (!videoUrl.startsWith('http')) {
                videoUrl = NEW_URL + (videoUrl.startsWith('/') ? '' : '/') + videoUrl;
            }
            return {
                name: 'NetMirror (HLS)',
                url: videoUrl,
                quality: s.label || 'HD',
                type: 'hls',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Android 14) ExoPlayer',
                    'Cookie': 'hd=on',
                    'Referer': NEW_URL + '/'
                }
            };
        });
    } catch (e) {
        console.error('[NetMirror] Link yükleme başarısız.');
        return [];
    }
}

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    try {
        console.log('[NetMirror] Başlatılıyor...');
        var token = await ensureToken();
        
        var tmdbType = (mediaType === 'movie') ? 'movie' : 'tv';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + tmdbType + '/' + tmdbId + '?language=tr-TR&api_key=' + TMDB_KEY;

        var tmdbRes = await fetch(tmdbUrl, { timeout: 5000 });
        var tmdbData = await tmdbRes.json();
        var title = tmdbData.title || tmdbData.name;

        if (!title) return [];

        // Arama kısmında path düzeltmesi yapıldı
        var searchPath = (mediaType === 'movie') ? '/mobile/hs' : '/mobile/pv';
        var searchUrl = MAIN_URL + searchPath + '/search.php?s=' + encodeURIComponent(title) + '&t=' + Math.floor(Date.now()/1000);
        
        var searchRes = await fetch(searchUrl, { 
            headers: getHeaders(mediaType, token),
            timeout: 8000
        });
        var searchData = await searchRes.json();
        
        var results = searchData.searchResult || [];
        if (results.length === 0) return [];

        return await loadLinks({
            id: results[0].id,
            title: results[0].t,
            type: mediaType
        }, token);

    } catch (err) {
        console.error('[NetMirror] Genel Hata:', err.message);
        return [];
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    this.getStreams = getStreams;
}
