const { sortStreamsByQuality } = require("../shared/quality.js");
const { loadConfig, val, wrapAll } = require("../shared/config.js");

var _cfgReady = null;
function cfgReady() {
    if (!_cfgReady) {
        _cfgReady = loadConfig().then(function () {
            var v;
            v = val('urls.movies.vidmody.base'); if (v && String(v).indexOf('vidmody.com') === -1) BASE_URL = String(v).replace(/\/+$/, '');
            if (STREAM_HEADERS) STREAM_HEADERS.Referer = BASE_URL + '/';
        });
    }
    return _cfgReady;
}

/**
 * Anthology - Vidmody Provider
 * Vidmody.com arşivi üzerinden doğrudan çift sesli (Türkçe & İngilizce)
 * ve Türkçe/İngilizce altyazılı 1080p HLS (.m3u8) akışları sunar.
 */

var PROVIDER_NAME = 'Vidmody';
var BASE_URL = 'https://ha.vixolity.com';
var TMDB_API_KEY  = '500330721680edb6d5f7f12ba7cd9023';

var VIXOLITY_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Referer': 'https://pl.vixolity.com/',
    'Origin': 'https://pl.vixolity.com',
    'Accept': '*/*'
};
var STREAM_HEADERS = VIXOLITY_HEADERS;

function parseVixolitySubtitles(playlistText) {
    var subs = [];
    var subRe = /#EXT-X-MEDIA:TYPE=SUBTITLES.*?NAME="([^"]+)".*?LANGUAGE="([^"]+)".*?URI="([^"]+)"/gi;
    var sm;
    var seen = new Set();
    while ((sm = subRe.exec(playlistText)) !== null) {
        var name = sm[1];
        var lang = sm[2].toLowerCase();
        var uri = sm[3];
        if (seen.has(uri)) continue;
        seen.add(uri);
        subs.push({
            id: lang,
            lang: lang === 'tr' ? 'tur' : lang === 'en' ? 'eng' : lang,
            language: lang,
            label: name,
            name: name,
            title: name,
            url: uri,
            format: 'vtt',
            type: 'text/vtt',
            headers: VIXOLITY_HEADERS
        });
    }
    return subs;
}

async function getStreams(tmdbId, mediaType, season, episode) {
    try {
        var id = tmdbId;
        var mType = mediaType;
        var sNum = parseInt(season) || 1;
        var eNum = parseInt(episode) || 1;

        if (typeof tmdbId === 'object' && tmdbId && tmdbId.id) {
            id = tmdbId.id;
            if (tmdbId.type) mType = tmdbId.type;
            if (tmdbId.season) sNum = parseInt(tmdbId.season) || 1;
            if (tmdbId.episode) eNum = parseInt(tmdbId.episode) || 1;
        }

        var cleanId = String(id || '').trim().replace(/^(?:movie|tv|series|tmdb|imdb):+/i, '');
        if (cleanId.includes(':')) cleanId = cleanId.split(':')[0];

        var isTV = (mType === 'tv' || mType === 'series');
        var typePath = isTV ? 'tv' : 'movie';
        var isImdb = cleanId.startsWith('tt');

        var imdbId = null;
        var displayTitle = 'İçerik';
        var releaseYear = '';

        if (isImdb) {
            imdbId = cleanId;
            var findUrl = 'https://api.themoviedb.org/3/find/' + cleanId + '?api_key=' + TMDB_API_KEY + '&external_source=imdb_id';
            var fRes = await fetch(findUrl);
            if (fRes.ok) {
                var fData = await fRes.json();
                var match = isTV ? (fData.tv_results && fData.tv_results[0]) : (fData.movie_results && fData.movie_results[0]);
                if (match) {
                    displayTitle = match.title || match.name || displayTitle;
                    releaseYear = (match.release_date || match.first_air_date || '').slice(0, 4);
                }
            }
        } else {
            var tmdbUrl = 'https://api.themoviedb.org/3/' + typePath + '/' + cleanId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR&append_to_response=external_ids';
            var tmdbRes = await fetch(tmdbUrl);
            if (!tmdbRes.ok) return [];
            var d = await tmdbRes.json();
            imdbId = d.external_ids ? d.external_ids.imdb_id : (d.imdb_id || null);
            displayTitle = d.title || d.name || displayTitle;
            releaseYear = (d.release_date || d.first_air_date || '').slice(0, 4);
        }

        if (!imdbId || !imdbId.startsWith('tt')) return [];

        var targetUrl = '';
        var tag = isTV ? ('S' + sNum + 'E' + eNum + ' • [TR Dublaj & Altyazılı]') : '[TR Dublaj & Altyazılı]';
        var streamTitle = '⌜ Vidmody ⌟ | Vixolity • ' + tag + ' (1080p HLS)';

        if (!isTV) {
            targetUrl = 'https://ha.vixolity.com/vs/' + imdbId;
            if (releaseYear) displayTitle += ' (' + releaseYear + ')';
        } else {
            var sStr = 's' + sNum;
            var eStr = 'e' + (eNum < 10 ? '0' + eNum : eNum);
            targetUrl = 'https://ha.vixolity.com/vs/' + imdbId + '/' + sStr + '/' + eStr;
            displayTitle += ' - S' + String(sNum).padStart(2, '0') + 'E' + String(eNum).padStart(2, '0');
        }

        try {
            var checkRes = await fetch(targetUrl, {
                headers: VIXOLITY_HEADERS
            });

            if (checkRes.ok) {
                var text = await checkRes.text();
                if (text.includes('#EXTM3U')) {
                    var subs = parseVixolitySubtitles(text);
                    return [{
                        name: 'Vidmody',
                        title: streamTitle,
                        url: targetUrl,
                        quality: '1080p',
                        headers: VIXOLITY_HEADERS,
                        format: 'hls',
                        isHls: true,
                        behaviorHints: {
                            notWebReady: true,
                            proxyHeaders: { request: VIXOLITY_HEADERS }
                        },
                        provider: 'vidmody',
                        subtitles: subs
                    }];
                }
            }
        } catch (linkErr) {
            return [];
        }

        return [];
    } catch (e) {
        console.error('[Vidmody] Hata:', e.message);
        return [];
    }
}

// ── Universal Quality Sorter ──────────────────────────────────────────
if (typeof getStreams === "function") {
    var _origGetStreams = getStreams;
    getStreams = async function() {
        var res = await _origGetStreams.apply(this, arguments);
        return sortStreamsByQuality(res);
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = wrapAll({ getStreams: getStreams }, cfgReady);
} else {
    global.VidmodyProvider = { getStreams: getStreams };
}
