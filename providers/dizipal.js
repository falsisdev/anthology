/**
 * DiziPal 1543 - Kotlin Tabanlı & console.error Loglamalı
 */

var BASE_URL = 'https://dizipal1543.com';
const PASSPHRASE = "3hPn4uCjTVtfYWcjIcoJQ4cL1WWk1qxXI39egLYOmNv6IblA7eKJz68uU3eLzux1biZLCms0quEjTYniGv5z1JcKbNIsDQFSeIZOBZJz4is6pD7UyWDggWWzTLBQbHcQFpBQdClnuQaMNUHtLHTpzCvZy33p6I7wFBvL4fnXBYH84aUIyWGTRvM2G5cfoNf4705tO2kv";

// AES Çözücü (Kotlin PBKDF2WithHmacSHA512 karşılığı)
function decryptDizipalData(rawJsonText) {
    try {
        const ct = rawJsonText.match(/"ciphertext"\s*:\s*"([^"]+)"/)?.[1];
        const ivHex = rawJsonText.match(/"iv"\s*:\s*"([^"]+)"/)?.[1];
        const saltHex = rawJsonText.match(/"salt"\s*:\s*"([^"]+)"/)?.[1];

        if (!ct || !ivHex || !saltHex) {
            console.error("[DiziPal-Err] Şifreli bileşenler eksik!");
            return null;
        }

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

        return decrypted.toString(CryptoJS.enc.Utf8).replace(/\\/g, "");
    } catch (e) {
        console.error("[DiziPal-Err] Decrypt işlemi başarısız: " + e.message);
        return null;
    }
}

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    console.error(`[DiziPal] AKIŞ BAŞLADI -> TMDB: ${tmdbId} | Tip: ${mediaType}`);

    try {
        // 1. TMDB Bilgisi Al
        const type = mediaType === 'movie' ? 'movie' : 'tv';
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/${type}/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`);
        const tmdbData = await tmdbRes.json();
        const query = (tmdbData.original_name || tmdbData.original_title || "").replace(/[^a-zA-Z0-9 ]/g, "").trim();

        console.error(`[DiziPal] Arama Terimi: ${query}`);

        // 2. DiziPal Araması
        const searchRes = await fetch(`${BASE_URL}/bg/searchcontent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest' },
            body: `searchterm=${encodeURIComponent(query)}`
        });
        const searchData = await searchRes.json();
        const results = Object.values(searchData);

        if (results.length === 0) {
            console.error("[DiziPal] Arama sonucu bulunamadı!");
            return [];
        }

        // 3. Bölüm/Film URL Belirleme
        let targetUrl = BASE_URL + results[0].url;
        if (mediaType === 'tv') {
            const slug = results[0].url.replace(/\/series\/|\/dizi\/|\//g, "");
            targetUrl = `${BASE_URL}/bolum/${slug}-${seasonNum}x${episodeNum}`;
        }
        console.error(`[DiziPal] Hedef URL: ${targetUrl}`);

        // 4. Sayfa İçeriğini Çek ve Şifreyi Çöz
        const pageRes = await fetch(targetUrl);
        const pageHtml = await pageRes.text();
        const encryptedMatch = pageHtml.match(/<div[^>]*data-rm-k="true"[^>]*>(.*?)<\/div>/);

        if (!encryptedMatch) {
            console.error("[DiziPal] Şifreli DIV bulunamadı!");
            return [];
        }

        let iframeUrl = decryptDizipalData(encryptedMatch[1]);
        if (!iframeUrl) return [];
        if (iframeUrl.startsWith("//")) iframeUrl = "https:" + iframeUrl;
        console.error(`[DiziPal] Iframe Çözüldü: ${iframeUrl}`);

        // 5. Player ve Playlist (DPlayer Logic)
        const playerRes = await fetch(iframeUrl, { headers: { 'Referer': targetUrl } });
        const playerHtml = await playerRes.text();
        const playlistId = playerHtml.match(/window\.openPlayer\s*\(\s*['"]([^'"]+)['"]/)?.[1];

        if (!playlistId) {
            console.error("[DiziPal] Playlist ID bulunamadı!");
            return [];
        }

        const playerOrigin = new URL(iframeUrl).origin;
        const apiRes = await fetch(`${playerOrigin}/source2.php?v=${playlistId}`, { headers: { 'Referer': iframeUrl } });
        const apiText = await apiRes.text();
        
        const fileMatch = apiText.match(/"file"\s*:\s*"([^"]+)"/);
        if (!fileMatch) {
            console.error("[DiziPal] Video dosyası API'den dönmedi!");
            return [];
        }

        let streamUrl = fileMatch[1].replace(/\\/g, "").replace("m.php", "master.m3u8");
        console.error(`[DiziPal] Final Stream: ${streamUrl}`);

        return [{
            name: "DiziPal (DPlayer)",
            url: streamUrl,
            quality: 720,
            type: 'm3u8',
            headers: { 'Referer': iframeUrl, 'Origin': playerOrigin }
        }];

    } catch (err) {
        console.error(`[DiziPal] KRİTİK HATA: ${err.message}`);
        return [];
    }
}

// Zırhlı Exportlar
if (typeof module !== 'undefined') module.exports = { getStreams };
globalThis.getStreams = getStreams;
this.getStreams = getStreams;
