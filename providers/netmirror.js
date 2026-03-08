// NetMirror Scraper - Kotlin Mantığıyla Güncellendi
const NETMIRROR_BASE = 'https://net22.cc';
const NEW_URL = 'https://net52.cc'; // Kotlin'deki newUrl

// Kotlin Storage Mantığı: Cookie ve Zaman Damgası
let nf_cookie = "senin_t_hash_t_degerin"; // Buraya tarayıcıdan aldığın t_hash_t gelmeli
let nf_cookie_timestamp = Date.now();
const COOKIE_EXPIRY = 15 * 60 * 60 * 1000; // 15 Saat (Kotlin uyumlu)

// 1. KOTLİN getCookie() UYARLAMASI
function getAuthHeaders(platformType) {
    // Platforma göre OTT parametresi (Kotlin'deki gibi: pv, hs, nf)
    let ott = "nf"; 
    if (platformType === "PrimeVideo") ott = "pv";
    if (platformType === "JioHotstar") ott = "hs";

    // Zaman aşımı kontrolü (Kotlin clearCookie mantığı)
    const now = Date.now();
    if (now - nf_cookie_timestamp > COOKIE_EXPIRY) {
        console.log("[NetMirror] LOG: Cookie süresi doldu, yenilenmeli!");
        // Burada gerekirse otomatik temizleme yapılabilir
    }

    return {
        'Cookie': `t_hash_t=${nf_cookie}; ott=${ott}; hd=on`,
        'User-Agent': 'Mozilla/5.0 (Android) ExoPlayer',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': `${NETMIRROR_BASE}/home`,
        'Accept': '*/*',
        'Connection': 'keep-alive'
    };
}

// 2. KOTLİN loadLinks() UYARLAMASI
function loadLinks(contentId, title, platformType) {
    const ts = Math.floor(Date.now() / 1000);
    
    // Kotlin Farkı: Dizin Yapısı (/pv/ veya /hs/)
    let path = "/mobile/hs"; // Default Hotstar/Jio
    if (platformType === "PrimeVideo") path = "/pv";
    
    const playlistUrl = `${NEW_URL}${path}/playlist.php?id=${contentId}&t=${encodeURIComponent(title)}&tm=${ts}`;
    
    console.log(`[NetMirror] LOG: İstek atılıyor -> ${playlistUrl}`);

    return fetch(playlistUrl, {
        headers: getAuthHeaders(platformType)
    })
    .then(res => {
        if (!res.ok) throw new Error(`HTTP Hata! Durum: ${res.status}`);
        return res.json();
    })
    .then(data => {
        const item = Array.isArray(data) ? data[0] : data;
        if (!item || !item.sources) {
            console.log("[NetMirror] LOG: Kaynak bulunamadı (404 riski)");
            return [];
        }

        return item.sources.map(s => {
            // Kotlin: "${newUrl}${it.file}"
            let videoUrl = s.file;
            if (!videoUrl.startsWith('http')) {
                videoUrl = `${NEW_URL}${videoUrl.startsWith('/') ? '' : '/'}${videoUrl}`;
            }

            console.log(`[NetMirror] LOG: Video Linki Hazır -> ${s.label}`);

            return {
                name: `NetMirror (${platformType})`,
                url: videoUrl,
                quality: s.label,
                type: 'hls',
                // Kotlin getVideoInterceptor mantığı: Player'a header enjeksiyonu
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Android) ExoPlayer',
                    'Cookie': 'hd=on', // Kotlin Interceptor'daki zorunlu header
                    'Referer': `${NEW_URL}/`,
                    'Connection': 'keep-alive'
                }
            };
        });
    })
    .catch(err => {
        console.error(`[NetMirror] LOG: Hata oluştu -> ${err.message}`);
        return [];
    });
}
