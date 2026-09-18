const { sortStreamsByQuality } = require("../shared/quality.js");
/**
 * Anthology - Vidmody Provider
 * Vidmody.com arşivi üzerinden doğrudan çift sesli (Türkçe & İngilizce)
 * ve Türkçe/İngilizce altyazılı 1080p HLS (.m3u8) akışları sunar.
 */

var PROVIDER_NAME = 'Vidmody';
var TMDB_API_KEY  = '500330721680edb6d5f7f12ba7cd9023';

var STREAM_HEADERS = {
    'Referer': 'https://vidmody.com/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML like Gecko) Chrome/137.0.0.0 Safari/537.36'
};

async function getStreams(tmdbId, mediaType, season, episode) {
    try {
        var cleanId = String(tmdbId || '').trim();
        if (cleanId.includes(':')) cleanId = cleanId.split(':')[0];

        var isTV = (mediaType === 'tv' || mediaType === 'series');
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
            imdbId = d.external_ids ? d.external_ids.imdb_id : null;
            displayTitle = d.title || d.name || displayTitle;
            releaseYear = (d.release_date || d.first_air_date || '').slice(0, 4);
        }

        if (!imdbId || !imdbId.startsWith('tt')) return [];

        var targetUrl = '';
        var streamTitle = '⌜ Vidmody ⌟ | Çoklu Dil (1080p HLS)';

        if (!isTV) {
            targetUrl = 'https://vidmody.com/vs/' + imdbId;
            if (releaseYear) displayTitle += ' (' + releaseYear + ')';
        } else {
            var sNum = parseInt(season) || 1;
            var eNum = parseInt(episode) || 1;
            var sStr = 's' + sNum;
            var eStr = 'e' + (eNum < 10 ? '0' + eNum : eNum);
            targetUrl = 'https://vidmody.com/vs/' + imdbId + '/' + sStr + '/' + eStr;
            displayTitle += ' - S' + String(sNum).padStart(2, '0') + 'E' + String(eNum).padStart(2, '0');
        }

        // Link doğrulama (Hızlı HEAD isteği)
        try {
            var checkRes = await fetch(targetUrl, { 
                method: 'HEAD',
                headers: STREAM_HEADERS
            });
            
            if (checkRes.status === 200) {
                return [{
                    name: displayTitle,
                    title: streamTitle,
                    url: targetUrl,
                    quality: '1080p',
                    headers: STREAM_HEADERS,
                    behaviorHints: {
                        notWebReady: true,
                        proxyHeaders: { request: STREAM_HEADERS }
                    },
                    provider: 'vidmody'
                }];
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
    module.exports = { getStreams: getStreams };
} else {
    global.VidmodyProvider = { getStreams: getStreams };
}
