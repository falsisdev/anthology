// Güncel Domain (Sürekli değişebilir, kontrol etmelisin)
var BASE_URL = 'https://dizipal1543.com'; 
const PASSPHRASE = "3hPn4uCjTVtfYWcjIcoJQ4cL1WWk1qxXI39egLYOmNv6IblA7eKJz68uU3eLzux1biZLCms0quEjTYniGv5z1JcKbNIsDQFSeIZOBZJz4is6pD7UyWDggWWzTLBQbHcQFpBQdClnuQaMNUHtLHTpzCvZy33p6I7wFBvL4fnXBYH84aUIyWGTRvM2G5cfoNf4705tO2kv";

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Referer': BASE_URL + '/'
};

// --- YARDIMCI FONKSİYONLAR ---

// Kotlin kodundaki AES Decrypt işleminin JS karşılığı
function decryptDizipalData(jsonStr) {
    try {
        const data = JSON.parse(jsonStr);
        const salt = CryptoJS.enc.Hex.parse(data.salt);
        const iv = CryptoJS.enc.Hex.parse(data.iv);
        const ciphertext = data.ciphertext;

        // PBKDF2 ile Key Türetme (Kotlin'deki 999 iteration ve SHA512 ayarı)
        const key = CryptoJS.PBKDF2(PASSPHRASE, salt, {
            keySize: 256 / 32,
            iterations: 999,
            hasher: CryptoJS.algo.SHA512
        });

        const decrypted = CryptoJS.AES.decrypt(ciphertext, key, {
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

async function searchDiziPal(query, mediaType) {
    // Yeni sistemde arama artık POST üzerinden /bg/searchcontent adresine yapılıyor
    const searchUrl = `${BASE_URL}/bg/searchcontent`;
    console.log('[DiziPal] Searching via POST:', searchUrl);

    try {
        const response = await fetch(searchUrl, {
            method: 'POST',
            headers: { 
                ...HEADERS, 
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Requested-With': 'XMLHttpRequest' 
            },
            body: `searchterm=${encodeURIComponent(query)}`
        });

        const data = await response.json();
        let results = [];

        // API'den dönen objeyi diziye çevir
        Object.values(data).forEach(item => {
            const itemType = item.type === 'series' ? 'tv' : 'movie';
            if (mediaType && itemType !== mediaType) return;

            results.push({
                title: item.title,
                url: BASE_URL + item.url,
                type: itemType,
                poster: item.poster
            });
        });

        return results;
    } catch (e) {
        console.error('[DiziPal] Search Hatası:', e);
        return [];
    }
}

async function getStreams(tmdbId, mediaType, season, episode) {
    try {
        // 1. TMDB'den başlık çekme (Senin kodundaki TMDB kısmı aynı kalabilir)
        // ... (TMDB fetch işlemleri burada varsayılıyor) ...
        const query = "Örnek Dizi Adı"; // TMDB'den gelen isim
        
        const results = await searchDiziPal(query, mediaType);
        if (!results.length) throw new Error("Sonuç bulunamadı.");

        const bestMatch = results[0]; // Basitçe ilk sonucu alıyoruz
        let targetUrl = bestMatch.url;

        // Bölüm URL oluşturma mantığı
        if (mediaType === 'tv' && season && episode) {
            // Slug temizleme (Kotlin kodundaki mantık)
            const slug = targetUrl.split('/series/')[1] || targetUrl.split('/dizi/')[1];
            targetUrl = `${BASE_URL}/bolum/${slug.replace(/\/$/, '')}-${season}-sezon-${episode}-bolum-izle/`;
        }

        console.log('[DiziPal] Loading page:', targetUrl);
        const pageRes = await fetch(targetUrl, { headers: HEADERS });
        const html = await pageRes.text();

        // 2. Şifreli Veriyi Yakalama (Kotlin'deki data-rm-k=true kısmı)
        const encryptedMatch = html.match(/<div[^>]*data-rm-k="true"[^>]*>(.*?)<\/div>/);
        if (!encryptedMatch) {
            console.error('[DiziPal] Şifreli veri (div) bulunamadı! Site yapısı değişmiş olabilir.');
            return [];
        }

        // 3. Veriyi Çözme
        let iframeUrl = decryptDizipalData(encryptedMatch[1]);
        if (!iframeUrl) throw new Error("Şifre çözülemedi.");
        if (iframeUrl.startsWith('//')) iframeUrl = 'https:' + iframeUrl;

        console.log('[DiziPal] Decrypted Iframe URL:', iframeUrl);

        // 4. Extractor Mantığı (DPlayer'dan master.m3u8 çekme)
        const playerRes = await fetch(iframeUrl, { headers: { ...HEADERS, 'Referer': targetUrl } });
        const playerHtml = await playerRes.text();
        
        const playlistIdMatch = playerHtml.match(/window\.openPlayer\s*\(\s*['"]([^'"]+)['"]/);
        if (playlistIdMatch) {
            const playlistId = playlistIdMatch[1];
            const playerDomain = new URL(iframeUrl).origin;
            const apiUrl = `${playerDomain}/source2.php?v=${playlistId}`;
            
            const apiRes = await fetch(apiUrl, { headers: { ...HEADERS, 'Referer': iframeUrl } });
            const apiData = await apiRes.text(); // Bu genelde JSON döner
            
            // master.m3u8 linklerini ayıkla
            const m3u8Match = apiData.match(/"file"\s*:\s*"([^"]+)"/g);
            // ... linkleri döngüye alıp döndür ...
            return m3u8Match; 
        }

    } catch (e) {
        console.error('[DiziPal] Ana İşlem Hatası:', e.message);
        return [];
    }
}
