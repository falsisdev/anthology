/**
 * FullHDFilmizlesene Nuvio Scraper - v29.4
 * Sadece eşleşme mantığı ve görsel etiketler güncellendi.
 */

var cheerio = require("cheerio-without-node-native");

const BASE_URL = "https://www.fullhdfilmizlesene.live";
const API_BASE = "https://www.fullhdfilmizlesene.live/player/api.php";

const WORKING_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/',
    'Origin': BASE_URL
};

function universalAtob(str) {
    try {
        if (typeof atob === 'function') return atob(str);
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
        var out = ''; str = String(str).replace(/[=]+$/, '');
        for (var bc = 0, bs, buffer, idx = 0; buffer = str.charAt(idx++); ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer, bc++ % 4) ? out += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0) {
            buffer = chars.indexOf(buffer);
        }
        return out;
    } catch (e) { return null; }
}

function decodeRapidVid(encodedData) {
    try {
        if (!encodedData) return null;
        var reversed = encodedData.split('').reverse().join('');
        var decodedBinary = universalAtob(reversed.replace(/[^A-Za-z0-9+/=]/g, ""));
        var key = "K9L"; var adjusted = "";
        for (var i = 0; i < decodedBinary.length; i++) {
            var charCode = decodedBinary.charCodeAt(i);
            var shift = (key.charCodeAt(i % key.length) % 5) + 1;
            adjusted += String.fromCharCode(charCode - shift);
        }
        var finalUrl = universalAtob(adjusted);
        return (finalUrl && finalUrl.startsWith('http')) ? finalUrl.replace(/\\/g, "").trim() : null;
    } catch (e) { return null; }
}

async function getStreamsFromAPI(vidid, movieTitle) {
    // v28.6'daki çalışan stabil mantık
    const fetchAtom = async () => {
        try {
            let res = await fetch(API_BASE + '?id=' + vidid + '&type=t&name=atom&get=video&format=json', { headers: WORKING_HEADERS });
            let data = await res.json();
            if (data && data.html) {
                let playerRes = await fetch(data.html.replace(/\\/g, ''), { headers: WORKING_HEADERS });
                let playerHtml = await playerRes.text();
                let avMatch = playerHtml.match(/av\(['"]([^'"]+)['"]\)/);
                if (avMatch) {
                    let url = decodeRapidVid(avMatch[1]);
                    if (url) return { 
                        name: movieTitle, 
                        title: "⌜ FULLHDFILM ⌟ | Atom | 🇹🇷 Dublaj", 
                        url: url, 
                        quality: "Auto", 
                        headers: WORKING_HEADERS 
                    };
                }
            }
        } catch (e) { }
        return null;
    };

    const fetchTurbo = async () => {
        try {
            let res = await fetch(API_BASE + '?id=' + vidid + '&type=t&name=advid&get=video&pno=tr&format=json', { headers: WORKING_HEADERS });
            let data = await res.json();
            if (data && data.html && data.html.includes('/watch/')) {
                let watchId = data.html.match(/\/watch\/(.*?)"/)[1];
                let playRes = await fetch('https://turbo.imgz.me/play/' + watchId + '?autoplay=true', { headers: Object.assign({}, WORKING_HEADERS, { 'Referer': BASE_URL }) });
                let playHtml = await playRes.text();
                let m3u8 = playHtml.match(/file:\s*"(.*?\.m3u8.*?)"/i);
                if (m3u8) return { 
                    name: movieTitle, 
                    title: "⌜ FULLHDFILM ⌟ | Turbo | 🇹🇷 Dublaj", 
                    url: m3u8[1], 
                    quality: "Auto", 
                    headers: Object.assign({}, WORKING_HEADERS, { 'Referer': 'https://turbo.imgz.me/' }) 
                };
            }
        } catch (e) { }
        return null;
    };

    let results = await Promise.all([fetchAtom(), fetchTurbo()]);
    return results.filter(r => r !== null);
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        if (mediaType !== 'movie') return resolve([]);

        fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96&append_to_response=alternative_titles`)
            .then(res => res.json())
            .then(data => {
                const targetYear = data.release_date ? data.release_date.split('-')[0] : "";
                const titles = new Set([data.title.toLowerCase(), data.original_title.toLowerCase()]);
                if (data.alternative_titles && data.alternative_titles.titles) {
                    data.alternative_titles.titles.forEach(t => titles.add(t.title.toLowerCase()));
                }

                console.error(`[NUVIO] Hedef: ${data.title} (${targetYear})`);
                return Promise.all([fetch(`${BASE_URL}/arama/${encodeURIComponent(data.title)}`, { headers: WORKING_HEADERS }), targetYear, Array.from(titles)]);
            })
            .then(async ([res, targetYear, allTitles]) => {
                let $ = cheerio.load(await res.text());
                let candidates = [];

                $("ul.list li.film").each((i, el) => {
                    let link = $(el).find("a.tt").attr("href");
                    let siteTitle = $(el).find(".film-title").text().trim().toLowerCase();
                    let siteYear = $(el).find(".film-yil").text().trim();

                    // 1. YIL KONTROLÜ: Kesin tutmalı
                    if (!siteYear.includes(targetYear)) return;

                    // 2. PUANLAMA
                    let score = 0;
                    allTitles.forEach(t => {
                        if (siteTitle === t) score += 100;
                        else if (siteTitle.includes(t) || t.includes(siteTitle)) score += 50;
                    });

                    if (score > 0) candidates.push({ link, score, title: siteTitle });
                });

                candidates.sort((a, b) => b.score - a.score);
                let bestMatch = candidates[0];

                if (bestMatch && bestMatch.link) {
                    console.error(`[NUVIO] DOĞRU EŞLEŞME: ${bestMatch.title} (${bestMatch.score} Puan)`);
                    let fRes = await fetch(bestMatch.link.startsWith('http') ? bestMatch.link : BASE_URL + bestMatch.link, { headers: WORKING_HEADERS });
                    let filmHtml = await fRes.text();
                    let vidMatch = filmHtml.match(/vidid\s*=\s*['"](\d+)['"]/);
                    
                    if (vidMatch) {
                        let streams = await getStreamsFromAPI(vidMatch[1], bestMatch.title.toUpperCase());
                        return resolve(streams);
                    }
                }
                resolve([]);
            })
            .catch(() => resolve([]));
    });
}

if (typeof module !== 'undefined' && module.exports) { 
    module.exports = { getStreams: getStreams }; 
} else { 
    globalThis.getStreams = getStreams; 
}
