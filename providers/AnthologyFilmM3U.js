/**
 * Anthology Film M3U Motoru
 */

const FILM_M3U_URL = 'https://raw.githubusercontent.com/falsisdev/anthology/main/providers/M3U/Liste/film.m3u';
const TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

function ultraClean(s) {
    if (!s) return '';
    return s.toString().toLowerCase()
        .replace(/[ıİ]/g, 'i').replace(/[üÜ]/g, 'u').replace(/[öÖ]/g, 'o')
        .replace(/[şŞ]/g, 's').replace(/[ğĞ]/g, 'g').replace(/[çÇ]/g, 'c')
        .replace(/[^a-z0-9]/g, '').trim();
}

async function getStreams(tmdbId, mediaType) {
    if (mediaType === 'tv' || mediaType === 'series') return [];

    try {
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR&append_to_response=external_ids`);
        const d = await tmdbRes.json();
        const targetTr = ultraClean(d.title);
        const targetEn = ultraClean(d.original_title);
        const targetYear = (d.release_date || '').slice(0, 4);

        const m3uRes = await fetch(`${FILM_M3U_URL}?v=${Date.now()}`);
        if (!m3uRes.ok) return [];

        const content = await m3uRes.text();
        const lines = content.split('\n');
        const results = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('#EXTINF')) {
                const normLine = ultraClean(line);
                const isMatch = normLine.includes(targetTr) || (targetEn && normLine.includes(targetEn));

                if (isMatch) {
                    for (let j = 1; j <= 3; j++) {
                        if (lines[i + j] && lines[i + j].trim().startsWith('http')) {
                            results.push({
                                url: lines[i + j].trim(),
                                name: `${d.title || d.original_title} (${targetYear})`,
                                title: `⌜ Anthology ⌟ | M3U Film [HD]`,
                                quality: "HD"
                            });
                            break;
                        }
                    }
                }
            }
        }
        return results;
    } catch (e) {
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
if (typeof globalThis !== 'undefined') globalThis.getStreams = getStreams;
