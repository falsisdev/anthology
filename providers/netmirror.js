/**
 * NetMirror Provider - net22.cc Özel Versiyon
 * TMDB Key: 1b3113663c9004682ed61086cf967c44
 */

var MAIN_URL = 'https://net22.cc';
var NEW_URL = 'https://net52.cc';
var TMDB_KEY = '1b3113663c9004682ed61086cf967c44';

var CONFIG = {
    token: "", // Varsa t_hash_t buraya eklenebilir
    timestamp: 0
};

function getHeaders(mediaType) {
    var ott = (mediaType === 'movie') ? 'nf' : 'pv';
    return {
        'Cookie': 't_hash_t=' + CONFIG.token + '; ott=' + ott + '; hd=on',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ExoPlayer',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': MAIN_URL + '/'
    };
}

async function loadLinks(data) {
    try {
        var ts = Math.floor(Date.now() / 1000);
        var url = MAIN_URL + '/playlist.php?id=' + data.id + '&t=' + encodeURIComponent(data.title) + '&tm=' + ts;

        // LOG: Sorgulanan playlist adresi
        console.log('[NetMirror] Playlist Sorgulanıyor: ' + url);

        var res = await fetch(url, { headers: getHeaders(data.type), timeout: 8000 });
        var text = await res.text();

        // KRİTİK KONTROL: HTML gelirse ExoPlayer'a göndermiyoruz
        if (!text || text.trim().startsWith('<')) {
            console.error('[NetMirror] HATA: ' + MAIN_URL + ' üzerinden JSON yerine HTML döndü. (Erişim Engeli veya Token Geçersiz)');
            return [];
        }

        var json = JSON.parse(text);
        var item = Array.isArray(json) ? json[0] : json;

        if (!item || !item.sources) {
            console.log('[NetMirror] Kaynak bulunamadı: ' + data.title);
            return [];
        }

        return item.sources.map(function(s) {
            var videoUrl = s.file;
            if (!videoUrl.startsWith('http')) {
                videoUrl = NEW_URL + (videoUrl.startsWith('/') ? '' : '/') + videoUrl;
            }

            // LOG: Bulunan final link
            console.log('[NetMirror] Video Linki Bulundu: ' + videoUrl);

            return {
                name: 'NetMirror (net22)',
                url: videoUrl,
                quality: s.label || 'HD',
                type: videoUrl.includes('.m3u8') ? 'hls' : 'video',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ExoPlayer',
                    'Referer': NEW_URL + '/',
                    'Cookie': 'hd=on'
                }
            };
        });
    } catch (e) {
        console.error('[NetMirror] Link Yükleme Hatası: ' + e.message);
        return [];
    }
}

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    try {
        console.log('[NetMirror] İşlem Başlatıldı. TMDB ID: ' + tmdbId);
        
        var tmdbType = (mediaType === 'movie') ? 'movie' : 'tv';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + tmdbType + '/' + tmdbId + '?language=tr-TR&api_key=' + TMDB_KEY;

        var tmdbRes = await fetch(tmdbUrl);
        var tmdbData = await tmdbRes.json();
        var title = tmdbData.title || tmdbData.name;

        if (!title) {
            console.error('[NetMirror] TMDB başlığı alınamadı.');
            return [];
        }

        // LOG: Arama başlatılan başlık
        var searchUrl = MAIN_URL + '/search.php?s=' + encodeURIComponent(title) + '&t=' + Math.floor(Date.now()/1000);
        console.log('[NetMirror] net22 üzerinde aranıyor: ' + title + ' | URL: ' + searchUrl);
        
        var searchRes = await fetch(searchUrl, { headers: getHeaders(mediaType), timeout: 8000 });
        var searchText = await searchRes.text();

        if (!searchText || searchText.trim().startsWith('<')) {
            console.error('[NetMirror] Arama başarısız: ' + MAIN_URL + ' HTML döndürdü.');
            return [];
        }

        var searchData = JSON.parse(searchText);
        var results = searchData.searchResult || [];

        if (results.length === 0) {
            console.log('[NetMirror] net22 üzerinde sonuç bulunamadı.');
            return [];
        }

        console.log('[NetMirror] Sonuç bulundu, playlist çekiliyor...');

        return await loadLinks({
            id: results[0].id,
            title: results[0].t,
            type: mediaType
        });

    } catch (err) {
        console.error('[NetMirror] getStreams Hatası: ' + err.message);
        return [];
    }
}

// Global scope tanımı
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    this.getStreams = getStreams;
}
