// NetMirror Scraper for Nuvio - Updated & Fixed Version
// Target: net51.cc (Active Domain)

console.log('[NetMirror] Initializing Fixed Scraper');

const NETMIRROR_BASE = 'https://net51.cc';
const USER_TOKEN = '233123f803cf02184bf6c67e149cdd50'; // Working Token

const BASE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'X-Requested-With': 'XMLHttpRequest',
    'Accept': 'application/json, text/plain, */*',
    'Referer': NETMIRROR_BASE + '/',
    'Origin': NETMIRROR_BASE
};

function getStreams(content) {
    const title = content.title;
    const year = content.year;
    const isTvShow = content.type === 'tv' || content.type === 'show';
    const season = content.season || 1;
    const episode = content.episode || 1;

    console.log(`[NetMirror] Searching for: ${title} (${year})`);

    // Platforms to check
    const platforms = ['netflix', 'prime', 'disney'];
    
    // QuickJS compatible fetch helper
    function safeFetch(url, options = {}) {
        const headers = Object.assign({}, BASE_HEADERS, options.headers || {});
        // Add auth cookies
        headers['Cookie'] = `user_token=${USER_TOKEN}; t_hash_t=checked`;
        
        return fetch(url, {
            method: options.method || 'GET',
            headers: headers,
            body: options.body
        }).then(res => {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.text();
        });
    }

    function tryPlatform(index) {
        if (index >= platforms.length) return Promise.resolve([]);
        const platform = platforms[index];

        const searchUrl = `${NETMIRROR_BASE}/search.php?query=${encodeURIComponent(title)}&t=${Date.now()}`;

        return safeFetch(searchUrl)
            .then(html => {
                // Basic ID extraction from search
                const match = html.match(new RegExp(`data-id="(\\d+)"[^>]*${platform}`, 'i'));
                if (!match) return tryPlatform(index + 1);

                const id = match[1];
                const playlistUrl = `${NETMIRROR_BASE}/tv/playlist.php?id=${id}&t=${Date.now()}`;

                return safeFetch(playlistUrl).then(data => {
                    try {
                        const json = JSON.parse(data);
                        let streams = [];
                        
                        // Parse logic for different content types
                        const sources = isTvShow ? (json[season] ? json[season][episode] : null) : json;

                        if (sources && Array.isArray(sources)) {
                            sources.forEach(src => {
                                if (src.file) {
                                    streams.push({
                                        name: `NetMirror [${platform.toUpperCase()}]`,
                                        url: src.file.replace('/tv/', '/').replace('//', '/'),
                                        quality: src.label || '720p',
                                        original: true
                                    });
                                }
                            });
                        }
                        
                        if (streams.length > 0) return streams;
                        return tryPlatform(index + 1);
                    } catch (e) {
                        return tryPlatform(index + 1);
                    }
                });
            })
            .catch(() => tryPlatform(index + 1));
    }

    return tryPlatform(0);
}

// Fixed for QuickJS/Nuvio - No 'process' or 'module' dependencies
if (typeof global !== 'undefined') {
    global.getStreams = getStreams;
} else if (typeof window !== 'undefined') {
    window.getStreams = getStreams;
}
