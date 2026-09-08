/**
 * 666FilmIzle Scraper - v8.5 (Hata Koruma & Dangal Fix)
 */

var cheerio = require("cheerio-without-node-native");

var BASE_URL = "https://666filmizle.site";
var TMDB_API_KEY = "500330721680edb6d5f7f12ba7cd9023";

async function getStreams(tmdbId, mediaType) {
    try {
        const type = (mediaType === 'tv' || mediaType === 'series') ? 'tv' : 'movie';
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
        const movieData = await tmdbRes.json();
        const title = movieData.title || movieData.name;

        // Sitede arama yap
        const searchRes = await fetch(`${BASE_URL}/arama/?q=${encodeURIComponent(title)}`);
        const searchHtml = await searchRes.text();
        const $search = cheerio.load(searchHtml);
        
        let filmUrl = "";
        $search(".film-card").each((i, el) => {
            const link = $search(el).find("a.film-card__link").attr("href");
            if (link) { filmUrl = link.startsWith('http') ? link : BASE_URL + link; return false; }
        });

        if (!filmUrl) return [];

        const pageHtml = await (await fetch(filmUrl)).text();
        const streams = [];

        // ÖNCELİK 1: Vidmoly (Dangal gibi 404 riski olan filmlerde en sağlamı budur)
        const vidmolyMatch = pageHtml.match(/https:\/\/vidmoly\.to\/embed-([^.]+)\.html/);
        if (vidmolyMatch) {
            streams.push({
                name: "Vidmoly (Otomatik Kurtarma)",
                url: vidmolyMatch[0],
                quality: "HD",
                provider: "666film"
            });
        }

        // ÖNCELİK 2: Rapidplay (404 kontrolü yaparak ekle)
        const frameMatch = pageHtml.match(/data-frame="([^"]+)"/);
        if (frameMatch) {
            const videoId = frameMatch[1].split(/[#/]/).filter(p => p.length > 5).pop()?.split('?')[0];
            if (videoId) {
                const rapidUrl = `https://p.rapidplay.website/videos/${videoId}/master.m3u8`;
                
                // Linkin çalışıp çalışmadığını arka planda kontrol et
                const check = await fetch(rapidUrl, { method: 'HEAD' }).catch(() => ({ status: 404 }));
                
                if (check.status !== 404) {
                    streams.push({
                        name: "Rapidplay (Sunucu)",
                        url: rapidUrl,
                        quality: "Auto",
                        isM3U8: true,
                        headers: { 'Referer': 'https://rapidplay.website/' },
                        provider: "666film"
                    });
                }
            }
        }

        return streams;
    } catch (e) {
        console.error("Hata:", e.message);
        return [];
    }
}

module.exports = { getStreams };
