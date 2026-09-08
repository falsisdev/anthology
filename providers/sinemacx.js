/**
 * Nuvio Local Scraper - SinemaCX (V42 - Hatalı Bilgi Fix)
 */

var cheerio = require("cheerio-without-node-native");

const PROVIDER_NAME = "SinemaCX";
const BASE_URL = "https://www.sinema.la";
const EMPTY_RESULT = [];

const WORKING_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://www.sinema.la/'
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        var isMovie = mediaType === 'movie';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + (isMovie ? 'movie' : 'tv') + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';
        
        var displayTitle = ""; 
        var releaseYear = "";

        fetch(tmdbUrl)
            .then(res => res.json())
            .then(data => {
                var trTitle = (data.title || data.name || "").toLowerCase();
                var orgTitle = (data.original_title || data.original_name || "").toLowerCase();
                displayTitle = (data.title || data.name || "Film");
                releaseYear = (data.release_date || data.first_air_date || "").split("-")[0];

                var query1 = trTitle.replace(/[:.,\-]/g, ' ').split(" ").slice(0, 3).join(" ");
                var query2 = orgTitle.replace(/[:.,\-]/g, ' ').split(" ").slice(0, 3).join(" ");

                return searchOnSite(query1, releaseYear).then(res1 => {
                    if (res1 && res1.score >= 5) return res1;
                    return searchOnSite(query2, releaseYear).then(res2 => {
                        if (res2) return res2;
                        return searchOnSite(orgTitle.split(" ")[0], releaseYear);
                    });
                });
            })
            .then(result => {
                if (!result) return resolve(EMPTY_RESULT);

                return fetch(result.url, { headers: WORKING_HEADERS }).then(res => res.text()).then(html => {
                    var $page = cheerio.load(html);
                    
                    // --- DİL ANALİZİ (GÜNCELLENDİ) ---
                    var pageText = $page("body").text().toLowerCase();
                    var siteTitleLower = result.siteTitle.toLowerCase();
                    
                    var langInfo = "HD"; // Varsayılan artık sadece HD
                    
                    if (pageText.includes("dublaj") || siteTitleLower.includes("dublaj")) {
                        langInfo = "Türkçe Dublaj";
                    } else if (pageText.includes("altyazı") || siteTitleLower.includes("altyazı")) {
                        langInfo = "Türkçe Altyazı";
                    }
                    // "Else" durumunda yani bir şey bulamazsa HD olarak kalacak.

                    var iframeUrl = "";
                    $page("iframe").each(function() {
                        var src = $page(this).attr("data-vsrc") || $page(this).attr("src") || "";
                        if (src.includes("player.filmizle.in")) {
                            iframeUrl = src.split("?img=")[0];
                            return false;
                        }
                    });

                    if (!iframeUrl) return resolve(EMPTY_RESULT);

                    var videoId = iframeUrl.split("/").pop();
                    return fetch("https://player.filmizle.in/player/index.php?data=" + videoId + "&do=getVideo", {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                            'X-Requested-With': 'XMLHttpRequest',
                            'Referer': iframeUrl
                        },
                        body: "data=" + videoId + "&do=getVideo"
                    }).then(r => r.json()).then(json => {
                        if (json && json.securedLink) {
                            resolve([{
                                name: displayTitle,  // Üstte Film İsmi
                                title: langInfo,     // Altta Dil veya sadece "HD"
                                url: json.securedLink,
                                quality: "1080p",
                                headers: { 'Referer': 'https://player.filmizle.in/' }
                            }]);
                        } else { resolve(EMPTY_RESULT); }
                    });
                });
            })
            .catch(err => {
                resolve(EMPTY_RESULT);
            });
    });
}

function searchOnSite(query, year) {
    if (!query || query.length < 2) return Promise.resolve(null);
    var cleanQuery = query.toLowerCase().trim();
    var searchUrl = `${BASE_URL}/?s=` + encodeURIComponent(cleanQuery);
    
    return fetch(searchUrl, { headers: WORKING_HEADERS }).then(res => res.text()).then(html => {
        var $ = cheerio.load(html);
        var results = [];

        $("a").each(function() {
            var url = $(this).attr("href") || "";
            var title = $(this).text().toLowerCase().trim();
            if (!url.startsWith(BASE_URL) || url.includes("/category/") || title.length < 5) return;

            var score = 0;
            var words = cleanQuery.split(" ");
            words.forEach(w => { if (title.includes(w)) score += 2; });
            if (year && title.includes(year)) score += 10;
            if (url.includes(cleanQuery.replace(/\s+/g, '-'))) score += 5;

            if (score > 3) {
                results.push({ url: url, siteTitle: $(this).text().trim(), score: score });
            }
        });

        if (results.length > 0) {
            results.sort((a, b) => b.score - a.score);
            return results[0];
        }
        return null;
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
}
