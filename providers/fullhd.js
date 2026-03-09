/**
 * Nuvio Local Scraper - FullHDFilmizlesene (.live güncel domain)
 */

var cheerio = require("cheerio-without-node-native");

// Domain .tv yerine .live olarak güncellendi
const BASE_URL = 'https://www.fullhdfilmizlesene.live';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9',
    'Referer': BASE_URL + '/'
};

// PHP'deki decodeLink mantığının JavaScript versiyonu
function decodeLink(encoded) {
    try {
        var step1 = atob(encoded.split("").reverse().join(""));
        var key = 'K9L';
        var output = '';
        for (var i = 0; i < step1.length; i++) {
            var r = key[i % 3];
            var n = step1.charCodeAt(i) - (r.charCodeAt(0) % 5 + 1);
            output += String.fromCharCode(n);
        }
        return atob(output);
    } catch (e) {
        return null;
    }
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        
        // 1. TMDB'den isim alarak arama başlatma
        var tmdbUrl = 'https://api.themoviedb.org/3/' + (mediaType === 'movie' ? 'movie' : 'tv') + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.title || data.name;
                // .live domaini üzerinden arama yapılıyor
                var searchUrl = BASE_URL + '/arama/' + encodeURIComponent(query);
                return fetch(searchUrl, { headers: HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var $ = cheerio.load(html);
                // PHP kodundaki li.film yapısına göre ilk sonucu seçme
                var moviePath = $('li.film a.tt').first().attr('href');
                
                if (!moviePath) return resolve([]);

                var finalMovieUrl = moviePath.startsWith('http') ? moviePath : BASE_URL + moviePath;
                return fetch(finalMovieUrl, { headers: HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(pageHtml) {
                // Video ID (vidid) ayıklama
                var vidIdMatch = pageHtml.match(/vidid = '(.*?)'/);
                if (!vidIdMatch) return resolve([]);
                var vidId = vidIdMatch[1];

                // API üzerinden video kaynağına erişim
                var apiUrl = BASE_URL + '/player/api.php?id=' + vidId + '&type=t&name=atom&get=video&format=json';
                return fetch(apiUrl, { headers: HEADERS });
            })
            .then(function(res) { return res.json(); })
            .then(function(apiData) {
                var iframeUrlMatch = (apiData.html || "").match(/src="([^"]+)"/);
                if (!iframeUrlMatch) return resolve([]);
                
                return fetch(iframeUrlMatch[1], { headers: HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(playerHtml) {
                // Şifreli linki decode etme süreci
                var encryptedLink = playerHtml.match(/av\(['"]([^'"]+)['"]\)/);
                if (!encryptedLink) return resolve([]);

                var streamUrl = decodeLink(encryptedLink[1]);

                if (streamUrl) {
                    resolve([{
                        name: "FullHD Film (.live) - HD",
                        title: "Film Kaynağı",
                        url: streamUrl,
                        quality: "1080p",
                        headers: HEADERS,
                        provider: "fullhdfilm"
                    }]);
                } else {
                    resolve([]);
                }
            })
            .catch(function(err) {
                console.error('[FullHDLive] Hata:', err);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
