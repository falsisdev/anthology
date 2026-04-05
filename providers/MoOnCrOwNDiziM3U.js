/**
 * Nuvio Dizi Motoru - V5.2.0
 * STRATEJİ: URL'yi görmezden gel, sadece Grup ve İsim odaklı eşleş.
 */

const DIZI_BASE_URL = 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/main/nuvio_dizi_parcalari/';
const TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

function ultraClean(s) {
    if (!s) return '';
    return s.toString().toLowerCase()
        .replace(/[ıİ]/g, 'i').replace(/[üÜ]/g, 'u').replace(/[öÖ]/g, 'o')
        .replace(/[şŞ]/g, 's').replace(/[ğĞ]/g, 'g').replace(/[çÇ]/g, 'c')
        .replace(/[^a-z0-9]/g, '');
}

async function getStreams(tmdbId, type, season, episode) {
    if (type !== 'tv') return [];

    try {
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
        const d = await tmdbRes.json();
        
        const targetTr = ultraClean(d.name);
        const targetEn = ultraClean(d.original_name);
        const targetSxxExx = `s${season.toString().padStart(2, '0')}e${episode.toString().padStart(2, '0')}`;
        
        const firstChar = targetTr.charAt(0);
        let harfGrubu = (/[a-z]/.test(firstChar)) ? firstChar : (/[0-9]/.test(firstChar) ? '0_9_rakam' : 'diger');
        const fileName = `dizi_${harfGrubu}_s${season}.m3u`;

        const m3uRes = await fetch(`${DIZI_BASE_URL}${fileName}?v=${Date.now()}`);
        if (!m3uRes.ok) return [];

        const content = await m3uRes.text();
        const results = [];
        const blocks = content.split('#EXTINF');

        for (let i = 1; i < blocks.length; i++) {
            const block = blocks[i];
            const lines = block.split('\n');
            const infoLine = lines[0]; // #EXTINF satırı

            // --- 1. ADIM: SADECE VİRGÜL SONRASINA BAK (SEZON/BÖLÜM İÇİN) ---
            const displayPart = infoLine.split(',').pop().toLowerCase();
            if (!displayPart.includes(targetSxxExx)) continue;

            // --- 2. ADIM: SADECE GROUP-TITLE İÇİNE BAK (DİZİ ADI İÇİN) ---
            const groupMatch = infoLine.match(/group-title="([^"]+)"/);
            const groupTitle = groupMatch ? groupMatch[1] : "";
            const cleanGroup = ultraClean(groupTitle);

            if (cleanGroup.includes(targetTr) || (targetEn && cleanGroup.includes(targetEn))) {
                const urlLine = lines.find(l => l.trim().startsWith('http'));

                if (urlLine) {
                    const authorMatch = infoLine.match(/group-author="([^"]+)"/);
                    results.push({
                        url: urlLine.trim(),
                        name: infoLine.split(',').pop().trim(),
                        title: `[NUVIO] ${authorMatch ? authorMatch[1] : "KAYNAK"}`,
                        quality: authorMatch ? authorMatch[1] : "HD"
                    });
                }
            }
        }

        console.error(`!!! [NUVIO] TAMAMLANDI. BULUNAN: ${results.length}`);
        return results;

    } catch (err) {
        console.error(`!!! [NUVIO_CRITICAL] ${err.message}`);
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
if (typeof globalThis !== 'undefined') globalThis.getStreams = getStreams;
