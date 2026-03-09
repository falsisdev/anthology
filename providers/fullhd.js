/**
 * Nuvio Local Scraper - FullHDFilmizlesene (.live)
 * @version 1.6
 * Değişiklik: QuickJS uyumluluğu için Template Literals ve Arrow Functions kaldırıldı.
 * SyntaxError: expecting ',' hatası giderildi.
 */

var cheerio = require("cheerio-without-node-native");

var MAIN_URL = "https://www.fullhdfilmizlesene.live";
var PROVIDER_ID = 'fullhdfilm_live';
var VERSION = 'v1.6';

var WORKING_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9',
    'Referer': MAIN_URL + '/',
    'Origin': MAIN_URL
};

// --- YARDIMCI FONKSİYONLAR ---
function rapidDecode(encoded) {
    try {
        if (!encoded) return null;
        var step1 = atob(encoded.split("").reverse().join(""));
        var key = 'K9L';
        var output = '';
        for (var i = 0; i < step1.length; i++) {
            var r = key[i % 3];
            var n = step1.charCodeAt(i) - (r.charCodeAt(0) % 5 + 1);
            output += String.fromCharCode(n);
        }
        var finalLink = atob(output);
        return finalLink.indexOf('.m3u8') !== -1 ? finalLink : finalLink + "/index.m3u8";
    } catch (e) { return null; }
}

function decodeSecret(s) {
    try {
        if (!s) return null;
        var rotated = s.replace(/[a-zA-Z]/g, function(c) {
            return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
        });
        return atob(rotated);
    } catch (e) { return null; }
}

// --- ANA FONKSİYON ---
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        console.log("[FullHDLive][" + VERSION + "] Başlatıldı: ID=" + tmdbId);

        var tmdbType = (mediaType === 'movie') ? 'movie' : 'tv';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + tmdbType + '/' + tmdbId + 
            '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(mediaInfo) {
                var movieTitle = mediaInfo.title || mediaInfo.name || '';
                if (!movieTitle) throw new Error('TMDB ismi boş');
                
                var searchUrl = MAIN_URL + '/arama/' + encodeURIComponent(movieTitle);
                console.log("[FullHDLive] Arama yapılıyor: " + movieTitle);
                return fetch(searchUrl, { headers: WORKING_HEADERS });
            })
            .then(function(res) { 
                if (!res || !res.ok) throw new Error('Arama hatası: ' + (res ? res.status : 'Bağlantı yok'));
                return res.text(); 
            })
            .then(function(searchHtml) {
                var $ = cheerio.load(searchHtml);
                var filmLink = $(".film-list li a, .film-box a, h2 a").first().attr("href");

                if (!filmLink) {
                    console.log("[FullHDLive] İçerik bulunamadı.");
                    return resolve([]);
                }

                var finalUrl = (filmLink.indexOf("http") === 0) ? filmLink : MAIN_URL + (filmLink.indexOf('/') === 0 ? '' : '/') + filmLink;
                console.log("[FullHDLive] Sayfa isteniyor: " + finalUrl);
                return fetch(finalUrl, { headers: WORKING_HEADERS });
            })
            .then(function(res) { 
                if (!res || !res.ok) throw new Error('Film sayfası yanıt vermedi');
                return res.text(); 
            })
            .then(function(pageHtml) {
                // Metot 1: SCX
                var scxMatch = /scx\s*=\s*({[\s\S]*?});/i.exec(pageHtml);
                if (scxMatch) {
                    try {
                        var jsonStr = scxMatch[1].replace(/'/g, '"').replace(/(\w+):/g, '"$1":').replace(/,\s*}/g, '}');
                        var data = JSON.parse(jsonStr);
                        var token = (data.proton && data.proton.sx) ? data.proton.sx.t : (data.atom && data.atom.sx ? data.atom.sx.t : null);
                        var embedUrl = decodeSecret(Array.isArray(token) ? token[0] : token);
                        if (embedUrl) {
                            return fetch(embedUrl, { headers: WORKING_HEADERS });
                        }
                    } catch(e) { console.log("[FullHDLive] SCX Hatası"); }
                }

                // Metot 2: VidID
                var vidIdMatch = pageHtml.match(/vidid\s*=\s*'(.*?)'/);
                if (vidIdMatch) {
                    var apiUrl = MAIN_URL + '/player/api.php?id=' + vidIdMatch[1] + '&type=t&get=video&format=json';
                    return fetch(apiUrl, { headers: Object.assign({}, WORKING_HEADERS, { 'X-Requested-With': 'XMLHttpRequest' }) })
                        .then(function(r) { return r.json(); })
                        .then(function(apiData) {
                            var iframeMatch = (apiData.html || "").match(/src="([^"]+)"/);
                            if (iframeMatch) return fetch(iframeMatch[1], { headers: WORKING_HEADERS });
                            throw new Error('Iframe yok');
                        });
                }
                throw new Error('Kaynak bulunamadı');
            })
            .then(function(res) { 
                if (!res) throw new Error('Embed yanıtı yok');
                return res.text(); 
            })
            .then(function(playerHtml) {
                var avMatch = /av\('([^']+)'\)/.exec(playerHtml);
                var streamUrl = avMatch ? rapidDecode(avMatch[1]) : null;

                if (!streamUrl) {
                    var m3u8Match = /["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i.exec(playerHtml);
                    if (m3u8Match) streamUrl = m3u8Match[1].replace(/\\/g, '');
                }

                if (!streamUrl) throw new Error('Stream URL ayrıştırılamadı');

                console.log("[FullHDLive] Link başarılı.");
                resolve([{
                    name: "⌜ FullHD Film ⌟",
                    url: streamUrl,
                    quality: "1080p",
                    headers: { "User-Agent": WORKING_HEADERS["User-Agent"], "Referer": MAIN_URL + "/" },
                    provider: PROVIDER_ID
                }]);
            })
            .catch(function(err) {
                console.error("[FullHDLive] Hata:", err.message);
                resolve([]);
            });
    });
}

// --- EXPORT ---
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    globalThis.getStreams = getStreams;
}
