/**
 * Anthology Dizi M3U Motoru
 */

const DIZI_M3U_URL = 'https://raw.githubusercontent.com/falsisdev/anthology/main/providers/M3U/Liste/dizi.m3u';
const TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

function ultraClean(s) {
    if (!s) return '';
    return s.toString().toLowerCase()
        .replace(/[ıİ]/g, 'i').replace(/[üÜ]/g, 'u').replace(/[öÖ]/g, 'o')
        .replace(/[şŞ]/g, 's').replace(/[ğĞ]/g, 'g').replace(/[çÇ]/g, 'c')
        .replace(/[^a-z0-9]/g, '') 
        .trim();
}

async function getStreams(rawId, type, seasonInput, episodeInput) {
    let finalTmdbId = rawId;
    let finalSeason = seasonInput || 1;
    let finalEpisode = episodeInput || 1;

    if (typeof rawId === 'string' && rawId.includes(':')) {
        const parts = rawId.split(':');
        finalTmdbId = parts[0];
        finalSeason = parts[1];
        finalEpisode = parts[2];
    }

    const finalType = (type === 'series' || type === 'tv') ? 'tv' : 'movie';
    if (finalType !== 'tv') return [];

    try {
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${finalTmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
        const d = await tmdbRes.json();
        
        if (!d.name) return [];

        const targetTr = ultraClean(d.name);           
        const targetEn = ultraClean(d.original_name);  
        const sPad = finalSeason.toString().padStart(2, '0');
        const ePad = finalEpisode.toString().padStart(2, '0');
        const targetSxxExx = `s${sPad}e${ePad}`;
        
        const m3uRes = await fetch(`${DIZI_M3U_URL}?v=${Date.now()}`);
        if (!m3uRes.ok) return [];

        const content = await m3uRes.text();
        const results = [];
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('#EXTINF')) {
                const normLine = ultraClean(line);
                const epMatch = normLine.includes(targetSxxExx) || normLine.includes(`${finalSeason}x${ePad}`) || (normLine.includes(`${finalSeason}s`) && normLine.includes(`bolum${finalEpisode}`));
                const nameMatch = normLine.includes(targetTr) || (targetEn && normLine.includes(targetEn));

                if (nameMatch && epMatch) {
                    for (let j = 1; j <= 3; j++) {
                        if (lines[i + j] && lines[i + j].trim().startsWith('http')) {
                            results.push({
                                url: lines[i + j].trim(),
                                name: `${d.name} S${sPad}E${ePad}`,
                                title: `⌜ Anthology ⌟ | M3U Dizi [HD]`,
                                quality: "HD"
                            });
                            break;
                        }
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
