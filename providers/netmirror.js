// NetMirror Scraper for Nuvio (QuickJS/Android TV Optimized)
console.log('[NetMirror] Script yukleniyor...');

// 1. QUICKJS UYUMLULUK KATMANI (Process hatasini engeller)
if (typeof process === 'undefined') {
    globalThis.process = { env: {} };
}

// 2. SABİT AYARLAR
const TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
const NETMIRROR_BASE = 'https://net22.cc'; // Tarayicida calisan guncel adres

const BASE_HEADERS = {
    'X-Requested-With': 'XMLHttpRequest',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'tr-TR,tr;q=0.9',
    'Connection': 'keep-alive'
};

// 3. MANUEL TOKEN VE GÜVENLİK AYARI
// Senin buldugun o uzun %3A%3A iceren kodu buraya tam olarak yapistir
let globalCookie = 'd753a3a2f2aa85e0abb7e334574ffc31%3A%3A0c69f152f07d0f5e9f7555b314c88029%3A%3A1773007142%3A%3Art';
let cookieTimestamp = Date.now(); 
const COOKIE_EXPIRY = 3153600000000; // 100 yil (Bypass'i devre disi birakir)

// 4. YARDIMCI FONKSİYONLAR
function getUnixTime() { return Math.floor(Date.now() / 1000); }

function makeRequest(url, options = {}) {
    console.log(`[NetMirror] Istek Atiliyor: ${url}`);
    return fetch(url, {
        ...options,
        headers: { ...BASE_HEADERS, ...options.headers },
        timeout: 10000
    }).then(response => {
        if (!response.ok) {
            console.error(`[NetMirror] HTTP Hatasi! Kod: ${response.status} URL: ${url}`);
            throw new Error(`HTTP ${response.status}`);
        }
        return response;
    });
}

// 5. AUTH / BYPASS (Manuel token varsa burasi pas gecer)
function bypass() {
    const now = Date.now();
    if (globalCookie && (now - cookieTimestamp) < COOKIE_EXPIRY) {
        console.log('[NetMirror] Manuel token kullaniliyor.');
        return Promise.resolve(globalCookie);
    }
    console.warn('[NetMirror] Manuel token bulunamadi veya gecersiz, otomatik bypass deneniyor...');
    // ... (Otomatik bypass mantigi yukaridaki degiskenler sayesinde calismayacak)
    return Promise.resolve(globalCookie);
}

// 6. ARAMA FONKSİYONU
function searchContent(query, platform) {
    const ottMap = { 'netflix': 'nf', 'primevideo': 'pv', 'disney': 'hs' };
    const ott = ottMap[platform.toLowerCase()] || 'nf';
    
    return bypass().then(cookie => {
        const searchUrl = `${NETMIRROR_BASE}/${platform === 'netflix' ? '' : platform + '/'}search.php?s=${encodeURIComponent(query)}&t=${getUnixTime()}`;
        console.log(`[NetMirror] ${platform} uzerinde araniyor: ${query}`);
        
        return makeRequest(searchUrl, {
            headers: { 
                'Cookie': `t_hash_t=${cookie}; ott=${ott}; hd=on`,
                'Referer': `${NETMIRROR_BASE}/tv/home`
            }
        });
    }).then(res => res.json()).then(data => {
        const results = data.searchResult || [];
        console.log(`[NetMirror] Arama bitti. Bulunan sonuc sayisi: ${results.length}`);
        return results.map(item => ({ id: item.id, title: item.t }));
    });
}

// 7. STREAM LİNKLERİNİ ÇÖZME (En kritik yer)
function getStreamingLinks(contentId, title, platform) {
    const ottMap = { 'netflix': 'nf', 'primevideo': 'pv', 'disney': 'hs' };
    const ott = ottMap[platform.toLowerCase()] || 'nf';

    return bypass().then(cookie => {
        const playlistUrl = `${NETMIRROR_BASE}/${platform === 'netflix' ? 'tv/' : 'mobile/' + platform + '/'}playlist.php?id=${contentId}&t=${encodeURIComponent(title)}&tm=${getUnixTime()}`;
        console.log(`[NetMirror] Playlist istegi: ${playlistUrl}`);

        return makeRequest(playlistUrl, {
            headers: { 
                'Cookie': `t_hash_t=${cookie}; ott=${ott}; hd=on`,
                'Referer': `${NETMIRROR_BASE}/tv/home` 
            }
        });
    }).then(res => res.json()).then(playlist => {
        if (!Array.isArray(playlist) || playlist.length === 0) {
            console.error('[NetMirror] Playlist bos dondu! Token hatali olabilir.');
            return { sources: [] };
        }

        const sources = [];
        playlist.forEach(item => {
            if (item.sources) {
                item.sources.forEach(source => {
                    let fileUrl = source.file;
                    // 404 Hatasini onlemek icin relative path (/) duzeltme
                    if (fileUrl.startsWith('/')) {
                        fileUrl = NETMIRROR_BASE.replace(/\/$/, '') + fileUrl.replace(/^\/tv\//, '/');
                    }
                    console.log(`[NetMirror] Stream bulundu: ${source.label} -> ${fileUrl.substring(0, 50)}...`);
                    sources.push({
                        url: fileUrl,
                        quality: source.label,
                        type: 'hls'
                    });
                });
            }
        });
        return { sources };
    });
}

// 8. ANA GİRİŞ FONKSİYONU
function getStreams(tmdbId, mediaType = 'movie', seasonNum = null, episodeNum = null) {
    console.log(`[NetMirror] Islem basliyor. TMDB: ${tmdbId} Tip: ${mediaType}`);
    
    const tmdbUrl = `https://api.themoviedb.org/3/${mediaType === 'tv' ? 'tv' : 'movie'}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    
    return makeRequest(tmdbUrl).then(res => res.json()).then(tmdbData => {
        const title = mediaType === 'tv' ? tmdbData.name : tmdbData.title;
        console.log(`[NetMirror] TMDB Basligi: ${title}`);

        const platforms = ['netflix', 'primevideo', 'disney'];
        
        function tryPlatform(index) {
            if (index >= platforms.length) {
                console.log('[NetMirror] Hicbir platformda bulunamadi.');
                return [];
            }
            const platform = platforms[index];
            
            return searchContent(title, platform).then(results => {
                if (results.length === 0) return tryPlatform(index + 1);
                
                // İlk sonucu al ve stream linklerini cek
                return getStreamingLinks(results[0].id, title, platform).then(data => {
                    if (data.sources.length === 0) return tryPlatform(index + 1);

                    return data.sources.map(s => ({
                        name: `NetMirror (${platform})`,
                        title: `${title} - ${s.quality}`,
                        url: s.url,
                        quality: s.quality,
                        type: 'hls',
                        headers: {
                            "Referer": `${NETMIRROR_BASE}/`,
                            "User-Agent": BASE_HEADERS['User-Agent'],
                            "Cookie": "hd=on"
                        }
                    }));
                });
            }).catch(err => {
                console.error(`[NetMirror] ${platform} hatasi: ${err.message}`);
                return tryPlatform(index + 1);
            });
        }
        return tryPlatform(0);
    }).catch(err => {
        console.error(`[NetMirror] Genel hata: ${err.message}`);
        return [];
    });
}

// EXPORT
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    global.getStreams = getStreams;
}
