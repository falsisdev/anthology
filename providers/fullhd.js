/**
 * FullHDFilmizlesene - NUVIOTR Uyumlu
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

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    console.log('[FHD] Baslatildi:', tmdbId, mediaType);
    
    try {
        var tmdbType = mediaType === 'movie' ? 'movie' : 'tv';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + tmdbType + '/' + tmdbId + '?language=tr-TR&api_key=' + TMDB_API_KEY;
        
        var tmdbRes = await fetch(tmdbUrl);
        var tmdbData = await tmdbRes.json();
        var query = tmdbData.title || tmdbData.name;
        
        if (!query) {
            console.log('[FHD] Isim bulunamadi');
            return [];
        }
        
        console.log('[FHD] Aranan:', query);
        
        var searchUrl = BASE_URL + '/arama/' + encodeURIComponent(query);
        var searchRes = await fetch(searchUrl, { headers: HEADERS });
        var html = await searchRes.text();
        
        var $ = cheerio.load(html);
        var firstLink = $('li.film a').first().attr('href');
        
        if (!firstLink) {
            console.log('[FHD] Film linki bulunamadi');
            return [];
        }
        
        var filmUrl = firstLink.startsWith('http') ? firstLink : BASE_URL + firstLink;
        console.log('[FHD] Film URL:', filmUrl);
        
        var filmRes = await fetch(filmUrl, { headers: HEADERS });
        var filmHtml = await filmRes.text();
        
        var scxMatch = filmHtml.match(/scx\s*=\s*(\{[\s\S]*?\});/);
        if (!scxMatch) {
            console.log('[FHD] scx bulunamadi');
            return [];
        }
        
        var scxData = JSON.parse(scxMatch[1].replace(/'/g, '"').replace(/(\w+):/g, '"$1":'));
        var streams = [];
        
        ['atom', 'advid', 'fast', 'proton'].forEach(function(key) {
            if (scxData[key] && scxData[key].sx && scxData[key].sx.t) {
                var t = scxData[key].sx.t;
                if (Array.isArray(t)) {
                    t.forEach(function(enc) {
                        var url = atob(rtt(enc));
                        if (url && url.startsWith('http')) {
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
        return streams;
        
    } catch (err) {
        console.error('[FHD] Hata:', err.message);
        return [];
    }
}

module.exports = {
    getStreams: getStreams,
    default: { getStreams: getStreams }
};

if (typeof globalThis !== 'undefined') {
    globalThis.getStreams = getStreams;
    globalThis.fullhdProvider = { getStreams: getStreams };
}

if (typeof global !== 'undefined') {
    global.getStreams = getStreams;
    global.fullhdProvider = { getStreams: getStreams };
}

console.log('[FHD] Scraper yuklendi');