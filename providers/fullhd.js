/**
 * FullHDFilmizlesene Local Scraper - Düzeltilmiş Export Yapısı
 */

var cheerio = require("cheerio-without-node-native");

var BASE_URL = 'https://www.fullhdfilmizlesene.live';
var TMDB_API_KEY = '4ef0d7355d9ffb5151e987764708ce96';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9'
};

var STREAM_HEADERS = {
    'User-Agent': 'Mozilla/5.0',
    'Accept': 'video/webm,video/ogg,video/*;q=0.9,*/*;q=0.5',
    'Referer': BASE_URL + '/',
    'Origin': BASE_URL
};

// ROT13 şifre çözme
function rtt(s) {
    if (!s) return '';
    var result = '';
    for (var i = 0; i < s.length; i++) {
        var c = s.charCodeAt(i);
        if (c >= 97 && c <= 122) {
            result += String.fromCharCode(((c - 97 + 13) % 26) + 97);
        } else if (c >= 65 && c <= 90) {
            result += String.fromCharCode(((c - 65 + 13) % 26) + 65);
        } else {
            result += s.charAt(i);
        }
    }
    return result;
}

// Base64 decode
function atob(s) {
    if (!s) return '';
    try {
        if (typeof Buffer !== 'undefined') {
            return Buffer.from(s, 'base64').toString('utf-8');
        }
        return '';
    } catch (e) {
        return '';
    }
}

// Ana fonksiyon
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        console.log('[FHD] Başlatıldı:', tmdbId, mediaType);
        
        var tmdbType = mediaType === 'movie' ? 'movie' : 'tv';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + tmdbType + '/' + tmdbId + '?language=tr-TR&api_key=' + TMDB_API_KEY;
        
        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(tmdbData) {
                var query = tmdbData.title || tmdbData.name;
                if (!query) throw new Error('İsim yok');
                
                // Arama
                var searchUrl = BASE_URL + '/arama/' + encodeURIComponent(query);
                return fetch(searchUrl, { headers: HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var $ = cheerio.load(html);
                var firstLink = $('li.film a').first().attr('href');
                if (!firstLink) throw new Error('Film bulunamadı');
                
                var filmUrl = firstLink.startsWith('http') ? firstLink : BASE_URL + firstLink;
                return fetch(filmUrl, { headers: HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                // scx çıkar
                var scxMatch = html.match(/scx\s*=\s*(\{[\s\S]*?\});/);
                if (!scxMatch) {
                    console.log('[FHD] scx bulunamadı');
                    return resolve([]);
                }
                
                try {
                    var scxData = JSON.parse(scxMatch[1].replace(/'/g, '"').replace(/(\w+):/g, '"$1":'));
                    var streams = [];
                    
                    // Video kaynaklarını çöz
                    ['atom', 'advid', 'fast', 'proton'].forEach(function(key) {
                        if (scxData[key] && scxData[key].sx && scxData[key].sx.t) {
                            var t = scxData[key].sx.t;
                            if (Array.isArray(t)) {
                                t.forEach(function(enc) {
                                    var url = atob(rtt(enc));
                                    if (url) {
                                        streams.push({
                                            name: '⌜ FullHD ⌟ | ' + key.toUpperCase(),
                                            url: url,
                                            quality: '1080p',
                                            headers: STREAM_HEADERS
                                        });
                                    }
                                });
                            }
                        }
                    });
                    
                    console.log('[FHD] Bulunan stream:', streams.length);
                    resolve(streams);
                } catch (e) {
                    console.error('[FHD] Parse hatası:', e);
                    resolve([]);
                }
            })
            .catch(function(err) {
                console.error('[FHD] Hata:', err.message);
                resolve([]);
            });
    });
}

// ============ KRİTİK: EXPORT YAPISI ============

// 1. module.exports (Node.js/CommonJS)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
    console.log('[FHD] module.exports ayarlandı');
}

// 2. globalThis (Modern JS)
if (typeof globalThis !== 'undefined') {
    globalThis.getStreams = getStreams;
    console.log('[FHD] globalThis.getStreams ayarlandı');
}

// 3. global (React Native/Node eski)
if (typeof global !== 'undefined') {
    global.getStreams = getStreams;
    console.log('[FHD] global.getStreams ayarlandı');
}

// 4. window (Tarayıcı)
if (typeof window !== 'undefined') {
    window.getStreams = getStreams;
    console.log('[FHD] window.getStreams ayarlandı');
}

// 5. this (Fallback)
if (typeof this !== 'undefined') {
    this.getStreams = getStreams;
}

console.log('[FHD] Scraper yüklendi - getStreams mevcut:', typeof getStreams !== 'undefined');
