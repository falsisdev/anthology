/**
 * NetMirror Provider - net22.cc Özel Versiyon
 */

var MAIN_URL = 'https://net22.cc';
var NEW_URL = 'https://net52.cc';
var TMDB_KEY = '1b3113663c9004682ed61086cf967c44';

var CONFIG = {
    token: "BURAYA_TARAYICIDAN_ALDIGIN_T_HASH_T_GELECEK", 
    timestamp: Date.now()
};

function getHeaders(mediaType) {
    // ott parametresi: film için nf, dizi için pv
    var ott = (mediaType === 'movie') ? 'nf' : 'pv';
    return {
        'Cookie': 't_hash_t=' + CONFIG.token + '; ott=' + ott + '; hd=on',
        'User-Agent': 'Mozilla/5.0 (Android 14) ExoPlayer',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': MAIN_URL + '/'
    };
}

async function loadLinks(data) {
    try {
        var parsed = typeof data === 'string' ? JSON.parse(data) : data;
        var ts = Math.floor(Date.now() / 1000);
        
        // Senin çalıştığını belirttiğin playlist yapısı
        // id=41 gibi direkt kök dizinden sorguluyoruz
        var url = MAIN_URL + '/playlist.php?id=' + parsed.id + '&t=' + encodeURIComponent(parsed.title) + '&tm=' + ts;

        console.log('[NetMirror] Link sorgusu:', url);

        var res = await fetch(url, { headers: getHeaders(parsed.type) });
        var text = await res.text();

        // HTML sayfası dönerse (hata sayfası) durdur
        if (!text || text.trim().startsWith('<')) {
            console.error('[NetMirror] Playlist JSON dönmedi, HTML döndü.');
            return [];
        }

        var json = JSON.parse(text);
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
                    'User-Agent': 'Mozilla/5.0 (Android 14) ExoPlayer',
                    'Cookie': 'hd=on',
                    'Referer': NEW_URL + '/'
                }
            };
        });
    } catch (e) {
        console.error('[NetMirror] Link Hatası:', e.message);
        return [];
    }
}

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    try {
        console.log('[NetMirror] İşlem başladı. ID:', tmdbId);
        
        var tmdbType = (mediaType === 'movie') ? 'movie' : 'tv';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + tmdbType + '/' + tmdbId + '?language=tr-TR&api_key=' + TMDB_KEY;

        var tmdbRes = await fetch(tmdbUrl);
        var tmdbData = await tmdbRes.json();
        var title = tmdbData.title || tmdbData.name;

        if (!title) return [];

        // net22 arama yapısı
        var searchUrl = MAIN_URL + '/search.php?s=' + encodeURIComponent(title) + '&t=' + Math.floor(Date.now()/1000);
        
        var searchRes = await fetch(searchUrl, { headers: getHeaders(mediaType) });
        var searchText = await searchRes.text();

        // Arama sonucu HTML gelirse engellenmiş demektir
        if (!searchText || searchText.trim().startsWith('<')) {
            console.error('[NetMirror] Arama sonucu HTML döndü (Erişim engeli).');
            return [];
        }

        var searchData = JSON.parse(searchText);
        var results = searchData.searchResult || [];
        if (results.length === 0) return [];

        // İlk sonucu yükle
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

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    this.getStreams = getStreams;
}
