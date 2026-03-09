/**
 * Nuvio Local Scraper - FullHDFilmizlesene (.live)
 * @version 1.4
 * Değişiklik: Derinlemesine loglama, res.ok kontrolü ve dinamik link doğrulama eklendi.
 */

var cheerio = require("cheerio-without-node-native");

const MAIN_URL = "https://www.fullhdfilmizlesene.live";
const PROVIDER_ID = 'fullhdfilm_live';
const VERSION = 'v1.4';

const WORKING_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9',
    'Referer': MAIN_URL + '/',
    'Origin': MAIN_URL,
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        console.log(`[FullHDLive][${VERSION}] İşlem başladı. TMDB ID: ${tmdbId}, Tip: ${mediaType}`);

        var tmdbType = mediaType === 'movie' ? 'movie' : 'tv';
        var tmdbUrl = `https://api.themoviedb.org/3/${tmdbType}/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`;

        fetch(tmdbUrl)
            .then(res => {
                if (!res.ok) throw new Error(`TMDB API Hatası: ${res.status}`);
                return res.json();
            })
            .then(mediaInfo => {
                var movieTitle = mediaInfo.title || mediaInfo.name || '';
                console.log(`[FullHDLive][${VERSION}] TMDB'den isim alındı: "${movieTitle}"`);
                
                if (!movieTitle) throw new Error('Film ismi boş döndü.');

                var searchUrl = MAIN_URL + '/arama/' + encodeURIComponent(movieTitle);
                console.log(`[FullHDLive][${VERSION}] Arama linki: ${searchUrl}`);
                
                return fetch(searchUrl, { headers: WORKING_HEADERS });
            })
            .then(res => {
                if (!res || !res.ok) throw new Error(`Arama başarısız. Durum: ${res ? res.status : 'Bağlantı Yok'}`);
                return res.text();
            })
            .then(searchHtml => {
                var $ = cheerio.load(searchHtml);
                var filmLink = $(".film-list li a, .film-box a, h2 a").first().attr("href");
                
                console.log(`[FullHDLive][${VERSION}] Arama sonucunda bulunan link: ${filmLink || 'BULUNAMADI'}`);

                if (!filmLink) {
                    // Alternatif: Eğer dizi ise sezon/bölüm linkini manuel kurgula (Örnek mantık)
                    return resolve([]);
                }

                var finalUrl = filmLink.startsWith("http") ? filmLink : MAIN_URL + (filmLink.startsWith('/') ? '' : '/') + filmLink;
                console.log(`[FullHDLive][${VERSION}] Film sayfası isteniyor: ${finalUrl}`);
                
                return fetch(finalUrl, { headers: WORKING_HEADERS });
            })
            .then(res => {
                console.log(`[FullHDLive][${VERSION}] Film sayfası yanıt kodu: ${res ? res.status : 'Res Yok'}`);
                if (!res || !res.ok) throw new Error(`Film sayfası açılamadı. Kod: ${res ? res.status : 'null'}`);
                return res.text();
            })
            .then(pageHtml => {
                if (!pageHtml || pageHtml.length < 500) throw new Error('Sayfa içeriği çok kısa veya boş döndü (Bot koruması?)');

                console.log(`[FullHDLive][${VERSION}] Sayfa HTML uzunluğu: ${pageHtml.length}. Player aranıyor...`);

                // Log deneyi: Sayfada vidid veya scx var mı?
                var hasVidId = pageHtml.includes('vidid');
                var hasScx = pageHtml.includes('scx');
                console.log(`[FullHDLive][${VERSION}] İpucu: vidid=${hasVidId}, scx=${hasScx}`);

                // --- PLAYER ÇEKME MANTIĞI ---
                var scxMatch = /scx\s*=\s*({[\s\S]*?});/i.exec(pageHtml);
                if (scxMatch) {
                   console.log(`[FullHDLive][${VERSION}] SCX Metodu bulundu, işleniyor...`);
                   // (Burada mevcut scx parse işlemlerin devam eder...)
                }

                // Klasik Metot Denemesi
                var vidIdMatch = pageHtml.match(/vidid\s*=\s*'(.*?)'/);
                if (vidIdMatch) {
                    console.log(`[FullHDLive][${VERSION}] VidID yakalandı: ${vidIdMatch[1]}`);
                    var apiUrl = MAIN_URL + '/player/api.php?id=' + vidIdMatch[1] + '&type=t&get=video&format=json';
                    return fetch(apiUrl, { headers: Object.assign({}, WORKING_HEADERS, { 'X-Requested-With': 'XMLHttpRequest' }) })
                           .then(r => r.json());
                }
                
                throw new Error('Hiçbir player metodu (SCX/VidID) eşleşmedi.');
            })
            .then(apiData => {
                // ... Geri kalan stream link işlemleri ...
                resolve([{
                    name: "FullHD Film",
                    url: "...", // streamUrl buraya
                    quality: "1080p"
                }]);
            })
            .catch(err => {
                console.error(`[FullHDLive][${VERSION}] KRİTİK HATA:`, err.message);
                resolve([]);
            });
    });
}
