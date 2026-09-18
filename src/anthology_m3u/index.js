/**
 * Anthology M3U
 * Binlerce yerli ve yabancı film ve dizi arşivi doğrudan HD HLS akışları.
 * (Lunedor, Zerk, PowerBoard vb. çok kaynaklı M3U altyapısı)
 */

const TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';
const FILM_BASE_URL = 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/main/nuvio_parcalari/';
const DIZI_BASE_URL = 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/main/nuvio_dizi_parcalari/';

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

function getLetterGroup(title) {
    const clean = ultraClean(title);
    if (!clean) return 'diger';
    const c = clean.charAt(0);
    if (/[0-9]/.test(c)) return '0_9_rakam';
    if (/[a-z]/.test(c)) return c;
    return 'diger';
}

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

function titleTokens(s) {
    if (!s) return null;
    const folded = String(s).toLowerCase()
        .replace(/[ıİ]/g, 'i').replace(/[üÜ]/g, 'u').replace(/[öÖ]/g, 'o')
        .replace(/[şŞ]/g, 's').replace(/[ğĞ]/g, 'g').replace(/[çÇ]/g, 'c')
        .replace(/[âÂ]/g, 'a').replace(/[îÎ]/g, 'i').replace(/[ûÛ]/g, 'u');
    return folded.split(/[^a-z0-9]+/)
        .map(t => t.replace(/[^a-z0-9]/g, ''))
        .filter(t => t.length >= 3);
}

function titleBoundaryMatch(rawName, targets) {
    if (!rawName) return false;
    const nameTokens = titleTokens(rawName.split('(')[0].split('-')[0]);
    if (!nameTokens || !nameTokens.length) return false;
    for (const t of targets) {
        if (!t) continue;
        let targetTokens = titleTokens(t);
        if (!targetTokens || !targetTokens.length) continue;
        while (targetTokens[0] && /^(the|a|an)$/.test(targetTokens[0])) targetTokens.shift();
        if (!targetTokens.length) continue;
        if (targetTokens.length === 1 && targetTokens[0].length < 4) continue;
        if (targetTokens.length > nameTokens.length) continue;
        let ok = true;
        for (let i = 0; i < targetTokens.length; i++) {
            if (nameTokens[i] !== targetTokens[i]) { ok = false; break; }
        }
        if (ok) return true;
    }
    return false;
}

async function searchFilmStreams(tmdbId) {
    try {
        const d = await resolveTmdbMovie(tmdbId);
        if (!d) return [];

        const targetImdb = d.imdb_id || (d.external_ids ? d.external_ids.imdb_id : null);
        const targetTr = ultraClean(d.title);
        const targetEn = ultraClean(d.original_title);
        const targetYear = (d.release_date || '').slice(0, 4);

        const targetGroups = new Set([
            getLetterGroup(d.title),
            getLetterGroup(d.original_title),
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

                    let authorMatch = line.match(/group-author="([^"]+)"/);
                    let sourceTag = authorMatch ? authorMatch[1].replace(/[\[\]]/g, '').trim() : 'M3U';

                    let parts = line.split(',');
                    let rawName = parts[parts.length - 1].trim();
                    let cleanM3U = ultraClean(rawName.split('(')[0].split('-')[0]);

                    let yearMatch = line.match(/year="(\d{4})"/);
                    let m3uYear = yearMatch ? yearMatch[1] : (rawName.match(/\d{4}/) ? rawName.match(/\d{4}/)[0] : '');

                    let isMatch = false;
                    let score = 0;

                    if (targetImdb && nextLine.includes(targetImdb)) {
                        isMatch = true;
                        score = 120;
                    } else if (cleanM3U === targetTr || cleanM3U === targetEn) {
                        if (!m3uYear || m3uYear === targetYear) {
                            isMatch = true;
                            score = (m3uYear === targetYear) ? 100 : 90;
                        }
                    } else if (cleanM3U.length > 3 && titleBoundaryMatch(rawName, [d.title, d.original_title])) {
                        if (!m3uYear || m3uYear === targetYear) {
                            isMatch = true;
                            score = 80;
                        }
                    }

                    if (isMatch && score >= 70) {
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
    let finalSeason = parseInt(seasonInput) || 1;
    let finalEpisode = parseInt(episodeInput) || 1;

    if (typeof rawId === 'string' && rawId.includes(':')) {
        const parts = rawId.split(':');
        if (parts.length >= 3) {
            finalSeason = parseInt(parts[1]) || finalSeason;
            finalEpisode = parseInt(parts[2]) || finalEpisode;
        }
    }

    try {
        const d = await resolveTmdbShow(rawId);
        if (!d) return [];

        const sPad = finalSeason.toString().padStart(2, '0');
        const ePad = finalEpisode.toString().padStart(2, '0');

        const searchPatterns = [
            `s${sPad}e${ePad}`,
            `s${sPad} e${ePad}`,
            `s${finalSeason}e${finalEpisode}`,
            `s${finalSeason} e${finalEpisode}`,
            `${finalSeason}x${ePad}`,
            `${finalSeason}x${finalEpisode}`,
            `bolum${finalEpisode}`,
            `bolum ${finalEpisode}`
        ];

        const targetGroups = new Set([
            getLetterGroup(d.name),
            getLetterGroup(d.original_name),
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

                    const parts2 = line.split(',');
                    const diziname = parts2[parts2.length - 1].trim();
                    const authorMatch = line.match(/group-author="([^"]+)"/);
                    const sourceTag = authorMatch ? authorMatch[1].replace(/[\[\]]/g, '').trim() : 'M3U';

                    const nameMatch = titleBoundaryMatch(diziname, [d.name, d.original_name]);
                    if (!nameMatch) continue;

                    const cleanLine = ultraClean(line);
                    let epMatch = false;
                    for (const pat of searchPatterns) {
                        if (cleanLine.includes(ultraClean(pat))) {
                            epMatch = true;
                            break;
                        }
                    }

                    if (epMatch) {
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
        }

        return results;
    } catch (err) {
        return [];
    }
}

// ── Universal Quality Sorter ──────────────────────────────────────────
function sortStreamsByQuality(streams) {
    if (!Array.isArray(streams) || streams.length <= 1) return streams || [];
    function getQualityScore(s) {
        if (!s) return 0;
        var score = 0;
        if (s.quality) {
            var q = String(s.quality).toLowerCase().trim();
            if (/\b(4k|2160p?|uhd)\b/.test(q)) score = 2160;
            else if (/\b(2k|1440p?|qhd)\b/.test(q)) score = 1440;
            else if (/\b(1080p?|fhd|full[\s-]?hd)\b/.test(q)) score = 1080;
            else if (/\b(720p?|hd)\b/.test(q)) score = 720;
            else if (/\b(540p?)\b/.test(q)) score = 540;
            else if (/\b(480p?|sd)\b/.test(q)) score = 480;
            else if (/\b(360p?)\b/.test(q)) score = 360;
            else if (/\b(240p?)\b/.test(q)) score = 240;
        }
        if (!score) {
            var text = [s.title, s.name, s.resolution].filter(Boolean).join(" ").toLowerCase();
            if (/\b(4k|2160p|uhd)\b/.test(text)) score = 2160;
            else if (/\b(2k|1440p|qhd)\b/.test(text)) score = 1440;
            else if (/\b(1080p|fhd|full[\s-]?hd)\b/.test(text)) score = 1080;
            else if (/\b(720p)\b/.test(text)) score = 720;
            else if (/\b(540p)\b/.test(text)) score = 540;
            else if (/\b(480p)\b/.test(text)) score = 480;
            else if (/\b(360p)\b/.test(text)) score = 360;
            else if (/\b(240p)\b/.test(text)) score = 240;
            else if (/\b(hd)\b/.test(text) && !/\b(full[\s-]?hd)\b/.test(text)) score = 720;
            else if (/\b(sd)\b/.test(text)) score = 480;
        }
        if (!score && s.url) {
            var u = String(s.url).toLowerCase();
            if (/[\/_.-](2160p?|4k)[\/_.-]/.test(u)) score = 2160;
            else if (/[\/_.-](1440p?|2k)[\/_.-]/.test(u)) score = 1440;
            else if (/[\/_.-](1080p?|fhd)[\/_.-]/.test(u)) score = 1080;
            else if (/[\/_.-](720p?|hd)[\/_.-]/.test(u)) score = 720;
            else if (/[\/_.-](480p?|sd)[\/_.-]/.test(u)) score = 480;
            else if (/[\/_.-](360p?)[\/_.-]/.test(u)) score = 360;
        }
        var isDirectMp4 = s.format === "mp4" || s.type === "mp4" || (!s.isHls && s.url && (s.url.endsWith(".mp4") || s.url.includes(".mp4?")));
        if (isDirectMp4 && score > 0) score += 1;
        return score;
    }
    return streams.slice().sort(function(a, b) {
        return getQualityScore(b) - getQualityScore(a);
    });
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
    module.exports = {
        getStreams,
        searchFilmStreams,
        searchDiziStreams,
        sortStreamsByQuality
    };
}
if (typeof globalThis !== 'undefined') {
    globalThis.getStreams = getStreams;
}
