// NetMirror Scraper - CloudStream/Kotlin Logic Sync
console.log('[NetMirror] Script baslatiliyor...');

// 1. QUICKJS / PROCESS HATASI KORUMASI
if (typeof process === 'undefined') {
    globalThis.process = { env: {} };
}

// 2. DOMAIN VE AYARLAR (Kotlin'deki newUrl mantigi)
const TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
const MAIN_URL = 'https://net22.cc';
const NEW_URL = 'https://net52.cc'; // Kotlin kodundaki yeni domain

const BASE_HEADERS = {
    'X-Requested-With': 'XMLHttpRequest',
    'User-Agent': 'Mozilla/5.0 (Android) ExoPlayer', // Kotlin'deki gibi ExoPlayer olarak degistirildi
    'Accept': '*/*',
    'Connection': 'keep-alive'
};

// 3. KRITIK TOKEN (t_hash_t)
// Buraya senin calisan tokenini ekle
let globalCookie = 'd753a3a2f2aa85e0abb7e334574ffc31::898f573179e928a097f3201c608f8d90::1773008412::rt';

function makeRequest(url, options = {}) {
    console.log(`[NetMirror] Istek -> ${url}`);
    return fetch(url, {
        ...options,
        headers: { ...BASE_HEADERS, ...options.headers },
        timeout: 10000
    }).then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res;
    });
}

// 4. PLAYLIST COZUCU (Kotlin loadLinks mantigi)
function getStreamingLinks(contentId, title) {
    const ts = Math.floor(Date.now() / 1000);
    
    // HATA DUZELTME: Kotlin kodunda playlist NEW_URL üzerinden çekiliyor!
    const playlistUrl = `${NEW_URL}/playlist.php?id=${contentId}&t=${encodeURIComponent(title)}&tm=${ts}`;
    
    console.log(`[NetMirror] Playlist Cekiliyor: ${playlistUrl}`);

    return makeRequest(playlistUrl, {
        headers: { 
            'Cookie': `t_hash_t=${globalCookie}; hd=on; ott=nf`,
            'Referer': `${NEW_URL}/` // Referer NEW_URL olmali
        }
    }).then(res => res.json()).then(data => {
        // Kotlin PlayList tipine gore: data dogrudan liste veya ilk eleman olabilir
        const playlist = Array.isArray(data) ? data[0] : data;
        if (!playlist || !playlist.sources) {
            console.error('[NetMirror] Kaynak bulunamadi!');
            return { sources: [] };
        }

        return {
            sources: playlist.sources.map(s => ({
                // HATA DUZELTME: it.file basina NEW_URL eklenmeli
                url: s.file.startsWith('http') ? s.file : (NEW_URL + s.file),
                quality: s.label,
                title: `NetMirror - ${s.label}`,
                type: 'hls'
            }))
        };
    });
}

// 5. ANA AKIS (Kotlin search + load mantigi)
function getStreams(tmdbId, mediaType = 'movie') {
    // TMDB'den isim alma
    const tmdbUrl = `https://api.themoviedb.org/3/${mediaType === 'tv' ? 'tv' : 'movie'}/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`;

    return makeRequest(tmdbUrl).then(res => res.json()).then(tmdbData => {
        const title = mediaType === 'tv' ? tmdbData.name : tmdbData.title;
        console.log(`[NetMirror] TMDB Basligi: ${title}`);

        // HATA DUZELTME: Arama MAIN_URL üzerinden yapilir
        const searchUrl = `${MAIN_URL}/search.php?s=${encodeURIComponent(title)}&t=${Math.floor(Date.now()/1000)}`;

        return makeRequest(searchUrl, {
            headers: { 
                'Cookie': `t_hash_t=${globalCookie}; ott=nf; hd=on`,
                'Referer': `${MAIN_URL}/tv/home` 
            }
        }).then(res => res.json()).then(data => {
            const results = data.searchResult || [];
            if (results.length === 0) {
                console.log('[NetMirror] Sonuc yok.');
                return [];
            }

            // İlk sonucu coz (Kotlin load fonksiyonu gibi)
            return getStreamingLinks(results[0].id, title).then(streamData => {
                return streamData.sources.map(s => ({
                    ...s,
                    name: "NetMirror",
                    headers: { 
                        "Referer": `${NEW_URL}/`,
                        "User-Agent": "Mozilla/5.0 (Android) ExoPlayer",
                        "Cookie": "hd=on"
                    }
                }));
            });
        });
    }).catch(err => {
        console.error(`[NetMirror] KRITIK HATA: ${err.message}`);
        return [];
    });
}

// EXPORT
if (typeof module !== 'undefined' && module.exports) { module.exports = { getStreams }; }
else { global.getStreams = getStreams; }
