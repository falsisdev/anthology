/**
 * DiziPal Full Provider - v1.5.0
 * Güncel Domain: dizipal1542.com
 * Özellikler: Çoklu Arama, AES-256 Decrypt, DPlayer/Source2 Desteği
 */

var BASE_URL = 'https://dizipal1542.com';
const PASSPHRASE = "3hPn4uCjTVtfYWcjIcoJQ4cL1WWk1qxXI39egLYOmNv6IblA7eKJz68uU3eLzux1biZLCms0quEjTYniGv5z1JcKbNIsDQFSeIZOBZJz4is6pD7UyWDggWWzTLBQbHcQFpBQdClnuQaMNUHtLHTpzCvZy33p6I7wFBvL4fnXBYH84aUIyWGTRvM2G5cfoNf4705tO2kv";

/**
 * AES Şifre Çözücü (CryptoJS gerektirir)
 */
function decryptDizipalData(jsonStr) {
    try {
        const data = JSON.parse(jsonStr);
        const salt = CryptoJS.enc.Hex.parse(data.salt);
        const iv = CryptoJS.enc.Hex.parse(data.iv);
        const key = CryptoJS.PBKDF2(PASSPHRASE, salt, { keySize: 256 / 32, iterations: 999, hasher: CryptoJS.algo.SHA512 });
        const decrypted = CryptoJS.AES.decrypt(data.ciphertext, key, { iv: iv, padding: CryptoJS.pad.Pkcs7, mode: CryptoJS.mode.CBC });
        return decrypted.toString(CryptoJS.enc.Utf8).replace(/\\/g, '');
    } catch (e) {
        console.error('[DiziPal] Decrypt Error:', e.message);
        return null;
    }
}

/**
 * ANA FONKSİYON: getStreams
 */
async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    console.log(`[DiziPal] Sorgu: TMDB-${tmdbId} | Domain: ${BASE_URL}`);

    try {
        // 1. TMDB Meta Verisi Al
        const type = mediaType === 'movie' ? 'movie' : 'tv';
        const tmdbUrl = `https://api.themoviedb.org/3/${type}/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`;
        const tmdbRes = await fetch(tmdbUrl);
        const tmdbData = await tmdbRes.json();

        // 2. Arama Varyasyonlarını Hazırla (Loglarındaki 'sonuç bulunamadı' hatasını çözer)
        let titlesToTry = [];
        const trTitle = tmdbData.title || tmdbData.name;
        const orgTitle = tmdbData.original_title || tmdbData.original_name;

        titlesToTry.push(trTitle); // Önce Türkçe isim
        if (orgTitle && orgTitle !== trTitle) titlesToTry.push(orgTitle); // Sonra Orijinal isim
        
        // Uzun isimleri kısalt (Örn: "A Knight of the Seven Kingdoms" -> "A Knight of")
        if (trTitle.includes(' ')) {
            titlesToTry.push(trTitle.split(' ').slice(0, 3).join(' '));
        }

        let searchResult = null;

        // 3. Döngüsel Arama (Sırayla tüm isimleri dene)
        for (let query of titlesToTry) {
            console.log(`[DiziPal] Deneniyor: ${query}`);
            const searchRes = await fetch(`${BASE_URL}/bg/searchcontent`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Referer': `${BASE_URL}/`
                },
                body: `searchterm=${encodeURIComponent(query)}`
            });

            const searchData = await searchRes.json();
            const results = Object.values(searchData);

            if (results.length > 0 && results[0].url) {
                searchResult = results[0];
                console.log(`[DiziPal] Bulundu! -> ${searchResult.title}`);
                break; 
            }
        }

        if (!searchResult) {
            console.error(`[DiziPal] Hiçbir varyasyonla sonuç bulunamadı: ${trTitle}`);
            return [];
        }

        // 4. Hedef Sayfa URL'sini Oluştur
        let targetUrl = BASE_URL + searchResult.url;
        if (mediaType === 'tv' && seasonNum && episodeNum) {
            const slug = searchResult.url.split('/').filter(Boolean).pop();
            targetUrl = `${BASE_URL}/bolum/${slug.replace(/\/$/, '')}-${seasonNum}-sezon-${episodeNum}-bolum-izle/`;
        }

        // 5. Şifreli Sayfa Verisini Çöz
        const pageRes = await fetch(targetUrl);
        const html = await pageRes.text();
        const encryptedMatch = html.match(/<div[^>]*data-rm-k="true"[^>]*>(.*?)<\/div>/);
        
        if (!encryptedMatch) throw new Error("Şifreli div bulunamadı.");
        let iframeUrl = decryptDizipalData(encryptedMatch[1]);
        if (!iframeUrl) throw new Error("Decrypt başarısız.");
        if (iframeUrl.startsWith('//')) iframeUrl = 'https:' + iframeUrl;

        // 6. Video Kaynağını Çek (DPlayer Extractor)
        const playerRes = await fetch(iframeUrl, { headers: { 'Referer': targetUrl } });
        const playerHtml = await playerRes.text();
        const playlistId = playerHtml.match(/window\.openPlayer\s*\(\s*['"]([^'"]+)['"]/)?.[1];

        if (!playlistId) throw new Error("Playlist ID bulunamadı.");

        const playerOrigin = new URL(iframeUrl).origin;
        const apiRes = await fetch(`${playerOrigin}/source2.php?v=${playlistId}`, { headers: { 'Referer': iframeUrl } });
        const apiData = await apiRes.json();

        // 7. Cloudstream/Nuvio Formatında Dön
        return apiData.map(item => ({
            name: `DiziPal | ${item.name || 'Auto'}`,
            url: item.file.replace('m.php', 'master.m3u8'),
            quality: 720,
            type: 'm3u8',
            headers: { 
                'Referer': iframeUrl,
                'Origin': playerOrigin,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        }));

    } catch (err) {
        console.error(`[DiziPal] Kritik Hata: ${err.message}`);
        return [];
    }
}

// --- NUVIO / CLOUDSTREAM EXPORT ---
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} 
if (typeof globalThis !== 'undefined') {
    globalThis.getStreams = getStreams;
}
this.getStreams = getStreams;
