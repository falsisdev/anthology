/**
 * Anthology Dizi M3U Motoru
 * binlerce Türkçe dublaj ve altyazılı dizi bölümü
 */

const DIZI_BASE_URL = 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/main/nuvio_dizi_parcalari/';
const TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

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

async function resolveTmdbShow(rawId) {
    let cleanId = String(rawId).replace(/^tmdb:/, '').split(':')[0].trim();
    const isImdb = cleanId.startsWith('tt');
    try {
        if (isImdb) {
            const res = await fetch(`https://api.themoviedb.org/3/find/${cleanId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`);
            const data = await res.json();
            return data.tv_results && data.tv_results[0] ? data.tv_results[0] : null;
        } else {
            const res = await fetch(`https://api.themoviedb.org/3/tv/${cleanId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
            const data = await res.json();
            return data && data.name ? data : null;
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
        const res = await fetch(url);
        if (!res.ok) return null;
        const text = await res.text();
        cache[url] = text;
        cacheTime[url] = now;
        return text;
    } catch (e) {
        return null;
    }
}

async function getStreams(rawId, type, seasonInput, episodeInput) {
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
                            title: `⌜ Anthology ⌟ | ${sourceTag} [HD]`,
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

if (typeof module !== 'undefined') module.exports = { getStreams };
if (typeof globalThis !== 'undefined') globalThis.getStreams = getStreams;
