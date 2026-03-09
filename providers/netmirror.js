/**
 * OMNI-STREAM PROVIDER (NetMirror + SineWix Entegrasyonu)
 * Net22, Net52 ve SineWix kaynaklarını birleştirir.
 */

// --- YAPILANDIRMA ---
const TMDB_API_KEY = '1b3113663c9004682ed61086cf967c44'; // Senin TMDB anahtarın
const SINEWIX_API_KEY = '9iQNC5HQwPlaFuJDkhncJ5XTJ8feGXOJatAA';
const SINEWIX_BASE = 'https://ydfvfdizipanel.ru/public/api';

const NET_MIRROR_CONFIG = {
    net22: "https://net22.cc",
    net52: "https://net52.cc" // Prime ve diğer içerikler için
};

// --- YARDIMCI ARAÇLAR ---
async function resolveMediaFire(link) {
    try {
        const res = await fetch(link);
        const html = await res.text();
        const match = html.match(/href="(https:\/\/download\d+\.mediafire\.com[^"]+)"/);
        return match ? match[1] : link;
    } catch { return link; }
}

// --- SINEWIX KAYNAĞI ---
async function fetchSineWix(title, type, s, e, year) {
    try {
        const searchRes = await fetch(`${SINEWIX_BASE}/search/${encodeURIComponent(title)}/${SINEWIX_API_KEY}`, {
            headers: { 'hash256': '711bff4afeb47f07ab08a0b07e85d3835e739295e8a6361db77eebd93d96306b' }
        });
        const searchData = await searchRes.json();
        const best = (searchData.search || []).find(i => type === 'movie' ? i.type.includes('movie') : i.type.includes('serie')) || searchData.search?.[0];

        if (!best) return [];

        const endpoint = type === 'movie' ? `media/detail/${best.id}` : `series/show/${best.id}`;
        const detailRes = await fetch(`${SINEWIX_BASE}/${endpoint}/${SINEWIX_API_KEY}`);
        const item = await detailRes.json();

        let links = [];
        if (type === 'movie') {
            links = (item.videos || []).map(v => v.link);
        } else {
            const season = (item.seasons || []).find(sn => parseInt(sn.season_number) === parseInt(s));
            const ep = (season?.episodes || []).find(en => parseInt(en.episode_number) === parseInt(e));
            links = (ep?.videos || []).map(v => v.link);
        }

        return Promise.all(links.filter(Boolean).map(async (l) => ({
            name: l.includes('mediafire') ? 'SineWix (MF)' : 'SineWix',
            url: l.includes('mediafire') ? await resolveMediaFire(l) : l,
            title: `${title} (${year})`,
            quality: 'HD',
            headers: { 'Referer': 'https://ydfvfdizipanel.ru/' },
            provider: 'sinewix'
        })));
    } catch { return []; }
}

// --- NETMIRROR (NET22/NET52) KAYNAĞI ---
async function fetchNetMirror(title, type, s, e, year) {
    const streams = [];
    const platforms = ['netflix', 'primevideo', 'disney', 'apple'];

    for (const platform of platforms) {
        // Net22 ve Net52 arasında platforma göre seçim yap
        const baseUrl = platform === 'netflix' ? NET_MIRROR_CONFIG.net22 : NET_MIRROR_CONFIG.net52;
        
        try {
            // playlist.php üzerinden veri çekme mantığı
            const searchUrl = `${baseUrl}/playlist.php?id=41&query=${encodeURIComponent(title)}`;
            const res = await fetch(searchUrl);
            const results = await res.json();

            if (results && results.length > 0) {
                // En uyumlu sonucu bul ve stream linklerini oluştur
                const best = results[0];
                streams.push({
                    name: `NetMirror (${platform})`,
                    url: best.url, // Mevcut url yapına göre düzenle
                    title: `${title} S${s}E${e} [${platform.toUpperCase()}]`,
                    quality: '1080p',
                    headers: { 'Origin': baseUrl, 'Referer': `${baseUrl}/` },
                    provider: 'netmirror'
                });
            }
        } catch (err) { continue; }
    }
    return streams;
}

// --- ANA FONKSİYON ---
async function getStreams(tmdbId, mediaType, seasonNum = 1, episodeNum = 1) {
    try {
        const type = mediaType === 'movie' ? 'movie' : 'tv';
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/${type}/${tmdbId}?language=tr-TR&api_key=${TMDB_API_KEY}`);
        const data = await tmdbRes.json();
        const title = data.title || data.name;
        const year = (data.release_date || data.first_air_date || '').substring(0, 4);

        if (!title) return [];

        // İki kaynağı aynı anda başlat
        const [sineResults, netResults] = await Promise.all([
            fetchSineWix(title, mediaType, seasonNum, episodeNum, year),
            fetchNetMirror(title, mediaType, seasonNum, episodeNum, year)
        ]);

        return [...netResults, ...sineResults];
    } catch (e) {
        console.error("Kritik Hata:", e);
        return [];
    }
}

module.exports = { getStreams };
