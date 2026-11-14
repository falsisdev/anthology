/**
 * Anthology Provider: anthology_sinema
 * Built from src/anthology_sinema/index.js
 * Build: v1.8.39 (anthology build system)
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
    function parseTvgLang(extinfLine) {
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
    function channelDescription(channelName, langCode) {
      return (channelName || "") + " Canl\u0131 [" + channelLangLabel(langCode) + "]";
    }
    module2.exports = {
      CHANNEL_LANG_LABELS,
      parseTvgLang,
      channelLangLabel,
      channelDescription
    };
  }
});

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
    function sortStreamsByQuality(streams) {
      if (!Array.isArray(streams) || streams.length === 0) return streams;
      return streams.slice().sort(function(a, b) {
        return getQualityScore(b) - getQualityScore(a);
      });
    }
    module2.exports = {
      getQualityScore,
      sortStreamsByQuality
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
        var fs = require("fs");
        var path = require("path");
        if (!fs || !path || typeof fs.existsSync !== "function") return null;
        var dir = typeof __dirname !== "undefined" ? __dirname : "";
        var candidates = [
          path.resolve(dir, "..", "config.json"),
          // providers/<name>.js
          path.resolve(dir, "..", "..", "config.json"),
          // src/<name>/index.js
          path.resolve(dir, "config.json")
        ];
        for (var i = 0; i < candidates.length; i++) {
          if (fs.existsSync(candidates[i])) {
            return JSON.parse(fs.readFileSync(candidates[i], "utf8"));
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
    function loadConfig() {
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
    function val(pathStr) {
      if (!_cfg || !pathStr) return void 0;
      var parts = String(pathStr).split(".");
      var cur = _cfg;
      for (var i = 0; i < parts.length; i++) {
        if (cur == null || typeof cur !== "object") return void 0;
        cur = cur[parts[i]];
      }
      return cur;
    }
    function wrapAll(obj, pre) {
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
      module2.exports = { loadConfig, val, wrapAll };
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
    function getNowPlayingInfo(channelKey, channelName) {
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
      getNowPlayingInfo
    };
  }
});

// src/shared/http.js
var require_http = __commonJS({
  "src/shared/http.js"(exports2, module2) {
    var DEFAULT_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
    function timeoutSignal(ms) {
      if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
        return AbortSignal.timeout(ms);
      }
      var controller = new AbortController();
      setTimeout(function() {
        controller.abort();
      }, ms);
      return controller.signal;
    }
    function fetchWithTimeout(url, options, ms) {
      ms = ms || 1e4;
      options = options || {};
      if (!options.signal) {
        options.signal = timeoutSignal(ms);
      }
      if (!options.headers) {
        options.headers = {};
      }
      if (!options.headers["User-Agent"] && !options.headers["user-agent"]) {
        options.headers["User-Agent"] = DEFAULT_UA;
      }
      return fetch(url, options);
    }
    module2.exports = {
      DEFAULT_UA,
      timeoutSignal,
      fetchWithTimeout
    };
  }
});

// src/shared/live_tv_engine.js
var require_live_tv_engine = __commonJS({
  "src/shared/live_tv_engine.js"(exports2, module2) {
    var { parseTvgLang, channelDescription } = require_channel_lang();
    var { sortStreamsByQuality } = require_quality();
    var { loadConfig, val, wrapAll } = require_config();
    var { getNowPlayingInfo } = require_epg();
    var { timeoutSignal } = require_http();
    var DEFAULT_M3U_REMOTE = "https://raw.githubusercontent.com/falsisdev/anthology/main/providers/M3U/Liste/canli.m3u";
    var DEFAULT_LOGO = "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/canli/default_tv.png";
    var _HEADERS = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "*/*"
    };
    var M3U_REMOTE = DEFAULT_M3U_REMOTE;
    var _cfgReady = null;
    var cachedText = null;
    var cacheTime = 0;
    function cfgReady() {
      if (!_cfgReady) {
        _cfgReady = loadConfig().then(function() {
          var v = val("urls.live.m3u_remote");
          if (v) M3U_REMOTE = String(v).replace(/\/+$/, "");
        });
      }
      return _cfgReady;
    }
    function getNodeModules() {
      if (typeof process === "undefined" || !process.versions || !process.versions.node || typeof require === "undefined") {
        return null;
      }
      try {
        return {
          path: require("path"),
          fs: require("fs")
        };
      } catch (e) {
        return null;
      }
    }
    function fetchChannels() {
      var now = Date.now();
      if (cachedText && now - cacheTime < 3e5) {
        return Promise.resolve(cachedText);
      }
      var nodeMods = getNodeModules();
      if (nodeMods && nodeMods.fs && nodeMods.path) {
        var candidates = [];
        try {
          if (typeof __dirname === "string") {
            candidates.push(nodeMods.path.resolve(__dirname, "M3U", "Liste", "canli.m3u"));
            candidates.push(nodeMods.path.resolve(__dirname, "..", "..", "providers", "M3U", "Liste", "canli.m3u"));
          }
          if (typeof process !== "undefined" && typeof process.cwd === "function") {
            candidates.push(nodeMods.path.resolve(process.cwd(), "providers", "M3U", "Liste", "canli.m3u"));
          }
          for (var i = 0; i < candidates.length; i++) {
            if (candidates[i] && nodeMods.fs.existsSync(candidates[i])) {
              cachedText = nodeMods.fs.readFileSync(candidates[i], "utf8");
              cacheTime = now;
              return Promise.resolve(cachedText);
            }
          }
        } catch (e) {
        }
      }
      return fetch(M3U_REMOTE, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: timeoutSignal(12e3)
      }).then(function(res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.text();
      }).then(function(txt) {
        cachedText = txt;
        cacheTime = now;
        return txt;
      });
    }
    function cleanKey(s) {
      return (s || "").toString().replace(/İ/g, "I").replace(/ı/g, "i").toLowerCase().replace(/[^a-z0-9]/g, "");
    }
    function parseGroupChannels(content, matchGroup) {
      var lines = String(content || "").split("\n");
      var channels = [];
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (line.indexOf("#EXTINF") === -1) continue;
        var groupMatch = line.match(/group-title="([^"]+)"/i);
        var group = groupMatch ? groupMatch[1] : "";
        if (!matchGroup(group)) continue;
        var tvgIdMatch = line.match(/tvg-id="([^"]+)"/i);
        var tvgNameMatch = line.match(/tvg-name="([^"]+)"/i);
        var logoMatch = line.match(/tvg-logo="([^"]+)"/i);
        var nameMatch = line.match(/"\s*,\s*(.+)$/);
        var channelName = nameMatch ? nameMatch[1].trim() : line.split(",").pop().trim();
        var rawId = tvgIdMatch && tvgIdMatch[1] ? tvgIdMatch[1].trim() : tvgNameMatch ? tvgNameMatch[1].trim() : channelName;
        var channelId = rawId.indexOf("tv:") === 0 ? rawId : "tv:" + rawId;
        var logo = logoMatch ? logoMatch[1] : DEFAULT_LOGO;
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
      return channels;
    }
    function isRejectedNonLiveRequest(targetId, mediaType) {
      var raw = String(targetId || "").trim();
      if (!raw) return true;
      if (mediaType === "movie" || mediaType === "series") return true;
      if (raw.toLowerCase().indexOf("tv:") !== 0 && /^(?:tt\d+|\d+)(?::\d+:\d+)?$/i.test(raw)) {
        return true;
      }
      return false;
    }
    function findMatchingChannel(channels, targetId) {
      var raw = String(targetId || "").trim();
      var searchKey = cleanKey(raw.replace(/^tv:/i, ""));
      if (!searchKey) return null;
      for (var i = 0; i < channels.length; i++) {
        var ch = channels[i];
        var cId = cleanKey(ch.id.replace(/^tv:/i, ""));
        var cName = cleanKey(ch.name);
        if (ch.id === raw || cId === searchKey || cName === searchKey) {
          return ch;
        }
      }
      if (searchKey.length >= 4) {
        for (var j = 0; j < channels.length; j++) {
          var ch2 = channels[j];
          var cId2 = cleanKey(ch2.id.replace(/^tv:/i, ""));
          var cName2 = cleanKey(ch2.name);
          if (cName2.length >= 4 && (cName2.indexOf(searchKey) !== -1 || searchKey.indexOf(cName2) !== -1) || cId2.length >= 4 && (cId2.indexOf(searchKey) !== -1 || searchKey.indexOf(cId2) !== -1)) {
            return ch2;
          }
        }
      }
      return null;
    }
    function buildStreamEntry(streamName, baseName, liveLabel, url) {
      var ytMatch = (url || "").match(/(?:watch\?v=|embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      if (ytMatch) {
        return {
          name: streamName,
          title: baseName + " [Canl\u0131 HD \xB7 YouTube]",
          ytId: ytMatch[1],
          behaviorHints: { isLive: true }
        };
      }
      return {
        name: streamName,
        title: liveLabel,
        url,
        headers: _HEADERS,
        behaviorHints: { isLive: true }
      };
    }
    function createLiveTvProvider2(opts) {
      var streamName = opts.streamName;
      var genre = opts.genre;
      var matchGroup = opts.matchGroup;
      var useEpg = Boolean(opts.useEpg);
      function getCatalog() {
        return fetchChannels().then(function(content) {
          var channels = parseGroupChannels(content, matchGroup);
          var metas = channels.map(function(ch) {
            return {
              id: ch.id,
              type: "tv",
              name: ch.name,
              poster: ch.logo,
              background: ch.logo,
              genres: [genre],
              description: channelDescription(ch.name, ch.lang)
            };
          });
          return { metas };
        }).catch(function() {
          return { metas: [] };
        });
      }
      function getStreams(args) {
        return __async(this, null, function* () {
          var targetId = typeof args === "string" ? args : args ? args.id || args.name || "" : "";
          var mediaType = args && typeof args === "object" ? args.type || args.mediaType || "" : "";
          var empty = [];
          empty.streams = empty;
          if (isRejectedNonLiveRequest(targetId, mediaType)) {
            return empty;
          }
          try {
            var content = yield fetchChannels();
            var channels = parseGroupChannels(content, matchGroup);
            var ch = findMatchingChannel(channels, targetId);
            if (!ch) return empty;
            var streams = [];
            if (ch.url) {
              streams.push(buildStreamEntry(streamName, ch.name, ch.name + " [Canl\u0131 HD]", ch.url));
            }
            if (ch.backups && ch.backups.length > 0) {
              for (var bkIdx = 0; bkIdx < ch.backups.length; bkIdx++) {
                var bUrl = ch.backups[bkIdx];
                if (bUrl && bUrl !== ch.url) {
                  var bSuffix = ch.backups.length > 1 ? " [Yedek Ak\u0131\u015F " + (bkIdx + 1) + "]" : " [Yedek Ak\u0131\u015F]";
                  streams.push(buildStreamEntry(streamName, ch.name + bSuffix, ch.name + bSuffix, bUrl));
                }
              }
            }
            var sorted = sortStreamsByQuality(streams);
            sorted.streams = sorted;
            return sorted;
          } catch (e) {
            return empty;
          }
        });
      }
      function getMeta(args) {
        var targetId = typeof args === "string" ? args : args && args.id ? args.id : null;
        if (!targetId) return Promise.resolve({ meta: null });
        return fetchChannels().then(function(content) {
          var channels = parseGroupChannels(content, matchGroup);
          var ch = findMatchingChannel(channels, targetId);
          if (!ch) return { meta: null };
          var cleanTarget = cleanKey(String(targetId).replace(/^tv:/i, ""));
          var baseDesc = channelDescription(ch.name, ch.lang);
          var epg = useEpg ? getNowPlayingInfo(cleanTarget, ch.name) : null;
          var description = epg && epg.formattedText ? baseDesc + "\n" + epg.formattedText : baseDesc;
          var videoTitle = epg && epg.current ? epg.current : ch.name;
          return {
            meta: {
              id: targetId,
              type: "tv",
              name: ch.name,
              poster: ch.logo,
              background: ch.logo,
              description,
              genres: [genre],
              videos: [{ id: targetId, title: videoTitle, released: (/* @__PURE__ */ new Date()).toISOString() }]
            }
          };
        }).catch(function() {
          return { meta: null };
        });
      }
      return wrapAll({
        getStreams,
        getCatalog,
        getMeta
      }, cfgReady);
    }
    module2.exports = {
      createLiveTvProvider: createLiveTvProvider2,
      cfgReady
    };
  }
});

// src/anthology_sinema/index.js
var { createLiveTvProvider } = require_live_tv_engine();
var provider = createLiveTvProvider({
  streamName: "\u231C Anthology Sinema \u231F",
  genre: "Sinema",
  matchGroup: function(group) {
    var g = (group || "").toString().toUpperCase().replace(/İ/g, "I");
    return g.indexOf("SINEMA") !== -1;
  }
});
if (typeof module !== "undefined" && module.exports) {
  module.exports = provider;
}
if (typeof globalThis !== "undefined") {
  globalThis.getStreams = provider.getStreams;
  globalThis.getCatalog = provider.getCatalog;
  globalThis.getMeta = provider.getMeta;
}

if (typeof globalThis !== 'undefined' && typeof module !== 'undefined' && module.exports) {
    if (module.exports.getStreams) globalThis.getStreams = module.exports.getStreams;
    if (module.exports.getCatalog) globalThis.getCatalog = module.exports.getCatalog;
    if (module.exports.getMeta) globalThis.getMeta = module.exports.getMeta;
    if (module.exports.getSubtitles) globalThis.getSubtitles = module.exports.getSubtitles;
}

