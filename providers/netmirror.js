const NetMirror = {
    MAIN_URL: 'https://net22.cc',
    PLAYLIST_BASE: 'https://net52.cc',
    VIDEO_BASE: 'http://net52.cc', // SSL Bypass için HTTP

    getHeaders: function() {
        return {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ExoPlayer',
            'Referer': this.MAIN_URL + '/',
            'Origin': this.MAIN_URL
        };
    },

    // Arama Fonksiyonu
    search: async function(query) {
        try {
            const ts = Math.floor(Date.now() / 1000);
            const url = `${this.MAIN_URL}/search.php?s=${encodeURIComponent(query)}&t=${ts}`;
            const res = await fetch(url, { headers: this.getHeaders() });
            const data = await res.json();
            return data.searchResult || [];
        } catch (e) {
            return [];
        }
    },

    // Link Yükleme (TV ve Film Ayrımı Dahil)
    loadLinks: async function(id, isTv = false) {
        try {
            // TV kanalı ise /tv/ ekler, film ise eklemez
            const endpoint = isTv ? '/tv/playlist.php' : '/playlist.php';
            const url = `${this.PLAYLIST_BASE}${endpoint}?id=${id}`;
            
            const res = await fetch(url, { headers: this.getHeaders() });
            const json = await res.json();
            const item = Array.isArray(json) ? json[0] : json;

            if (!item || !item.sources) return [];

            return item.sources.map(s => {
                let videoPath = s.file;
                // HTTP zorlaması yaparak Android sertifika hatasını (SSL) aşarız
                let finalUrl = this.VIDEO_BASE + (videoPath.startsWith('/') ? '' : '/') + videoPath;
                finalUrl = finalUrl.replace('https://', 'http://');

                return {
                    name: `NetMirror [${s.label}]`,
                    url: finalUrl,
                    quality: s.label,
                    type: 'hls',
                    headers: this.getHeaders()
                };
            });
        } catch (e) {
            return [];
        }
    }
};

/**
 * UYGULAMANIN BEKLEDİĞİ ANA FONKSİYON (getStreams)
 * module.exports içine koyarak hatayı gideriyoruz.
 */
module.exports = {
    getStreams: async function(tmdbId, mediaType) {
        // Not: mediaType 'movie' veya 'tv' gelir. 
        // Burada başlık üzerinden arama yaptığını varsayıyorum (CloudStream yapısı)
        // Eğer elinde isim varsa search kısmına o ismi gönder.
        
        // ÖRNEK: Eğer bir test yapıyorsan 152 id'li TV kanalını direkt çekmek için:
        // return await NetMirror.loadLinks('152', true);

        // Dinamik arama yapısı:
        const results = await NetMirror.search(tmdbId); // tmdbId burada genelde başlık olarak gelir
        if (results.length > 0) {
            return await NetMirror.loadLinks(results[0].id, mediaType === 'tv');
        }
        return [];
    }
};
