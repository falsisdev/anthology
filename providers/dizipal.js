/**
 * DiziPal Nuvio/Cloudstream JS Plugin
 * Güncel Domain: dizipal1542.com
 */

var BASE_URL = 'https://dizipal1542.com';
const PASSPHRASE = "3hPn4uCjTVtfYWcjIcoJQ4cL1WWk1qxXI39egLYOmNv6IblA7eKJz68uU3eLzux1biZLCms0quEjTYniGv5z1JcKbNIsDQFSeIZOBZJz4is6pD7UyWDggWWzTLBQbHcQFpBQdClnuQaMNUHtLHTpzCvZy33p6I7wFBvL4fnXBYH84aUIyWGTRvM2G5cfoNf4705tO2kv";

/**
 * AES-256 PBKDF2 Şifre Çözücü
 */
function decryptDizipalData(jsonStr) {
    try {
        const data = JSON.parse(jsonStr);
        const salt = CryptoJS.enc.Hex.parse(data.salt);
        const iv = CryptoJS.enc.Hex.parse(data.iv);
        
        const key = CryptoJS.PBKDF2(PASSPHRASE, salt, {
            keySize: 256 / 32,
            iterations: 999,
            hasher: CryptoJS.algo.SHA512
        });

        const decrypted = CryptoJS.AES.decrypt(data.ciphertext, key, {
            iv: iv,
            padding: CryptoJS.pad.Pkcs7,
            mode: CryptoJS.mode.CBC
        });

        return decrypted.toString(CryptoJS.enc.Utf8).replace(/\\/g, '');
    } catch (e) {
        console.error('[DiziPal] Decrypt İşlemi Başarısız:', e.message);
        return null;
    }
}

/**
 * ANA FONKSİYON: getStreams
 */
async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    console.log(`[DiziPal] Sorgu Başlatıldı: TMDB-${tmdbId} | Domain: ${BASE_URL}`);
    
    try {
        // 1. TMDB Meta Bilgisi Çekme (Türkçe İsim Öncelikli)
        const type = mediaType === 'movie' ? 'movie' : 'tv';
        const tmdbUrl = `https://api.themoviedb.org/3/${type}/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`;
        const tmdbRes = await fetch(tmdbUrl);
        const tmdbData = await tmdbRes.json();
        
        // Arama terimini sadeleştir (Noktalı işaretlerden sonrasını atar)
        let title = tmdbData.title || tmdbData.name || tmdbData.original_name;
        title = title.split(':')[0].split('-')[0].trim(); 

        console.log(`[DiziPal] Aranan Başlık: ${title}`);

        // 2. Yeni Arama API (POST İsteği)
        const searchRes = await fetch(`${BASE_URL}/bg/searchcontent`, {
            method: 'POST',
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': `${BASE_URL}/`
            },
            body: `searchterm=${encodeURIComponent(title)}`
        });

        const searchData = await searchRes.json();
        const results = Object.values(searchData);

        if (!results || results.length === 0 || !results[0].url) {
            console.error(`[DiziPal] '${title}' için sonuç bulunamadı.`);
            return [];
        }

        // 3. İçerik Sayfası URL Yapılandırması
        const match = results[0];
        let targetUrl = BASE_URL + match.url;

        if (mediaType === 'tv' && seasonNum && episodeNum) {
            const slug = match.url.split('/').filter(Boolean).pop();
            targetUrl = `${BASE_URL}/bolum/${slug.replace(/\/$/, '')}-${seasonNum}-sezon-${episodeNum}-bolum-izle/`;
        }

        console.log(`[DiziPal] Hedef Sayfa: ${targetUrl}`);

        // 4. Sayfa İçeriğini Al ve Şifreli Iframe'i Çöz
        const pageRes = await fetch(targetUrl);
        const html = await pageRes.text();
        const encryptedMatch = html.match(/<div[^>]*data-rm-k="true"[^>]*>(.*?)<\/div>/);
        
        if (!encryptedMatch) {
            console.error('[DiziPal] Şifreli veri divi (data-rm-k) bulunamadı.');
            return [];
        }

        let iframeUrl = decryptDizipalData(encryptedMatch[1]);
        if (!iframeUrl) return [];
        if (iframeUrl.startsWith('//')) iframeUrl = 'https:' + iframeUrl;

        console.log(`[DiziPal] Çözülen Iframe: ${iframeUrl}`);

        // 5. DPlayer Extractor (Source2.php)
        const playerRes = await fetch(iframeUrl, { headers: { 'Referer': targetUrl } });
        const playerHtml = await playerRes.text();
        const playlistId = playerHtml.match(/window\.openPlayer\s*\(\s*['"]([^'"]+)['"]/)?.[1];

        if (!playlistId) {
            console.error('[DiziPal] Playlist ID (openPlayer) bulunamadı.');
            return [];
        }

        const playerOrigin = new URL(iframeUrl).origin;
        const apiUrl = `${playerOrigin}/source2.php?v=${playlistId}`;
        const apiRes = await fetch(apiUrl, { headers: { 'Referer': iframeUrl } });
        const apiData = await apiRes.json();

        // 6. Linkleri Cloudstream/Nuvio Formatında Dön
        return apiData.map(item => ({
            name: `DiziPal | ${item.name || 'HLS'}`,
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
        console.error('[DiziPal] Kritik Hata:', err.message);
        return [];
    }
}

// --- DIŞA AKTARMA (EXPORT) ---
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} 

if (typeof globalThis !== 'undefined') {
    globalThis.getStreams = getStreams;
}

this.getStreams = getStreams;
