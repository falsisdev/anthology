/**
 * Anthology Canlı TV & M3U Katalog Motoru
 * 80+ Ulusal, Haber, Spor ve Canlı TV kanalı
 */

var M3U_URL = "https://raw.githubusercontent.com/falsisdev/anthology/main/providers/M3U/Liste/canli.m3u";

var _HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*'
};

var cachedText = null;
var cacheTime = 0;

function fetchChannels() {
    var now = Date.now();
    if (cachedText && (now - cacheTime < 300000)) {
        return Promise.resolve(cachedText);
    }
    return fetch(M3U_URL, { headers: { 'User-Agent': 'Mozilla/5.0' } })
        .then(function(res) { return res.text(); })
        .then(function(txt) {
            cachedText = txt;
            cacheTime = now;
            return txt;
        });
}

function getCatalog(args) {
    return fetchChannels()
        .then(function(content) {
            var lines = content.split('\n');
            var metas = [];
            for (var i = 0; i < lines.length; i++) {
                var line = lines[i].trim();
                if (line.indexOf("#EXTINF") !== -1) {
                    var tvgIdMatch = line.match(/tvg-id="([^"]+)"/i);
                    var tvgNameMatch = line.match(/tvg-name="([^"]+)"/i);
                    var logoMatch = line.match(/tvg-logo="([^"]+)"/i);
                    var groupMatch = line.match(/group-title="([^"]+)"/i);

                    var commaParts = line.split(',');
                    var channelName = commaParts[commaParts.length - 1].trim();
                    var channelId = tvgIdMatch && tvgIdMatch[1] ? tvgIdMatch[1].trim() : (tvgNameMatch ? tvgNameMatch[1].trim() : channelName);
                    var logo = logoMatch ? logoMatch[1] : "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/canli/default_tv.png";
                    var genre = groupMatch ? groupMatch[1].replace(/[^\w\sğüşıöçĞÜŞİÖÇ]/gi, '').trim() : "Ulusal";

                    metas.push({
                        id: channelId,
                        type: "tv",
                        name: channelName,
                        poster: logo,
                        background: logo,
                        genres: [genre],
                        description: channelName + " Canlı Yayın"
                    });
                }
            }
            return { metas: metas };
        })
        .catch(function() {
            return { metas: [] };
        });
}

function cleanKey(s) {
    return (s || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function getMeta(args) {
    var targetId = (typeof args === 'string') ? args : (args && args.id ? args.id : null);
    if (!targetId) return Promise.resolve({ meta: null });

    return fetchChannels()
        .then(function(content) {
            var lines = content.split('\n');
            var name = targetId;
            var logo = "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/canli/default_tv.png";
            var searchKey = cleanKey(targetId);

            for (var i = 0; i < lines.length; i++) {
                var line = lines[i].trim();
                if (line.indexOf("#EXTINF") !== -1) {
                    var tvgIdMatch = line.match(/tvg-id="([^"]+)"/i);
                    var tvgNameMatch = line.match(/tvg-name="([^"]+)"/i);
                    var commaParts = line.split(',');
                    var aliasName = commaParts[commaParts.length - 1].trim();

                    var cId = cleanKey(tvgIdMatch ? tvgIdMatch[1] : "");
                    var cName = cleanKey(tvgNameMatch ? tvgNameMatch[1] : "");
                    var aName = cleanKey(aliasName);

                    if (cId === searchKey || cName === searchKey || aName === searchKey || aName.includes(searchKey) || searchKey.includes(aName)) {
                        name = aliasName;
                        var logoMatch = line.match(/tvg-logo="([^"]+)"/i);
                        if (logoMatch) logo = logoMatch[1];
                        break;
                    }
                }
            }

            return {
                meta: {
                    id: targetId,
                    type: "tv",
                    name: name,
                    poster: logo,
                    background: logo,
                    description: name + " Canlı Yayın",
                    videos: [{
                        id: targetId,
                        title: name,
                        released: new Date().toISOString()
                    }]
                }
            };
        })
        .catch(function() {
            return {
                meta: {
                    id: targetId,
                    type: "tv",
                    name: "Canlı Yayın",
                    poster: "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/canli/default_tv.png",
                    videos: [{ id: targetId, title: "Yayını Başlat" }]
                }
            };
        });
}

function getStreams(args) {
    var targetId = (typeof args === 'string') ? args : (args ? args.id : "");
    if (!targetId) return Promise.resolve({ streams: [] });

    return fetchChannels()
        .then(function(content) {
            var lines = content.split('\n');
            var streams = [];
            var searchKey = cleanKey(targetId);

            for (var i = 0; i < lines.length; i++) {
                var line = lines[i].trim();
                if (line.indexOf("#EXTINF") !== -1) {
                    var tvgIdMatch = line.match(/tvg-id="([^"]+)"/i);
                    var tvgNameMatch = line.match(/tvg-name="([^"]+)"/i);
                    var commaParts = line.split(',');
                    var aliasName = commaParts[commaParts.length - 1].trim();

                    var cId = cleanKey(tvgIdMatch ? tvgIdMatch[1] : "");
                    var cName = cleanKey(tvgNameMatch ? tvgNameMatch[1] : "");
                    var aName = cleanKey(aliasName);

                    if (cId === searchKey || cName === searchKey || aName === searchKey || (aName.length > 2 && (aName.includes(searchKey) || searchKey.includes(aName)))) {
                        for (var j = i + 1; j < lines.length; j++) {
                            var urlLine = lines[j].trim();
                            if (urlLine && urlLine.indexOf("http") === 0) {
                                streams.push({
                                    name: '⌜ Anthology ⌟',
                                    title: aliasName + ' [Canlı]',
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

            return { streams: streams };
        })
        .catch(function() {
            return { streams: [] };
        });
}

// --- EXPORTS ---
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams, getMeta: getMeta, getCatalog: getCatalog };
} else {
    var g = (typeof globalThis !== 'undefined') ? globalThis : (typeof global !== 'undefined') ? global : window;
    g.getStreams = getStreams; g.getMeta = getMeta; g.getCatalog = getCatalog;
}
