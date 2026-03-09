/**
 * NetMirror OMNI - TV & Film Tam Modül
 * SSL Sertifika Hatası (net52) ve Yol Düzeltmeleri Dahil
 */

const NetMirror = {
    MAIN_URL: 'https://net22.cc',
    PLAYLIST_BASE: 'https://net52.cc',
    VIDEO_BASE: 'http://net52.cc', // SSL Hatası almamak için özellikle HTTP
    TMDB_KEY: '1b3113663c9004682ed61086cf967c44',

    getHeaders: function() {
        return {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ExoPlayer',
            'Referer': this.MAIN_URL + '/',
            'X-Requested-With': 'XMLHttpRequest'
        };
    },

    // 1. ADIM: Arama Yapma (Film veya TV Kanalı İçin)
    search: async function(query) {
        try {
            const ts = Math.floor(Date.now() / 1000);
            const url = `${this.MAIN_URL}/search.php?s=${encodeURIComponent(query)}&t=${ts}`;
            const res = await fetch(url, { headers: this.getHeaders() });
            const data = await res.json();
            return data.searchResult || [];
        } catch (e) {
            console.error('Search Error:', e);
            return [];
        }
    },

    // 2. ADIM: Playlist Çekme (Senin verdiğin JSON yapısına tam uyumlu)
    loadLinks: async function(id, isTv = false) {
        try {
            // TV ise /tv/playlist.php, Film ise /playlist.php kullanır
            const endpoint = isTv ? '/tv/playlist.php' : '/playlist.php';
            const url = `${this.PLAYLIST_BASE}${endpoint}?id=${id}`;

            console.log('[NetMirror] Sorgulanıyor:', url);

            const res = await fetch(url, { headers: this.getHeaders() });
            const json = await res.json();
            const item = Array.isArray(json) ? json[0] : json;

            if (!item || !item.sources) return [];

            return item.sources.map(s => {
                let path = s.file; // Örn: /tv/hls/152.m3u8...
                
                // HTTP üzerinden birleştirerek SSL hatasını (Hostname not verified) aşarız
                let finalUrl = this.VIDEO_BASE + (path.startsWith('/') ? '' : '/') + path;

                return {
                    name: `NetMirror [${s.label}]`,
                    url: finalUrl,
                    quality: s.label,
                    type: 'hls',
                    headers: this.getHeaders()
                };
            });
        } catch (e) {
            console.error('LoadLinks Error:', e);
            return [];
        }
    },

    // 3. ADIM: Ana Giriş Noktası (TMDB ID veya Direkt Başlık ile)
    getStreams: async function(tmdbId, mediaType) {
        // TMDB'den isim çekme (Opsiyonel, elinde isim varsa direkt search'e geçebilirsin)
        const type = (mediaType === 'movie') ? 'movie' : 'tv';
        const tmdbUrl = `https://api.themoviedb.org/3/${type}/${tmdbId}?language=tr-TR&api_key=${this.TMDB_KEY}`;
        
        try {
            const tmdbRes = await fetch(tmdbUrl);
            const tmdbData = await tmdbRes.json();
            const title = tmdbData.title || tmdbData.name;

            if (!title) return [];

            // NetMirror'da ara
            const results = await this.search(title);
            if (results.length === 0) return [];

            // İlk sonucu al ve playlist'i yükle
            // mediaType 'tv' ise isTv parametresini true gönderir
            return await this.loadLinks(results[0].id, mediaType === 'tv');

        } catch (e) {
            return [];
        }
    }
};

// Örnek Kullanım:
// NetMirror.getStreams('152', 'tv').then(links => console.log(links));
