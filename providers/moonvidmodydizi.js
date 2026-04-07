var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';
var VERSION      = "7.4.0-SAFE-FORMAT";

async function getStreams(tmdbId, mediaType, season, episode) {
    if (mediaType !== 'tv') return [];

    try {
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR&append_to_response=external_ids`);
        const d = await tmdbRes.json();
        
        const imdbId = d.external_ids ? d.external_ids.imdb_id : null;
        const showName = d.name || "Dizi";

        if (!imdbId || !imdbId.startsWith('tt')) return [];

        let sStr = "s" + season;
        let eStr = "e" + (episode < 10 ? "0" + episode : episode);
        const targetUrl = `https://vidmody.com/vs/${imdbId}/${sStr}/${eStr}`;

        // Sadece linkin varlığını kontrol et
        const checkRes = await fetch(targetUrl, { method: 'HEAD' });
        
        if (checkRes.status === 200) {
            return [{
                url: targetUrl, 
                // Tahmin yürütmeden sadece kaynak adını yazıyoruz
                name: `Vidmody`, 
                // Sadece bölüm bilgisini gösteriyoruz
                title: `${showName} (${sStr.toUpperCase()}${eStr.toUpperCase()})`,
                quality: "Auto", // Bilinmediği için Auto bıraktık
                headers: {
                    'Referer': 'https://vidmody.com/',
                    'User-Agent': 'Mozilla/5.0'
                }
            }];
        }

        return [];

    } catch (e) {
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
