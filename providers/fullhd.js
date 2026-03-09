/**
 * Nuvio Local Scraper - FullHDFilmizlesene (.live)
 * @version 2.0
 * Mimari: DiziPal/SineWix uyumlu ES5 yapısı.
 * Amaç: sayfa_hata (403/SSL) engelini aşmak.
 */

var cheerio = require("cheerio-without-node-native");

var BASE_URL = 'https://www.fullhdfilmizlesene.live';
var PROVIDER_ID = 'fullhdfilm_live';

// SineWix/Dizipal tarzı stabil headerlar
var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': BASE_URL + '/',
    'Upgrade-Insecure-Requests': '1'
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
        // 1. TMDB'den isim al
        var tmdbType = (mediaType === 'movie') ? 'movie' : 'tv';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + tmdbType + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        console.log('[FullHD] Baslatildi ID:', tmdbId);

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.title || data.name || '';
                if (!query) throw new Error('tmdb_isim_yok');
                
                // 2. Sitede Arama Yap (DiziPal mantığı)
                var searchUrl = BASE_URL + '/arama/' + encodeURIComponent(query);
                return fetch(searchUrl, { headers: HEADERS });
            })
            .then(function(res) { 
                if (!res.ok) throw new Error('arama_hata_' + res.status);
                return res.text(); 
            })
            .then(function(html) {
                var $ = cheerio.load(html);
                var filmLink = $(".film-list li a, .film-box a, h2 a").first().attr("href");
                
                if (!filmLink) {
                    console.log('[FullHD] Aranan içerik bulunamadı.');
                    return resolve([]);
                }

                // Link temizleme (SineWix mantığı)
                var finalUrl = filmLink;
                if (filmLink.indexOf('http') !== 0) {
                    finalUrl = BASE_URL + (filmLink.indexOf('/') === 0 ? '' : '/') + filmLink;
                }
                
                console.log('[FullHD] Hedef Sayfa:', finalUrl);
                return fetch(finalUrl, { headers: HEADERS });
            })
            .then(function(res) {
                if (!res.ok) throw new Error('sayfa_hata_' + res.status);
                return res.text();
            })
            .then(function(pageHtml) {
                // Oyuncu (Player) ayıklama
                var scxMatch = /scx\s*=\s*({[\s\S]*?});/i.exec(pageHtml);
                if (scxMatch) {
                    try {
                        var jsonStr = scxMatch[1].replace(/'/g, '"').replace(/(\w+):/g, '"$1":').replace(/,\s*}/g, "}");
                        var data = JSON.parse(jsonStr);
                        var token = (data.proton && data.proton.sx) ? data.proton.sx.t : (data.atom && data.atom.sx ? data.atom.sx.t : null);
                        var embedUrl = decodeSecret(Array.isArray(token) ? token[0] : token);
                        if (embedUrl) return fetch(embedUrl, { headers: HEADERS });
                    } catch(e) { console.log('[FullHD] SCX Parse Hatasi'); }
                }

                var vidIdMatch = pageHtml.match(/vidid\s*=\s*'(.*?)'/);
                if (vidIdMatch) {
                    var apiUrl = BASE_URL + '/player/api.php?id=' + vidIdMatch[1] + '&type=t&get=video&format=json';
                    var apiHeaders = JSON.parse(JSON.stringify(HEADERS));
                    apiHeaders['X-Requested-With'] = 'XMLHttpRequest';
                    return fetch(apiUrl, { headers: apiHeaders })
                        .then(function(r) { return r.json(); })
                        .then(function(apiData) {
                            var iframeMatch = (apiData.html || "").match(/src="([^"]+)"/);
                            if (iframeMatch) return fetch(iframeMatch[1], { headers: HEADERS });
                            throw new Error('iframe_bulunamadi');
                        });
                }
                throw new Error('player_yok');
            })
            .then(function(res) { 
                return (res && typeof res.text === 'function') ? res.text() : null; 
            })
            .then(function(playerHtml) {
                if (!playerHtml) return resolve([]);

                var avMatch = /av\('([^']+)'\)/.exec(playerHtml);
                var streamUrl = avMatch ? rapidDecode(avMatch[1]) : null;

                if (!streamUrl) {
                    var m3u8Match = /["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i.exec(playerHtml);
                    if (m3u8Match) streamUrl = m3u8Match[1].replace(/\\/g, "");
                }

                if (!streamUrl) throw new Error('link_ayiklanamadi');

                console.log('[FullHD] Akış bulundu:', streamUrl);

                resolve([{
                    name: "⌜ FullHD ⌟ | Video",
                    url: streamUrl,
                    quality: "1080p",
                    headers: { 'User-Agent': HEADERS['User-Agent'], 'Referer': BASE_URL + '/' },
                    provider: PROVIDER_ID
                }]);
            })
            .catch(function(err) {
                console.error('[FullHD] Hata:', err.message);
                resolve([]);
            });
    });
}

// Export yapısı (DiziPal/SineWix ile aynı)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
