var CONFIG = (typeof require !== "undefined" ? (function() {
  try {
    return require("../config");
  } catch (e) {
    return require("../urls");
  }
})() : null) || (typeof globalThis !== "undefined" ? globalThis.CONFIG || globalThis.URLS : null) || {};
var URLS = CONFIG.urls || CONFIG;
var M3U_URL = URLS.live && URLS.live.m3u_remote || "https://raw.githubusercontent.com/falsisdev/anthology/main/providers/M3U/Liste/canli.m3u";
var _HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "*/*"
};
var cachedText = null;
var cacheTime = 0;
function fetchChannels() {
  var now = Date.now();
  if (cachedText && now - cacheTime < 3e5) {
    return Promise.resolve(cachedText);
  }
  if (typeof require !== "undefined") {
    try {
      var path = require("path");
      var fs = require("fs");
      var localPath = path.resolve(__dirname, "Liste", "canli.m3u");
      if (fs.existsSync(localPath)) {
        cachedText = fs.readFileSync(localPath, "utf8");
        cacheTime = now;
        return Promise.resolve(cachedText);
      }
    } catch (e) {
    }
  }
  return fetch(M3U_URL, { headers: { "User-Agent": "Mozilla/5.0" } }).then(function(res) {
    return res.text();
  }).then(function(txt) {
    cachedText = txt;
    cacheTime = now;
    return txt;
  });
}
function getCatalog(args) {
  return fetchChannels().then(function(content) {
    var lines = content.split("\n");
    var metas = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (line.indexOf("#EXTINF") !== -1) {
        var tvgIdMatch = line.match(/tvg-id="([^"]+)"/i);
        var tvgNameMatch = line.match(/tvg-name="([^"]+)"/i);
        var logoMatch = line.match(/tvg-logo="([^"]+)"/i);
        var groupMatch = line.match(/group-title="([^"]+)"/i);
        var nameMatch = line.match(/"\s*,\s*(.+)$/);
        var channelName = nameMatch ? nameMatch[1].trim() : line.split(",").pop().trim();
        var rawId = tvgIdMatch && tvgIdMatch[1] ? tvgIdMatch[1].trim() : tvgNameMatch ? tvgNameMatch[1].trim() : channelName;
        var channelId = rawId.startsWith("tv:") ? rawId : "tv:" + rawId;
        var logo = logoMatch ? logoMatch[1] : "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/canli/default_tv.png";
        var genre = groupMatch ? groupMatch[1].replace(/[^\w\sğüşıöçĞÜŞİÖÇ]/gi, "").trim() : "Ulusal";
        metas.push({
          id: channelId,
          type: "tv",
          name: channelName,
          poster: logo,
          background: logo,
          genres: [genre],
          description: channelName + " Canl\u0131 Yay\u0131n"
        });
      }
    }
    return { metas };
  }).catch(function() {
    return { metas: [] };
  });
}
function cleanKey(s) {
  return (s || "").toString().toLowerCase().replace(/[^a-z0-9]/g, "");
}
function getMeta(args) {
  var targetId = typeof args === "string" ? args : args && args.id ? args.id : null;
  if (!targetId) return Promise.resolve({ meta: null });
  return fetchChannels().then(function(content) {
    var lines = content.split("\n");
    var name = targetId.replace(/^tv:/, "");
    var logo = "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/canli/default_tv.png";
    var searchKey = cleanKey(targetId.replace(/^tv:/, ""));
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (line.indexOf("#EXTINF") !== -1) {
        var tvgIdMatch = line.match(/tvg-id="([^"]+)"/i);
        var tvgNameMatch = line.match(/tvg-name="([^"]+)"/i);
        var nameMatch = line.match(/"\s*,\s*(.+)$/);
        var aliasName = nameMatch ? nameMatch[1].trim() : line.split(",").pop().trim();
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
        name,
        poster: logo,
        background: logo,
        description: name + " Canl\u0131 Yay\u0131n",
        videos: [{
          id: targetId,
          title: name,
          released: (/* @__PURE__ */ new Date()).toISOString()
        }]
      }
    };
  }).catch(function() {
    return {
      meta: {
        id: targetId,
        type: "tv",
        name: "Canl\u0131 Yay\u0131n",
        poster: "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/canli/default_tv.png",
        videos: [{ id: targetId, title: "Yay\u0131n\u0131 Ba\u015Flat" }]
      }
    };
  });
}
var KNOWN_BACKUPS = {
  "trt1": "https://tv-trt1.medya.trt.com.tr/master.m3u8",
  "trtspor": "https://tv-trtspor1.medya.trt.com.tr/master.m3u8",
  "trtsporyildiz": "https://tv-trtspor2.medya.trt.com.tr/master.m3u8",
  "trthaber": "https://tv-trthaber.medya.trt.com.tr/master.m3u8",
  "trtbelgesel": "https://tv-trtbelgesel-dai.medya.trt.com.tr/master.m3u8",
  "trtcocuk": "https://tv-trtcocuk.medya.trt.com.tr/master.m3u8",
  "trtmuzik": "https://tv-trtmuzik.medya.trt.com.tr/master.m3u8",
  "tv85": "https://tv8.daioncdn.net/tv8bucuk/tv8bucuk.m3u8?app=tv8bucuk_web&ce=3"
};
function isEncryptedChannel(name, id) {
  var key = (name || "").toLowerCase() + " " + (id || "").toLowerCase();
  return /bein|ssport|sspor|tivibu|smartspor|smarts|exxen|tabii|eurosport|nba/.test(key);
}
function getStreams(args) {
  var targetId = typeof args === "string" ? args : args ? args.id : "";
  if (!targetId) {
    var empty = [];
    empty.streams = [];
    return Promise.resolve(empty);
  }
  return fetchChannels().then(function(content) {
    var lines = content.split("\n");
    var streams = [];
    var seenUrls = {};
    var searchKey = cleanKey(targetId.replace(/^tv:/, ""));
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (line.indexOf("#EXTINF") !== -1) {
        var tvgIdMatch = line.match(/tvg-id="([^"]+)"/i);
        var tvgNameMatch = line.match(/tvg-name="([^"]+)"/i);
        var nameMatch = line.match(/"\s*,\s*(.+)$/);
        var aliasName = nameMatch ? nameMatch[1].trim() : line.split(",").pop().trim();
        var cId = cleanKey(tvgIdMatch ? tvgIdMatch[1] : "");
        var cName = cleanKey(tvgNameMatch ? tvgNameMatch[1] : "");
        var aName = cleanKey(aliasName);
        if (cId === searchKey || cName === searchKey || aName === searchKey || aName.length > 2 && (aName.includes(searchKey) || searchKey.includes(aName))) {
          var encrypted = isEncryptedChannel(aliasName, cId);
          for (var j = i + 1; j < lines.length; j++) {
            var urlLine = lines[j].trim();
            if (urlLine && urlLine.indexOf("http") === 0) {
              if (!seenUrls[urlLine]) {
                seenUrls[urlLine] = true;
                var ytMatch = urlLine.match(/(?:watch\?v=|embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
                var sObj = {
                  name: encrypted ? "\u231C Anthology Spor \u231F" : "\u231C Anthology \u231F",
                  title: aliasName + (ytMatch ? " [Canl\u0131 HD \xB7 YouTube]" : " [Canl\u0131 HD]"),
                  url: urlLine,
                  behaviorHints: { isLive: true }
                };
                if (ytMatch) {
                  sObj.ytId = ytMatch[1];
                } else if (encrypted) {
                  sObj.headers = {
                    "User-Agent": _HEADERS["User-Agent"],
                    "Referer": "https://mahsunsports80.xyz/",
                    "Origin": "https://mahsunsports80.xyz"
                  };
                } else {
                  sObj.headers = _HEADERS;
                }
                streams.push(sObj);
              }
              break;
            }
            if (urlLine.indexOf("#EXTINF") === 0) break;
          }
          for (var bk in KNOWN_BACKUPS) {
            if ((cId === bk || searchKey === bk) && !seenUrls[KNOWN_BACKUPS[bk]] && KNOWN_BACKUPS[bk] !== urlLine) {
              seenUrls[KNOWN_BACKUPS[bk]] = true;
              streams.push({
                name: "\u231C Anthology \u231F",
                title: aliasName + " [Yedek Ak\u0131\u015F]",
                url: KNOWN_BACKUPS[bk],
                headers: _HEADERS,
                behaviorHints: { isLive: true }
              });
            }
          }
        }
      }
      if (streams.length >= 3) break;
    }
    streams.streams = streams;
    return streams;
  }).catch(function() {
    var empty2 = [];
    empty2.streams = [];
    return empty2;
  });
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams, getMeta, getCatalog };
} else {
  var g = typeof globalThis !== "undefined" ? globalThis : typeof global !== "undefined" ? global : window;
  g.getStreams = getStreams;
  g.getMeta = getMeta;
  g.getCatalog = getCatalog;
}
