/**
 * NETMIRROR ÖNCELİKLİ MEDYA SAĞLAYICI
 * net22.cc (Netflix) ve net52.cc (Diğer) sistemine göre optimize edilmiştir.
 */

// --- YAPILANDIRMA ---
const TMDB_API_KEY = '1b3113663c9004682ed61086cf967c44'; // Senin TMDB anahtarın
const NET_CONFIG = {
    netflix: "https://net22.cc", // Netflix içerikleri için
    others: "https://net52.cc"   // Prime, Disney+ vb. içerikler için
};

const COMMON_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': '*/*',
    'Cookie': 'hd=on' // Yüksek kalite zorlaması için
};

// --- NETMIRROR ARAMA MANTIĞI ---
async function fetchFromNetMirror(title, type, s, e, platform) {
    // Platforma göre domain seçimi (net22 veya net52)
    const baseUrl = platform === 'netflix' ? NET_CONFIG.netflix : NET_CONFIG.others;
    
    try {
        // Senin kullandığın playlist.php yapısı üzerinden arama
        const searchUrl = `${baseUrl}/playlist.php?id=41&query=${encodeURIComponent(title)}`;
        const res = await fetch(searchUrl, { headers: COMMON_HEADERS });
        const results = await res.json();

        if (!results || results.length === 0) return [];

        // En iyi eşleşmeyi filtrele ve formatla
        return results.map(item => ({
            name: `NetMirror (${platform.toUpperCase()})`,
            title: `${item.title || title} ${type === 'tv' ? `S${s}E${e}` : ''}`,
            url: item.url, // Gelen ham yayın linki
            quality: item.quality || '1080p',
            headers: {
                'Origin': baseUrl,
                'Referer': `${baseUrl}/`,
                'User-Agent': COMMON_HEADERS['User-Agent']
            },
            provider: 'netmirror'
        }));
    } catch (err) {
        console.error(`[NetMirror] ${platform} hatası:`, err.message);
        return [];
    }
}

// --- ANA AKIŞ ---
async function getStreams(tmdbId, mediaType, seasonNum = 1, episodeNum = 1) {
    console.log(`[NetMirror] TMDB:${tmdbId} aranıyor...`);

    try {
        // 1. TMDB'den Türkçe isim al (Arama başarısı için şart)
        const type = mediaType === 'movie' ? 'movie' : 'tv';
        const tmdbUrl = `https://api.themoviedb.org/3/${type}/${tmdbId}?language=tr-TR&api_key=${TMDB_API_KEY}`;
        const tmdbRes = await fetch(tmdbUrl);
        const data = await tmdbRes.json();
        
        const title = data.title || data.name;
        if (!title) return [];

        // 2. NetMirror Platformlarını Tara
        // net22 (netflix) ve net52 (diğerleri) eş zamanlı taranır
        const platforms = ['netflix', 'primevideo', 'disney'];
        const searchPromises = platforms.map(p => 
            fetchFromNetMirror(title, mediaType, seasonNum, episodeNum, p)
        );

        const allResults = await Promise.all(searchPromises);
        
        // Tüm platformlardan gelen sonuçları tek listede birleştir
        const finalStreams = allResults.flat();

        console.log(`[NetMirror] Toplam ${finalStreams.length} yayın bulundu.`);
        return finalStreams;

    } catch (e) {
        console.error("[NetMirror] Kritik hata:", e);
        return [];
    }
}

// Modül dışa aktarma
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    global.getStreams = getStreams;
}
