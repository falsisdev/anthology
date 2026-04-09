// NOT: RecTV_v12_Dizi_Film_Link_Birlestirme_Sistemi (Optimize Edilmiş)
var cheerio = require("cheerio-without-node-native");

var BASE_URL = "https://a.prectv67.lol";
var SW_KEY = "4F5A9C3D9A86FA54EACEDDD635185/c3c5bd17-e37b-4b94-a944-8a3688a30452";

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    'Referer': 'https://twitter.com/',
    'Accept': 'application/json'
};

var cachedToken = null;

async function getAuthToken() {
    if (cachedToken) return cachedToken;
    try {
        const res = await fetch(BASE_URL + "/api/attest/nonce", { headers: HEADERS });
        const text = await res.text();
        try {
            const json = JSON.parse(text);
            cachedToken = json.accessToken || text.trim();
        } catch (e) { cachedToken = text.trim(); }
        return cachedToken;
    } catch (e) { return null; }
}

function analyzeStream(url, index, itemLabel) {
    const lowUrl = url.toLowerCase();
    const lowLabel = (itemLabel || "").toLowerCase();
    let info = { icon: "🌐", text: "Orijinal / Altyazı" };

    if (lowLabel.includes("dublaj") || lowUrl.includes("dublaj")) {
        if (lowLabel.includes("altyazı") && index === 1) {
            info.icon = "🌐";
            info.text = "Orijinal / Altyazı";
        } else {
            info.icon = "🇹🇷";
            info.text = "Türkçe Dublaj";
        }
    }
    return info;
}

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    try {
        const isMovie = (mediaType === 'movie');
        const tmdbUrl = `https://api.themoviedb.org/3/${isMovie ? 'movie' : 'tv'}/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`;
        const tmdbRes = await fetch(tmdbUrl);
        const tmdbData = await tmdbRes.json();
        const query = tmdbData.title || tmdbData.name;
        if (!query) return [];

        const token = await getAuthToken();
        const searchHeaders = Object.assign({}, HEADERS, { 'Authorization': 'Bearer ' + token });
        const searchUrl = `${BASE_URL}/api/search/${encodeURIComponent(query)}/${SW_KEY}/`;
        
        const sRes = await fetch(searchUrl, { headers: searchHeaders });
        const sData = await sRes.json();
        
        // Posterler ve serileri birleştir
        const items = (sData.series || []).concat(sData.posters || []);
        if (items.length === 0) return [];

        let finalResults = [];

        for (let target of items) {
            const targetTitle = target.title.toLowerCase().trim();
            const searchTitle = query.toLowerCase().trim();
            
            // --- NOKTA ATIŞI FİLTRELEME ---
            // 1. Tam eşleşme (Örn: "from" === "from")
            // 2. Yıl ekli eşleşme (Örn: "from (2022)")
            const isExactMatch = targetTitle === searchTitle;
            const isYearMatch = targetTitle.startsWith(searchTitle + " (");

            // Eğer başlık tam uymuyorsa, yanlış dizidir (Örn: "From Dusk Till Dawn" elenir)
            if (!isExactMatch && !isYearMatch) continue;

            if (target.type === "serie" || (!isMovie && target.label && target.label.toLowerCase().includes("dizi"))) {
                // DİZİ MANTIĞI
                const seasonRes = await fetch(`${BASE_URL}/api/season/by/serie/${target.id}/${SW_KEY}/`, { headers: searchHeaders });
                const seasons = await seasonRes.json();
                
                for (let s of seasons) {
                    let sNumber = parseInt(s.title.match(/\d+/) || 0);
                    if (sNumber == seasonNum) {
                        for (let ep of s.episodes) {
                            let epNumber = parseInt(ep.title.match(/\d+/) || 0);
                            if (epNumber == episodeNum) {
                                (ep.sources || []).forEach((src, idx) => {
                                    const res = analyzeStream(src.url, idx, ep.label || s.title || target.label);
                                    finalResults.push({
                                        name: `${query} [${res.icon} ${res.text}]`,
                                        url: src.url,
                                        quality: "Auto",
                                        headers: { 'User-Agent': 'googleusercontent', 'Referer': 'https://twitter.com/', 'Accept-Encoding': 'identity' }
                                    });
                                });
                            }
                        }
                    }
                }
            } else if (isMovie) {
                // FİLM MANTIĞI
                let movieSources = target.sources || [];
                if (movieSources.length === 0) {
                    const detRes = await fetch(`${BASE_URL}/api/movie/${target.id}/${SW_KEY}/`, { headers: searchHeaders });
                    const detData = await detRes.json();
                    movieSources = detData.sources || [];
                }
                movieSources.forEach((src, idx) => {
                    const res = analyzeStream(src.url, idx, target.label);
                    finalResults.push({
                        name: `${query} [${res.icon} ${res.text}]`,
                        url: src.url,
                        quality: "Auto",
                        headers: { 'User-Agent': 'googleusercontent', 'Referer': 'https://twitter.com/', 'Accept-Encoding': 'identity' }
                    });
                });
            }
        }

        // Tekrarlanan URL'leri temizle
        return finalResults.filter((v, i, a) => a.findIndex(t => (t.url === v.url)) === i);

    } catch (err) { 
        console.log("Hata oluştu:", err);
        return []; 
    }
}

module.exports = { getStreams };
