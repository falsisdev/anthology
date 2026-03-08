// NetMirror Scraper - Fixed for ExoPlayer Error
console.log('[NetMirror] Script baslatiliyor...');

if (typeof process === 'undefined') { globalThis.process = { env: {} }; }

const TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
const MAIN_URL = 'https://net22.cc';
const NEW_URL = 'https://net52.cc'; // Kotlin kodundaki asıl video domaini

const BASE_HEADERS = {
    'X-Requested-With': 'XMLHttpRequest',
    'User-Agent': 'Mozilla/5.0 (Android) ExoPlayer', // Loglardaki ExoPlayer hatasini cozmek icin sart
    'Accept': '*/*',
    'Connection': 'keep-alive'
};

// Senin taze token'ın
let globalCookie = 'd753a3a2f2aa85e0abb7e334574ffc31::898f573179e928a097f3201c608f8d90::1773008412::rt';

function makeRequest(url, options = {}) {
    console.log(`[NetMirror] Baglaniliyor -> ${url}`);
    return fetch(url, {
        ...options,
        headers: { ...BASE_HEADERS, ...options.headers },
        timeout: 10000
    }).then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res;
    });
}

function getStreamingLinks(contentId, title) {
    const ts = Math.floor(Date.now() / 1000);
    // KOTLIN FIX: Playlist NEW_URL üzerinden çekilmeli
    const playlistUrl = `${NEW_URL}/playlist.php?id=${contentId}&t=${encodeURIComponent(title)}&tm=${ts}`;
    
    return makeRequest(playlistUrl, {
        headers: { 'Cookie': `t_hash_t=${globalCookie}; ott=nf; hd=on` }
    }).then(res => res.json()).then(data => {
        const playlist = Array.isArray(data) ? data[0] : data;
        if (!playlist || !playlist.sources) return { sources: [] };

        return {
            sources: playlist.sources.map(s => {
                // KOTLIN FIX: Linkin basina mutlaka domain eklenmeli (404/Parser hatasini bu cozer)
                let finalUrl = s.file;
                if (!finalUrl.startsWith('http')) {
                    finalUrl = NEW_URL + (finalUrl.startsWith('/') ? '' : '/') + finalUrl;
                }
                
                console.log(`[NetMirror] Link Olusturuldu: ${finalUrl.substring(0, 50)}...`);
                
                return {
                    url: finalUrl,
                    quality: s.label,
                    type: 'hls'
                };
            })
        };
    });
}

function getStreams(tmdbId, mediaType = 'movie') {
    const tmdbUrl = `https://api.themoviedb.org/3/${mediaType === 'tv' ? 'tv' : 'movie'}/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`;

    return makeRequest(tmdbUrl).then(res => res.json()).then(tmdbData => {
        const title = mediaType === 'tv' ? tmdbData.name : tmdbData.title;
        console.log(`[NetMirror] Aranan: ${title}`);

        const searchUrl = `${MAIN_URL}/search.php?s=${encodeURIComponent(title)}&t=${Math.floor(Date.now()/1000)}`;

        return makeRequest(searchUrl, {
            headers: { 
                'Cookie': `t_hash_t=${globalCookie}; ott=nf; hd=on`,
                'Referer': `${MAIN_URL}/tv/home` 
            }
        }).then(res => res.json()).then(data => {
            const results = data.searchResult || [];
            if (results.length === 0) return [];

            return getStreamingLinks(results[0].id, title).then(streamData => {
                return streamData.sources.map(s => ({
                    ...s,
                    name: "NetMirror",
                    headers: { 
                        "Referer": `${NEW_URL}/`,
                        "User-Agent": "Mozilla/5.0 (Android) ExoPlayer", // Player bu header'i gormeli
                        "Cookie": "hd=on"
                    }
                }));
            });
        });
    });
}

if (typeof module !== 'undefined' && module.exports) { module.exports = { getStreams }; }
else { global.getStreams = getStreams; }
