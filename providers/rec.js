// RecTV_v12_Dizi_Film_Link_Birlestirme_Sistemi (Film Desteği Onarılmış)
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
        
        const items = (sData.series || []).concat(sData.posters || []);
        if (items.length === 0) return [];

        let finalResults = [];

        for (let target of items) {
            const targetTitle = target.title.toLowerCase().trim();
            const searchTitle = query.toLowerCase().trim();
            
            // --- DAHA ESNEK AMA GÜVENLİ FİLTRE ---
            // Sadece aranan kelime başlığın içinde geçmiyorsa veya yanlış türse atla
            // Bu sayede "Film Adı - Dublaj" gibi sonuçlar elenmez.
            if (!targetTitle.includes(searchTitle)) continue;

            // Eğer film arıyorsak ama gelen "serie" ise veya "dizi" etiketi varsa atla
            const isActuallySerie = target.type === "serie" || (target.label && target.label.toLowerCase().includes("dizi"));
            if (isMovie && isActuallySerie) continue;

            // Dizi arıyorsak ama film geldiyse atla
            if (!isMovie && !isActuallySerie) continue;

            if (isActuallySerie) {
                // --- DİZİ MANTIĞI ---
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
            } else {
                // --- FİLM MANTIĞI ---
                let movieSources = target.sources || [];
                // Eğer kaynaklar boşsa detay sayfasından çek
                if (!movieSources || movieSources.length === 0) {
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

        return finalResults.filter((v, i, a) => a.findIndex(t => (t.url === v.url)) === i);

    } catch (err) { 
        return []; 
    }
}

module.exports = { getStreams };
