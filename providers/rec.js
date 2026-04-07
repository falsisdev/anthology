var cheerio = require("cheerio-without-node-native");

var BASE_URL = "https://a.prectv67.lol";
var SW_KEY = "4F5A9C3D9A86FA54EACEDDD635185/c3c5bd17-e37b-4b94-a944-8a3688a30452";

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    'Referer': 'https://twitter.com/',
    'Accept': 'application/json'
};

var cachedToken = null;

/**
 * Token alma işlemini daha sağlam hale getirdik
 */
async function getAuthToken() {
    if (cachedToken) return cachedToken;
    try {
        const res = await fetch(BASE_URL + "/api/attest/nonce", { headers: HEADERS });
        const text = await res.text();
        try {
            const json = JSON.parse(text);
            cachedToken = json.accessToken || text.trim();
        } catch (e) {
            cachedToken = text.trim();
        }
        return cachedToken;
    } catch (e) {
        return null;
    }
}

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    try {
        const isMovie = (mediaType === 'movie');
        const tmdbUrl = `https://api.themoviedb.org/3/${isMovie ? 'movie' : 'tv'}/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`;

        const tmdbRes = await fetch(tmdbUrl);
        const data = await tmdbRes.json();
        const query = data.title || data.name;
        if (!query) return [];

        const token = await getAuthToken();
        if (!token) return [];

        const searchHeaders = Object.assign({}, HEADERS, { 'Authorization': 'Bearer ' + token });
        const searchUrl = `${BASE_URL}/api/search/${encodeURIComponent(query)}/${SW_KEY}/`;
        
        const sRes = await fetch(searchUrl, { headers: searchHeaders });
        const sData = await sRes.json();
        
        const items = (sData.posters || []).concat(sData.channels || []).concat(sData.series || []);
        if (items.length === 0) return [];

        const target = items[0];
        let sources = [];

        if (target.type === "serie" || (target.label && target.label.toLowerCase().includes("dizi"))) {
            const seasonRes = await fetch(`${BASE_URL}/api/season/by/serie/${target.id}/${SW_KEY}/`, { headers: searchHeaders });
            const seasons = await seasonRes.json();
            
            for (let s of seasons) {
                let sNumber = parseInt(s.title.match(/\d+/) || 0);
                if (sNumber == seasonNum) {
                    for (let ep of s.episodes) {
                        let epNumber = parseInt(ep.title.match(/\d+/) || 0);
                        if (epNumber == episodeNum) {
                            sources = ep.sources || [];
                            break;
                        }
                    }
                }
            }
        } else {
            sources = target.sources || [];
        }

        // SONUÇLARI DÖNDÜR
        return sources.map(src => ({
            name: `RecTV | ${src.type.toUpperCase()}`,
            url: src.url, // Proxy'yi kaldırdık, doğrudan link daha sağlıklı
            quality: "Auto",
            headers: {
                'User-Agent': 'googleusercontent', // Oynatırken bu UA kritik
                'Referer': 'https://twitter.com/'
            }
        }));

    } catch (err) {
        console.error(err);
        return [];
    }
}

module.exports = { getStreams };
