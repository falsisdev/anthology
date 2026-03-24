var cheerio = require("cheerio-without-node-native");

var BASE_URL = "https://a.prectv67.lol";
var SW_KEY = "4F5A9C3D9A86FA54EACEDDD635185/c3c5bd17-e37b-4b94-a944-8a3688a30452";
var PROXY_URL = "https://goproxy.watchbuddy.tv/proxy/video";

var HEADERS = {
    'User-Agent': 'googleusercontent',
    'Referer': 'https://twitter.com/',
    'Accept': 'application/json'
};

// Global Token Saklayıcı
var cachedToken = null;

/**
 * API yetkilendirmesi için Bearer Token alır.
 */
function getAuthToken() {
    return new Promise(function(resolve) {
        if (cachedToken) return resolve(cachedToken);

        fetch(BASE_URL + "/api/attest/nonce", { headers: HEADERS })
            .then(function(res) { return res.text(); })
            .then(function(text) {
                try {
                    var json = JSON.parse(text);
                    cachedToken = json.accessToken || text.trim();
                } catch (e) {
                    cachedToken = text.trim();
                }
                console.log('[RecTV] Token Hazır.');
                resolve(cachedToken);
            })
            .catch(function() { 
                console.error('[RecTV] Token Alınamadı!');
                resolve(null); 
            });
    });
}

/**
 * Ana Akış Fonksiyonu
 */
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        
        var isMovie = (mediaType === 'movie');
        var tmdbUrl = 'https://api.themoviedb.org/3/' + (isMovie ? 'movie' : 'tv') + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        console.log('[RecTV] Başlatıldı:', tmdbId, 'Tip:', mediaType);

        // 1. TMDB Bilgisini Al
        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.title || data.name;
                if (!query) throw new Error('İsim bulunamadı');

                // 2. Token Al ve Arama Yap
                return getAuthToken().then(function(token) {
                    var searchHeaders = Object.assign({}, HEADERS, { 
                        'Authorization': 'Bearer ' + token 
                    });
                    
                    var searchUrl = BASE_URL + '/api/search/' + encodeURIComponent(query) + '/' + SW_KEY + '/';
                    return fetch(searchUrl, { headers: searchHeaders })
                        .then(function(res) { return res.json(); })
                        .then(function(sData) {
                            return { searchData: sData, token: token, title: query };
                        });
                });
            })
            .then(function(ctx) {
                var sData = ctx.searchData;
                var items = (sData.posters || []).concat(sData.channels || []).concat(sData.series || []);
                
                if (items.length === 0) {
                    console.log('[RecTV] Sonuç bulunamadı:', ctx.title);
                    return resolve([]);
                }

                var target = items[0]; // İlk ve en alakalı sonucu al
                var searchHeaders = Object.assign({}, HEADERS, { 'Authorization': 'Bearer ' + ctx.token });

                // 3. EĞER DİZİ İSE: Sezon ve Bölüm Eşleştirme Yap
                if (target.type === "serie" || (target.label && target.label.toLowerCase().includes("dizi"))) {
                    console.log('[RecTV] Dizi saptandı, bölümler taranıyor...');
                    
                    return fetch(BASE_URL + '/api/season/by/serie/' + target.id + '/' + SW_KEY + '/', { headers: searchHeaders })
                        .then(function(res) { return res.json(); })
                        .then(function(seasons) {
                            var finalSources = [];
                            
                            // Sezonları döngüye al
                            for (var i = 0; i < seasons.length; i++) {
                                var s = seasons[i];
                                var sNumber = parseInt(s.title.match(/\d+/) || (i + 1));
                                
                                if (sNumber === parseInt(seasonNum)) {
                                    // Doğru sezondaki bölümleri döngüye al
                                    for (var j = 0; j < s.episodes.length; j++) {
                                        var ep = s.episodes[j];
                                        var epNumber = parseInt(ep.title.match(/\d+/) || (j + 1));
                                        
                                        if (epNumber === parseInt(episodeNum)) {
                                            finalSources = ep.sources || [];
                                            break;
                                        }
                                    }
                                    break;
                                }
                            }
                            return finalSources;
                        });
                }
                
                // 4. EĞER FİLM İSE: Doğrudan kaynakları al
                return target.sources || [];
            })
            .then(function(sources) {
                if (!sources || sources.length === 0) {
                    console.log('[RecTV] Yayın kaynağı bulunamadı.');
                    return resolve([]);
                }

                // 5. Linkleri Proxy Üzerinden Hazırla
                var results = sources.map(function(src) {
                    var finalUrl = PROXY_URL + "?url=" + encodeURIComponent(src.url) + "&referer=" + encodeURIComponent("https://twitter.com/") + "&ignore_ssl=true";
                    
                    return {
                        name: "⌜ RecTV ⌟ | " + src.type.toUpperCase(),
                        url: finalUrl,
                        quality: "Auto",
                        headers: HEADERS,
                        provider: "rectv_api"
                    };
                });

                console.log('[RecTV] Toplam Yayın:', results.length);
                resolve(results);
            })
            .catch(function(err) {
                console.error('[RecTV] Kritik Hata:', err.message);
                resolve([]);
            });
    });
}

// Export yapısı
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
