// NetMirror Scraper - VLC Fix
const MAIN_URL = 'https://net22.cc';
const NEW_URL = 'https://net52.cc'; // Buradaki rakamı (52) güncel tutmalısın

function getStreamingLinks(contentId, title) {
    const ts = Math.floor(Date.now() / 1000);
    // Kotlin'deki tam playlist URL yapısı
    const playlistUrl = `${NEW_URL}/playlist.php?id=${contentId}&t=${encodeURIComponent(title)}&tm=${ts}`;
    
    console.log(`[NetMirror] Playlist isteği: ${playlistUrl}`);

    return makeRequest(playlistUrl, {
        headers: { 
            'Cookie': `t_hash_t=${globalCookie}; ott=nf; hd=on`,
            'Referer': `${NEW_URL}/`
        }
    }).then(res => res.json()).then(data => {
        const playlist = Array.isArray(data) ? data[0] : data;
        if (!playlist || !playlist.sources) return { sources: [] };

        return {
            sources: playlist.sources.map(s => {
                // HATA DÜZELTME: Linkin başına NEW_URL ekle ve sonuna VLC için m3u8 zorlaması yap
                let finalUrl = s.file;
                if (!finalUrl.startsWith('http')) {
                    finalUrl = NEW_URL + (finalUrl.startsWith('/') ? '' : '/') + finalUrl;
                }

                // Bazı VLC versiyonları parametreli m3u8'i tanımaz, temizle veya uzantı ekle
                return {
                    url: finalUrl,
                    quality: s.label,
                    title: `NetMirror - ${s.label}`,
                    type: 'hls', // Bu VLC'ye "bu bir yayındır" der
                    headers: {
                        "User-Agent": "Mozilla/5.0 (Android) ExoPlayer",
                        "Referer": `${NEW_URL}/`,
                        "Connection": "keep-alive"
                    }
                };
            })
        };
    });
}
