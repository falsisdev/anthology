/**
 * Anthology M3U
 * Binlerce yerli ve yabancı film ve dizi arşivi doğrudan HD HLS akışları.
 * (Lunedor, Zerk, PowerBoard vb. çok kaynaklı M3U altyapısı)
 */

const { sortStreamsByQuality } = require('../shared/quality');
const { loadConfig, val, wrapAll } = require('../shared/config');

var _cfgReady = null;
function cfgReady() {
    if (!_cfgReady) {
        _cfgReady = loadConfig().then(function () {
            var v;
            v = val('urls.m3u.film_base'); if (v) FILM_BASE_URL = v;
            v = val('urls.m3u.dizi_base'); if (v) DIZI_BASE_URL = v;
        });
    }
    return _cfgReady;
}

var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';
var FILM_BASE_URL = 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/main/nuvio_parcalari/';
var DIZI_BASE_URL = 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/main/nuvio_dizi_parcalari/';

const cache = {};
const cacheTime = {};

function ultraClean(s) {
    if (!s) return '';
    return s.toString().toLowerCase()
        .replace(/[ıİ]/g, 'i').replace(/[üÜ]/g, 'u').replace(/[öÖ]/g, 'o')
        .replace(/[şŞ]/g, 's').replace(/[ğĞ]/g, 'g').replace(/[çÇ]/g, 'c')
        .replace(/[âÂ]/g, 'a').replace(/[îÎ]/g, 'i').replace(/[ûÛ]/g, 'u')
        .replace(/[^a-z0-9]/g, '')
        .trim();
}

function cleanTitleTokens(s) {
    if (!s) return [];
    const junk = new Set([
        'the', 'a', 'an', 'bir', 'film', 'filmi', 'dizi', 'dizisi',
        'izle', 'dublaj', 'altyazi', 'altyazili', 'turkce', 'hd', 'fhd', 'uhd',
        'webrip', 'bluray', 'extended', 'cut', 'edition', 'unrated', 'remastered'
    ]);
    const folded = String(s).toLowerCase()
        .replace(/[ıİ]/g, 'i').replace(/[üÜ]/g, 'u').replace(/[öÖ]/g, 'o')
        .replace(/[şŞ]/g, 's').replace(/[ğĞ]/g, 'g').replace(/[çÇ]/g, 'c')
        .replace(/[âÂ]/g, 'a').replace(/[îÎ]/g, 'i').replace(/[ûÛ]/g, 'u');
    return folded.split(/[^a-z0-9]+/)
        .map(t => t.replace(/[^a-z0-9]/g, ''))
        .filter(t => t.length > 0 && !junk.has(t));
}

function getLetterGroups(title) {
    const groups = new Set();
    const clean = ultraClean(title);
    if (!clean) return ['diger'];

    const firstChar = clean.charAt(0);
    if (/[0-9]/.test(firstChar)) groups.add('0_9_rakam');
    else if (/[a-z]/.test(firstChar)) groups.add(firstChar);
    else groups.add('diger');

    const stripped = clean.replace(/^(the|a|an|bir)/, '');
    if (stripped && stripped.length > 0) {
        const nextChar = stripped.charAt(0);
        if (/[0-9]/.test(nextChar)) groups.add('0_9_rakam');
        else if (/[a-z]/.test(nextChar)) groups.add(nextChar);
    }

    return Array.from(groups);
}

function matchesMovieTitle(m3uTitle, m3uYear, targetTitle, targetYear) {
    if (!m3uTitle || !targetTitle) return false;

    if (m3uYear && targetYear) {
        const yM3u = parseInt(m3uYear, 10);
        const yTgt = parseInt(targetYear, 10);
        if (!isNaN(yM3u) && !isNaN(yTgt) && Math.abs(yM3u - yTgt) > 1) {
            return false;
        }
    }

    const m3uClean = m3uTitle.replace(/\([^)]*\)/g, '').split('-')[0].trim();
    let mTokens = cleanTitleTokens(m3uClean);
    let tTokens = cleanTitleTokens(targetTitle);

    if (!mTokens.length || !tTokens.length) return false;

    // Normalize part 1: if mTokens has an extra '1' at the end and tTokens has no number
    if (mTokens.length === tTokens.length + 1 && mTokens[mTokens.length - 1] === '1') {
        const hasTgtNum = tTokens.some(t => /^\d+$/.test(t));
        if (!hasTgtNum) {
            mTokens.pop();
        }
    }

    return mTokens.join('') === tTokens.join('');
}

function matchesShowTitle(rawName, targetName) {
    if (!rawName || !targetName) return false;
    const nameWithoutYear = rawName.replace(/\([^)]*\)/g, '').split('-')[0].trim();
    const nameTokens = cleanTitleTokens(nameWithoutYear);
    const targetTokens = cleanTitleTokens(targetName);
    if (!nameTokens.length || !targetTokens.length) return false;
    return nameTokens.join('') === targetTokens.join('');
}

const EP_REGEX = /(?:s\d+[\s._-]*e0*(\d+)|(?:b[oö]l[uü]m|episode|ep)[\s._-]*0*(\d+)|\b0*(\d+)\.[\s._-]*b[oö]l[uü]m|\b\d+x0*(\d+)\b)/i;
const S_REGEX = /(?:s0*(\d+)[\s._-]*e|\b0*(\d+)x\d+\b)/i;

async function resolveTmdbMovie(rawId) {
    let cleanId = String(rawId).replace(/^tmdb:/, '').split(':')[0].trim();
    const isImdb = cleanId.startsWith('tt');
    try {
        if (isImdb) {
            const res = await fetch(`https://api.themoviedb.org/3/find/${cleanId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`);
            const data = await res.json();
            return data.movie_results && data.movie_results[0] ? data.movie_results[0] : null;
        } else {
            const res = await fetch(`https://api.themoviedb.org/3/movie/${cleanId}?api_key=${TMDB_API_KEY}&language=tr-TR&append_to_response=external_ids`);
            const data = await res.json();
            return data && (data.title || data.original_title) ? data : null;
        }
    } catch (e) {
        return null;
    }
}

async function resolveTmdbShow(rawId) {
    let cleanId = String(rawId).replace(/^tmdb:/, '').split(':')[0].trim();
    const isImdb = cleanId.startsWith('tt');
    try {
        if (isImdb) {
            const res = await fetch(`https://api.themoviedb.org/3/find/${cleanId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`);
            const data = await res.json();
            return data.tv_results && data.tv_results[0] ? data.tv_results[0] : null;
        } else {
            const res = await fetch(`https://api.themoviedb.org/3/tv/${cleanId}?api_key=${TMDB_API_KEY}&language=tr-TR&append_to_response=external_ids`);
            const data = await res.json();
            return data && (data.name || data.original_name) ? data : null;
        }
    } catch (e) {
        return null;
    }
}

async function fetchM3U(url) {
    const now = Date.now();
    if (cache[url] && (now - (cacheTime[url] || 0) < 300000)) {
        return cache[url];
    }
    try {
        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!res.ok) return null;
        const text = await res.text();
        cache[url] = text;
        cacheTime[url] = now;
        return text;
    } catch (e) {
        return null;
    }
}

const BLOCKED_DOMAINS = [
    'imagebin.pics',
    'imagehub.pics',
    'imagesbox.cloud',
    'photogrids.site',
    'picturebox.cloud',
    'pixtureup.org',
    'pixypost.art',
    'pixtures.art',
    'imglink.info',
    'imglink.pro'
];

function isBlockedStream(url) {
    if (!url) return true;
    for (let i = 0; i < BLOCKED_DOMAINS.length; i++) {
        if (url.includes(BLOCKED_DOMAINS[i])) return true;
    }
    return false;
}

async function searchFilmStreams(tmdbId) {
    try {
        const d = await resolveTmdbMovie(tmdbId);
        if (!d || (!d.title && !d.original_title)) return [];

        const targetImdb = d.imdb_id || (d.external_ids ? d.external_ids.imdb_id : null);
        const targetYear = (d.release_date || '').slice(0, 4);

        const targetGroups = new Set([
            ...getLetterGroups(d.title),
            ...getLetterGroups(d.original_title),
            '0_9_rakam',
            'diger'
        ]);

        const results = [];
        const seenUrls = new Set();

        for (const grp of targetGroups) {
            const m3uUrl = `${FILM_BASE_URL}nuvio_${grp}.m3u`;
            const content = await fetchM3U(m3uUrl);
            if (!content) continue;

            const lines = content.split('\n');
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line.startsWith('#EXTINF')) {
                    const nextLine = lines[i + 1] ? lines[i + 1].trim() : '';
                    if (!nextLine.startsWith('http')) continue;
                    if (isBlockedStream(nextLine)) continue;
                    if (seenUrls.has(nextLine)) continue;

                    // Non-Turkish movies shouldn't match "YERLI FILM" lines
                    const grpTitleMatch = line.match(/group-title="([^"]+)"/);
                    const grpTitle = grpTitleMatch ? grpTitleMatch[1].toUpperCase() : '';
                    if (d.original_language !== 'tr' && (grpTitle.includes('YERLI') || grpTitle.includes('TURK'))) {
                        continue;
                    }

                    let authorMatch = line.match(/group-author="([^"]+)"/);
                    let sourceTag = authorMatch ? authorMatch[1].replace(/[\[\]]/g, '').trim() : 'M3U';

                    let parts = line.split(',');
                    let rawName = parts[parts.length - 1].trim();

                    let yearMatch = line.match(/year="(\d{4})"/);
                    let m3uYear = yearMatch ? yearMatch[1] : (rawName.match(/\d{4}/) ? rawName.match(/\d{4}/)[0] : '');

                    let isMatch = false;
                    let score = 0;

                    if (targetImdb && nextLine.includes(targetImdb)) {
                        isMatch = true;
                        score = 120;
                    } else if (matchesMovieTitle(rawName, m3uYear, d.title, targetYear) ||
                               matchesMovieTitle(rawName, m3uYear, d.original_title, targetYear)) {
                        isMatch = true;
                        score = (m3uYear && targetYear && Math.abs(parseInt(m3uYear, 10) - parseInt(targetYear, 10)) <= 1) ? 100 : 90;
                    }

                    if (isMatch) {
                        seenUrls.add(nextLine);
                        results.push({
                            name: `${d.title || d.original_title} (${m3uYear || targetYear})`,
                            title: `⌜ Anthology M3U ⌟ | ${sourceTag} [HD]`,
                            url: nextLine,
                            quality: sourceTag || 'HD',
                            format: nextLine.includes('.m3u8') ? 'hls' : 'mp4',
                            isHls: nextLine.includes('.m3u8'),
                            score: score
                        });
                    }
                }
            }
        }

        return results.sort((a, b) => b.score - a.score);
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

        const sPad = finalSeason.toString().padStart(2, '0');
        const ePad = finalEpisode.toString().padStart(2, '0');

        const targetGroups = new Set([
            ...getLetterGroups(d.name),
            ...getLetterGroups(d.original_name),
            '0_9_rakam',
            'diger'
        ]);

        const results = [];
        const seenUrls = new Set();

        for (const grp of targetGroups) {
            const fileName = `dizi_${grp}_s${finalSeason}.m3u`;
            const m3uUrl = `${DIZI_BASE_URL}${fileName}`;
            const content = await fetchM3U(m3uUrl);
            if (!content) continue;

            const lines = content.split('\n');
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line.startsWith('#EXTINF')) {
                    const nextLine = lines[i + 1] ? lines[i + 1].trim() : '';
                    if (!nextLine.startsWith('http')) continue;
                    if (isBlockedStream(nextLine)) continue;
                    if (seenUrls.has(nextLine)) continue;

                    // 1. Show Identity Check
                    const tvgIdMatch = line.match(/tvg-id="(\d+)"/);
                    const lineTvgId = tvgIdMatch ? tvgIdMatch[1] : null;

                    let showMatches = false;
                    if (lineTvgId && d.id) {
                        if (lineTvgId === String(d.id)) {
                            showMatches = true;
                        }
                    }
                    if (!showMatches && !lineTvgId) {
                        const grpMatch = line.match(/group-title="([^"]+)"/);
                        const grpTitle = grpMatch ? grpMatch[1] : '';
                        const parts2 = line.split(',');
                        const diziname = parts2[parts2.length - 1].trim();
                        const dizinameWithoutEp = diziname.replace(/(?:s\d+[\s._-]*e\d+|b[oö]l[uü]m[\s._-]*\d+|\d+\.[\s._-]*b[oö]l[uü]m|\b\d+x\d+).*/i, '').trim();

                        if (matchesShowTitle(grpTitle, d.name) ||
                            matchesShowTitle(grpTitle, d.original_name) ||
                            matchesShowTitle(dizinameWithoutEp, d.name) ||
                            matchesShowTitle(dizinameWithoutEp, d.original_name)) {
                            showMatches = true;
                        }
                    }

                    if (!showMatches) continue;

                    // 2. Season Check
                    const parts = line.split(',');
                    const diziname = parts[parts.length - 1].trim();

                    const sMatch = diziname.match(S_REGEX);
                    if (sMatch) {
                        const lineSeason = parseInt(sMatch[1] || sMatch[2], 10);
                        if (lineSeason !== finalSeason) continue;
                    }

                    // 3. Strict Episode Check
                    const epMatch = diziname.match(EP_REGEX);
                    if (!epMatch) continue;
                    const epNum = parseInt(epMatch[1] || epMatch[2] || epMatch[3] || epMatch[4], 10);
                    if (epNum !== finalEpisode) continue;

                    const authorMatch = line.match(/group-author="([^"]+)"/);
                    const sourceTag = authorMatch ? authorMatch[1].replace(/[\[\]]/g, '').trim() : 'M3U';

                    seenUrls.add(nextLine);
                    results.push({
                        name: `${d.name || d.original_name} S${sPad}E${ePad}`,
                        title: `⌜ Anthology M3U ⌟ | ${sourceTag} [HD]`,
                        url: nextLine,
                        quality: sourceTag || 'HD',
                        format: nextLine.includes('.m3u8') ? 'hls' : 'mp4',
                        isHls: nextLine.includes('.m3u8')
                    });
                }
            }
        }

        return results;
    } catch (err) {
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
