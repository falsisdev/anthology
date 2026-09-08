/**
 * Anthology M3U Engine Core
 * Paylaşılan yüksek hızlı M3U indeksleme, TMDB çözümleme ve filtreleme motoru.
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

async function searchFilmStreams(tmdbId, options = {}) {
    const {
        sourceName = 'Anthology Film',
        genreFilter = null,
        minScore = 70
    } = options;

    try {
        const d = await resolveTmdbMovie(tmdbId);
        if (!d) return [];

        const targetImdb = d.imdb_id || (d.external_ids ? d.external_ids.imdb_id : null);
        const targetTr = ultraClean(d.title);
        const targetEn = ultraClean(d.original_title);
        const targetYear = (d.release_date || '').slice(0, 4);

        // Check if movie genres match genreFilter if provided
        const movieGenres = (d.genres || []).map(g => ultraClean(g.name));
        let genreMatch = true;
        if (genreFilter && genreFilter.length > 0) {
            const filterNorm = genreFilter.map(ultraClean);
            const tmdbHasGenre = movieGenres.some(mg => filterNorm.some(f => mg.includes(f) || f.includes(mg)));
            // We'll allow either TMDB genre match or line group match
            genreMatch = tmdbHasGenre;
        }

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
                    if (seenUrls.has(nextLine)) continue;

                    let authorMatch = line.match(/group-author="([^"]+)"/);
                    let sourceTag = authorMatch ? authorMatch[1].replace(/[\[\]]/g, '').trim() : 'M3U';

                    let groupMatch = line.match(/group-title="([^"]+)"/);
                    let groupTitle = groupMatch ? ultraClean(groupMatch[1]) : '';

                    let lineGenreOk = genreMatch;
                    if (genreFilter && genreFilter.length > 0) {
                        const filterNorm = genreFilter.map(ultraClean);
                        const lineMatches = filterNorm.some(f => groupTitle.includes(f) || f.includes(groupTitle));
                        if (lineMatches) lineGenreOk = true;
                    }

                    if (!lineGenreOk && genreFilter) continue;

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
                    } else if (cleanM3U.length > 3 && (cleanM3U.includes(targetTr) || (targetEn && cleanM3U.includes(targetEn)))) {
                        if (!m3uYear || m3uYear === targetYear) {
                            isMatch = true;
                            score = 80;
                        }
                    }

                    if (isMatch && score >= minScore) {
                        seenUrls.add(nextLine);
                        results.push({
                            name: `${d.title || d.original_title} (${m3uYear || targetYear})`,
                            title: `⌜ ${sourceName} ⌟ | ${sourceTag} [HD]`,
                            url: nextLine,
                            quality: sourceTag || 'HD',
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

async function searchDiziStreams(rawId, type, seasonInput, episodeInput, options = {}) {
    const {
        sourceName = 'Anthology Dizi',
        originFilter = null // 'tr' for Turkish, 'foreign' for non-Turkish
    } = options;

    let finalSeason = parseInt(seasonInput) || 1;
    let finalEpisode = parseInt(episodeInput) || 1;

    if (typeof rawId === 'string' && rawId.includes(':')) {
        const parts = rawId.split(':');
        if (parts.length >= 3) {
            finalSeason = parseInt(parts[1]) || finalSeason;
            finalEpisode = parseInt(parts[2]) || finalEpisode;
        }
    }

    const finalType = (type === 'series' || type === 'tv') ? 'tv' : 'movie';
    if (finalType !== 'tv') return [];

    try {
        const d = await resolveTmdbShow(rawId);
        if (!d) return [];

        const originCountry = (d.origin_country && d.origin_country[0]) || '';
        const isTurkish = originCountry === 'TR';

        if (originFilter === 'tr' && !isTurkish) return [];
        if (originFilter === 'foreign' && isTurkish) return [];

        const targetTr = ultraClean(d.name);
        const targetEn = ultraClean(d.original_name);
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
                    if (seenUrls.has(nextLine)) continue;

                    const cleanLine = ultraClean(line);
                    const authorMatch = line.match(/group-author="([^"]+)"/);
                    const sourceTag = authorMatch ? authorMatch[1].replace(/[\[\]]/g, '').trim() : 'M3U';

                    const nameMatch = cleanLine.includes(targetTr) || (targetEn && cleanLine.includes(targetEn));
                    if (!nameMatch) continue;

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
                            title: `⌜ ${sourceName} ⌟ | ${sourceTag} [HD]`,
                            url: nextLine,
                            quality: sourceTag || 'HD'
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

module.exports = {
    ultraClean,
    getLetterGroup,
    resolveTmdbMovie,
    resolveTmdbShow,
    fetchM3U,
    searchFilmStreams,
    searchDiziStreams
};
