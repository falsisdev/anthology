/**
 * MoOnCrOwN - V27 (Full Meta & Stream Matcher)
 * tvg-id, tvg-name veya virgül sonrası (star, tmdb_atv vb.) eşleşme yapar.
 */

var M3U_URL = "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/canli.m3u";

var _HEADERS = {
    'User-Agent': 'VLC/3.0.18',
    'Accept': '*/*'
};

// --- META FONKSİYONU ---
// Nuvio'nun "Metadata bulunamadı" hatasını bu kısım çözer.
function getMeta(args) {
    var targetId = (typeof args === 'string') ? args : (args && args.id ? args.id : null);
    
    if (!targetId) return Promise.resolve({ meta: null });

    console.error('[MoOnCrOwN] Meta İsteği Geldi:', targetId);

    return Promise.resolve({
        meta: {
            id: targetId,
            type: "tv",
            name: "Canlı Yayın",
            poster: "https://i.imgur.com/Dlsm9XP.png",
            background: "https://i.imgur.com/Dlsm9XP.png",
            description: "MoOnCrOwN IPTV Kanalı",
            // Oynatıcının yayını sorması için gerekli video objesi
            videos: [{
                id: targetId,
                title: "Yayını Başlat",
                released: new Date().toISOString()
            }]
        }
    });
}

// --- STREAM FONKSİYONU ---
// M3U içinden asıl .m3u8 linkini bulan kısım.
function getStreams(args) {
    var targetId = (typeof args === 'string') ? args : (args ? args.id : "");
    console.error('[MoOnCrOwN] Yayın Sorgulanıyor:', targetId);

    return new Promise(function(resolve) {
        if (!targetId) return resolve({ streams: [] });

        fetch(M3U_URL, { headers: { 'User-Agent': 'Mozilla/5.0' } })
            .then(function(res) { return res.text(); })
            .then(function(content) {
                var lines = content.split('\n');
                var streams = [];
                var searchKey = targetId.toLowerCase().trim();

                for (var i = 0; i < lines.length; i++) {
                    var line = lines[i].trim();
                    
                    if (line.indexOf("#EXTINF") !== -1) {
                        // M3U içindeki etiketleri ayıkla
                        var tvgIdMatch = line.match(/tvg-id="([^"]+)"/i);
                        var tvgId = tvgIdMatch ? tvgIdMatch[1].toLowerCase().trim() : "";

                        var tvgNameMatch = line.match(/tvg-name="([^"]+)"/i);
                        var tvgName = tvgNameMatch ? tvgNameMatch[1].toLowerCase().trim() : "";

                        var commaParts = line.split(',');
                        var aliasName = commaParts[commaParts.length - 1].toLowerCase().trim();

                        // Üçlü kontrol (ID, Name veya Virgül Sonrası)
                        if (tvgId === searchKey || tvgName === searchKey || aliasName === searchKey) {
                            console.error('[MoOnCrOwN] Eşleşme Başarılı:', aliasName);
                            
                            for (var j = i + 1; j < lines.length; j++) {
                                var urlLine = lines[j].trim();
                                if (urlLine && urlLine.indexOf("http") === 0) {
                                    streams.push({
                                        name: '⌜ MoOnCrOwN ⌟',
                                        title: 'Canlı TV (ID: ' + aliasName + ')',
                                        url: urlLine,
                                        headers: _HEADERS,
                                        behaviorHints: { isLive: true }
                                    });
                                    break;
                                }
                                if (urlLine.indexOf("#EXTINF") === 0) break;
                            }
                        }
                    }
                    if (streams.length > 0) break;
                }

                resolve({ streams: streams });
            })
            .catch(function(err) {
                console.error('[MoOnCrOwN] Bağlantı Hatası:', err.message);
                resolve({ streams: [] });
            });
    });
}

// --- EXPORTS ---
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams, getMeta: getMeta };
} else {
    var g = (typeof globalThis !== 'undefined') ? globalThis : (typeof global !== 'undefined') ? global : window;
    g.getStreams = getStreams; g.getMeta = getMeta;
}
