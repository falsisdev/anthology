// NetMirror Scraper - Nuvio & QuickJS Optimized
console.log('[NetMirror] Script baslatiliyor...');

// 1. QUICKJS UYUMLULUK KORUMASI
if (typeof process === 'undefined') {
    globalThis.process = { env: {} };
}

// 2. SABITLER VE GUNCEL DOMAIN
const TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
const NETMIRROR_BASE = 'https://net22.cc'; // Tarayicidakiyle ayni olmali

const BASE_HEADERS = {
    'X-Requested-With': 'XMLHttpRequest',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Connection': 'keep-alive'
};

// 3. SENIN BULDUGUN CANLI TOKEN (t_hash_t)
// Buraya az once calistigini teyit ettigin o uzun kodu yapistir:
let globalCookie = 'd753a3a2f2aa85e0abb7e334574ffc31::898f573179e928a097f3201c608f8d90::1773008412::rt';
const COOKIE_EXPIRY = 3153600000000; // 100 yil (Manuel tokeni korumak icin)
let cookieTimestamp = Date.now();

// 4. ISTEK YARDIMCISI (LOGLU)
function makeRequest(url, options = {}) {
    console.log(`[NetMirror] ISTEK -> ${url}`);
    return fetch(url, {
        ...options,
        headers: { ...BASE_HEADERS, ...options.headers },
        timeout: 10000
    }).then(res => {
        if (!res.ok) {
            console.error(`[NetMirror] HTTP HATASI: ${res.status} | URL: ${url}`);
            throw new Error(`HTTP ${res.status}`);
        }
        return res;
    });
}

function getUnixTime() { return Math.floor(Date.now() / 1000); }

// 5. AUTH/BYPASS (Sadece manuel token yoksa calisir)
function bypass() {
    if (globalCookie) {
        console.log('[NetMirror] Manuel token aktif, bypass atlaniyor.');
        return Promise.resolve(globalCookie);
    }
    return Promise.resolve('');
}

// 6. PLAYLIST COZUCU (Senin attigin JSON verisini isleyen kisim)
function getStreamingLinks(contentId, title, platform) {
    const ottMap = { 'netflix': 'nf', 'primevideo': 'pv', 'disney': 'hs' };
    const ott = ottMap[platform.toLowerCase()] || 'nf';

    return bypass().then(cookie => {
        // Playlist URL yapisi (id=41 gibi)
        const playlistUrl = `${NETMIRROR_BASE}/${platform === 'netflix' ? 'tv/' : 'mobile/' + platform + '/'}playlist.php?id=${contentId}&t=${encodeURIComponent(title)}&tm=${getUnixTime()}`;
        
        console.log(`[NetMirror] Playlist Cekiliyor (ID: ${contentId})`);
        
        return makeRequest(playlistUrl, {
            headers: { 
                'Cookie': `t_hash_t=${cookie}; ott=${ott}; hd=on`,
                'Referer': `${NETMIRROR_BASE}/tv/home`
            }
        });
    }).then(res => res.json()).then(playlistData => {
        if (!playlistData || !playlistData[0] || !playlistData[0].sources) {
            console.error('[NetMirror] JSON verisi bos veya hatali! Tokeni yenile.');
            return { sources: [] };
        }

        const sources = [];
        // Senin attigin JSON yapisina gore dongu:
        playlistData[0].sources.forEach(source => {
            let fileUrl = source.file;

            // URL DUZELTME (404 almamak icin en kritik yer)
            if (fileUrl.startsWith('/')) {
                // Eger /hls/41.m3u8 ise -> https://net22.cc/hls/41.m3u8 yapar
                fileUrl = NETMIRROR_BASE.replace(/\/$/, '') + fileUrl;
            }

            console.log(`[NetMirror] Kaynak Bulundu: [${source.label}] -> ${fileUrl.substring(0, 60)}...`);
            
            sources.push({
                url: fileUrl,
                quality: source.label,
                title: `NetMirror - ${source.label}`,
                type: 'hls'
            });
        });
        return { sources };
    });
}

// 7. ANA GIRIS (TMDB ID'den NetMirror ID'ye)
function getStreams(tmdbId, mediaType = 'movie', season = null, episode = null) {
    console.log(`[NetMirror] Baslatiliyor -> TMDB: ${tmdbId} | Tip: ${mediaType}`);
    
    // TMDB'den isim al
    const tmdbUrl = `https://api.themoviedb.org/3/${mediaType === 'tv' ? 'tv' : 'movie'}/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`;

    return makeRequest(tmdbUrl).then(res => res.json()).then(tmdbData => {
        const title = mediaType === 'tv' ? tmdbData.name : tmdbData.title;
        console.log(`[NetMirror] Aranan Baslik: ${title}`);

        const platforms = ['netflix', 'primevideo', 'disney'];
        
        function tryPlatform(idx) {
            if (idx >= platforms.length) return [];
            const platform = platforms[idx];

            // Arama yap
            const searchUrl = `${NETMIRROR_BASE}/${platform === 'netflix' ? '' : platform + '/'}search.php?s=${encodeURIComponent(title)}&t=${getUnixTime()}`;
            
            return bypass().then(cookie => {
                return makeRequest(searchUrl, {
                    headers: { 'Cookie': `t_hash_t=${cookie}; ott=nf; hd=on` }
                });
            }).then(res => res.json()).then(data => {
                const results = data.searchResult || [];
                if (results.length === 0) return tryPlatform(idx + 1);

                // Ilk sonucun playlist'ini cek
                return getStreamingLinks(results[0].id, title, platform).then(streamData => {
                    if (streamData.sources.length === 0) return tryPlatform(idx + 1);

                    return streamData.sources.map(s => ({
                        ...s,
                        name: `NetMirror (${platform})`,
                        headers: {
                            "Referer": `${NETMIRROR_BASE}/`,
                            "User-Agent": BASE_HEADERS['User-Agent'],
                            "Cookie": "hd=on"
                        }
                    }));
                });
            }).catch(err => {
                console.error(`[NetMirror] ${platform} Hatasi: ${err.message}`);
                return tryPlatform(idx + 1);
            });
        }
        return tryPlatform(0);
    }).catch(err => {
        console.error(`[NetMirror] Genel Hata: ${err.message}`);
        return [];
    });
}

// 8. EXPORT
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    global.getStreams = getStreams;
}
