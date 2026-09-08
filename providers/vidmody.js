var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';
var VERSION      = "8.0.0-UNIFIED-VERIFIED";

async function getStreams(tmdbId, mediaType, season, episode) {
    try {
        // 1. TMDB Verisini Çek (Film veya Dizi fark etmeksizin dış ID'leri al)
        const typePath = (mediaType === 'movie') ? 'movie' : 'tv';
        const tmdbUrl = `https://api.themoviedb.org/3/${typePath}/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR&append_to_response=external_ids`;
        
        const tmdbRes = await fetch(tmdbUrl);
        const d = await tmdbRes.json();
        
        const imdbId = d.external_ids ? d.external_ids.imdb_id : null;
        const title = d.title || d.name || "İçerik";
        
        if (!imdbId || !imdbId.startsWith('tt')) return [];

        // 2. URL Formatını Belirle
        let targetUrl = "";
        let displayTitle = title;

        if (mediaType === 'movie') {
            // Film Formatı: https://vidmody.com/vs/tt123456
            targetUrl = `https://vidmody.com/vs/${imdbId}`;
            const releaseYear = (d.release_date || '').slice(0, 4);
            displayTitle += releaseYear ? ` (${releaseYear})` : "";
        } else {
            // Dizi Formatı: https://vidmody.com/vs/tt123456/s1/e01
            let sStr = "s" + season;
            let eStr = "e" + (episode < 10 ? "0" + episode : episode);
            targetUrl = `https://vidmody.com/vs/${imdbId}/${sStr}/${eStr}`;
            displayTitle += ` - ${sStr.toUpperCase()}${eStr.toUpperCase()}`;
        }

        // 3. Link Doğrulama (Gerçekten var mı kontrolü)
        // HEAD isteği ile sadece linkin aktif olup olmadığına bakıyoruz (Hızlıdır)
        try {
            const checkRes = await fetch(targetUrl, { method: 'HEAD' });
            
            if (checkRes.status === 200) {
                return [{
                    url: targetUrl,
                    name: `Vidmody`,
                    title: displayTitle,
                    quality: "Auto",
                    headers: {
                        'Referer': 'https://vidmody.com/',
                        'User-Agent': 'Mozilla/5.0'
                    }
                }];
            }
        } catch (linkErr) {
            // Bağlantı hatası veya CORS varsa linki riske atmayıp göstermiyoruz
            return [];
        }

        return [];

    } catch (e) {
        console.error(`[V${VERSION}] HATA: ${e.message}`);
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
