/**
 * DiziPal Nuvio/Cloudstream Provider
 * GÜNCEL DOMAIN: dizipal1543.com
 */

var BASE_URL = 'https://dizipal1543.com'; // 1543 Olarak güncellendi
const PASSPHRASE = "3hPn4uCjTVtfYWcjIcoJQ4cL1WWk1qxXI39egLYOmNv6IblA7eKJz68uU3eLzux1biZLCms0quEjTYniGv5z1JcKbNIsDQFSeIZOBZJz4is6pD7UyWDggWWzTLBQbHcQFpBQdClnuQaMNUHtLHTpzCvZy33p6I7wFBvL4fnXBYH84aUIyWGTRvM2G5cfoNf4705tO2kv";

// AES Decrypt Fonksiyonu (Değişmedi)
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
    console.log(`[DiziPal] Hedef Domain: ${BASE_URL}`);
    
    try {
        // 1. TMDB Bilgilerini Al
        const type = mediaType === 'movie' ? 'movie' : 'tv';
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/${type}/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`);
        const tmdbData = await tmdbRes.json();

        // Arama denemeleri: Önce orijinal isim (Young Sherlock), sonra Türkçe isim
        const titles = [
            tmdbData.original_name || tmdbData.original_title,
            tmdbData.name || tmdbData.title
        ].filter(Boolean);

        let searchResult = null;

        // 2. Arama Motoru (POST)
        for (const title of titles) {
            console.log(`[DiziPal] Arama yapılıyor: ${title}`);
            const searchRes = await fetch(`${BASE_URL}/bg/searchcontent`, {
                method: 'POST',
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Referer': `${BASE_URL}/`
                },
                body: `searchterm=${encodeURIComponent(title)}`
            });

            const searchData = await searchRes.json();
            const results = Object.values(searchData);

            if (results.length > 0 && results[0].url) {
                searchResult = results[0];
                break;
            }
        }

        if (!searchResult) {
            console.error('[DiziPal] Arama başarısız oldu.');
            return [];
        }

        // 3. URL Oluşturma (Senin verdiğin yapıya göre düzenlendi)
        let targetUrl = BASE_URL + searchResult.url;

        if (mediaType === 'tv' && seasonNum && episodeNum) {
            // URL içindeki 'series' veya 'dizi' kısmını temizleyip 'bolum' yapısına çevirir
            const slug = searchResult.url.replace('/series/', '').replace('/dizi/', '').replace(/\//g, '');
            targetUrl = `${BASE_URL}/bolum/${slug}-${seasonNum}-sezon-${episodeNum}-bolum-izle/`;
        }

        console.log(`[DiziPal] Gidilen URL: ${targetUrl}`);

        // 4. Sayfadan Iframe Verisini Çek
        const pageRes = await fetch(targetUrl);
        const html = await pageRes.text();
        const encryptedMatch = html.match(/<div[^>]*data-rm-k="true"[^>]*>(.*?)<\/div>/);
        
        if (!encryptedMatch) return [];

        let iframeUrl = decryptDizipalData(encryptedMatch[1]);
        if (!iframeUrl) return [];
        if (iframeUrl.startsWith('//')) iframeUrl = 'https:' + iframeUrl;

        // 5. Video Kaynaklarını Çek
        const playerRes = await fetch(iframeUrl, { headers: { 'Referer': targetUrl } });
        const playerHtml = await playerRes.text();
        const playlistId = playerHtml.match(/window\.openPlayer\s*\(\s*['"]([^'"]+)['"]/)?.[1];

        if (!playlistId) return [];

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
        console.error('[DiziPal] Hata:', err.message);
        return [];
    }
}

// --- NUVIO EXPORT ---
if (typeof module !== 'undefined') module.exports = { getStreams };
globalThis.getStreams = getStreams;
this.getStreams = getStreams;
