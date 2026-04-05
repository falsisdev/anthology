var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';
var VERSION      = "7.1.0-TV-S-E-FORMAT";

async function getStreams(tmdbId, mediaType, season, episode) {
    if (mediaType !== 'tv') return [];

    try {
        // 1. TMDB'den dizinin ana IMDb ID'sini al
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR&append_to_response=external_ids`);
        const d = await tmdbRes.json();
        
        const imdbId = d.external_ids ? d.external_ids.imdb_id : null;
        const showName = d.name || "Bilinmeyen Dizi";

        const results = [];

        // 2. Eğer IMDb ID varsa, verdiğin s1/e06 formatında linki oluştur
        if (imdbId && imdbId.startsWith('tt')) {
            // Bölüm ve Sezon numaralarını 2 haneli yapmak gerekirse (06 gibi) burası ayarlanabilir.
            // Ama verdiğin örnekte s1/e06 olduğu için direkt ekliyoruz:
            let sStr = "s" + season;
            let eStr = "e" + (episode < 10 ? "0" + episode : episode); // 10'dan küçükse başına 0 ekler

            results.push({
                url: `https://vidmody.com/vs/${imdbId}/${sStr}/${eStr}`, 
                name: `${showName} - ${sStr}${eStr}`,
                title: `[Vidmody-TV] ${showName} (${sStr.toUpperCase()} ${eStr.toUpperCase()})`,
                quality: "1080p",
                score: 100
            });
        }

        return results;

    } catch (e) {
        console.error(`[V${VERSION}] HATA: ${e.message}`);
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
