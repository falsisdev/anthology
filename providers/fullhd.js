/**
 * Nuvio Local Scraper - FullHDFilmizlesene (.live)
 * Güncelleme: Loglama, Error Handling ve Stream Doğrulama eklendi.
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

/**
 * Siteye özel şifrelenmiş linki çözer (av('...') fonksiyonu karşılığı)
 */
function decodeLink(encoded) {
    try {
        if (!encoded) return null;
        // 1. Adım: Ters çevir ve Base64'ten çöz
        var step1 = atob(encoded.split("").reverse().join(""));
        var key = 'K9L';
        var output = '';
        
        // 2. Adım: Key (K9L) üzerinden byte kaydırma
        for (var i = 0; i < step1.length; i++) {
            var r = key[i % 3];
            var n = step1.charCodeAt(i) - (r.charCodeAt(0) % 5 + 1);
            output += String.fromCharCode(n);
        }
        // 3. Adım: Sonuç tekrar Base64
        return atob(output);
    } catch (e) {
        console.error('[FullHDLive] Decode Hatası:', e.message);
        return null;
    }
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        // Bu site ağırlıklı olarak Film odaklıdır, dizi desteği için arama sonucunda parse gerekir.
        console.log('[FullHDLive] Başlatılıyor:', PROVIDER_ID, 'ID:', tmdbId, 'Tip:', mediaType);

        var tmdbType = mediaType === 'movie' ? 'movie' : 'tv';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + tmdbType + '/' + tmdbId + 
            '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.title || data.name || '';
                if (!query) throw new Error('TMDB ismi alınamadı.');
                
                console.log('[FullHDLive] Arama Sorgusu:', query);
                var searchUrl = BASE_URL + '/arama/' + encodeURIComponent(query);
                return fetch(searchUrl, { headers: HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var $ = cheerio.load(html);
                // li.film yapısındaki ilk sonucu yakala
                var movieLink = $('li.film a.tt').first();
                var moviePath = movieLink.attr('href');
                var movieTitle = movieLink.text().trim();

                if (!moviePath) {
                    console.log('[FullHDLive] Arama sonucu bulunamadı.');
                    return resolve([]);
                }

                console.log('[FullHDLive] Bulunan İçerik:', movieTitle, 'Link:', moviePath);
                var finalUrl = moviePath.startsWith('http') ? moviePath : BASE_URL + moviePath;
                return fetch(finalUrl, { headers: HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(pageHtml) {
                // Sayfa içindeki Video ID (vidid) bilgisini bul
                var vidIdMatch = pageHtml.match(/vidid\s*=\s*'(.*?)'/);
                if (!vidIdMatch) {
                    console.log('[FullHDLive] vidid bulunamadı (Telifli içerik olabilir).');
                    return resolve([]);
                }

                var vidId = vidIdMatch[1];
                console.log('[FullHDLive] vidid Yakalandı:', vidId);

                // Site API'sine istek at (Video kaynağını almak için)
                var apiUrl = BASE_URL + '/player/api.php?id=' + vidId + '&type=t&name=atom&get=video&format=json';
                return fetch(apiUrl, { 
                    headers: Object.assign({}, HEADERS, { 'X-Requested-With': 'XMLHttpRequest' }) 
                });
            })
            .then(function(res) { return res.json(); })
            .then(function(apiData) {
                // API'den dönen HTML içinde iframe src'sini bul
                var iframeUrlMatch = (apiData.html || "").match(/src="([^"]+)"/);
                if (!iframeUrlMatch) {
                    console.log('[FullHDLive] Iframe URL bulunamadı.');
                    return resolve([]);
                }

                var playerUrl = iframeUrlMatch[1];
                console.log('[FullHDLive] Player URL:', playerUrl);
                return fetch(playerUrl, { headers: HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(playerHtml) {
                // Player içindeki şifreli linki (av(...)) bul
                var encryptedLink = playerHtml.match(/av\(['"]([^'"]+)['"]\)/);
                if (!encryptedLink) {
                    console.log('[FullHDLive] Şifreli link (av) bulunamadı.');
                    return resolve([]);
                }

                var streamUrl = decodeLink(encryptedLink[1]);
                if (!streamUrl) throw new Error('Link çözülemedi.');

                console.log('[FullHDLive] Stream Linki Başarıyla Çözüldü.');

                // Nuvio Formatında sonucu döndür
                resolve([{
                    name: "⌜ FullHD Film ⌟ | 1080p",
                    title: "FullHD (.live) Sunucusu",
                    url: streamUrl,
                    quality: "1080p",
                    size: "Unknown",
                    headers: {
                        'User-Agent': HEADERS['User-Agent'],
                        'Referer': BASE_URL + '/',
                        'Origin': BASE_URL
                    },
                    provider: PROVIDER_ID
                }]);
            })
            .catch(function(err) {
                console.error('[FullHDLive] İşlem Hatası:', err.message);
                resolve([]);
            });
    });
}

// Export yapısı (SineWix ve DiziPal uyumlu)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
