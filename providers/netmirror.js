/**
 * NetMirror - net52.cc & net22.cc 
 * SSL Sertifika Hatası ve 404 Giderilmiş Tam Kod
 */

const MAIN_URL = 'https://net22.cc';
const PLAYLIST_NODE = 'https://net52.cc'; // Playlist verisini aldığın sunucu
const VIDEO_NODE = 'http://net52.cc';    // SSL hatasını aşmak için HTTP (S'siz)
const TMDB_KEY = '1b3113663c9004682ed61086cf967c44';

function getHeaders() {
    return {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ExoPlayer',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': MAIN_URL + '/',
        'Origin': MAIN_URL
    };
}

async function loadLinks(data) {
    try {
        const ts = Math.floor(Date.now() / 1000);
        // Playlist sorgusu: net52.cc/playlist.php?id=...
        const url = `${PLAYLIST_NODE}/playlist.php?id=${data.id}&t=${encodeURIComponent(data.title)}&tm=${ts}`;

        console.log('[NetMirror-Debug] Playlist Sorgulanıyor: ' + url);

        const res = await fetch(url, { headers: getHeaders(), timeout: 10000 });
        const json = await res.json();
        
        const item = Array.isArray(json) ? json[0] : json;
        if (!item || !item.sources) {
            console.log('[NetMirror-Debug] Kaynak bulunamadı.');
            return [];
        }

        return item.sources.map(s => {
            let videoUrl = s.file; // Örn: /hls/41.m3u8?in=unknown::rt
            
            // Eğer link tam değilse başına VIDEO_NODE (http://net52.cc) ekle
            if (!videoUrl.startsWith('http')) {
                videoUrl = VIDEO_NODE + (videoUrl.startsWith('/') ? '' : '/') + videoUrl;
            } else {
                // Eğer link tam gelmişse de HTTPS'yi HTTP'ye çevir (SSL Bypass)
                videoUrl = videoUrl.replace('https://', 'http://');
            }

            console.log('[NetMirror-Debug] Final Video Linki: ' + videoUrl);

            return {
                name: 'NetMirror (' + (s.label || 'HD') + ')',
                url: videoUrl,
                quality: s.label || 'HD',
                type: 'hls', // .m3u8 olduğu için HLS tipinde
                headers: getHeaders() // Video oynatılırken de referer gönderilmeli
            };
        });
    } catch (e) {
        console.error('[NetMirror-Error] loadLinks Hatası: ' + e.message);
        return [];
    }
}

async function getStreams(tmdbId, mediaType) {
    try {
        // 1. TMDB'den film/dizi adını al
        const tmdbType = (mediaType === 'movie') ? 'movie' : 'tv';
        const tmdbUrl = `https://api.themoviedb.org/3/${tmdbType}/${tmdbId}?language=tr-TR&api_key=${TMDB_KEY}`;

        const tmdbRes = await fetch(tmdbUrl);
        const tmdbData = await tmdbRes.json();
        const title = tmdbData.title || tmdbData.name;

        if (!title) return [];
        console.log('[NetMirror-Debug] Aranıyor: ' + title);

        // 2. net22.cc üzerinde arama yap
        const searchUrl = `${MAIN_URL}/search.php?s=${encodeURIComponent(title)}&t=${Math.floor(Date.now()/1000)}`;
        const searchRes = await fetch(searchUrl, { headers: getHeaders() });
        const searchData = await searchRes.json();
        
        const results = searchData.searchResult || [];
        if (results.length === 0) {
            console.log('[NetMirror-Debug] Arama sonucu boş.');
            return [];
        }

        // 3. İlk sonucun playlist verilerini çek
        // results[0].id (örneğin 41) ve results[0].t verisini kullanıyoruz
        return await loadLinks({ 
            id: results[0].id, 
            title: results[0].t, 
            type: mediaType 
        });

    } catch (err) {
        console.error('[NetMirror-Error] getStreams Hatası: ' + err.message);
        return [];
    }
}
