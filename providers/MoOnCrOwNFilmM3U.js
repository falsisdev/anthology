/**
 * Nuvio Sinema Alfabetik Motoru - V11.4.0
 * Özellik: Kaynak bilgisi "Quality" etiketine taşındı.
 */

const BASE_DIR = 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/main/nuvio_parcalari/';
const TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';
const VERSION = "11.4.0-TAG_AS_QUALITY";

let cachedM3U = {}; 
let lastFetch = {};

function ultraClean(s) {
    if (!s) return '';
    return s.toString().toLowerCase()
        .replace(/[ıİ]/g, 'i').replace(/[üÜ]/g, 'u').replace(/[öÖ]/g, 'o')
        .replace(/[şŞ]/g, 's').replace(/[ğĞ]/g, 'g').replace(/[çÇ]/g, 'c')
        .replace(/[^a-z0-9]/g, '').trim();
}

function getTargetM3U(cleanTitle) {
    if (!cleanTitle) return BASE_DIR + 'nuvio_diger.m3u';
    const firstChar = cleanTitle.charAt(0);
    if (/[0-9]/.test(firstChar)) return BASE_DIR + 'nuvio_0_9_rakam.m3u';
    if (/[a-z]/.test(firstChar)) return BASE_DIR + `nuvio_${firstChar}.m3u`;
    return BASE_DIR + 'nuvio_diger.m3u';
}

async function getStreams(tmdbId, mediaType) {
    if (mediaType === 'tv') return [];

    try {
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR&append_to_response=external_ids`);
        const d = await tmdbRes.json();
        const targetImdb = d.external_ids ? d.external_ids.imdb_id : null;
        const targetTr = ultraClean(d.title);
        const targetEn = ultraClean(d.original_title);
        const targetYear = (d.release_date || '').slice(0, 4);

        const selectedURL = getTargetM3U(targetTr);

        const now = Date.now();
        if (!cachedM3U[selectedURL] || (now - (lastFetch[selectedURL] || 0) > 300000)) {
            const m3uRes = await fetch(selectedURL);
            if (m3uRes.ok) {
                let rawText = await m3uRes.text();
                cachedM3U[selectedURL] = rawText.replace(/\r/g, '').replace(/^\uFEFF/, '');
                lastFetch[selectedURL] = now;
            } else {
                return [];
            }
        }

        const lines = cachedM3U[selectedURL].split('\n');
        const results = [];

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            if (line.startsWith("#EXTINF")) {
                let nextLine = lines[i + 1] ? lines[i + 1].trim() : "";
                if (nextLine.startsWith("http")) {
                    
                    // 1. Kaynak Etiketini Ayıkla (Group-Author)
                    let fullAuthorMatch = line.match(/group-author="([^"]+)"/);
                    let sourceTag = fullAuthorMatch ? fullAuthorMatch[1] : "M3U";

                    let parts = line.split(',');
                    let rawName = parts[parts.length - 1].trim();
                    let cleanM3U = ultraClean(rawName.split('(')[0].split('-')[0]); 
                    
                    let yearMatch = line.match(/year="(\d{4})"/);
                    let m3uYear = yearMatch ? yearMatch[1] : (rawName.match(/\d{4}/) ? rawName.match(/\d{4}/)[0] : "");

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
                    } else if (cleanM3U.includes(targetTr) || (targetEn && cleanM3U.includes(targetEn))) {
                        if (m3uYear === targetYear) {
                            isMatch = true;
                            score = 80;
                        }
                    }

                    if (isMatch) {
                        results.push({
                            url: nextLine,
                            name: rawName,
                            // BAŞLIK: Sade tutuldu (Dangal (2016))
                            title: `[NUVIO] ${rawName} ${m3uYear ? '('+m3uYear+')' : ''}`,
                            // KALİTE ETİKETİ: Kaynak buraya yazıldı (✨YENİ [Lunedor])
                            quality: sourceTag, 
                            score: score
                        });
                    }
                }
            }
        }
        return results.sort((a, b) => b.score - a.score);
    } catch (e) {
        console.error(`[V${VERSION}] HATA: ${e.message}`);
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
