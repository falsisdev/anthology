/**
 * Nuvio Sinema Alfabetik Motoru - V11.0.0
 * Özellik: Dinamik klasör yönlendirme ve nokta atışı eşleşme.
 */

// GitHub kullanıcı adın ve klasör yolun
const BASE_DIR = 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/main/nuvio_parcalari/';
const TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';
const VERSION = "11.0.0-FOLDERED";

let cachedM3U = {}; // Klasördeki her harf dosyası için ayrı cache
let lastFetch = {};

function ultraClean(s) {
    if (!s) return '';
    return s.toString().toLowerCase()
        .replace(/[ıİ]/g, 'i').replace(/[üÜ]/g, 'u').replace(/[öÖ]/g, 'o')
        .replace(/[şŞ]/g, 's').replace(/[ğĞ]/g, 'g').replace(/[çÇ]/g, 'c')
        .replace(/[^a-z0-9]/g, '').trim();
}

/**
 * İsmin ilk harfine göre doğru M3U dosyasının URL'sini oluşturur.
 */
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
        // 1. TMDb Detaylarını Al
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR&append_to_response=external_ids`);
        const d = await tmdbRes.json();
        
        const targetImdb = d.external_ids ? d.external_ids.imdb_id : null;
        const targetTr = ultraClean(d.title);
        const targetEn = ultraClean(d.original_title);
        const targetYear = (d.release_date || '').slice(0, 4);

        // 2. Hedef Dosyayı Belirle (Örn: nuvio_d.m3u)
        const selectedURL = getTargetM3U(targetTr);
        console.error(`[V${VERSION}] ARA: ${d.title} | KAYNAK: ${selectedURL.split('/').pop()}`);

        // 3. Cache Kontrolü (5 dakika)
        const now = Date.now();
        if (!cachedM3U[selectedURL] || (now - (lastFetch[selectedURL] || 0) > 300000)) {
            const m3uRes = await fetch(selectedURL);
            if (m3uRes.ok) {
                let rawText = await m3uRes.text();
                cachedM3U[selectedURL] = rawText.replace(/\r/g, '').replace(/^\uFEFF/, '');
                lastFetch[selectedURL] = now;
            } else {
                console.error(`[V${VERSION}] Dosya bulunamadı: ${selectedURL}`);
                return [];
            }
        }

        const lines = cachedM3U[selectedURL].split('\n');
        const results = [];

        // 4. M3U İçinde Arama Yap
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            if (line.startsWith("#EXTINF")) {
                let nextLine = lines[i + 1] ? lines[i + 1].trim() : "";
                if (nextLine.startsWith("http")) {
                    
                    let parts = line.split(',');
                    let rawName = parts[parts.length - 1].trim();
                    let cleanM3U = ultraClean(rawName.split('(')[0].split('-')[0]); // Sadece isim kısmını al
                    
                    // Yıl tespiti
                    let yearMatch = line.match(/year="(\d{4})"/);
                    let m3uYear = yearMatch ? yearMatch[1] : (rawName.match(/\d{4}/) ? rawName.match(/\d{4}/)[0] : "");

                    let isMatch = false;
                    let score = 0;

                    // IMDb ID Eşleşmesi (En Kesin)
                    if (targetImdb && nextLine.includes(targetImdb)) {
                        isMatch = true;
                        score = 120;
                    } 
                    // Tam İsim Eşleşmesi
                    else if (cleanM3U === targetTr || cleanM3U === targetEn) {
                        if (!m3uYear || m3uYear === targetYear) {
                            isMatch = true;
                            score = (m3uYear === targetYear) ? 100 : 90;
                        }
                    }
                    // Kısmi İsim Eşleşmesi (Daha esnek)
                    else if (cleanM3U.includes(targetTr) || (targetEn && cleanM3U.includes(targetEn))) {
                        if (m3uYear === targetYear) {
                            isMatch = true;
                            score = 80;
                        }
                    }

                    if (isMatch) {
                        results.push({
                            url: nextLine,
                            name: rawName,
                            title: `[NUVIO] ${rawName} ${m3uYear ? '('+m3uYear+')' : ''}`,
                            quality: "1080p",
                            score: score
                        });
                    }
                }
            }
        }
        
        // Sonuçları puana göre diz
        return results.sort((a, b) => b.score - a.score);

    } catch (e) {
        console.error(`[V${VERSION}] HATA: ${e.message}`);
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
