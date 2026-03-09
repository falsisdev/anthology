/**
 * Nuvio Local Scraper - FullHDFilmizlesene (.live)
 * @version 3.0 (NetMirror Logic Integrated)
 */

var cheerio = require("cheerio-without-node-native");

var BASE_URL = 'https://www.fullhdfilmizlesene.live';
var PROVIDER_ID = 'fullhdfilm_live';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 11; Fire TV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Mobile Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Referer': BASE_URL + '/'
};

// --- NETMIRROR BENZERLİK ALGORİTMASI ---
function calculateSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    var s1 = str1.toLowerCase().trim();
    var s2 = str2.toLowerCase().trim();
    if (s1 === s2) return 1;
    
    var words1 = s1.split(/\s+/).filter(function(w) { return w.length > 0; });
    var words2 = s2.split(/\s+/).filter(function(w) { return w.length > 0; });
    
    var matches = 0;
    words2.forEach(function(word) {
        if (words1.indexOf(word) !== -1) matches++;
    });
    
    return matches / Math.max(words1.length, words2.length);
}

function rot13(str) {
    return str ? str.replace(/[a-zA-Z]/g, function(c) {
        return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
    }) : "";
}

function decodeLink(v) {
    try {
        var r = rot13(v);
        var decoded = atob(r).trim();
        return (decoded.indexOf('http') === 0) ? decoded : null;
    } catch (e) { return null; }
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        var tmdbType = (mediaType === 'movie') ? 'movie' : 'tv';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + tmdbType + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.title || data.name || '';
                if (!query) throw new Error('isim_yok');
                
                console.log('[FullHD] Aranıyor:', query);
                return fetch(BASE_URL + '/arama/' + encodeURIComponent(query), { headers: HEADERS })
                    .then(function(res) { return res.text(); })
                    .then(function(html) { return { html: html, query: query }; });
            })
            .then(function(obj) {
                var $ = cheerio.load(obj.html);
                var results = [];

                // Tüm arama sonuçlarını topla
                $(".film-list li").each(function() {
                    var title = $(this).find(".film-name, h2").text().trim();
                    var href = $(this).find("a").attr("href");
                    if (title && href) {
                        results.push({ 
                            title: title, 
                            href: href, 
                            score: calculateSimilarity(title, obj.query) 
                        });
                    }
                });

                // Skoruna göre sırala ve en iyi eşleşmeyi al (NetMirror mantığı)
                results.sort(function(a, b) { return b.score - a.score; });
                var bestMatch = results[0];

                if (!bestMatch || bestMatch.score < 0.4) { // %40 benzerlik barajı
                    console.log('[FullHD] Uygun sonuç bulunamadı.');
                    return resolve([]);
                }

                console.log('[FullHD] En iyi eşleşme:', bestMatch.title, '(Skor:', bestMatch.score + ')');
                var finalUrl = bestMatch.href.indexOf('http') === 0 ? bestMatch.href : BASE_URL + bestMatch.href;
                return fetch(finalUrl, { headers: HEADERS });
            })
            .then(function(res) { return res ? res.text() : null; })
            .then(function(pageHtml) {
                if (!pageHtml) return resolve([]);

                var streams = [];
                var scxMatch = /scx\s*=\s*({[\s\S]*?});/i.exec(pageHtml);
                
                if (scxMatch) {
                    try {
                        var cleanJson = scxMatch[1].replace(/(\w+):/g, '"$1"').replace(/'/g, '"').replace(/,\s*}/g, "}");
                        var scxData = JSON.parse(cleanJson);
                        var keys = ["atom", "proton", "fast", "tr", "en"];
                        
                        keys.forEach(function(k) {
                            if (scxData[k] && scxData[k].sx && scxData[k].sx.t) {
                                var raw = scxData[k].sx.t;
                                var link = decodeLink(Array.isArray(raw) ? raw[0] : raw);
                                if (link) {
                                    streams.push({
                                        name: "⌜ FullHD ⌟ | " + k.toUpperCase(),
                                        url: link,
                                        quality: "1080p",
                                        headers: { 'User-Agent': HEADERS['User-Agent'], 'Referer': BASE_URL + '/' },
                                        provider: PROVIDER_ID
                                    });
                                }
                            }
                        });
                    } catch (e) { }
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
