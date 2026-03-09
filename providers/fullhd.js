/**
 * Nuvio Local Scraper - FullHDFilmizlesene (.live)
 * @version 1.2
 * Değişiklik: scx veri yapısı entegre edildi, async/await Promise'e çevrildi.
 */

var cheerio = require("cheerio-without-node-native");

const MAIN_URL = "https://www.fullhdfilmizlesene.live";
const PROVIDER_ID = 'fullhdfilm_live';
const VERSION = 'v1.2';

const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "tr-TR,tr;q=0.9",
    "Cache-Control": "no-cache"
};

// K9L / Rapidvid Şifre Çözücü
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
        return finalLink.includes('.m3u8') ? finalLink : finalLink + "/index.m3u8";
    } catch (e) { return null; }
}

// Scx / ROT13 Şifre Çözücü
function decodeSecret(s) {
    try {
        if (!s) return null;
        var rotated = s.replace(/[a-zA-Z]/g, function(c) {
            return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
        });
        return atob(rotated);
    } catch (e) { return null; }
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        console.log(`[FullHDLive][${VERSION}] İşlem Başladı ID:`, tmdbId);

        var tmdbType = mediaType === 'movie' ? 'movie' : 'tv';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + tmdbType + '/' + tmdbId + 
            '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(mediaInfo) {
                var movieTitle = mediaInfo.title || mediaInfo.name || '';
                if (!movieTitle) throw new Error('Film ismi bulunamadı.');
                
                var searchUrl = MAIN_URL + '/arama/' + encodeURIComponent(movieTitle);
                console.log(`[FullHDLive][${VERSION}] Arama:`, movieTitle);
                return fetch(searchUrl, { headers: HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(searchHtml) {
                var $ = cheerio.load(searchHtml);
                var filmLink = $(".film-list li a, .film-box a, h2 a").first().attr("href");

                if (!filmLink) {
                    console.log(`[FullHDLive][${VERSION}] Arama sonucu boş.`);
                    return resolve([]);
                }

                var finalUrl = filmLink.startsWith("http") ? filmLink : MAIN_URL + filmLink;
                console.log(`[FullHDLive][${VERSION}] Sayfa çekiliyor...`);
                return fetch(finalUrl, { headers: Object.assign({}, HEADERS, { "Referer": MAIN_URL + '/' }) });
            })
            .then(function(res) { return res.text(); })
            .then(function(pageHtml) {
                // 1. Yol: scx verisi üzerinden (Modern yol)
                var scxMatch = /scx\s*=\s*({[\s\S]*?});/i.exec(pageHtml);
                if (scxMatch) {
                    console.log(`[FullHDLive][${VERSION}] scx verisi bulundu, ayrıştırılıyor...`);
                    // Basit JSON temizliği
                    var jsonStr = scxMatch[1].replace(/'/g, '"').replace(/(\w+):/g, '"$1":').replace(/,\s*}/g, '}');
                    try {
                        var data = JSON.parse(jsonStr);
                        var token = null;
                        if (data.proton && data.proton.sx) token = data.proton.sx.t;
                        else if (data.atom && data.atom.sx) token = data.atom.sx.t;

                        var embedUrl = decodeSecret(Array.isArray(token) ? token[0] : token);
                        if (embedUrl) {
                            console.log(`[FullHDLive][${VERSION}] Embed bulundu:`, embedUrl);
                            return fetch(embedUrl, { headers: Object.assign({}, HEADERS, { "Referer": MAIN_URL + '/' }) });
                        }
                    } catch(e) { console.log("JSON Parse Hatası"); }
                }

                // 2. Yol: Klasik vidid yolu (Eski/Yedek yol)
                var vidIdMatch = pageHtml.match(/vidid\s*=\s*'(.*?)'/);
                if (vidIdMatch) {
                    var apiUrl = MAIN_URL + '/player/api.php?id=' + vidIdMatch[1] + '&type=t&get=video&format=json';
                    return fetch(apiUrl, { headers: Object.assign({}, HEADERS, { 'X-Requested-With': 'XMLHttpRequest' }) })
                        .then(function(r) { return r.json(); })
                        .then(function(apiData) {
                            var iframeMatch = (apiData.html || "").match(/src="([^"]+)"/);
                            if (iframeMatch) return fetch(iframeMatch[1], { headers: HEADERS });
                            throw new Error('Iframe bulunamadı');
                        });
                }
                
                throw new Error('Link yapısı tespit edilemedi');
            })
            .then(function(res) { 
                if (!res) throw new Error('Player sayfası yanıtı undefined');
                return res.text(); 
            })
            .then(function(playerHtml) {
                // Şifreli linki ara (av('...') fonksiyonu)
                var avMatch = /av\('([^']+)'\)/.exec(playerHtml);
                var streamUrl = null;

                if (avMatch) {
                    streamUrl = rapidDecode(avMatch[1]);
                } else {
                    // Şifresiz m3u8 ara
                    var m3u8Match = /["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i.exec(playerHtml);
                    if (m3u8Match) streamUrl = m3u8Match[1].replace(/\\/g, '');
                }

                if (!streamUrl) throw new Error('Stream URL bulunamadı');

                console.log(`[FullHDLive][${VERSION}] Başarılı!`);
                resolve([{
                    name: "⌜ FullHD Film ⌟",
                    title: "1080p Kaynak",
                    url: streamUrl,
                    quality: "1080p",
                    headers: { 
                        "User-Agent": HEADERS["User-Agent"],
                        "Referer": MAIN_URL + "/",
                        "Origin": MAIN_URL
                    },
                    provider: PROVIDER_ID
                }]);
            })
            .catch(function(err) {
                console.error(`[FullHDLive][${VERSION}] Hata:`, err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
