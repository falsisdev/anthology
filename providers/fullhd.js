/**
 * Nuvio Local Scraper - FullHDFilmizlesene (.live)
 * @version 2.1
 * Hata Giderme: "property 'ok' of undefined" ve SSL Sertifika sorunları için koruma eklendi.
 */

var cheerio = require("cheerio-without-node-native");

var BASE_URL = 'https://www.fullhdfilmizlesene.live';
var PROVIDER_ID = 'fullhdfilm_live';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Referer': BASE_URL + '/',
    'Accept-Language': 'tr-TR,tr;q=0.9'
};

function rapidDecode(encoded) {
    try {
        if (!encoded) return null;
        var step1 = atob(encoded.split("").reverse().join(""));
        var key = "K9L";
        var output = "";
        for (var i = 0; i < step1.length; i++) {
            var r = key[i % 3];
            var n = step1.charCodeAt(i) - (r.charCodeAt(0) % 5 + 1);
            output += String.fromCharCode(n);
        }
        var finalLink = atob(output);
        return (finalLink.indexOf(".m3u8") !== -1) ? finalLink : finalLink + "/index.m3u8";
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

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        var tmdbType = (mediaType === 'movie') ? 'movie' : 'tv';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + tmdbType + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.title || data.name || '';
                if (!query) throw new Error('tmdb_name_null');
                return fetch(BASE_URL + '/arama/' + encodeURIComponent(query), { headers: HEADERS });
            })
            .then(function(res) { 
                if (!res || !res.ok) throw new Error('search_failed');
                return res.text(); 
            })
            .then(function(html) {
                var $ = cheerio.load(html);
                var filmLink = $(".film-list li a, .film-box a, h2 a").first().attr("href");
                if (!filmLink) return resolve([]);

                var finalUrl = filmLink.indexOf('http') === 0 ? filmLink : BASE_URL + (filmLink[0] === '/' ? '' : '/') + filmLink;
                return fetch(finalUrl, { headers: HEADERS });
            })
            .then(function(res) {
                if (!res || !res.ok) throw new Error('page_failed');
                return res.text();
            })
            .then(function(pageHtml) {
                // VideoID üzerinden API sorgusu (Daha stabil metot)
                var vidIdMatch = pageHtml.match(/vidid\s*=\s*'(.*?)'/);
                if (vidIdMatch) {
                    var apiUrl = BASE_URL + '/player/api.php?id=' + vidIdMatch[1] + '&type=t&get=video&format=json';
                    return fetch(apiUrl, { headers: Object.assign({}, HEADERS, {'X-Requested-With': 'XMLHttpRequest'}) })
                        .then(function(r) { return r.json(); })
                        .then(function(apiData) {
                            var iframeSrc = (apiData.html || "").match(/src="([^"]+)"/);
                            if (iframeSrc) return fetch(iframeSrc[1], { headers: HEADERS });
                            return null;
                        });
                }
                
                // SCX Metodu (Yedek)
                var scxMatch = /scx\s*=\s*({[\s\S]*?});/i.exec(pageHtml);
                if (scxMatch) {
                    var data = JSON.parse(scxMatch[1].replace(/'/g, '"').replace(/(\w+):/g, '"$1":').replace(/,\s*}/g, "}"));
                    var token = (data.proton && data.proton.sx) ? data.proton.sx.t : (data.atom && data.atom.sx ? data.atom.sx.t : null);
                    var embedUrl = decodeSecret(Array.isArray(token) ? token[0] : token);
                    if (embedUrl) return fetch(embedUrl, { headers: HEADERS });
                }
                return null;
            })
            .then(function(res) {
                // "cannot read property ok of undefined" hatasını burada engelliyoruz
                if (!res) throw new Error('no_embed_res'); 
                if (typeof res.text !== 'function') return res; // Eğer zaten text geldiyse
                return res.text();
            })
            .then(function(playerHtml) {
                if (!playerHtml || typeof playerHtml !== 'string') return resolve([]);

                var streamUrl = null;
                var avMatch = /av\('([^']+)'\)/.exec(playerHtml);
                if (avMatch) {
                    streamUrl = rapidDecode(avMatch[1]);
                } else {
                    var m3u8Match = /["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i.exec(playerHtml);
                    if (m3u8Match) streamUrl = m3u8Match[1].replace(/\\/g, "");
                }

                if (!streamUrl) return resolve([]);

                resolve([{
                    name: "⌜ FullHD ⌟ | Otomatik",
                    url: streamUrl,
                    quality: "1080p",
                    headers: { 'User-Agent': HEADERS['User-Agent'], 'Referer': BASE_URL + '/' },
                    provider: PROVIDER_ID
                }]);
            })
            .catch(function(err) {
                console.error('[FullHD] Yakalanan Hata:', err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
