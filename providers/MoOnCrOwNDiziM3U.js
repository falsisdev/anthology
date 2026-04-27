/**
 * Nuvio Dizi Motoru - V5.7.0
 * STRATEJİ: Gelen "ID:S:E" formatını parçala ve kesin eşleşme yap.
 */

const DIZI_BASE_URL = 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/main/nuvio_dizi_parcalari/';
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
    // 1. VERİ PARÇALAMA (ID:S:E Formatı Kontrolü)
    // Eğer rawId içinde ":" varsa parçala, yoksa gelen parametreleri kullan
    let finalTmdbId = rawId;
    let finalSeason = seasonInput;
    let finalEpisode = episodeInput;

    if (rawId.includes(':')) {
        const parts = rawId.split(':');
        finalTmdbId = parts[0]; // tt7221388 kısmı
        finalSeason = parts[1]; // 1 (sezon)
        finalEpisode = parts[2]; // 1 (bölüm)
    }

    // 2. TÜR DÜZELTME (series -> tv)
    const finalType = (type === 'series' || type === 'tv') ? 'tv' : 'movie';
    if (finalType !== 'tv') return [];

    try {
        // 3. TMDB'den isim bilgilerini al
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${finalTmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
        const d = await tmdbRes.json();
        
        if (!d.name) return []; // Dizi bulunamadıysa çık

        const targetTr = ultraClean(d.name);           
        const targetEn = ultraClean(d.original_name);  
        const targetSxxExx = `s${finalSeason.toString().padStart(2, '0')}e${finalEpisode.toString().padStart(2, '0')}`;
        
        // 4. M3U Dosya Yolunu Belirle
        const firstChar = targetTr.charAt(0);
        let harfGrubu = (/[a-z]/.test(firstChar)) ? firstChar : (/[0-9]/.test(firstChar) ? '0_9_rakam' : 'diger');
        const fileName = `dizi_${harfGrubu}_s${finalSeason}.m3u`;

        const m3uRes = await fetch(`${DIZI_BASE_URL}${fileName}?v=${Date.now()}`);
        if (!m3uRes.ok) return [];

        const content = await m3uRes.text();
        const results = [];
        const blocks = content.split('#EXTINF');

        for (let i = 1; i < blocks.length; i++) {
            const block = blocks[i];
            const lines = block.split('\n');
            const infoLine = lines[0];

            // SEZON/BÖLÜM KONTROLÜ
            const displayPart = infoLine.split(',').pop().toLowerCase();
            if (!displayPart.includes(targetSxxExx)) continue;

            // GRUP BAŞLIĞI TEMİZLİĞİ VE KESİN EŞLEŞME
            const groupMatch = infoLine.match(/group-title="([^"]+)"/);
            const groupTitle = groupMatch ? groupMatch[1] : "";
            const cleanGroup = ultraClean(groupTitle);

            const checkMatch = (targetName) => {
                if (!targetName) return false;
                if (cleanGroup === targetName) return true;
                // "From" faciasını önlemek için uzunluk farkı kontrolü (Max 4 karakter fark)
                if (cleanGroup.includes(targetName)) {
                    return Math.abs(cleanGroup.length - targetName.length) <= 4;
                }
                return false;
            };

            if (checkMatch(targetTr) || checkMatch(targetEn)) {
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

        return results;

    } catch (err) {
        console.error(`[NUVIO_ERROR] ${err.message}`);
        return [];
    }
}

// DIŞA AKTARMA
if (typeof module !== 'undefined') module.exports = { getStreams };
if (typeof globalThis !== 'undefined') globalThis.getStreams = getStreams;
