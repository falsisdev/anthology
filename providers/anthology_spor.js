/**
 * Anthology Canlı Spor Paketi
 * TRT Spor, A Spor, TV8.5, BeIN Sports, S Sport, Tivibu Spor, Exxen Spor vb.
 */

var path = typeof require !== 'undefined' ? require('path') : null;
var fs = typeof require !== 'undefined' ? require('fs') : null;

var M3U_REMOTE = "https://raw.githubusercontent.com/falsisdev/anthology/main/providers/M3U/Liste/canli.m3u";

var _HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*'
};

var _MAHSUN_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://mahsunsports80.xyz/',
    'Origin': 'https://mahsunsports80.xyz'
};

var cachedText = null;
var cacheTime = 0;

function fetchChannels() {
    var now = Date.now();
    if (cachedText && (now - cacheTime < 300000)) {
        return Promise.resolve(cachedText);
    }
    if (fs && path) {
        try {
            var localPath = path.resolve(__dirname, 'M3U', 'Liste', 'canli.m3u');
            if (fs.existsSync(localPath)) {
                cachedText = fs.readFileSync(localPath, 'utf8');
                cacheTime = now;
                return Promise.resolve(cachedText);
            }
        } catch (e) {}
    }
    return fetch(M3U_REMOTE, { headers: { 'User-Agent': 'Mozilla/5.0' } })
        .then(function(res) { return res.text(); })
        .then(function(txt) {
            cachedText = txt;
            cacheTime = now;
            return txt;
        });
}

function cleanKey(s) {
    return (s || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function parseSportChannels(content) {
    var lines = content.split('\n');
    var channels = [];
    var isTargetGroup = false;

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (line.indexOf('#EXTINF') !== -1) {
            var groupMatch = line.match(/group-title="([^"]+)"/i);
            var group = groupMatch ? groupMatch[1] : '';
            isTargetGroup = group.indexOf('SPOR') !== -1;

            if (isTargetGroup) {
                var tvgIdMatch = line.match(/tvg-id="([^"]+)"/i);
                var tvgNameMatch = line.match(/tvg-name="([^"]+)"/i);
                var logoMatch = line.match(/tvg-logo="([^"]+)"/i);
                var nameMatch = line.match(/"\s*,\s*(.+)$/);
                var channelName = nameMatch ? nameMatch[1].trim() : line.split(',').pop().trim();
                var rawId = tvgIdMatch && tvgIdMatch[1] ? tvgIdMatch[1].trim() : (tvgNameMatch ? tvgNameMatch[1].trim() : channelName);
                var channelId = rawId.startsWith('tv:') ? rawId : ('tv:' + rawId);
                var logo = logoMatch ? logoMatch[1] : "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/canli/default_tv.png";

                var streamUrl = '';
                for (var j = i + 1; j < lines.length; j++) {
                    var u = lines[j].trim();
                    if (u.indexOf('http') === 0) {
                        streamUrl = u;
                        break;
                    }
                    if (u.indexOf('#EXTINF') === 0) break;
                }

                channels.push({
                    id: channelId,
                    name: channelName,
                    logo: logo,
                    url: streamUrl
                });
            }
        }
    }
    return channels;
}

function isEncryptedSport(channel) {
    var key = cleanKey((channel.id || '').replace(/^tv:/, '') + ' ' + (channel.name || ''));
    return /bein|ssport|sspor|tivibu|smartspor|smarts|exxen|tabii|eurosport|nba/.test(key);
}

function getCatalog(args) {
    return fetchChannels()
        .then(function(content) {
            var channels = parseSportChannels(content);
            var metas = channels.map(function(ch) {
                return {
                    id: ch.id,
                    type: "tv",
                    name: ch.name,
                    poster: ch.logo,
                    background: ch.logo,
                    genres: ["Spor"],
                    description: ch.name + " Canlı Spor Yayını"
                };
            });
            return { metas: metas };
        })
        .catch(function() {
            return { metas: [] };
        });
}

var VERIFIED_BACKUPS = {
    'trtspor': 'https://tv-trtspor1.medya.trt.com.tr/master.m3u8',
    'trtsporyildiz': 'https://tv-trtspor2.medya.trt.com.tr/master.m3u8',
    'aspor': 'https://trkvz-live.ercdn.net/asportv/asportv.m3u8',
    'fbtv': 'http://1hskrdto.rocketcdn.com/fenerbahcetv.smil/playlist.m3u8',
    'tv85': 'https://tv8.daioncdn.net/tv8bucuk/tv8bucuk.m3u8?app=tv8bucuk_web&ce=3'
};

function getStreams(args) {
    var targetId = (typeof args === 'string') ? args : (args ? (args.id || args.name) : "");
    var mediaType = (args && args.type) || (args && args.mediaType) || '';
    var isLiveRequest = /^tv:/i.test(targetId) || mediaType === 'channel' || mediaType === 'tv' && /^tv:/i.test((args && args.id) || '');
    if (!isLiveRequest && targetId && !/^tv:/i.test(targetId)) {
        var looksLikeTmdb = /^(tt\d+|\d+)$/.test(String(targetId).split(':')[0]);
        if (looksLikeTmdb || mediaType === 'movie') {
            var emptyNoLive = [];
            emptyNoLive.streams = [];
            return Promise.resolve(emptyNoLive);
        }
    }

    return fetchChannels()
        .then(function(content) {
            var channels = parseSportChannels(content);
            if (!targetId && channels.length > 0) {
                return channels.slice(0, 5).map(function(ch) {
                    var encrypted = isEncryptedSport(ch);
                    return {
                        name: '⌜ Anthology Spor ⌟',
                        title: ch.name + ' [Canlı HD]',
                        url: ch.url,
                        headers: encrypted ? _MAHSUN_HEADERS : _HEADERS,
                        behaviorHints: { isLive: true }
                    };
                });
            }

            var searchKey = cleanKey(targetId.replace(/^tv:/, ''));
            var matched = null;

            for (var i = 0; i < channels.length; i++) {
                var ch = channels[i];
                var cId = cleanKey(ch.id.replace(/^tv:/, ''));
                var cName = cleanKey(ch.name);

                if (cId === searchKey || cName === searchKey || (searchKey && (cName.includes(searchKey) || searchKey.includes(cName)))) {
                    matched = ch;
                    break;
                }
            }

            if (!matched) {
                var empty2 = [];
                empty2.streams = [];
                return empty2;
            }

            var streams = [];
            var encrypted = isEncryptedSport(matched);

            if (encrypted) {
                // Şifreli kanallar: Canlı spor yayınları
                streams.push({
                    name: '⌜ Anthology Spor ⌟',
                    title: matched.name + ' [Canlı HD]',
                    url: matched.url,
                    headers: _MAHSUN_HEADERS,
                    behaviorHints: { isLive: true }
                });

                // Alternatif yedek akışlar
                var key = cleanKey(matched.id.replace(/^tv:/, ''));
                var backupUrl = null;
                if (key.includes('beinsportsmax1')) backupUrl = 'https://andro.evrenesoglu101.click/checklist/androstreamlivebsm1.m3u8';
                else if (key.includes('beinsportsmax2')) backupUrl = 'https://andro.evrenesoglu101.click/checklist/androstreamlivebsm2.m3u8';
                else if (key.includes('beinsports1')) backupUrl = 'https://andro.evrenesoglu101.click/checklist/androstreamlivebs1.m3u8';
                else if (key.includes('beinsports2')) backupUrl = 'https://andro.evrenesoglu101.click/checklist/androstreamlivebs2.m3u8';
                else if (key.includes('beinsports3')) backupUrl = 'https://andro.evrenesoglu101.click/checklist/androstreamlivebs3.m3u8';
                else if (key.includes('beinsports4')) backupUrl = 'https://andro.evrenesoglu101.click/checklist/androstreamlivebs4.m3u8';
                else if (key.includes('beinsports5')) backupUrl = 'https://andro.evrenesoglu101.click/checklist/androstreamlivebs5.m3u8';
                else if (key.includes('ssportplus')) backupUrl = 'https://andro.evrenesoglu101.click/checklist/batutest.m3u8';
                else if (key.includes('ssport2')) backupUrl = 'https://andro.evrenesoglu101.click/checklist/androstreamlivess2.m3u8';
                else if (key.includes('ssport')) backupUrl = 'https://andro.evrenesoglu99.click/checklist/batutest.m3u8';

                if (backupUrl && backupUrl !== matched.url) {
                    streams.push({
                        name: '⌜ Anthology Spor · Yedek ⌟',
                        title: matched.name + ' [Yedek Akış]',
                        url: backupUrl,
                        headers: _MAHSUN_HEADERS,
                        behaviorHints: { isLive: true }
                    });
                }
            } else {
                // Şifresiz resmi spor kanalları
                streams.push({
                    name: '⌜ Anthology Spor ⌟',
                    title: matched.name + ' [Canlı HD]',
                    url: matched.url,
                    headers: _HEADERS,
                    behaviorHints: { isLive: true }
                });

                for (var bk in VERIFIED_BACKUPS) {
                    if (cleanKey(matched.id).includes(bk) && VERIFIED_BACKUPS[bk] !== matched.url) {
                        streams.push({
                            name: '⌜ Anthology Spor · Yedek ⌟',
                            title: matched.name + ' [Yedek Akış]',
                            url: VERIFIED_BACKUPS[bk],
                            headers: _HEADERS,
                            behaviorHints: { isLive: true }
                        });
                        break;
                    }
                }
            }

            streams.streams = streams;
            return streams;
        })
        .catch(function() {
            var empty = [];
            empty.streams = [];
            return empty;
        });
}

function getMeta(args) {
    var targetId = (typeof args === 'string') ? args : (args && args.id ? args.id : null);
    if (!targetId) return Promise.resolve({ meta: null });
    return fetchChannels()
        .then(function(content) {
            var channels = parseSportChannels(content);
            var cleanTarget = cleanKey(targetId.replace(/^tv:/, ''));
            var ch = channels.find(function(c) { return c.id === targetId || cleanKey(c.id.replace(/^tv:/, '')) === cleanTarget || cleanKey(c.name) === cleanTarget; }) || channels[0];
            return {
                meta: {
                    id: targetId,
                    type: "tv",
                    name: ch.name,
                    poster: ch.logo,
                    background: ch.logo,
                    description: ch.name + " Canlı Spor Yayını",
                    genres: ["Spor"],
                    videos: [{ id: targetId, title: ch.name, released: new Date().toISOString() }]
                }
            };
        })
        .catch(function() { return { meta: null }; });
}

// ── Universal Quality Sorter ──────────────────────────────────────────
function sortStreamsByQuality(streams) {
    if (!Array.isArray(streams) || streams.length <= 1) return streams || [];
    function getQualityScore(s) {
        if (!s) return 0;
        var score = 0;
        if (s.quality) {
            var q = String(s.quality).toLowerCase().trim();
            if (/\b(4k|2160p?|uhd)\b/.test(q)) score = 2160;
            else if (/\b(2k|1440p?|qhd)\b/.test(q)) score = 1440;
            else if (/\b(1080p?|fhd|full[\s-]?hd)\b/.test(q)) score = 1080;
            else if (/\b(720p?|hd)\b/.test(q)) score = 720;
            else if (/\b(540p?)\b/.test(q)) score = 540;
            else if (/\b(480p?|sd)\b/.test(q)) score = 480;
            else if (/\b(360p?)\b/.test(q)) score = 360;
            else if (/\b(240p?)\b/.test(q)) score = 240;
        }
        if (!score) {
            var text = [s.title, s.name, s.resolution].filter(Boolean).join(" ").toLowerCase();
            if (/\b(4k|2160p|uhd)\b/.test(text)) score = 2160;
            else if (/\b(2k|1440p|qhd)\b/.test(text)) score = 1440;
            else if (/\b(1080p|fhd|full[\s-]?hd)\b/.test(text)) score = 1080;
            else if (/\b(720p)\b/.test(text)) score = 720;
            else if (/\b(540p)\b/.test(text)) score = 540;
            else if (/\b(480p)\b/.test(text)) score = 480;
            else if (/\b(360p)\b/.test(text)) score = 360;
            else if (/\b(240p)\b/.test(text)) score = 240;
            else if (/\b(hd)\b/.test(text) && !/\b(full[\s-]?hd)\b/.test(text)) score = 720;
            else if (/\b(sd)\b/.test(text)) score = 480;
        }
        if (!score && s.url) {
            var u = String(s.url).toLowerCase();
            if (/[\/_.-](2160p?|4k)[\/_.-]/.test(u)) score = 2160;
            else if (/[\/_.-](1440p?|2k)[\/_.-]/.test(u)) score = 1440;
            else if (/[\/_.-](1080p?|fhd)[\/_.-]/.test(u)) score = 1080;
            else if (/[\/_.-](720p?|hd)[\/_.-]/.test(u)) score = 720;
            else if (/[\/_.-](480p?|sd)[\/_.-]/.test(u)) score = 480;
            else if (/[\/_.-](360p?)[\/_.-]/.test(u)) score = 360;
        }
        var isDirectMp4 = s.format === "mp4" || s.type === "mp4" || (!s.isHls && s.url && (s.url.endsWith(".mp4") || s.url.includes(".mp4?")));
        if (isDirectMp4 && score > 0) score += 1;
        return score;
    }
    return streams.slice().sort(function(a, b) {
        return getQualityScore(b) - getQualityScore(a);
    });
}

if (typeof getStreams === "function") {
    var _origGetStreams = getStreams;
    getStreams = async function() {
        var res = await _origGetStreams.apply(this, arguments);
        return sortStreamsByQuality(res);
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams, getCatalog: getCatalog, getMeta: getMeta };
} else {
    var g = (typeof globalThis !== 'undefined') ? globalThis : (typeof global !== 'undefined') ? global : window;
    g.getStreams = getStreams; g.getCatalog = getCatalog; g.getMeta = getMeta;
}
