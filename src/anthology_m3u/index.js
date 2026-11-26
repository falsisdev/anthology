/**
 * Anthology M3U / VOD
 * Binlerce yerli ve yabancı film ve dizi arşivi — Doğrudan Vixolity HLS Motoru.
 */

const { sortStreamsByQuality } = require('../shared/quality');
const { loadConfig, val, wrapAll } = require('../shared/config');
const { timeoutSignal } = require('../shared/http');

var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';
var VIXOLITY_BASE = 'https://ha.vixolity.com';

var _cfgReady = null;
function cfgReady() {
    if (!_cfgReady) {
        _cfgReady = loadConfig().then(function () {
            var vix = val('urls.vod.vixolity_base');
            if (vix) VIXOLITY_BASE = vix.replace(/\/+$/, '');
        });
    }
    return _cfgReady;
}

const VIXOLITY_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Referer': 'https://pl.vixolity.com/',
    'Origin': 'https://pl.vixolity.com',
    'Accept': '*/*'
};

function buildStreamObject(streamName, sourceTag, streamUrl, score) {
    const isVixolity = /vixolity\.com/i.test(streamUrl);
    const isHlsStream = streamUrl.includes('.m3u8') || isVixolity;
    const obj = {
        name: streamName,
        title: `⌜ Anthology VOD ⌟ | ${sourceTag} [HD]`,
        url: streamUrl,
        quality: sourceTag || 'HD',
        format: isHlsStream ? 'hls' : 'mp4',
        isHls: isHlsStream
    };
    if (typeof score === 'number') obj.score = score;
    if (isVixolity) {
        obj.headers = VIXOLITY_HEADERS;
        obj.behaviorHints = { proxyHeaders: { request: VIXOLITY_HEADERS } };
    }
    return obj;
}

async function resolveTmdbMovie(rawId) {
    let cleanId = String(rawId).replace(/^tmdb:/, '').split(':')[0].trim();
    const isImdb = cleanId.startsWith('tt');
    try {
        let movieId = cleanId;
        if (isImdb) {
            const res = await fetch(`https://api.themoviedb.org/3/find/${cleanId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`, { signal: timeoutSignal(8000) });
            const data = await res.json();
            const found = data.movie_results && data.movie_results[0] ? data.movie_results[0] : null;
            if (!found || !found.id) return null;
            movieId = String(found.id);
        }
        const res = await fetch(`https://api.themoviedb.org/3/movie/${movieId}?api_key=${TMDB_API_KEY}&language=tr-TR&append_to_response=external_ids`, { signal: timeoutSignal(8000) });
        const data = await res.json();
        if (!data || (!data.title && !data.original_title)) return null;
        if (isImdb && !data.imdb_id) data.imdb_id = cleanId;
        return data;
    } catch (e) {
        return null;
    }
}

async function resolveTmdbShow(rawId) {
    let cleanId = String(rawId).replace(/^tmdb:/, '').split(':')[0].trim();
    const isImdb = cleanId.startsWith('tt');
    try {
        let showId = cleanId;
        if (isImdb) {
            const res = await fetch(`https://api.themoviedb.org/3/find/${cleanId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`, { signal: timeoutSignal(8000) });
            const data = await res.json();
            const found = data.tv_results && data.tv_results[0] ? data.tv_results[0] : null;
            if (!found || !found.id) return null;
            showId = String(found.id);
        }
        const res = await fetch(`https://api.themoviedb.org/3/tv/${showId}?api_key=${TMDB_API_KEY}&language=tr-TR&append_to_response=external_ids`, { signal: timeoutSignal(8000) });
        const data = await res.json();
        if (!data || (!data.name && !data.original_name)) return null;
        return data;
    } catch (e) {
        return null;
    }
}

async function probeDirectVixolity(urls, streamName) {
    for (let i = 0; i < urls.length; i++) {
        const targetUrl = urls[i];
        try {
            const res = await fetch(targetUrl, {
                headers: VIXOLITY_HEADERS,
                signal: timeoutSignal(5000)
            });
            if (!res.ok) continue;
            const text = await res.text();
            if (text && text.includes('#EXTM3U')) {
                return [buildStreamObject(streamName, 'Vixolity', targetUrl, 120)];
            }
        } catch (e) { }
    }
    return [];
}

async function searchFilmStreams(tmdbId) {
    try {
        const d = await resolveTmdbMovie(tmdbId);
        if (!d || (!d.title && !d.original_title)) return [];

        const targetImdb = d.imdb_id || (d.external_ids ? d.external_ids.imdb_id : '') || '';
        const targetYear = (d.release_date || '').slice(0, 4);

        if (targetImdb && targetImdb.startsWith('tt')) {
            const dispName = `${d.title || d.original_title}${targetYear ? ' (' + targetYear + ')' : ''}`;
            return await probeDirectVixolity([`${VIXOLITY_BASE}/vs/${targetImdb}/`], dispName);
        }
        return [];
    } catch (e) {
        return [];
    }
}

async function searchDiziStreams(rawId, seasonInput, episodeInput) {
    let finalSeason = parseInt(seasonInput, 10) || 1;
    let finalEpisode = parseInt(episodeInput, 10) || 1;

    if (typeof rawId === 'string' && rawId.includes(':')) {
        const parts = rawId.split(':');
        if (parts.length >= 3) {
            finalSeason = parseInt(parts[1], 10) || finalSeason;
            finalEpisode = parseInt(parts[2], 10) || finalEpisode;
        }
    }

    try {
        const d = await resolveTmdbShow(rawId);
        if (!d || (!d.name && !d.original_name)) return [];

        const rawStr = String(rawId).split(':')[0].trim();
        const targetImdb = (rawStr.startsWith('tt') ? rawStr : '') || (d.external_ids ? d.external_ids.imdb_id : '') || '';
        const sPad = String(finalSeason).padStart(2, '0');
        const ePad = String(finalEpisode).padStart(2, '0');

        if (targetImdb && targetImdb.startsWith('tt')) {
            const dispName = `${d.name || d.original_name} S${sPad}E${ePad}`;
            const candidates = [
                `${VIXOLITY_BASE}/vs/${targetImdb}/s${finalSeason}/e${ePad}`,
                `${VIXOLITY_BASE}/vs/${targetImdb}/s${finalSeason}/e${finalEpisode}`
            ];
            return await probeDirectVixolity(Array.from(new Set(candidates)), dispName);
        }
        return [];
    } catch (e) {
        return [];
    }
}

async function getStreams(id, mediaType, season, episode) {
    let finalId = id;
    let finalType = mediaType;
    let finalSeason = season;
    let finalEpisode = episode;

    if (id && typeof id === 'object') {
        finalType = id.type || id.mediaType || mediaType;
        finalSeason = id.season || season;
        finalEpisode = id.episode || episode;
        finalId = id.id || id.tmdbId || id.imdbId;
    }

    if (typeof finalId === 'string' && finalId.includes(':')) {
        const parts = finalId.split(':');
        if (parts.length >= 3) {
            finalSeason = parts[1];
            finalEpisode = parts[2];
            finalId = parts[0];
            if (!finalType || finalType === 'movie') finalType = 'series';
        }
    }

    const isSeries = finalType === 'tv' || finalType === 'series' || (finalSeason !== undefined && finalEpisode !== undefined && finalSeason !== null);

    let streams = [];
    if (isSeries) {
        streams = await searchDiziStreams(finalId, finalSeason, finalEpisode);
    } else {
        streams = await searchFilmStreams(finalId);
    }

    return sortStreamsByQuality(streams);
}

if (typeof module !== 'undefined') {
    module.exports = wrapAll({
        getStreams,
        searchFilmStreams,
        searchDiziStreams,
        sortStreamsByQuality
    }, cfgReady);
}
if (typeof globalThis !== 'undefined') {
    globalThis.getStreams = getStreams;
}
