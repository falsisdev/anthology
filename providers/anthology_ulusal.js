/**
 * Anthology Provider: anthology_ulusal
 * Built from src/anthology_ulusal/index.js
 * Build: v1.8.22 (anthology build system)
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
      if (!s.url) return 1;
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

// src/shared/epg.js
var require_epg = __commonJS({
  "src/shared/epg.js"(exports2, module2) {
    var SAMPLE_SCHEDULES = {
      "trt1": [
        { start: "06:00", end: "09:00", title: "Sabah Haberleri & G\xFCndem" },
        { start: "09:00", end: "10:30", title: "Ali\u015Fan ile Hayata G\xFCl\xFCmse" },
        { start: "10:30", end: "13:00", title: "Yerli Dizi / Sinema Ku\u015Fa\u011F\u0131" },
        { start: "13:00", end: "14:00", title: "TRT 1 G\xFCn Ortas\u0131 Haberleri" },
        { start: "14:00", end: "17:00", title: "G\xF6n\xFCl Da\u011F\u0131 / Nostalji Ku\u015Fa\u011F\u0131" },
        { start: "17:00", end: "19:00", title: "Ana Haber \xD6ncesi Akt\xFCalite" },
        { start: "19:00", end: "20:00", title: "TRT 1 Ana Haber" },
        { start: "20:00", end: "23:30", title: "Te\u015Fkilat / Kud\xFCs Fatihi Selahaddin Eyyubi" },
        { start: "23:30", end: "02:00", title: "Gece Ku\u015Fa\u011F\u0131 / Sinema" }
      ],
      "trtgenc": [
        { start: "08:00", end: "10:00", title: "Gen\xE7 Bak\u0131\u015F & Teknoloji Trendleri" },
        { start: "10:00", end: "12:00", title: "Oyun D\xFCnyas\u0131 & Espor G\xFCndemi" },
        { start: "12:00", end: "14:00", title: "Gen\xE7lik Dizileri Ku\u015Fa\u011F\u0131" },
        { start: "14:00", end: "16:00", title: "Bilim, Sanat ve Giri\u015Fimcilik" },
        { start: "16:00", end: "18:00", title: "Kamp\xFCs Hayat\u0131 & \xDCniversite Sohbetleri" },
        { start: "18:00", end: "20:00", title: "M\xFCzik & Gen\xE7 Ritimler" },
        { start: "20:00", end: "22:00", title: "Gelecek Sensin! \xD6zel Gen\xE7lik Program\u0131" },
        { start: "22:00", end: "00:00", title: "Espor Kar\u015F\u0131la\u015Fmalar\u0131 & Konserler" }
      ],
      "atv": [
        { start: "06:30", end: "10:00", title: "Kahvalt\u0131 Haberleri" },
        { start: "10:00", end: "13:00", title: "M\xFCge Anl\u0131 ile Tatl\u0131 Sert" },
        { start: "13:00", end: "14:00", title: "atv G\xFCn Ortas\u0131" },
        { start: "14:00", end: "16:00", title: "Mutfak Bahane" },
        { start: "16:00", end: "19:00", title: "Esra Erol'da" },
        { start: "19:00", end: "20:00", title: "atv Ana Haber" },
        { start: "20:00", end: "23:30", title: "Kurulu\u015F Osman / Aldatmak" },
        { start: "23:30", end: "02:00", title: "Gece Ku\u015Fa\u011F\u0131 Dizisi" }
      ],
      "kanald": [
        { start: "07:00", end: "09:00", title: "Kanal D Sabah Haberleri" },
        { start: "09:00", end: "11:00", title: "Neler Oluyor Hayatta?" },
        { start: "11:00", end: "13:00", title: "Gelinim Mutfakta" },
        { start: "13:00", end: "16:00", title: "Arka Sokaklar Ku\u015Fa\u011F\u0131" },
        { start: "16:00", end: "19:00", title: "Bizi Birle\u015Ftiren Hayat" },
        { start: "19:00", end: "20:00", title: "Kanal D Ana Haber" },
        { start: "20:00", end: "23:30", title: "\u0130nci Taneleri / Yarg\u0131" },
        { start: "23:30", end: "02:00", title: "Yabanc\u0131 Sinema Ku\u015Fa\u011F\u0131" }
      ],
      "trtspor": [
        { start: "07:00", end: "10:00", title: "\u0130lk Bask\u0131 & Sabah Sporu" },
        { start: "10:00", end: "12:00", title: "Spor B\xFClteni & S\xFCper Lig \xD6zetleri" },
        { start: "12:00", end: "14:00", title: "G\xFCn\xFCn \u0130\xE7inden & Transfer G\xFCndemi" },
        { start: "14:00", end: "17:00", title: "Canl\u0131 Ma\xE7 Ku\u015Fa\u011F\u0131 / 1. Lig & Voleybol" },
        { start: "17:00", end: "19:00", title: "Spor St\xFCdyosu" },
        { start: "19:00", end: "21:00", title: "Ma\xE7 \xD6n\xFC & \xD6zel R\xF6portajlar" },
        { start: "21:00", end: "23:30", title: "Futbol Akl\u0131 / Canl\u0131 Ma\xE7 Yay\u0131n\u0131" },
        { start: "23:30", end: "01:30", title: "Teknik Analiz & Gece Sporu" }
      ]
    };
    function parseTimeToMinutes(t) {
      if (!t) return 0;
      var parts = t.split(":");
      return parseInt(parts[0], 10) * 60 + parseInt(parts[1] || "0", 10);
    }
    function getNowPlayingInfo2(channelKey, channelName) {
      var key = (channelKey || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      var sched = SAMPLE_SCHEDULES[key];
      if (!sched) {
        for (var k in SAMPLE_SCHEDULES) {
          if (key.indexOf(k) !== -1 || k.indexOf(key) !== -1) {
            sched = SAMPLE_SCHEDULES[k];
            break;
          }
        }
      }
      if (!sched || !sched.length) {
        return {
          current: channelName + " 7/24 Kesintisiz Canl\u0131 Yay\u0131n",
          next: "Yay\u0131n Ak\u0131\u015F\u0131 Devam Ediyor",
          timeSlot: "CANLI",
          formattedText: channelName + " Canl\u0131 HD Yay\u0131n."
        };
      }
      var now = /* @__PURE__ */ new Date();
      var istanbulHour = (now.getUTCHours() + 3) % 24;
      var istanbulMin = now.getUTCMinutes();
      var currentMin = istanbulHour * 60 + istanbulMin;
      var cur = null;
      var nxt = null;
      for (var i = 0; i < sched.length; i++) {
        var sMin = parseTimeToMinutes(sched[i].start);
        var eMin = parseTimeToMinutes(sched[i].end);
        if (eMin < sMin) {
          if (currentMin >= sMin || currentMin < eMin) {
            cur = sched[i];
            nxt = sched[(i + 1) % sched.length];
            break;
          }
        } else if (currentMin >= sMin && currentMin < eMin) {
          cur = sched[i];
          nxt = sched[(i + 1) % sched.length];
          break;
        }
      }
      if (!cur) {
        cur = sched[sched.length - 1];
        nxt = sched[0];
      }
      var timeStr = cur.start + " - " + cur.end;
      var formatted = "\u{1F534} YAYINDA: " + cur.title + " (" + timeStr + ")\n\u25B6 SIRADAK\u0130: " + (nxt ? nxt.title + " [" + nxt.start + "]" : "Program Ak\u0131\u015F\u0131");
      return {
        current: cur.title,
        next: nxt ? nxt.title : "",
        timeSlot: timeStr,
        formattedText: formatted
      };
    }
    module2.exports = {
      getNowPlayingInfo: getNowPlayingInfo2
    };
  }
});

// src/shared/channel_lang.js
var require_channel_lang = __commonJS({
  "src/shared/channel_lang.js"(exports2, module2) {
    var CHANNEL_LANG_LABELS = {
      tr: "T\xFCrk\xE7e",
      en: "\u0130ngilizce",
      az: "Azerbaycan T\xFCrk\xE7esi",
      ar: "Arap\xE7a",
      ku: "K\xFCrt\xE7e",
      de: "Almanca",
      fr: "Frans\u0131zca",
      ru: "Rus\xE7a",
      es: "\u0130spanyolca",
      it: "\u0130talyanca"
    };
    var DEFAULT_CHANNEL_LANG = "tr";
    function parseTvgLang2(extinfLine) {
      var line = extinfLine || "";
      var m = line.match(/tvg-lang="([^"]+)"/i);
      if (!m) m = line.match(/tvg-language="([^"]+)"/i);
      return m ? String(m[1]).trim().toLowerCase() : "";
    }
    function channelLangLabel(code) {
      var key = (code || "").toString().trim().toLowerCase();
      if (!key) key = DEFAULT_CHANNEL_LANG;
      return CHANNEL_LANG_LABELS[key] || CHANNEL_LANG_LABELS[DEFAULT_CHANNEL_LANG];
    }
    function channelDescription2(channelName, langCode) {
      return (channelName || "") + " Canl\u0131 [" + channelLangLabel(langCode) + "]";
    }
    module2.exports = {
      CHANNEL_LANG_LABELS,
      parseTvgLang: parseTvgLang2,
      channelLangLabel,
      channelDescription: channelDescription2
    };
  }
});

// src/anthology_ulusal/index.js
var { sortStreamsByQuality } = require_quality();
var { loadConfig, val, wrapAll } = require_config();
var { getNowPlayingInfo } = require_epg();
var { parseTvgLang, channelDescription } = require_channel_lang();
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
function parseUlusalChannels(content) {
  var lines = content.split("\n");
  var channels = [];
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (line.indexOf("#EXTINF") !== -1) {
      var groupMatch = line.match(/group-title="([^"]+)"/i);
      var group = groupMatch ? groupMatch[1] : "";
      if (group.indexOf("ULUSAL") !== -1) {
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
        var backups = [];
        var b1 = line.match(/tvg-backup="([^"]+)"/i);
        var b2 = line.match(/tvg-backup2="([^"]+)"/i);
        if (b1) b1[1].split("|").forEach(function(u2) {
          if (u2 && u2.trim()) backups.push(u2.trim());
        });
        if (b2) b2[1].split("|").forEach(function(u2) {
          if (u2 && u2.trim()) backups.push(u2.trim());
        });
        channels.push({
          id: channelId,
          name: channelName,
          logo,
          url: streamUrl,
          backups,
          lang: parseTvgLang(line)
        });
      }
    }
  }
  return channels;
}
function getCatalog(args) {
  return fetchChannels().then(function(content) {
    var channels = parseUlusalChannels(content);
    var metas = channels.map(function(ch) {
      return {
        id: ch.id,
        type: "tv",
        name: ch.name,
        poster: ch.logo,
        background: ch.logo,
        genres: ["Ulusal"],
        description: channelDescription(ch.name, ch.lang)
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
    var channels = parseUlusalChannels(content);
    if (!targetId && channels.length > 0) {
      return channels.slice(0, 5).map(function(ch2) {
        return {
          name: "\u231C Anthology Ulusal \u231F",
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
        streams.push({
          name: "\u231C Anthology Ulusal \u231F",
          title: ch.name + " [Canl\u0131 HD]",
          url: ch.url,
          headers: _HEADERS,
          behaviorHints: { isLive: true }
        });
        if (ch.backups && ch.backups.length > 0) {
          for (var bkIdx = 0; bkIdx < ch.backups.length; bkIdx++) {
            var bUrl = ch.backups[bkIdx];
            if (bUrl !== ch.url) {
              var bLabel = ch.name + (ch.backups.length > 1 ? " [Yedek Ak\u0131\u015F " + (bkIdx + 1) + "]" : " [Yedek Ak\u0131\u015F]");
              streams.push({
                name: "\u231C Anthology Ulusal \u231F",
                title: bLabel,
                url: bUrl,
                headers: _HEADERS,
                behaviorHints: { isLive: true }
              });
            }
          }
        }
        break;
      }
    }
    if (streams.length === 0 && channels.length > 0) {
      streams.push({
        name: "\u231C Anthology Ulusal \u231F",
        title: channels[0].name + " [Canl\u0131 HD]",
        url: channels[0].url,
        headers: _HEADERS,
        behaviorHints: { isLive: true }
      });
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
    var channels = parseUlusalChannels(content);
    var cleanTarget = cleanKey(targetId.replace(/^tv:/, ""));
    var ch = channels.find(function(c) {
      return c.id === targetId || cleanKey(c.id.replace(/^tv:/, "")) === cleanTarget || cleanKey(c.name) === cleanTarget;
    }) || channels[0];
    var epg = getNowPlayingInfo(cleanTarget, ch.name);
    return {
      meta: {
        id: targetId,
        type: "tv",
        name: ch.name,
        poster: ch.logo,
        background: ch.logo,
        description: epg && epg.formattedText ? channelDescription(ch.name, ch.lang) + "\n" + epg.formattedText : channelDescription(ch.name, ch.lang),
        genres: ["Ulusal"],
        videos: [{ id: targetId, title: epg && epg.current ? epg.current : ch.name, released: (/* @__PURE__ */ new Date()).toISOString() }]
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

