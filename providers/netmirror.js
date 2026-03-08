/**
 * NetMirror - net22.cc & net50.cc Güncel Sürüm
 * TMDB Key: 1b3113663c9004682ed61086cf967c44
 */

var MAIN_URL = 'https://net22.cc';
var NEW_URL = 'https://net50.cc'; // Senin belirttiğin güncel adres
var TMDB_KEY = '1b3113663c9004682ed61086cf967c44';

var CONFIG = {
    token: "", 
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
        // net22 playlist sorgusu
        var url = MAIN_URL + '/playlist.php?id=' + data.id + '&t=' + encodeURIComponent(data.title) + '&tm=' + ts;

        console.log('[NetMirror-Check] Sorgulanıyor: ' + url);

        var res = await fetch(url, { headers: getHeaders(data.type), timeout: 8000 });
        var text = await res.text();

        // HTML kontrolü (Erişim engeli varsa loga düşer)
        if (!text || text.trim().startsWith('<')) {
            console.error('[NetMirror-Check] HATA: ' + MAIN_URL + ' JSON yerine HTML döndü.');
            return [];
        }

        var json = JSON.parse(text);
        var item = Array.isArray(json) ? json[0] : json;

        if (!item || !item.sources) {
            console.log('[NetMirror-Check] Kaynak bulunamadı.');
            return [];
        }

        return item.sources.map(function(s) {
            var videoUrl = s.file;
            // Link tam değilse net50.cc ekliyoruz
            if (!videoUrl.startsWith('http')) {
                videoUrl = NEW_URL + (videoUrl.startsWith('/') ? '' : '/') + videoUrl;
            }

            // LOG: Final link net50 olarak basılacak
            console.log('[NetMirror-Check] Final Video Linki (net50): ' + videoUrl);

            return {
                name: 'NetMirror (net50)',
                url: videoUrl,
                quality: s.label || 'HD',
                type: videoUrl.includes('.m3u8') ? 'hls' : 'video',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ExoPlayer',
                    'Referer': MAIN_URL + '/',
                    'Origin': MAIN_URL
                }
            };
        });
    } catch (e) {
        console.error('[NetMirror-Check] Playlist Hatası: ' + e.message);
        return [];
    }
}

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    try {
        console.log('[NetMirror-Check] Başladı. TMDB ID: ' + tmdbId);
        
        var tmdbType = (mediaType === 'movie') ? 'movie' : 'tv';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + tmdbType + '/' + tmdbId + '?language=tr-TR&api_key=' + TMDB_KEY;

        var tmdbRes = await fetch(tmdbUrl);
        var tmdbData = await tmdbRes.json();
        var title = tmdbData.title || tmdbData.name;

        if (!title) return [];

        // Arama net22 üzerinden
        var searchUrl = MAIN_URL + '/search.php?s=' + encodeURIComponent(title) + '&t=' + Math.floor(Date.now()/1000);
        console.log('[NetMirror-Check] net22 Arama: ' + title);
        
        var searchRes = await fetch(searchUrl, { headers: getHeaders(mediaType), timeout: 8000 });
        var searchText = await searchRes.text();

        if (!searchText || searchText.trim().startsWith('<')) {
            console.error('[NetMirror-Check] Arama sırasında net22 HTML döndü.');
            return [];
        }

        var searchData = JSON.parse(searchText);
        var results = searchData.searchResult || [];

        if (results.length === 0) return [];

        return await loadLinks({
            id: results[0].id,
            title: results[0].t,
            type: mediaType
        });

    } catch (err) {
        console.error('[NetMirror-Check] getStreams Hatası: ' + err.message);
        return [];
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    this.getStreams = getStreams;
}
