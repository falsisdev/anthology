/**
 * Anthology M3U
 * Binlerce yerli ve yabancı film ve dizi arşivi doğrudan HD HLS akışları.
 * (Lunedor, Zerk, PowerBoard vb. çok kaynaklı M3U altyapısı)
 */

const { sortStreamsByQuality } = require('../shared/quality');
const { loadConfig, val, wrapAll } = require('../shared/config');
const { timeoutSignal } = require('../shared/http');

var _cfgReady = null;
function cfgReady() {
    if (!_cfgReady) {
        _cfgReady = loadConfig().then(function () {
            var v;
            v = val('urls.m3u.film_base'); if (v) FILM_BASE_URL = v;
            v = val('urls.m3u.dizi_base'); if (v) DIZI_BASE_URL = v;
            v = val('urls.m3u.film_full'); if (v) FILM_FULL_URL = v;
            v = val('urls.m3u.dizi_full'); if (v) DIZI_FULL_URL = v;
        });
    }
    return _cfgReady;
}

var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';
var FILM_BASE_URL = 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/main/nuvio_parcalari/';
var DIZI_BASE_URL = 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/main/nuvio_dizi_parcalari/';
var FILM_FULL_URL = 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/main/birlesik_sinema.m3u';
var DIZI_FULL_URL = 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/main/birlesik_diziler.m3u';

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
    const romanMap = {
        'ii': '2', 'iii': '3', 'iv': '4', 'v': '5',
        'vi': '6', 'vii': '7', 'viii': '8', 'ix': '9', 'x': '10'
    };
    const folded = String(s).toLowerCase()
        .replace(/[ıİ]/g, 'i').replace(/[üÜ]/g, 'u').replace(/[öÖ]/g, 'o')
        .replace(/[şŞ]/g, 's').replace(/[ğĞ]/g, 'g').replace(/[çÇ]/g, 'c')
        .replace(/[âÂ]/g, 'a').replace(/[îÎ]/g, 'i').replace(/[ûÛ]/g, 'u');
    return folded.split(/[^a-z0-9]+/)
        .map(t => t.replace(/[^a-z0-9]/g, ''))
        .filter(t => t.length > 0 && !junk.has(t))
        .map(t => romanMap[t] || t);
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

    const strippedGenre = m3uTitle
        .replace(/ (?:Aksiyon|Korku|Dram|Gerilim|Komedi|Macera|Polisiye|Biyografi|Müzik|Muzik|Gizem|Bilim-Kurgu|Romantik|Belgesel|Western|Animasyon|Aile|Suç|Suc)--.*/i, '')
        .replace(/\s*--.*$/, '')
        .replace(/\([^)]*\)/g, '')
        .trim();

    const parts = [strippedGenre];
    if (strippedGenre.indexOf('/') !== -1) {
        strippedGenre.split('/').forEach(function (p) { if (p && p.trim()) parts.push(p.trim()); });
    }
    const dashLead = strippedGenre.split('-')[0].trim();
    if (dashLead && parts.indexOf(dashLead) === -1) parts.push(dashLead);

    let tTokens = cleanTitleTokens(targetTitle);
    if (!tTokens.length) return false;
    const tgtJoined = tTokens.join('');

    for (let pi = 0; pi < parts.length; pi++) {
        let mTokens = cleanTitleTokens(parts[pi]);
        if (!mTokens.length) continue;

        // Normalize part 1: if mTokens has an extra '1' at the end and tTokens has no number
        if (mTokens.length === tTokens.length + 1 && mTokens[mTokens.length - 1] === '1') {
            const hasTgtNum = tTokens.some(t => /^\d+$/.test(t));
            if (!hasTgtNum) {
                mTokens.pop();
            }
        }
        if (mTokens.join('') === tgtJoined) return true;
    }
    return false;
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

async function fetchM3U(url) {
    const now = Date.now();
    if (cache[url] && (now - (cacheTime[url] || 0) < 300000)) {
        return cache[url];
    }
    try {
        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: timeoutSignal(15000) });
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
    'imglink.pro',
    'picogallery.org',
    'rapidimages.pro',
    'imagescdns.pics',
    'seeshare.pics',
    'imgmania.org',
    'imageshub.pro',
    'photomag.biz',
    'photostack.net',
    'photofunny.org',
    'photoflax.org',
    'photour.org',
    'pictureflix.org',
    'photoflick.org',
    'photoflix.org',
    '.buzz/'
];

function isBlockedStream(url) {
    if (!url) return true;
    for (let i = 0; i < BLOCKED_DOMAINS.length; i++) {
        if (url.includes(BLOCKED_DOMAINS[i])) return true;
    }
    return false;
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
        title: `⌜ Anthology M3U ⌟ | ${sourceTag} [HD]`,
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

function scanFilmM3UContent(content, d, targetImdb, targetYear, seenUrls, results) {
    if (!content) return;
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line.startsWith('#EXTINF')) continue;
        const nextLine = lines[i + 1] ? lines[i + 1].trim() : '';
        if (!nextLine.startsWith('http')) continue;
        if (isBlockedStream(nextLine)) continue;
        if (seenUrls.has(nextLine)) continue;

        const grpTitleMatch = line.match(/group-title="([^"]+)"/);
        const grpTitle = grpTitleMatch ? grpTitleMatch[1].toUpperCase() : '';
        if (d.original_language !== 'tr' && (grpTitle.includes('YERLI') || grpTitle.includes('TURK'))) {
            continue;
        }

        // Eğer akış URL'si doğrudan başka bir IMDb ID içeriyorsa yanlış eşleşmeyi ele
        const urlImdbMatch = nextLine.match(/\/vs\/(tt\d+)/i);
        const lineImdb = urlImdbMatch ? urlImdbMatch[1] : null;
        if (targetImdb && lineImdb && lineImdb !== targetImdb) {
            continue;
        }

        const authorMatch = line.match(/group-author="([^"]+)"/);
        const sourceTag = authorMatch ? authorMatch[1].replace(/[\[\]]/g, '').trim() : 'M3U';

        const parts = line.split(',');
        const rawName = parts[parts.length - 1].trim();

        const yearMatch = line.match(/year="(\d{4})"/);
        const m3uYear = yearMatch ? yearMatch[1] : (rawName.match(/\d{4}/) ? rawName.match(/\d{4}/)[0] : '');

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
            results.push(buildStreamObject(`${d.title || d.original_title} (${m3uYear || targetYear})`, sourceTag, nextLine, score));
        }
    }
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
            scanFilmM3UContent(content, d, targetImdb, targetYear, seenUrls, results);
        }

        if (results.length === 0 && FILM_FULL_URL) {
            const fullContent = await fetchM3U(FILM_FULL_URL);
            scanFilmM3UContent(fullContent, d, targetImdb, targetYear, seenUrls, results);
        }

        return results.sort((a, b) => b.score - a.score);
    } catch (e) {
        return [];
    }
}

function scanDiziM3UContent(content, d, finalSeason, finalEpisode, sPad, ePad, seenUrls, results) {
    if (!content) return;
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line.startsWith('#EXTINF')) continue;
        const nextLine = lines[i + 1] ? lines[i + 1].trim() : '';
        if (!nextLine.startsWith('http')) continue;
        if (isBlockedStream(nextLine)) continue;
        if (seenUrls.has(nextLine)) continue;

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

        const parts = line.split(',');
        const diziname = parts[parts.length - 1].trim();

        const sMatch = diziname.match(S_REGEX);
        if (sMatch) {
            const lineSeason = parseInt(sMatch[1] || sMatch[2], 10);
            if (lineSeason !== finalSeason) continue;
        }

        const epMatch = diziname.match(EP_REGEX);
        if (!epMatch) continue;
        const epNum = parseInt(epMatch[1] || epMatch[2] || epMatch[3] || epMatch[4], 10);
        if (epNum !== finalEpisode) continue;

        const authorMatch = line.match(/group-author="([^"]+)"/);
        const sourceTag = authorMatch ? authorMatch[1].replace(/[\[\]]/g, '').trim() : 'M3U';

        seenUrls.add(nextLine);
        results.push(buildStreamObject(`${d.name || d.original_name} S${sPad}E${ePad}`, sourceTag, nextLine));
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
            scanDiziM3UContent(content, d, finalSeason, finalEpisode, sPad, ePad, seenUrls, results);
        }

        if (results.length === 0 && DIZI_FULL_URL) {
            const fullContent = await fetchM3U(DIZI_FULL_URL);
            scanDiziM3UContent(fullContent, d, finalSeason, finalEpisode, sPad, ePad, seenUrls, results);
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
