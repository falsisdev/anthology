/**
 * Anthology M3U / VOD
 * Binlerce yerli ve yabancı film ve dizi arşivi — Anthology-Live Go VOD Motoru + Doğrudan HLS Yedeği.
 */

const { sortStreamsByQuality } = require('../shared/quality');
const { loadConfig, val, wrapAll } = require('../shared/config');
const { timeoutSignal } = require('../shared/http');

var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';
var ANTHOLOGY_VOD_API = 'https://anthology-live.duckdns.org/api/vod/streams';
var VIXOLITY_BASE = 'https://ha.vixolity.com';

var _cfgReady = null;
function cfgReady() {
    if (!_cfgReady) {
        _cfgReady = loadConfig().then(function () {
            var v = val('urls.vod.anthology_live_api');
            if (v) {
                ANTHOLOGY_VOD_API = v;
            } else {
                var liveBase = val('urls.live.anthology_live.base');
                if (liveBase) {
                    ANTHOLOGY_VOD_API = liveBase.replace(/\/+$/, '') + '/api/vod/streams';
                }
            }
            var vix = val('urls.vod.vixolity_base');
            if (vix) VIXOLITY_BASE = vix.replace(/\/+$/, '');
        });
    }
    return _cfgReady;
}

const cache = {};
const cacheTime = {};

const VIXOLITY_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Referer': 'https://pl.vixolity.com/',
    'Origin': 'https://pl.vixolity.com',
    'Accept': '*/*'
};

function getVodApiUrl() {
    if (typeof process !== 'undefined' && process.env && process.env.ANTHOLOGY_LIVE_URL) {
        return process.env.ANTHOLOGY_LIVE_URL.replace(/\/+$/, '') + '/api/vod/streams';
    }
    return ANTHOLOGY_VOD_API;
}

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

function normalizeGoVodStream(item) {
    if (!item || !item.url) return null;
    const isVixolity = /vixolity\.com/i.test(item.url);
    const isHls = typeof item.isHls === 'boolean' ? item.isHls : (item.url.includes('.m3u8') || isVixolity);
    const out = {
        name: item.name || 'Anthology VOD',
        title: item.title || `⌜ Anthology VOD ⌟ | ${item.quality || 'HD'}`,
        url: item.url,
        quality: item.quality || 'HD',
        format: item.format || (isHls ? 'hls' : 'mp4'),
        isHls: isHls
    };
    if (typeof item.score === 'number') out.score = item.score;
    if (item.headers) out.headers = item.headers;
    if (item.behaviorHints) out.behaviorHints = item.behaviorHints;
    if (isVixolity && !out.headers) {
        out.headers = VIXOLITY_HEADERS;
        out.behaviorHints = { proxyHeaders: { request: VIXOLITY_HEADERS } };
    }
    return out;
}

async function queryGoVodApi(params) {
    const apiBase = getVodApiUrl();
    const qsParts = [];
    Object.keys(params).forEach(function (k) {
        if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
            qsParts.push(encodeURIComponent(k) + '=' + encodeURIComponent(String(params[k])));
        }
    });
    const url = apiBase + '?' + qsParts.join('&');
    const now = Date.now();
    if (cache[url] && (now - (cacheTime[url] || 0) < 300000)) {
        return cache[url];
    }

    try {
        const res = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            signal: timeoutSignal(8000)
        });
        if (!res.ok) return [];
        const data = await res.json();
        const rawStreams = data && Array.isArray(data.streams) ? data.streams : [];
        const normalized = rawStreams.map(normalizeGoVodStream).filter(Boolean);
        if (normalized.length > 0) {
            cache[url] = normalized;
            cacheTime[url] = now;
        }
        return normalized;
    } catch (e) {
        return [];
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

        const goStreams = await queryGoVodApi({
            type: 'movie',
            imdb: targetImdb,
            title: d.title || '',
            original_title: d.original_title || '',
            year: targetYear,
            lang: d.original_language || ''
        });
        if (goStreams.length > 0) return goStreams;

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

        const goStreams = await queryGoVodApi({
            type: 'series',
            imdb: targetImdb,
            title: d.name || '',
            original_title: d.original_name || '',
            lang: d.original_language || '',
            season: finalSeason,
            episode: finalEpisode
        });
        if (goStreams.length > 0) return goStreams;

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
