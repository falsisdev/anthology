/**
 * Anthology Provider: anthology_haber
 * Built from src/anthology_haber/index.js
 * Build Date: 2026-09-18T16:40:17.290Z
 */
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// src/shared/quality.js
var require_quality = __commonJS({
  "src/shared/quality.js"(exports2, module2) {
    function getQualityScore(s) {
      if (!s) return 0;
      var q = ((s.quality || "") + " " + (s.title || "") + " " + (s.name || "")).toLowerCase();
      var score = 0;
      if (/\b(4k|2160p?|uhd)\b/.test(q)) score = 2160;
      else if (/\b(2k|1440p?|qhd)\b/.test(q)) score = 1440;
      else if (/\b(1080p?|fhd)\b/.test(q)) score = 1080;
      else if (/\b(720p?|hd)\b/.test(q)) score = 720;
      else if (/\b(540p?)\b/.test(q)) score = 540;
      else if (/\b(480p?|sd)\b/.test(q)) score = 480;
      else if (/\b(360p?)\b/.test(q)) score = 360;
      else if (/\b(240p?)\b/.test(q)) score = 240;
      if (score === 0 && s.title) {
        var text = s.title.toLowerCase();
        if (/\b(4k|2160p|uhd)\b/.test(text)) score = 2160;
        else if (/\b(2k|1440p|qhd)\b/.test(text)) score = 1440;
        else if (/\b(1080p|fhd)\b/.test(text)) score = 1080;
        else if (/\b(720p|hd)\b/.test(text)) score = 720;
        else if (/\b(480p|sd)\b/.test(text)) score = 480;
        else if (/\b(360p)\b/.test(text)) score = 360;
        else if (/\b(240p)\b/.test(text)) score = 240;
      }
      if (score === 0 && s.url) {
        var u = s.url.toLowerCase();
        if (/[\/_.-](2160p?|4k)[\/_.-]/.test(u)) score = 2160;
        else if (/[\/_.-](1440p?|2k)[\/_.-]/.test(u)) score = 1440;
        else if (/[\/_.-](1080p?|fhd)[\/_.-]/.test(u)) score = 1080;
        else if (/[\/_.-](720p?|hd)[\/_.-]/.test(u)) score = 720;
        else if (/[\/_.-](480p?|sd)[\/_.-]/.test(u)) score = 480;
        else if (/[\/_.-](360p?)[\/_.-]/.test(u)) score = 360;
      }
      var isDirectMp4 = s.format === "mp4" || s.type === "mp4" || !s.isHls && s.url && (s.url.endsWith(".mp4") || s.url.includes(".mp4?"));
      if (isDirectMp4 && score > 0) score += 1;
      return score;
    }
    function sortStreamsByQuality2(streams) {
      if (!Array.isArray(streams) || streams.length === 0) return streams;
      return streams.slice().sort(function(a, b) {
        return getQualityScore(b) - getQualityScore(a);
      });
    }
    module2.exports = {
      getQualityScore,
      sortStreamsByQuality: sortStreamsByQuality2
    };
  }
});

// src/shared/config.js
var require_config = __commonJS({
  "src/shared/config.js"(exports2, module2) {
    var CONFIG_URL = "https://raw.githubusercontent.com/falsisdev/anthology/main/config.json";
    var CONFIG_TTL_MS = 10 * 60 * 1e3;
    var _cfg = null;
    var _cfgTime = 0;
    function _cfgLocalRead() {
      try {
        if (typeof require === "undefined") return null;
        var fs2 = require("fs");
        var path2 = require("path");
        if (!fs2 || !path2 || typeof fs2.existsSync !== "function") return null;
        var dir = typeof __dirname !== "undefined" ? __dirname : "";
        var candidates = [
          path2.resolve(dir, "..", "config.json"),
          // providers/<name>.js
          path2.resolve(dir, "..", "..", "config.json"),
          // src/<name>/index.js
          path2.resolve(dir, "config.json")
        ];
        for (var i = 0; i < candidates.length; i++) {
          if (fs2.existsSync(candidates[i])) {
            return JSON.parse(fs2.readFileSync(candidates[i], "utf8"));
          }
        }
      } catch (e) {
        return null;
      }
      return null;
    }
    function _cfgFetch() {
      return fetch(CONFIG_URL, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "Accept": "application/json"
        }
      }).then(function(res) {
        if (!res || !res.ok) throw new Error("config.json " + (res && res.status));
        if (typeof res.json === "function") return res.json();
        return res.text().then(function(t) {
          return JSON.parse(t);
        });
      });
    }
    function loadConfig2() {
      var now = Date.now();
      if (_cfg && now - _cfgTime < CONFIG_TTL_MS) return Promise.resolve(_cfg);
      var local = _cfgLocalRead();
      if (local && typeof local === "object") {
        _cfg = local;
        _cfgTime = now;
        return Promise.resolve(_cfg);
      }
      return _cfgFetch().then(function(c) {
        _cfg = c && typeof c === "object" ? c : {};
        _cfgTime = now;
        return _cfg;
      }).catch(function() {
        _cfg = null;
        _cfgTime = now;
        return _cfg;
      });
    }
    function val2(pathStr) {
      if (!_cfg || !pathStr) return void 0;
      var parts = String(pathStr).split(".");
      var cur = _cfg;
      for (var i = 0; i < parts.length; i++) {
        if (cur == null || typeof cur !== "object") return void 0;
        cur = cur[parts[i]];
      }
      return cur;
    }
    function wrapAll2(obj, pre) {
      var out = {};
      for (var k in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, k)) {
          if (typeof obj[k] === "function") {
            (function(name, fn) {
              out[name] = function() {
                var self = this;
                var args = arguments;
                var chain = pre ? pre() : Promise.resolve();
                return chain.then(function() {
                  return fn.apply(self, args);
                });
              };
            })(k, obj[k]);
          } else {
            out[k] = obj[k];
          }
        }
      }
      return out;
    }
    if (typeof module2 !== "undefined" && module2.exports) {
      module2.exports = { loadConfig: loadConfig2, val: val2, wrapAll: wrapAll2 };
    }
  }
});

// src/anthology_haber/index.js
var { sortStreamsByQuality } = require_quality();
var { loadConfig, val, wrapAll } = require_config();
var _cfgReady = null;
function cfgReady() {
  if (!_cfgReady) {
    _cfgReady = loadConfig().then(function() {
      var v;
      v = val("urls.live.m3u_remote");
      if (v) M3U_REMOTE = String(v).replace(/\/+$/, "");
    });
  }
  return _cfgReady;
}
var path = typeof require !== "undefined" ? require("path") : null;
var fs = typeof require !== "undefined" ? require("fs") : null;
var M3U_REMOTE = "https://raw.githubusercontent.com/falsisdev/anthology/main/providers/M3U/Liste/canli.m3u";
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
  if (fs && path) {
    try {
      var localPath = path.resolve(__dirname, "M3U", "Liste", "canli.m3u");
      if (fs.existsSync(localPath)) {
        cachedText = fs.readFileSync(localPath, "utf8");
        cacheTime = now;
        return Promise.resolve(cachedText);
      }
    } catch (e) {
    }
  }
  return fetch(M3U_REMOTE, { headers: { "User-Agent": "Mozilla/5.0" } }).then(function(res) {
    return res.text();
  }).then(function(txt) {
    cachedText = txt;
    cacheTime = now;
    return txt;
  });
}
function cleanKey(s) {
  return (s || "").toString().toLowerCase().replace(/[^a-z0-9]/g, "");
}
function parseHaberChannels(content) {
  var lines = content.split("\n");
  var channels = [];
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (line.indexOf("#EXTINF") !== -1) {
      var groupMatch = line.match(/group-title="([^"]+)"/i);
      var group = groupMatch ? groupMatch[1] : "";
      if (group.indexOf("HABER") !== -1) {
        var tvgIdMatch = line.match(/tvg-id="([^"]+)"/i);
        var tvgNameMatch = line.match(/tvg-name="([^"]+)"/i);
        var logoMatch = line.match(/tvg-logo="([^"]+)"/i);
        var nameMatch = line.match(/"\s*,\s*(.+)$/);
        var channelName = nameMatch ? nameMatch[1].trim() : line.split(",").pop().trim();
        var rawId = tvgIdMatch && tvgIdMatch[1] ? tvgIdMatch[1].trim() : tvgNameMatch ? tvgNameMatch[1].trim() : channelName;
        var channelId = rawId.startsWith("tv:") ? rawId : "tv:" + rawId;
        var logo = logoMatch ? logoMatch[1] : "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/canli/default_tv.png";
        var streamUrl = "";
        for (var j = i + 1; j < lines.length; j++) {
          var u = lines[j].trim();
          if (u.indexOf("http") === 0) {
            streamUrl = u;
            break;
          }
          if (u.indexOf("#EXTINF") === 0) break;
        }
        channels.push({
          id: channelId,
          name: channelName,
          logo,
          url: streamUrl
        });
      }
    }
  }
  return channels;
}
function getCatalog(args) {
  return fetchChannels().then(function(content) {
    var channels = parseHaberChannels(content);
    var metas = channels.map(function(ch) {
      return {
        id: ch.id,
        type: "tv",
        name: ch.name,
        poster: ch.logo,
        background: ch.logo,
        genres: ["Haber"],
        description: ch.name + " Canl\u0131 Haber Yay\u0131n\u0131"
      };
    });
    return { metas };
  }).catch(function() {
    return { metas: [] };
  });
}
function getStreams(args) {
  var targetId = typeof args === "string" ? args : args ? args.id || args.name : "";
  return fetchChannels().then(function(content) {
    var channels = parseHaberChannels(content);
    if (!targetId && channels.length > 0) {
      return channels.slice(0, 5).map(function(ch2) {
        return {
          name: "\u231C Anthology Haber \u231F",
          title: ch2.name + " [Canl\u0131]",
          url: ch2.url,
          headers: _HEADERS,
          behaviorHints: { isLive: true }
        };
      });
    }
    var searchKey = cleanKey(targetId.replace(/^tv:/, ""));
    var streams = [];
    for (var i = 0; i < channels.length; i++) {
      var ch = channels[i];
      var cId = cleanKey(ch.id.replace(/^tv:/, ""));
      var cName = cleanKey(ch.name);
      if (cId === searchKey || cName === searchKey || searchKey && (cName.includes(searchKey) || searchKey.includes(cName))) {
        var ytMatch = (ch.url || "").match(/(?:watch\?v=|embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        if (ytMatch) {
          streams.push({
            name: "\u231C Anthology Haber \u231F",
            title: ch.name + " [Canl\u0131 HD \xB7 YouTube]",
            ytId: ytMatch[1],
            behaviorHints: { isLive: true }
          });
        } else {
          streams.push({
            name: "\u231C Anthology Haber \u231F",
            title: ch.name + " [Canl\u0131 HD]",
            url: ch.url,
            headers: _HEADERS,
            behaviorHints: { isLive: true }
          });
        }
        break;
      }
    }
    streams.streams = streams;
    return streams;
  }).catch(function() {
    var empty = [];
    empty.streams = [];
    return empty;
  });
}
if (typeof getStreams === "function") {
  _origGetStreams = getStreams;
  getStreams = function() {
    return __async(this, arguments, function* () {
      var res = yield _origGetStreams.apply(this, arguments);
      return sortStreamsByQuality(res);
    });
  };
}
var _origGetStreams;
if (typeof module !== "undefined" && module.exports) {
  module.exports = wrapAll({ getStreams, getCatalog }, cfgReady);
} else {
  g = typeof globalThis !== "undefined" ? globalThis : typeof global !== "undefined" ? global : window;
  g.getStreams = getStreams;
  g.getCatalog = getCatalog;
}
var g;
function getMeta(args) {
  var targetId = typeof args === "string" ? args : args && args.id ? args.id : null;
  if (!targetId) return Promise.resolve({ meta: null });
  return fetchChannels().then(function(content) {
    var channels = parseHaberChannels(content);
    var cleanTarget = cleanKey(targetId.replace(/^tv:/, ""));
    var ch = channels.find(function(c) {
      return c.id === targetId || cleanKey(c.id.replace(/^tv:/, "")) === cleanTarget || cleanKey(c.name) === cleanTarget;
    }) || channels[0];
    return {
      meta: {
        id: targetId,
        type: "tv",
        name: ch.name,
        poster: ch.logo,
        background: ch.logo,
        description: ch.name + " Canl\u0131 Haber Yay\u0131n\u0131",
        genres: ["Haber"],
        videos: [{ id: targetId, title: ch.name, released: (/* @__PURE__ */ new Date()).toISOString() }]
      }
    };
  }).catch(function() {
    return { meta: null };
  });
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams, getCatalog, getMeta };
} else {
  g = typeof globalThis !== "undefined" ? globalThis : typeof global !== "undefined" ? global : window;
  g.getStreams = getStreams;
  g.getCatalog = getCatalog;
  g.getMeta = getMeta;
}
var g;

if (typeof globalThis !== 'undefined' && typeof module !== 'undefined' && module.exports) {
    if (module.exports.getStreams) globalThis.getStreams = module.exports.getStreams;
    if (module.exports.getCatalog) globalThis.getCatalog = module.exports.getCatalog;
    if (module.exports.getMeta) globalThis.getMeta = module.exports.getMeta;
    if (module.exports.getSubtitles) globalThis.getSubtitles = module.exports.getSubtitles;
}

