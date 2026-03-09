/**
 * SineWix Local Scraper - Updated with New API Key
 */

var API_BASE = 'https://ydfvfdizipanel.ru/public/api';
var API_KEY = '9iQNC5HQwPlaFuJDkhncJ5XTJ8feGXOJatAA'; // Yeni API Key entegre edildi

var API_HEADERS = {
    'hash256': '711bff4afeb47f07ab08a0b07e85d3835e739295e8a6361db77eebd93d96306b',
    'User-Agent': 'EasyPlex (Android 14; SM-A546B; Samsung Galaxy A54 5G; tr)',
    'Accept': 'application/json'
};

// Benzerlik algoritması (NetMirror mantığı)
function calculateSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    var s1 = str1.toLowerCase().trim();
    var s2 = str2.toLowerCase().trim();
    if (s1 === s2) return 1;
    var words1 = s1.split(/\s+/);
    var words2 = s2.split(/\s+/);
    var matches = 0;
    words2.forEach(function(word) {
        if (words1.indexOf(word) !== -1) matches++;
    });
    return matches / Math.max(words1.length, words2.length);
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        var tmdbType = (mediaType === 'movie') ? 'movie' : 'tv';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + tmdbType + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.title || data.name || '';
                if (!query) throw new Error('İsim bulunamadı');

                // SineWix API Arama
                var searchUrl = API_BASE + '/search/' + API_KEY + '/' + encodeURIComponent(query);
                return fetch(searchUrl, { headers: API_HEADERS })
                    .then(function(res) { return res.json(); })
                    .then(function(json) { return { results: json.search || [], query: query }; });
            })
            .then(function(obj) {
                // Sonuçları benzerlik skoruna göre filtrele ve sırala
                var filtered = obj.results.map(function(item) {
                    item.score = calculateSimilarity(item.title || item.name, obj.query);
                    return item;
                }).filter(function(item) {
                    return item.score > 0.4; // %40 benzerlik barajı
                }).sort(function(a, b) {
                    return b.score - a.score;
                });

                if (filtered.length === 0) return resolve([]);

                var bestMatch = filtered[0];
                var detailUrl = API_BASE + '/' + (mediaType === 'movie' ? 'movies' : 'shows') + '/show/' + API_KEY + '/' + bestMatch.id;
                
                return fetch(detailUrl, { headers: API_HEADERS });
            })
            .then(function(res) { return res ? res.json() : null; })
            .then(function(detail) {
                if (!detail) return resolve([]);
                
                var streams = [];
                // Video linklerini ayıklama mantığı (SineWix API yapısına göre)
                if (mediaType === 'movie' && detail.videos) {
                    detail.videos.forEach(function(v) {
                        streams.push({
                            name: "⌜ SineWix ⌟ | " + (v.server || "HLS"),
                            url: v.link,
                            quality: "1080p",
                            headers: { 'User-Agent': 'Mozilla/5.0' },
                            provider: "sinewix"
                        });
                    });
                } 
                // TV dizi mantığı buraya eklenebilir (Seasons/Episodes döngüsü)
                
                resolve(streams);
            })
            .catch(function(err) {
                console.error('[SineWix] Hata:', err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
}
