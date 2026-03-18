/**
 * DiziPal 1543 - Undefined Property Fix
 */

var BASE_URL = 'https://dizipal1543.com';
const PASSPHRASE = "3hPn4uCjTVtfYWcjIcoJQ4cL1WWk1qxXI39egLYOmNv6IblA7eKJz68uU3eLzux1biZLCms0quEjTYniGv5z1JcKbNIsDQFSeIZOBZJz4is6pD7UyWDggWWzTLBQbHcQFpBQdClnuQaMNUHtLHTpzCvZy33p6I7wFBvL4fnXBYH84aUIyWGTRvM2G5cfoNf4705tO2kv";

function decryptDizipalData(rawJsonText) {
    try {
        const ct = rawJsonText.match(/"ciphertext"\s*:\s*"([^"]+)"/)?.[1];
        const ivHex = rawJsonText.match(/"iv"\s*:\s*"([^"]+)"/)?.[1];
        const saltHex = rawJsonText.match(/"salt"\s*:\s*"([^"]+)"/)?.[1];
        if (!ct || !ivHex || !saltHex) return null;

        const salt = CryptoJS.enc.Hex.parse(saltHex);
        const iv = CryptoJS.enc.Hex.parse(ivHex);
        const key = CryptoJS.PBKDF2(PASSPHRASE, salt, { keySize: 256 / 32, iterations: 999, hasher: CryptoJS.algo.SHA512 });
        const decrypted = CryptoJS.AES.decrypt(ct, key, { iv: iv, padding: CryptoJS.pad.Pkcs7, mode: CryptoJS.mode.CBC });
        return decrypted.toString(CryptoJS.enc.Utf8).replace(/\\/g, "");
    } catch (e) { return null; }
}

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    console.error(`[DiziPal] AKIŞ: TMDB=${tmdbId} | ${mediaType}`);

    try {
        const type = mediaType === 'movie' ? 'movie' : 'tv';
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/${type}/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`);
        const tmdbData = await tmdbRes.json();
        const query = (tmdbData.original_name || tmdbData.original_title || tmdbData.name || "").replace(/[^a-zA-Z0-9 ]/g, "").trim();

        console.error(`[DiziPal] Arama: ${query}`);

        const searchRes = await fetch(`${BASE_URL}/bg/searchcontent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest' },
            body: `searchterm=${encodeURIComponent(query)}`
        });
        
        const searchData = await searchRes.json();
        const results = Object.values(searchData);

        // HATA FİX: results[0] var mı ve url içeriyor mu?
        if (!results || results.length === 0 || !results[0].url) {
            console.error("[DiziPal] Arama sonucu URL içermiyor!");
            return [];
        }

        let resultUrl = results[0].url;
        let targetUrl = BASE_URL + resultUrl;

        if (mediaType === 'tv') {
            // Güvenli slug alma
            const slug = resultUrl.split('/').filter(p => p && p !== 'series' && p !== 'dizi').pop();
            if (!slug) {
                console.error("[DiziPal] Slug oluşturulamadı!");
                return [];
            }
            targetUrl = `${BASE_URL}/bolum/${slug}-${seasonNum}x${episodeNum}`;
        }
        
        console.error(`[DiziPal] Hedef: ${targetUrl}`);

        const pageRes = await fetch(targetUrl);
        const pageHtml = await pageRes.text();
        const encryptedMatch = pageHtml.match(/<div[^>]*data-rm-k="true"[^>]*>(.*?)<\/div>/);

        if (!encryptedMatch) {
            console.error("[DiziPal] Şifreli DIV (data-rm-k) yok!");
            return [];
        }

        let iframeUrl = decryptDizipalData(encryptedMatch[1]);
        if (!iframeUrl) return [];
        if (iframeUrl.startsWith("//")) iframeUrl = "https:" + iframeUrl;

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
        if (!fileMatch) return [];

        let streamUrl = fileMatch[1].replace(/\\/g, "").replace("m.php", "master.m3u8");

        return [{
            name: "DiziPal (DPlayer)",
            url: streamUrl,
            quality: 720,
            type: 'm3u8',
            headers: { 'Referer': iframeUrl, 'Origin': playerOrigin }
        }];

    } catch (err) {
        console.error(`[DiziPal] KRİTİK HATA: ${err.stack || err.message}`);
        return [];
    }
}

globalThis.getStreams = getStreams;
