/**
 * FullHDFilmizlesene - DEBUG VERSIYON
 */

var cheerio = require("cheerio-without-node-native");

var BASE_URL = 'https://www.fullhdfilmizlesene.live';
var TMDB_API_KEY = '4ef0d7355d9ffb5151e987764708ce96';

console.log('[FHD] === SCRAPER YUKLENIYOR ===');
console.log('[FHD] BASE_URL:', BASE_URL);
console.log('[FHD] cheerio mevcut:', typeof cheerio !== 'undefined');

// ROT13
function rtt(s) {
    if (!s) return '';
    var r = '';
    for (var i = 0; i < s.length; i++) {
        var c = s.charCodeAt(i);
        if (c >= 97 && c <= 122) r += String.fromCharCode(((c - 97 + 13) % 26) + 97);
        else if (c >= 65 && c <= 90) r += String.fromCharCode(((c - 65 + 13) % 26) + 65);
        else r += s.charAt(i);
    }
    return r;
}

// Base64
function atob(s) {
    if (!s) return '';
    try { 
        var result = Buffer.from(s, 'base64').toString('utf-8');
        console.log('[FHD] Base64 decode basarili, uzunluk:', result.length);
        return result;
    } catch(e) { 
        console.log('[FHD] Base64 decode HATASI:', e.message);
        return ''; 
    }
}

// Ana fonksiyon
async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    console.log('[FHD] === getStreams CAGrildi ===');
    console.log('[FHD] Parametreler:', { tmdbId, mediaType, seasonNum, episodeNum });
    
    try {
        // TMDB API cagrisi
        var tmdbType = mediaType === 'movie' ? 'movie' : 'tv';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + tmdbType + '/' + tmdbId + '?language=tr-TR&api_key=' + TMDB_API_KEY;
        console.log('[FHD] TMDB URL:', tmdbUrl);
        
        var tmdbRes = await fetch(tmdbUrl);
        console.log('[FHD] TMDB yanit status:', tmdbRes.status);
        
        var tmdbData = await tmdbRes.json();
        console.log('[FHD] TMDB yanit:', tmdbData.title || tmdbData.name || 'BULUNAMADI');
        
        var query = tmdbData.title || tmdbData.name;
        if (!query) {
            console.log('[FHD] HATA: Film ismi bulunamadi!');
            return [];
        }
        
        // Arama
        var searchUrl = BASE_URL + '/arama/' + encodeURIComponent(query);
        console.log('[FHD] Arama URL:', searchUrl);
        
        var searchRes = await fetch(searchUrl, { 
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept-Language': 'tr-TR,tr;q=0.9'
            } 
        });
        console.log('[FHD] Arama yanit status:', searchRes.status);
        
        var searchHtml = await searchRes.text();
        console.log('[FHD] Arama HTML uzunlugu:', searchHtml.length);
        
        var $ = cheerio.load(searchHtml);
        var firstLink = $('li.film a').first().attr('href');
        console.log('[FHD] Bulunan ilk link:', firstLink);
        
        if (!firstLink) {
            console.log('[FHD] HATA: Film linki bulunamadi!');
            return [];
        }
        
        // Film sayfasi
        var filmUrl = firstLink.startsWith('http') ? firstLink : BASE_URL + firstLink;
        console.log('[FHD] Film URL:', filmUrl);
        
        var filmRes = await fetch(filmUrl, { 
            headers: { 'User-Agent': 'Mozilla/5.0' } 
        });
        var filmHtml = await filmRes.text();
        console.log('[FHD] Film HTML uzunlugu:', filmHtml.length);
        
        // scx bul
        var scxMatch = filmHtml.match(/scx\s*=\s*(\{[\s\S]*?\});/);
        console.log('[FHD] scx match bulundu mu:', !!scxMatch);
        
        if (!scxMatch) {
            console.log('[FHD] HATA: scx degiskeni bulunamadi!');
            // HTML'de ne oldugunu kontrol et
            if (filmHtml.includes('scx')) {
                console.log('[FHD] scx kelimesi var ama pattern eslesmedi');
            }
            return [];
        }
        
        // Parse
        var scxStr = scxMatch[1].replace(/'/g, '"').replace(/(\w+):/g, '"$1":');
        console.log('[FHD] scx string uzunlugu:', scxStr.length);
        
        var scxData = JSON.parse(scxStr);
        console.log('[FHD] scx parse basarili, anahtarlar:', Object.keys(scxData));
        
        var streams = [];
        var sources = ['atom', 'advid', 'fast', 'proton'];
        
        for (var i = 0; i < sources.length; i++) {
            var key = sources[i];
            console.log('[FHD] Kontrol ediliyor:', key);
            
            if (scxData[key] && scxData[key].sx && scxData[key].sx.t) {
                var t = scxData[key].sx.t;
                console.log('[FHD]', key, 'icin', t.length, 'adet URL var');
                
                for (var j = 0; j < t.length; j++) {
                    var enc = t[j];
                    var decoded = rtt(enc);
                    var url = atob(decoded);
                    
                    console.log('[FHD] URL', j, 'cozuldu:', url ? 'EVET (uzunluk:' + url.length + ')' : 'HAYIR');
                    
                    if (url && url.startsWith('http')) {
                        streams.push({
                            name: '⌜ FullHD ⌟ | ' + key.toUpperCase(),
                            url: url,
                            quality: '1080p',
                            headers: {
                                'User-Agent': 'Mozilla/5.0',
                                'Referer': BASE_URL + '/',
                                'Origin': BASE_URL
                            }
                        });
                    }
                }
            } else {
                console.log('[FHD]', key, 'verisi yok');
            }
        }
        
        console.log('[FHD] === TOPLAM', streams.length, 'STREAM BULUNDU ===');
        return streams;
        
    } catch (err) {
        console.error('[FHD] === KRITIK HATA ===');
        console.error('[FHD] Hata mesaji:', err.message);
        console.error('[FHD] Stack:', err.stack);
        return [];
    }
}

// EXPORT
console.log('[FHD] Export yapiliyor...');

// 1. CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
    console.log('[FHD] module.exports OK');
}

// 2. globalThis
if (typeof globalThis !== 'undefined') {
    globalThis.getStreams = getStreams;
    console.log('[FHD] globalThis OK');
}

// 3. global
if (typeof global !== 'undefined') {
    global.getStreams = getStreams;
    console.log('[FHD] global OK');
}

// 4. window
if (typeof window !== 'undefined') {
    window.getStreams = getStreams;
    console.log('[FHD] window OK');
}

console.log('[FHD] === SCRAYER HAZIR ===');
