var cheerio = require("cheerio-without-node-native");
var BASE_URL = 'https://www.fullhdfilmizlesene.live';
var TMDB_API_KEY = '4ef0d7355d9ffb5151e987764708ce96';

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

function atob(s) {
    if (!s) return '';
    try { return Buffer.from(s, 'base64').toString('utf-8'); } catch(e) { return ''; }
}

async function getStreams(tmdbId, mediaType) {
    try {
        var tmdbType = mediaType === 'movie' ? 'movie' : 'tv';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + tmdbType + '/' + tmdbId + '?language=tr-TR&api_key=' + TMDB_API_KEY;
        
        var tmdbRes = await fetch(tmdbUrl);
        var tmdbData = await tmdbRes.json();
        var query = tmdbData.title || tmdbData.name;
        if (!query) return [];
        
        var searchRes = await fetch(BASE_URL + '/arama/' + encodeURIComponent(query), {
            headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'tr-TR,tr;q=0.9' }
        });
        var html = await searchRes.text();
        
        var $ = cheerio.load(html);
        var link = $('li.film a').first().attr('href');
        if (!link) return [];
        
        var filmUrl = link.startsWith('http') ? link : BASE_URL + link;
        var filmRes = await fetch(filmUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        var filmHtml = await filmRes.text();
        
        var scxMatch = filmHtml.match(/scx\s*=\s*(\{[\s\S]*?\});/);
        if (!scxMatch) return [];
        
        var scxData = JSON.parse(scxMatch[1].replace(/'/g, '"').replace(/(\w+):/g, '"$1":'));
        var streams = [];
        
        ['atom', 'advid', 'fast', 'proton'].forEach(function(key) {
            if (scxData[key] && scxData[key].sx && scxData[key].sx.t) {
                scxData[key].sx.t.forEach(function(enc) {
                    var url = atob(rtt(enc));
                    if (url) streams.push({
                        name: 'FullHD | ' + key.toUpperCase(),
                        url: url,
                        quality: '1080p',
                        headers: { 'Referer': BASE_URL + '/', 'Origin': BASE_URL }
                    });
                });
            }
        });
        
        return streams;
    } catch(e) {
        console.error('[FHD] Hata:', e);
        return [];
    }
}

// EXPORT - NUVIOTR için kritik
module.exports = { getStreams: getStreams, default: { getStreams: getStreams } };
if (typeof globalThis !== 'undefined') { globalThis.getStreams = getStreams; globalThis.fullhdProvider = { getStreams: getStreams }; }
if (typeof global !== 'undefined') { global.getStreams = getStreams; global.fullhdProvider = { getStreams: getStreams }; }
