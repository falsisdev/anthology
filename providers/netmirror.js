/**
 * NetMirror - net22.cc & net54.cc (SSL Sertifika Düzeltmeli)
 * TMDB Key: 1b3113663c9004682ed61086cf967c44
 */

var MAIN_URL = 'https://net22.cc';
var NEW_URL = 'https://net54.cc'; // net50 ve 52 404 verdiği için 54'ü deniyoruz
var TMDB_KEY = '1b3113663c9004682ed61086cf967c44';

function getHeaders(mediaType) {
    return {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ExoPlayer',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': MAIN_URL + '/'
    };
}

async function loadLinks(data) {
    try {
        var ts = Math.floor(Date.now() / 1000);
        var url = MAIN_URL + '/playlist.php?id=' + data.id + '&t=' + encodeURIComponent(data.title) + '&tm=' + ts;

        console.log('[NetMirror-Debug] Playlist Sorgusu: ' + url);

        var res = await fetch(url, { headers: getHeaders(data.type), timeout: 8000 });
        var text = await res.text();

        if (!text || text.trim().startsWith('<')) return [];

        var json = JSON.parse(text);
        var item = Array.isArray(json) ? json[0] : json;
        if (!item || !item.sources) return [];

        return item.sources.map(function(s) {
            var videoUrl = s.file;
            if (!videoUrl.startsWith('http')) {
                videoUrl = NEW_URL + (videoUrl.startsWith('/') ? '' : '/') + videoUrl;
            }

            // Loglardaki "Certificate verification failure" hatasını aşmak için 
            // linki zorla HTTP yapıyoruz (Eğer sunucu destekliyorsa SSL hatası biter)
            videoUrl = videoUrl.replace('https://', 'http://');

            console.log('[NetMirror-Debug] Final Link (HTTP denemesi): ' + videoUrl);

            return {
                name: 'NetMirror (net54-Bypass)',
                url: videoUrl,
                quality: s.label || 'HD',
                type: videoUrl.includes('.m3u8') ? 'hls' : 'video',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ExoPlayer',
                    'Referer': MAIN_URL + '/'
                }
            };
        });
    } catch (e) {
        return [];
    }
}

async function getStreams(tmdbId, mediaType) {
    try {
        var tmdbType = (mediaType === 'movie') ? 'movie' : 'tv';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + tmdbType + '/' + tmdbId + '?language=tr-TR&api_key=' + TMDB_KEY;

        var tmdbRes = await fetch(tmdbUrl);
        var tmdbData = await tmdbRes.json();
        var title = tmdbData.title || tmdbData.name;

        if (!title) return [];

        var searchUrl = MAIN_URL + '/search.php?s=' + encodeURIComponent(title) + '&t=' + Math.floor(Date.now()/1000);
        console.log('[NetMirror-Debug] Arama: ' + title);
        
        var searchRes = await fetch(searchUrl, { headers: getHeaders(mediaType) });
        var searchText = await searchRes.text();
        var searchData = JSON.parse(searchText);
        var results = searchData.searchResult || [];

        if (results.length === 0) return [];

        return await loadLinks({ id: results[0].id, title: results[0].t, type: mediaType });
    } catch (err) {
        return [];
    }
}
