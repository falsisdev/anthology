/**
 * DiziPal 1543 - Kotlin Kaynak Kodlu Tam Entegrasyon
 * Sürüm: v2.6.0 (Final Debug)
 */

var BASE_URL = 'https://dizipal1543.com';
const PASSPHRASE = "3hPn4uCjTVtfYWcjIcoJQ4cL1WWk1qxXI39egLYOmNv6IblA7eKJz68uU3eLzux1biZLCms0quEjTYniGv5z1JcKbNIsDQFSeIZOBZJz4is6pD7UyWDggWWzTLBQbHcQFpBQdClnuQaMNUHtLHTpzCvZy33p6I7wFBvL4fnXBYH84aUIyWGTRvM2G5cfoNf4705tO2kv";

// 1. KOTLIN'deki PBKDF2WithHmacSHA512 Şifre Çözücü
function decryptDizipalData(rawJsonText) {
    try {
        const ct = rawJsonText.match(/"ciphertext"\s*:\s*"([^"]+)"/)?.[1];
        const ivHex = rawJsonText.match(/"iv"\s*:\s*"([^"]+)"/)?.[1];
        const saltHex = rawJsonText.match(/"salt"\s*:\s*"([^"]+)"/)?.[1];

        if (!ct || !ivHex || !saltHex) return null;

        const salt = CryptoJS.enc.Hex.parse(saltHex);
        const iv = CryptoJS.enc.Hex.parse(ivHex);

        const key = CryptoJS.PBKDF2(PASSPHRASE, salt, {
            keySize: 256 / 32,
            iterations: 999,
            hasher: CryptoJS.algo.SHA512
        });

        const decrypted = CryptoJS.AES.decrypt(ct, key, {
            iv: iv,
            padding: CryptoJS.pad.Pkcs7,
            mode: CryptoJS.mode.CBC
        });

        let finalUrl = decrypted.toString(CryptoJS.enc.Utf8).replace(/\\/g, "");
        if (finalUrl.startsWith("//")) finalUrl = "https:" + finalUrl;
        return finalUrl;
    } catch (e) {
        return null;
    }
}

// 2. ANA AKIŞ (getStreams)
async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    console.log(`[DiziPal] Sorgu: ID ${tmdbId} - ${mediaType}`);
    try {
        // TMDB Verisi Al (Arama terimi için)
        const type = mediaType === 'movie' ? 'movie' : 'tv';
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/${type}/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`);
        const tmdbData = await tmdbRes.json();
        
        const clean = (s) => s ? s.replace(/[^a-zA-Z0-9çğıöşüÇĞİÖŞÜ ]/g, '').trim() : "";
        let searchQueries = [clean(tmdbData.original_name || tmdbData.original_title), clean(tmdbData.name || tmdbData.title)].filter(q => q);

        let searchResult = null;
        for (const query of searchQueries) {
            const searchRes = await fetch(`${BASE_URL}/bg/searchcontent`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest' },
                body: `searchterm=${encodeURIComponent(query)}`
            });
            const searchData = await searchRes.json();
            const results = Object.values(searchData);
            if (results.length > 0 && results[0].url) {
                searchResult = results[0];
                break;
            }
        }

        if (!searchResult) return [];

        // 3. Bölüm/Film Sayfasına Git
        let targetUrl = BASE_URL + searchResult.url;
        if (mediaType === 'tv') {
            const slug = searchResult.url.replace('/series/', '').replace('/dizi/', '').replace(/\//g, '');
            // Hibrit Format: 1x2 veya klasik format
            const f1 = `${BASE_URL}/bolum/${slug}-${seasonNum}x${episodeNum}`;
            const f2 = `${BASE_URL}/bolum/${slug}-${seasonNum}-sezon-${episodeNum}-bolum-izle/`;
            
            const check = await fetch(f1);
            targetUrl = check.status === 200 ? f1 : f2;
        }

        const pageRes = await fetch(targetUrl);
        const pageHtml = await pageRes.text();
        const encryptedMatch = pageHtml.match(/<div[^>]*data-rm-k="true"[^>]*>(.*?)<\/div>/);
        
        if (!encryptedMatch) return [];

        // 4. PLAYER AYIKLAMA (DizipalPlayer logic)
        const iframeUrl = decryptDizipalData(encryptedMatch[1]);
        if (!iframeUrl) return [];

        const playerRes = await fetch(iframeUrl, { headers: { 'Referer': targetUrl } });
        const playerHtml = await playerRes.text();
        
        // Kotlin: window.openPlayer regex'i
        const playlistId = playerHtml.match(/window\.openPlayer\s*\(\s*['"]([^'"]+)['"]/)?.[1];
        if (!playlistId) return [];

        const playerDomain = new URL(iframeUrl).origin;
        const apiRes = await fetch(`${playerDomain}/source2.php?v=${playlistId}`, { headers: { 'Referer': iframeUrl } });
        const apiText = await apiRes.text();

        // Kotlin: "file" regex'i ve m.php -> master.m3u8 dönüşümü
        const fileMatch = apiText.match(/"file"\s*:\s*"([^"]+)"/);
        if (!fileMatch) return [];

        let streamUrl = fileMatch[1].replace(/\\/g, "");
        if (streamUrl.includes("m.php")) {
            streamUrl = streamUrl.replace("m.php", "master.m3u8");
        }

        return [{
            name: "DiziPal (DPlayer)",
            url: streamUrl,
            quality: 720,
            type: 'm3u8',
            headers: { 'Referer': iframeUrl, 'Origin': playerDomain }
        }];

    } catch (err) {
        console.log(`[DiziPal] Error: ${err.message}`);
        return [];
    }
}

// Global Exportlar
if (typeof module !== 'undefined') module.exports = { getStreams };
globalThis.getStreams = getStreams;
this.getStreams = getStreams;
