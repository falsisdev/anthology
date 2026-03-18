// --- AYARLAR ---
var BASE_URL = 'https://dizipal1543.com';
const PASSPHRASE = "3hPn4uCjTVtfYWcjIcoJQ4cL1WWk1qxXI39egLYOmNv6IblA7eKJz68uU3eLzux1biZLCms0quEjTYniGv5z1JcKbNIsDQFSeIZOBZJz4is6pD7UyWDggWWzTLBQbHcQFpBQdClnuQaMNUHtLHTpzCvZy33p6I7wFBvL4fnXBYH84aUIyWGTRvM2G5cfoNf4705tO2kv";

// --- AES DECRYPT ---
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

// --- ANA FONKSİYON ---
async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    try {
        const type = mediaType === 'movie' ? 'movie' : 'tv';
        const tmdbUrl = `https://api.themoviedb.org/3/${type}/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`;
        const tmdbRes = await fetch(tmdbUrl);
        const tmdbData = await tmdbRes.json();
        const title = tmdbData.title || tmdbData.name;

        // Arama (POST)
        const searchRes = await fetch(`${BASE_URL}/bg/searchcontent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest' },
            body: `searchterm=${encodeURIComponent(title)}`
        });
        const searchData = await searchRes.json();
        const results = Object.values(searchData);

        // HATA KONTROLÜ: Eğer sonuç yoksa veya URL undefined ise dur
        if (!results || results.length === 0 || !results[0].url) {
            console.error('[DiziPal] Arama sonucu bulunamadı veya URL hatalı.');
            return [];
        }

        let targetUrl = BASE_URL + results[0].url;

        // TV Series ise Bölüm URL Oluştur (Hata alınan Split kısmı burasıydı)
        if (mediaType === 'tv' && seasonNum && episodeNum) {
            // URL içindeki slug'ı daha güvenli alıyoruz
            const rawUrl = results[0].url || "";
            const slug = rawUrl.split('/').filter(Boolean).pop(); // undefined hatasını engeller
            
            if (!slug) return [];
            targetUrl = `${BASE_URL}/bolum/${slug}-${seasonNum}-sezon-${episodeNum}-bolum-izle/`;
        }

        const pageRes = await fetch(targetUrl);
        const html = await pageRes.text();
        const encryptedMatch = html.match(/<div[^>]*data-rm-k="true"[^>]*>(.*?)<\/div>/);
        if (!encryptedMatch) return [];

        let iframeUrl = decryptDizipalData(encryptedMatch[1]);
        if (!iframeUrl) return [];
        if (iframeUrl.startsWith('//')) iframeUrl = 'https:' + iframeUrl;

        const playerRes = await fetch(iframeUrl, { headers: { 'Referer': targetUrl } });
        const playerHtml = await playerRes.text();
        const playlistId = playerHtml.match(/window\.openPlayer\s*\(\s*['"]([^'"]+)['"]/)?.[1];
        if (!playlistId) return [];

        const playerOrigin = new URL(iframeUrl).origin;
        const apiRes = await fetch(`${playerOrigin}/source2.php?v=${playlistId}`, { headers: { 'Referer': iframeUrl } });
        const apiData = await apiRes.json();

        return apiData.map(item => ({
            name: `DiziPal | ${item.name || 'Auto'}`,
            url: item.file.replace('m.php', 'master.m3u8'),
            quality: 720,
            type: 'm3u8',
            headers: { 'Referer': iframeUrl, 'Origin': playerOrigin }
        }));

    } catch (err) {
        console.error('[DiziPal] Kritik Hata:', err.message);
        return [];
    }
}

// --- NUVIO EXPORT ---
if (typeof module !== 'undefined' && module.exports) { module.exports = { getStreams }; } 
if (typeof globalThis !== 'undefined') { globalThis.getStreams = getStreams; }
this.getStreams = getStreams;
