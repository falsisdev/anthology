/**
 * Nuvio Local Scraper - FullHDFilmizlesene
 * PHP Decode ve API mantığı entegre edilmiştir.
 */

var cheerio = require("cheerio-without-node-native");

const BASE_URL = 'https://www.fullhdfilmizlesene.tv';
const API_URL = 'https://www.fullhdfilmizlesene.tv/player/api.php';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Referer': BASE_URL + '/',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
};

// PHP'deki decodeLink fonksiyonunun JavaScript versiyonu
function decodeLink(encoded) {
    try {
        // 1. Ters çevir ve Base64 çöz
        var step1 = atob(encoded.split("").reverse().join(""));
        var key = 'K9L';
        var output = '';

        // 2. Key tabanlı ASCII kaydırma
        for (var i = 0; i < step1.length; i++) {
            var r = key[i % 3];
            var n = step1.charCodeAt(i) - (r.charCodeAt(0) % 5 + 1);
            output += String.fromCharCode(n);
        }

        // 3. Son Base64 çözümü
        return atob(output);
    } catch (e) {
        return null;
    }
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        // 1. TMDB'den isim al
        var tmdbUrl = 'https://api.themoviedb.org/3/' + (mediaType === 'movie' ? 'movie' : 'tv') + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.name || data.title;
                // 2. Sitede arama yap
                return fetch(BASE_URL + '/filmizle/' + encodeURIComponent(query), { headers: HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var $ = cheerio.load(html);
                // İlk bulduğu film linkini al
                var firstMatch = $('li.film a.tt').first().attr('href');
                if (!firstMatch) return resolve([]);

                // 3. Film sayfasını çek
                return fetch(firstMatch, { headers: HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(pageHtml) {
                // PHP'deki vidid ayıklama
                var vidIdMatch = pageHtml.match(/vidid = '(.*?)'/);
                if (!vidIdMatch) return resolve([]);
                var vidId = vidIdMatch[1];

                // 4. API'den video bilgilerini al (Atom ve Turbo servisleri)
                var atomApi = API_URL + '?id=' + vidId + '&type=t&name=atom&get=video&format=json';
                
                return fetch(atomApi, { headers: HEADERS });
            })
            .then(function(res) { return res.json(); })
            .then(function(atomJson) {
                // JSON içindeki HTML'den iframe/link ayıkla
                var htmlContent = atomJson.html || "";
                var watchUrlMatch = htmlContent.match(/src="([^"]+)"/);
                if (!watchUrlMatch) return resolve([]);
                
                var watchUrl = watchUrlMatch[1];
                return fetch(watchUrl, { headers: HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(watchHtml) {
                // Şifreli linki bul: av('...')
                var encryptedMatch = watchHtml.match(/av\(['"]([^'"]+)['"]\)/);
                if (!encryptedMatch) return resolve([]);

                var finalUrl = decodeLink(encryptedMatch[1]);
                if (!finalUrl) return resolve([]);

                // Nuvio formatında döndür
                resolve([{
                    name: "FullHDFilm - Sunucu 1",
                    title: "Film / Dizi",
                    url: finalUrl,
                    quality: "HD",
                    headers: { 'Referer': BASE_URL + '/', 'User-Agent': HEADERS['User-Agent'] },
                    provider: "fullhdfilm"
                }]);
            })
            .catch(function(err) {
                console.error('FullHDFilm Hata:', err);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
