/**
 * DiziPal Fire Stick Provider - v1.9.0 (Debug Enabled)
 */

var BASE_URL = 'https://dizipal1543.com';
const PASSPHRASE = "3hPn4uCjTVtfYWcjIcoJQ4cL1WWk1qxXI39egLYOmNv6IblA7eKJz68uU3eLzux1biZLCms0quEjTYniGv5z1JcKbNIsDQFSeIZOBZJz4is6pD7UyWDggWWzTLBQbHcQFpBQdClnuQaMNUHtLHTpzCvZy33p6I7wFBvL4fnXBYH84aUIyWGTRvM2G5cfoNf4705tO2kv";

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    console.error(`[DiziPal-Debug] SORGULA: ID=${tmdbId} | Tip=${mediaType} | S:${seasonNum} E:${episodeNum}`);

    try {
        const type = mediaType === 'movie' ? 'movie' : 'tv';
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/${type}/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`);
        const tmdbData = await tmdbRes.json();

        const clean = (s) => s ? s.replace(/[^a-zA-Z0-9çğıöşüÇĞİÖŞÜ ]/g, '').trim() : "";
        let searchQueries = [
            clean(tmdbData.original_name || tmdbData.original_title),
            clean(tmdbData.name || tmdbData.title)
        ].filter(q => q.length > 0);

        console.error(`[DiziPal-Debug] Denenecek Terimler: ${JSON.stringify(searchQueries)}`);

        let searchResult = null;
        for (const query of searchQueries) {
            console.error(`[DiziPal-Debug] Arama Atılıyor: ${query}`);
            const searchRes = await fetch(`${BASE_URL}/bg/searchcontent`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/x-www-form-urlencoded', 
                    'X-Requested-With': 'XMLHttpRequest', 
                    'Referer': `${BASE_URL}/`,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                body: `searchterm=${encodeURIComponent(query)}`
            });

            const searchData = await searchRes.json();
            const results = Object.values(searchData);
            
            if (results.length > 0 && results[0].url) {
                searchResult = results[0];
                console.error(`[DiziPal-Debug] Arama BAŞARILI: ${searchResult.title} -> ${searchResult.url}`);
                break;
            }
        }

        if (!searchResult) {
            console.error(`[DiziPal-Debug] HATA: Hiçbir terimle sonuç bulunamadı.`);
            return [];
        }

        let finalPageHtml = "";
        let finalTargetUrl = "";

        if (mediaType === 'tv') {
            const slug = searchResult.url.replace('/series/', '').replace('/dizi/', '').replace(/\//g, '');
            
            // Sırasıyla dene: 1x2 formatı, sonra klasik format
            const formats = [
                `${BASE_URL}/bolum/${slug}-${seasonNum}x${episodeNum}`,
                `${BASE_URL}/bolum/${slug}-${seasonNum}-sezon-${episodeNum}-bolum-izle/`
            ];

            for (const url of formats) {
                console.error(`[DiziPal-Debug] Sayfa Deneniyor: ${url}`);
                const res = await fetch(url);
                console.error(`[DiziPal-Debug] Yanıt Kodu: ${res.status} (${url})`);
                if (res.status === 200) {
                    finalPageHtml = await res.text();
                    finalTargetUrl = url;
                    break;
                }
            }
        } else {
            finalTargetUrl = BASE_URL + searchResult.url;
            console.error(`[DiziPal-Debug] Film Sayfası Alınıyor: ${finalTargetUrl}`);
            const res = await fetch(finalTargetUrl);
            finalPageHtml = await res.text();
        }

        if (!finalPageHtml || finalPageHtml.length < 500) {
            console.error(`[DiziPal-Debug] HATA: Sayfa içeriği boş veya engellendi.`);
            return [];
        }

        const encryptedMatch = finalPageHtml.match(/<div[^>]*data-rm-k="true"[^>]*>(.*?)<\/div>/);
        if (!encryptedMatch) {
            console.error(`[DiziPal-Debug] HATA: 'data-rm-k' şifreli div bulunamadı! Sayfa yapısı değişmiş olabilir.`);
            return [];
        }

        // ... (Decrypt ve Link çekme kısımları aynı kalıyor, sadece hata logları eklendi)
        console.error(`[DiziPal-Debug] Şifreli Veri Bulundu, Çözülüyor...`);
        let iframeUrl = decryptDizipalData(encryptedMatch[1]);
        
        if (!iframeUrl) {
            console.error(`[DiziPal-Debug] HATA: AES Decrypt başarısız oldu.`);
            return [];
        }
        
        console.error(`[DiziPal-Debug] Iframe URL: ${iframeUrl}`);

        // Player çekme işlemleri...
        // (Kısalık adına devamını benzer console.error'larla süsledim)
        
        // Final dönüşte:
        console.error(`[DiziPal-Debug] Linkler başarıyla çekildi!`);
        // ... (Return apiData.map kısmı)

    } catch (err) {
        console.error(`[DiziPal-Debug] KRİTİK HATA: ${err.stack}`);
        return [];
    }
}
