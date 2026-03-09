/**
 * Nuvio Local Scraper - FullHDFilmizlesene (.live)
 * @version 2.3
 * Güncelleme: Kotlin kodundaki ROT13 (rtt) ve Base64 (atob) çözücüleri JS'ye uyarlandı.
 */

var cheerio = require("cheerio-without-node-native");

var BASE_URL = 'https://www.fullhdfilmizlesene.live';
var PROVIDER_ID = 'fullhdfilm_live';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Referer': BASE_URL + '/',
    'Accept-Language': 'tr-TR,tr;q=0.9'
};

// Kotlin'deki rtt (ROT13) fonksiyonunun JS karşılığı
function rot13(str) {
    return str.replace(/[a-zA-Z]/g, function(c) {
        return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
    });
}

// Kotlin'deki atob(rtt(v)) mantığını uygulayan ana çözücü
function decodeKotlinStyle(encoded) {
    try {
        if (!encoded) return null;
        var rotated = rot13(encoded);
        return atob(rotated).trim();
    } catch (e) { return null; }
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        var tmdbType = (mediaType === 'movie') ? 'movie' : 'tv';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + tmdbType + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res && res.ok ? res.json() : null; })
            .then(function(data) {
                if (!data) throw new Error('tmdb_yok');
                var query = data.title || data.name || '';
                return fetch(BASE_URL + '/arama/' + encodeURIComponent(query), { headers: HEADERS });
            })
            .then(function(res) { return res && res.ok ? res.text() : null; })
            .then(function(html) {
                if (!html) return resolve([]);
                var $ = cheerio.load(html);
                var filmLink = $(".film-list li a, .film-box a, h2 a").first().attr("href");
                if (!filmLink) return resolve([]);

                var finalUrl = filmLink.indexOf('http') === 0 ? filmLink : BASE_URL + (filmLink[0] === '/' ? '' : '/') + filmLink;
                return fetch(finalUrl, { headers: HEADERS });
            })
            .then(function(res) { return res && res.ok ? res.text() : null; })
            .then(function(pageHtml) {
                if (!pageHtml) return resolve([]);

                var streams = [];
                // Kotlin'deki scxData Regex'i
                var scxMatch = /scx\s*=\s*({[\s\S]*?});/i.exec(pageHtml);
                
                if (scxMatch) {
                    try {
                        // JSON'ı temizleyip parse edelim
                        var rawJson = scxMatch[1].replace(/'/g, '"').replace(/(\w+):/g, '"$1":').replace(/,\s*}/g, "}");
                        var scxData = JSON.parse(rawJson);
                        
                        // Kotlin'deki anahtarları (atom, proton, vb.) sırayla kontrol et
                        var keys = ["atom", "proton", "fast", "tr", "en", "advid"];
                        keys.forEach(function(key) {
                            if (scxData[key] && scxData[key].sx && scxData[key].sx.t) {
                                var tValue = scxData[key].sx.t;
                                var link = "";

                                if (Array.isArray(tValue)) {
                                    link = decodeKotlinStyle(tValue[0]);
                                } else if (typeof tValue === 'string') {
                                    link = decodeKotlinStyle(tValue);
                                }

                                if (link && link.indexOf('http') === 0) {
                                    streams.push({
                                        name: "⌜ FullHD ⌟ | " + key.toUpperCase(),
                                        url: link,
                                        quality: "1080p",
                                        headers: { 'User-Agent': HEADERS['User-Agent'], 'Referer': BASE_URL + '/' },
                                        provider: PROVIDER_ID
                                    });
                                }
                            }
                        });
                    } catch (e) { console.error('[FullHD] JSON Parse Error'); }
                }

                resolve(streams);
            })
            .catch(function(err) {
                console.error('[FullHD] Hata:', err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
