/**
 * DiziPal Fire Stick / Nuvio Provider - v1.8.0
 * Desteklenen Formatlar: /series/, /movies/, /bolum/ (1-sezon-1-bolum VE 1x1)
 */

var BASE_URL = 'https://dizipal1543.com';
const PASSPHRASE = "3hPn4uCjTVtfYWcjIcoJQ4cL1WWk1qxXI39egLYOmNv6IblA7eKJz68uU3eLzux1biZLCms0quEjTYniGv5z1JcKbNIsDQFSeIZOBZJz4is6pD7UyWDggWWzTLBQbHcQFpBQdClnuQaMNUHtLHTpzCvZy33p6I7wFBvL4fnXBYH84aUIyWGTRvM2G5cfoNf4705tO2kv";

function decryptDizipalData(jsonStr) {
    try {
        const data = JSON.parse(jsonStr);
        const salt = CryptoJS.enc.Hex.parse(data.salt);
        const iv = CryptoJS.enc.Hex.parse(data.iv);
        const key = CryptoJS.PBKDF2(PASSPHRASE, salt, { keySize: 256 / 32, iterations: 999, hasher: CryptoJS.algo.SHA512 });
        const decrypted = CryptoJS.AES.decrypt(data.ciphertext, key, { iv: iv, padding: CryptoJS.pad.Pkcs7, mode: CryptoJS.mode.CBC });
        return decrypted.toString(CryptoJS.enc.Utf8).replace(/\\/g, '');
    } catch (e) { return null; }
}

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    try {
        const type = mediaType === 'movie' ? 'movie' : 'tv';
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/${type}/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`);
        const tmdbData = await tmdbRes.json();

        const clean = (s) => s.replace(/[^a-zA-Z0-9çğıöşüÇĞİÖŞÜ ]/g, '').trim();
        let searchQueries = [clean(tmdbData.original_name || tmdbData.original_title), clean(tmdbData.name || tmdbData.title)].filter(Boolean);

        let searchResult = null;
        for (const query of searchQueries) {
            const searchRes = await fetch(`${BASE_URL}/bg/searchcontent`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest', 'Referer': `${BASE_URL}/` },
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

        let finalPageHtml = "";
        let finalTargetUrl = "";

        if (mediaType === 'tv') {
            const slug = searchResult.url.replace('/series/', '').replace('/dizi/', '').replace(/\//g, '');
            
            // DENENECEK FORMATLAR
            const formats = [
                `${BASE_URL}/bolum/${slug}-${seasonNum}x${episodeNum}`, // Örn: one-piece-1x2
                `${BASE_URL}/bolum/${slug}-${seasonNum}-sezon-${episodeNum}-bolum-izle/` // Klasik format
            ];

            for (const url of formats) {
                console.log(`[DiziPal] Format Deneniyor: ${url}`);
                const res = await fetch(url);
                if (res.status === 200) {
                    finalPageHtml = await res.text();
                    finalTargetUrl = url;
                    break;
                }
            }
        } else {
            finalTargetUrl = BASE_URL + searchResult.url;
            const res = await fetch(finalTargetUrl);
            finalPageHtml = await res.text();
        }

        if (!finalPageHtml) throw new Error("Sayfa içeriği alınamadı (404).");

        // IFRAME VE DECRYPT
        const encryptedMatch = finalPageHtml.match(/<div[^>]*data-rm-k="true"[^>]*>(.*?)<\/div>/);
        if (!encryptedMatch) throw new Error("Şifreli veri bulunamadı.");

        let iframeUrl = decryptDizipalData(encryptedMatch[1]);
        if (!iframeUrl) throw new Error("Decrypt başarısız.");
        if (iframeUrl.startsWith('//')) iframeUrl = 'https:' + iframeUrl;

        // PLAYER VE SOURCE2
        const playerRes = await fetch(iframeUrl, { headers: { 'Referer': finalTargetUrl } });
        const playerHtml = await playerRes.text();
                const playlistId = playerHtml.match(/window\.openPlayer\s*\(\s*['"]([^'"]+)['"]/)?.[1];
        if (!playlistId) throw new Error("Playlist ID yok.");

        const playerOrigin = new URL(iframeUrl).origin;
        const apiRes = await fetch(`${playerOrigin}/source2.php?v=${playlistId}`, { headers: { 'Referer': iframeUrl } });
        const apiData = await apiRes.json();

        return apiData.map(item => ({
            name: `DiziPal | ${item.name || 'HLS'}`,
            url: item.file.replace('m.php', 'master.m3u8'),
            quality: 720,
            type: 'm3u8',
            headers: { 'Referer': iframeUrl, 'Origin': playerOrigin }
        }));

    } catch (err) {
        console.error(`[DiziPal] Hata: ${err.message}`);
        return [];
    }
}

// EXPORT
globalThis.getStreams = getStreams;
if (typeof module !== 'undefined') module.exports = { getStreams };
