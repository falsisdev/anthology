// NetMirror Scraper - QuickJS / Nuvio Ultra-Compatible Version
// Fixed: Process ReferenceError & SSL Domain Update

(function() {
    "use strict";

    // QuickJS 'process' hatasını engellemek için global tanım
    if (typeof process === 'undefined') {
        globalThis.process = { env: {} };
    }

    const NETMIRROR_BASE = 'https://net51.cc';
    const USER_TOKEN = '233123f803cf02184bf6c67e149cdd50';

    const HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'X-Requested-With': 'XMLHttpRequest',
        'Cookie': 'user_token=' + USER_TOKEN + '; t_hash_t=checked'
    };

    function getStreams(content) {
        var title = content.title;
        var type = content.type;
        var season = content.season || 1;
        var episode = content.episode || 1;

        console.log('[NetMirror] Search started for: ' + title);

        // Nuvio'nun fetch yapısını bozmamak için basit URL oluşturma
        var searchUrl = NETMIRROR_BASE + '/search.php?query=' + encodeURIComponent(title);

        return fetch(searchUrl, { headers: HEADERS })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                // Regex ile ID çekme (QuickJS uyumlu)
                var idMatch = html.match(/data-id="(\d+)"/i);
                if (!idMatch) return [];

                var id = idMatch[1];
                var playlistUrl = NETMIRROR_BASE + '/tv/playlist.php?id=' + id;

                return fetch(playlistUrl, { headers: HEADERS })
                    .then(function(res) { return res.json(); })
                    .then(function(json) {
                        var results = [];
                        var sources = (type === 'tv' || type === 'show') ? (json[season] ? json[season][episode] : null) : json;

                        if (sources && Array.isArray(sources)) {
                            for (var i = 0; i < sources.length; i++) {
                                if (sources[i].file) {
                                    results.push({
                                        name: 'NetMirror HQ',
                                        url: sources[i].file,
                                        quality: sources[i].label || '720p'
                                    });
                                }
                            }
                        }
                        return results;
                    });
            })
            .catch(function(err) {
                console.log('[NetMirror] Error: ' + err.message);
                return [];
            });
    }

    // Nuvio Global Export
    globalThis.getStreams = getStreams;
})();
