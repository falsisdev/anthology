// --- AYARLAR VE ANAHTARLAR ---
var BASE_URL = 'https://dizipal1543.com';
const PASSPHRASE = "3hPn4uCjTVtfYWcjIcoJQ4cL1WWk1qxXI39egLYOmNv6IblA7eKJz68uU3eLzux1biZLCms0quEjTYniGv5z1JcKbNIsDQFSeIZOBZJz4is6pD7UyWDggWWzTLBQbHcQFpBQdClnuQaMNUHtLHTpzCvZy33p6I7wFBvL4fnXBYH84aUIyWGTRvM2G5cfoNf4705tO2kv";

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Referer': BASE_URL + '/'
};

// --- ŞİFRE ÇÖZÜCÜ (AES DECRYPT) ---
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
        console.error('[DiziPal] Decrypt Hatası:', e.message);
        return null;
    }
}

// --- ANA FONKSİYON ---
async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    console.log(`[DiziPal] Başlatılıyor: TMDB:${tmdbId} Type:${mediaType}`);
    
    try {
        // 1. TMDB Bilgisi Çekme
        const tmdbUrl = `https://api.themoviedb.org/3/${mediaType === 'movie' ? 'movie' : 'tv'}/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`;
        const tmdbRes = await fetch(tmdbUrl);
        const tmdbData = await tmdbRes.json();
        const title = tmdbData.title || tmdbData.name;

        // 2. Arama (POST Yöntemi)
        console.log('[DiziPal] Aranan Başlık:', title);
        const searchRes = await fetch(`${BASE_URL}/bg/searchcontent`, {
            method: 'POST',
            headers: { ...HEADERS, 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest' },
            body: `searchterm=${encodeURIComponent(title)}`
        });
        const searchData = await searchRes.json();
        const results = Object.values(searchData);

        if (!results.length) {
            console.error('[DiziPal] Arama sonucu bulunamadı.');
            return [];
        }

        // 3. İçerik Sayfasına Git
        let targetUrl = BASE_URL + results[0].url;
        if (mediaType === 'tv' && seasonNum && episodeNum) {
            const slug = results[0].url.split('/').pop();
            targetUrl = `${BASE_URL}/bolum/${slug}-${seasonNum}-sezon-${episodeNum}-bolum-izle/`;
        }

        console.log('[DiziPal] Hedef URL:', targetUrl);
        const pageRes = await fetch(targetUrl, { headers: HEADERS });
        const html = await pageRes.text();

        // 4. Şifreli Veriyi Yakala ve Çöz
        const encryptedMatch = html.match(/<div[^>]*data-rm-k="true"[^>]*>(.*?)<\/div>/);
        if (!encryptedMatch) throw new Error("Şifreli div bulunamadı.");

        let iframeUrl = decryptDizipalData(encryptedMatch[1]);
        if (!iframeUrl) throw new Error("Şifre çözülemedi.");
        if (iframeUrl.startsWith('//')) iframeUrl = 'https:' + iframeUrl;

        // 5. Video Kaynağını Çek (DPlayer Extractor)
        const playerRes = await fetch(iframeUrl, { headers: { ...HEADERS, 'Referer': targetUrl } });
        const playerHtml = await playerRes.text();
        const playlistId = playerHtml.match(/window\.openPlayer\s*\(\s*['"]([^'"]+)['"]/)?.[1];

        if (!playlistId) throw new Error("Playlist ID bulunamadı.");

        const apiUrl = `${new URL(iframeUrl).origin}/source2.php?v=${playlistId}`;
        const apiRes = await fetch(apiUrl, { headers: { ...HEADERS, 'Referer': iframeUrl } });
        const apiData = await apiRes.json();

        // Sonuçları Cloudstream formatına çevir
        return apiData.map(item => ({
            name: `DiziPal | ${item.name || 'Auto'}`,
            url: item.file.replace('m.php', 'master.m3u8'),
            quality: 720,
            type: 'm3u8',
            headers: { 'Referer': iframeUrl }
        }));

    } catch (e) {
        console.error('[DiziPal] Kritik Hata:', e.message);
        return [];
    }
}

// --- HATAYI ÇÖZEN KRİTİK KISIM (EXPORT) ---
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} 

if (typeof globalThis !== 'undefined') {
    globalThis.getStreams = getStreams;
}

// Bazı sistemler için doğrudan pencereye de ekleyelim
if (typeof window !== 'undefined') {
    window.getStreams = getStreams;
}
