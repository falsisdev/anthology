/**
 * Nuvio Local Scraper - FullHDFilmizlesene (.live)
 * Hata Giderme: undefined 'text' hatası için kontrol eklendi.
 */

var cheerio = require("cheerio-without-node-native");

const BASE_URL = 'https://www.fullhdfilmizlesene.live';
const PROVIDER_ID = 'fullhdfilm_live';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9',
    'Referer': BASE_URL + '/'
};

function decodeLink(encoded) {
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
        return atob(output);
    } catch (e) {
        return null;
    }
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        console.log('[FullHDLive] Başlatılıyor ID:', tmdbId);

        var tmdbType = mediaType === 'movie' ? 'movie' : 'tv';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + tmdbType + '/' + tmdbId + 
            '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { 
                if (!res) throw new Error('TMDB Response Undefined');
                return res.json(); 
            })
            .then(function(data) {
                var query = data.title || data.name || '';
                if (!query) throw new Error('Film ismi bulunamadı.');
                
                var searchUrl = BASE_URL + '/arama/' + encodeURIComponent(query);
                console.log('[FullHDLive] Arama yapılıyor:', searchUrl);
                return fetch(searchUrl, { headers: HEADERS });
            })
            .then(function(res) { 
                // LOGDAKİ HATANIN ÇÖZÜMÜ BURASI:
                if (!res || typeof res.text !== 'function') {
                    throw new Error('Arama sayfası yanıt vermedi (Response undefined)');
                }
                return res.text(); 
            })
            .then(function(html) {
                if (!html) throw new Error('Arama sonucu HTML boş.');
                var $ = cheerio.load(html);
                var movieLink = $('li.film a.tt').first();
                var moviePath = movieLink.attr('href');

                if (!moviePath) {
                    console.log('[FullHDLive] Sitede içerik bulunamadı.');
                    return resolve([]);
                }

                var finalUrl = moviePath.startsWith('http') ? moviePath : BASE_URL + moviePath;
                return fetch(finalUrl, { headers: HEADERS });
            })
            .then(function(res) { 
                if (!res || typeof res.text !== 'function') throw new Error('İçerik sayfası yanıt vermedi');
                return res.text(); 
            })
            .then(function(pageHtml) {
                var vidIdMatch = pageHtml.match(/vidid\s*=\s*'(.*?)'/);
                if (!vidIdMatch) return resolve([]);

                var vidId = vidIdMatch[1];
                var apiUrl = BASE_URL + '/player/api.php?id=' + vidId + '&type=t&name=atom&get=video&format=json';
                return fetch(apiUrl, { headers: Object.assign({}, HEADERS, { 'X-Requested-With': 'XMLHttpRequest' }) });
            })
            .then(function(res) { 
                if (!res || typeof res.json !== 'function') throw new Error('API yanıt vermedi');
                return res.json(); 
            })
            .then(function(apiData) {
                var iframeUrlMatch = (apiData.html || "").match(/src="([^"]+)"/);
                if (!iframeUrlMatch) return resolve([]);

                return fetch(iframeUrlMatch[1], { headers: HEADERS });
            })
            .then(function(res) { 
                if (!res || typeof res.text !== 'function') throw new Error('Player sayfası yanıt vermedi');
                return res.text(); 
            })
            .then(function(playerHtml) {
                var encryptedLink = playerHtml.match(/av\(['"]([^'"]+)['"]\)/);
                if (!encryptedLink) return resolve([]);

                var streamUrl = decodeLink(encryptedLink[1]);
                if (!streamUrl) return resolve([]);

                resolve([{
                    name: "⌜ FullHD Film ⌟",
                    title: "1080p Kaynak",
                    url: streamUrl,
                    quality: "1080p",
                    headers: { 'User-Agent': HEADERS['User-Agent'], 'Referer': BASE_URL + '/' },
                    provider: PROVIDER_ID
                }]);
            })
            .catch(function(err) {
                // Loglardaki hatayı burada yakalayıp sessizce boş döndürüyoruz
                console.error('[FullHDLive] Yakalanan Hata:', err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
