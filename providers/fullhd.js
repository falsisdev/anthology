/**
 * Nuvio Local Scraper - FullHDFilmizlesene (.live)
 * @version 1.8
 * Hata Giderme: sayfa_hata (403/503 engeli) için Header ve Link temizleme eklendi.
 */

// ... (Üst kısımdaki fonksiyonlar aynı kalıyor, sadece getStreams içindeki fetch'i güncelliyoruz)

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        // ... (TMDB kısmı aynı)
        
        // ARAMA VE SAYFA İSTEĞİ İÇİN GÜÇLENDİRİLMİŞ HEADER
        var headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "tr-TR,tr;q=0.9",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "Referer": "https://www.google.com/" // Google üzerinden gelmiş gibi gösteriyoruz
        };

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(mediaInfo) {
                var movieTitle = mediaInfo.title || mediaInfo.name || "";
                var searchUrl = MAIN_URL + "/arama/" + encodeURIComponent(movieTitle);
                return fetch(searchUrl, { "headers": headers });
            })
            .then(function(res) { 
                // Log deneyi: Site ne cevap veriyor?
                console.log("[FullHDLive] Arama Status: " + res.status);
                return res.text(); 
            })
            .then(function(searchHtml) {
                var $ = cheerio.load(searchHtml);
                var filmLink = $(".film-list li a, .film-box a, h2 a").first().attr("href");

                if (!filmLink) return resolve([]);

                // Link bazen "//" ile başlayabilir veya hatalı gelebilir, düzeltiyoruz
                var finalUrl = filmLink;
                if (filmLink.indexOf("http") !== 0) {
                    finalUrl = MAIN_URL + (filmLink.indexOf("/") === 0 ? "" : "/") + filmLink;
                }
                
                console.log("[FullHDLive] Film Sayfasi: " + finalUrl);
                
                // İkinci istekte Referer'ı arama sayfası yapıyoruz
                headers["Referer"] = MAIN_URL + "/"; 
                
                return fetch(finalUrl, { "headers": headers });
            })
            .then(function(res) {
                // EĞER BURADA HATA ALIYORSAK DURUMU ANLAYALIM
                if (!res.ok) {
                    console.error("[FullHDLive] Sayfa Yuklenemedi! Kod: " + res.status);
                    throw new Error("sayfa_hata_" + res.status); 
                }
                return res.text();
            })
            // ... (Geri kalan player bulma kısımları aynı)
