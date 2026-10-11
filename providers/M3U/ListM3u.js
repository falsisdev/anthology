/**
 * Anthology Provider: m3u_list
 * Built from src/m3u_list/index.js
 * Build: v1.8.27 (anthology build system)
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

// src/m3u_list/index.js
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
      if (v) M3U_URL = String(v).replace(/\/+$/, "");
      v = val("urls.live.taraftarium.base");
      if (v) TARAFTARIUM_SITE = String(v);
      v = val("urls.live.taraftarium.api_base");
      if (v) TARAFTARIUM_API = String(v).replace(/\/+$/, "");
      v = val("urls.live.taraftarium.base_number");
      if (v && !isNaN(Number(v))) TARAFTARIUM_BASE_NUM = Number(v);
      if (_TARAFTARIUM_HEADERS) {
        _TARAFTARIUM_HEADERS.Referer = TARAFTARIUM_SITE;
        _TARAFTARIUM_HEADERS.Origin = TARAFTARIUM_SITE;
      }
    });
  }
  return _cfgReady;
}
var M3U_URL = "https://raw.githubusercontent.com/falsisdev/anthology/main/providers/M3U/Liste/canli.m3u";
var TARAFTARIUM_SITE = "https://taraftarium24-245.top/";
var TARAFTARIUM_API = "https://teletv15.top";
var TARAFTARIUM_BASE_NUM = 245;
var TARAFTARIUM_LOGO = "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/canli/taraftarium24.png";
var _HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "*/*"
};
var _TARAFTARIUM_HEADERS = {
  "User-Agent": _HEADERS["User-Agent"],
  "Referer": TARAFTARIUM_SITE,
  "Origin": TARAFTARIUM_SITE
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
          description: channelDescription(channelName, parseTvgLang(line))
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
var TARAFTARIUM_CHANNELS = [
  { id: "bein-sports-1", name: "BEIN SPORTS 1", clean: "beinsports1" },
  { id: "bein-sports-2", name: "BEIN SPORTS 2", clean: "beinsports2" },
  { id: "bein-sports-3", name: "BEIN SPORTS 3", clean: "beinsports3" },
  { id: "bein-sports-4", name: "BEIN SPORTS 4", clean: "beinsports4" },
  { id: "bein-sports-5", name: "BEIN SPORTS 5", clean: "beinsports5" },
  { id: "bein-sports-max-1", name: "BEIN SPORTS MAX 1", clean: "beinsportsmax1" },
  { id: "bein-sports-max-2", name: "BEIN SPORTS MAX 2", clean: "beinsportsmax2" },
  { id: "s-sport", name: "S SPORT", clean: "ssport" },
  { id: "s-sport-2", name: "S SPORT 2", clean: "ssport2" },
  { id: "trt-spor", name: "TRT SPOR", clean: "trtspor" },
  { id: "trt-1", name: "TRT 1", clean: "trt1" },
  { id: "a-spor", name: "A SPOR", clean: "aspor" }
];
var TARAFTARIUM_ALIASES = {
  "beinsports1": "bein-sports-1",
  "beinsports1tr": "bein-sports-1",
  "beinsports2": "bein-sports-2",
  "beinsports2tr": "bein-sports-2",
  "beinsports3": "bein-sports-3",
  "beinsports3tr": "bein-sports-3",
  "beinsports4": "bein-sports-4",
  "beinsports4tr": "bein-sports-4",
  "beinsports5": "bein-sports-5",
  "beinsports5tr": "bein-sports-5",
  "beinsportsmax1": "bein-sports-max-1",
  "beinsportsmax1tr": "bein-sports-max-1",
  "beinsportsmax2": "bein-sports-max-2",
  "beinsportsmax2tr": "bein-sports-max-2",
  "ssport": "s-sport",
  "ssport1": "s-sport",
  "ssporttr": "s-sport",
  "ssport2": "s-sport-2",
  "ssport2tr": "s-sport-2",
  "trtspor": "trt-spor",
  "trtsportr": "trt-spor",
  "trt1": "trt-1",
  "trt1tr": "trt-1",
  "aspor": "a-spor",
  "asportr": "a-spor"
};
function matchTaraftariumChannelId(rawStr) {
  if (!rawStr) return null;
  var k = cleanKey(rawStr).replace(/^tv/, "");
  if (TARAFTARIUM_ALIASES[k]) return TARAFTARIUM_ALIASES[k];
  for (var ak in TARAFTARIUM_ALIASES) {
    if (k.indexOf(ak) === 0 || ak.indexOf(k) === 0) return TARAFTARIUM_ALIASES[ak];
  }
  return null;
}
var _resolvedApi = null;
var _resolvedSite = null;
var _resolvedTime = 0;
var RESOLVER_TTL = 15 * 60 * 1e3;
function resolveActiveBase() {
  var now = Date.now();
  if (_resolvedApi && now - _resolvedTime < RESOLVER_TTL) {
    return Promise.resolve({ api: _resolvedApi, site: _resolvedSite });
  }
  var baseApi = _resolvedApi || TARAFTARIUM_API;
  var baseSite = _resolvedSite || TARAFTARIUM_SITE;
  var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  var tm = setTimeout(function() {
    if (ctrl) ctrl.abort();
  }, 3500);
  var opts = { headers: _HEADERS };
  if (ctrl) opts.signal = ctrl.signal;
  return fetch(baseApi + "/load/channels.php", opts).then(function(res) {
    clearTimeout(tm);
    if (res && res.status === 200) {
      _resolvedApi = baseApi;
      _resolvedSite = baseSite;
      _resolvedTime = now;
      return { api: _resolvedApi, site: _resolvedSite };
    }
    throw new Error("API status not 200");
  }).catch(function() {
    clearTimeout(tm);
    var num = TARAFTARIUM_BASE_NUM;
    var cands = [num, num + 1, num - 1, num + 2, num + 3, num + 4];
    var i = 0;
    function tryNextCandidate() {
      if (i >= cands.length) {
        _resolvedApi = baseApi;
        _resolvedSite = baseSite;
        _resolvedTime = now;
        return Promise.resolve({ api: _resolvedApi, site: _resolvedSite });
      }
      var curN = cands[i++];
      var candUrl = "https://taraftarium24-" + curN + ".top/";
      var cctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
      var ctm = setTimeout(function() {
        if (cctrl) cctrl.abort();
      }, 3e3);
      var copts = { headers: _HEADERS };
      if (cctrl) copts.signal = cctrl.signal;
      return fetch(candUrl, copts).then(function(r) {
        return r.text();
      }).then(function(html) {
        clearTimeout(ctm);
        if (!html) return tryNextCandidate();
        var apiM = html.match(/https:\/\/teletv\d+\.top/i) || html.match(/fetch\(['"](https:\/\/[^'"]*teletv[^'"]*top)/i);
        var foundApi = apiM ? apiM[1] || apiM[0] : baseApi;
        var activeSite = candUrl;
        var numM = html.match(/taraftarium24-(\d+)\.top/i);
        if (numM && numM[1]) {
          TARAFTARIUM_BASE_NUM = parseInt(numM[1], 10);
        }
        _resolvedApi = foundApi.replace(/\/+$/, "");
        _resolvedSite = activeSite;
        _resolvedTime = now;
        return { api: _resolvedApi, site: _resolvedSite };
      }).catch(function() {
        clearTimeout(ctm);
        return tryNextCandidate();
      });
    }
    return tryNextCandidate();
  });
}
function fetchTaraftariumStream(streamOrChannelId) {
  if (!streamOrChannelId) return Promise.resolve(null);
  return resolveActiveBase().then(function(base) {
    var apiUrl = base.api + "/load/yayinlink.php?id=" + encodeURIComponent(streamOrChannelId);
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var tm = setTimeout(function() {
      if (ctrl) ctrl.abort();
    }, 4500);
    var opts = { headers: _HEADERS };
    if (ctrl) opts.signal = ctrl.signal;
    return fetch(apiUrl, opts).then(function(res) {
      clearTimeout(tm);
      return res.json();
    }).then(function(data) {
      if (data && data.deismackanal && typeof data.deismackanal === "string" && data.deismackanal.indexOf("m3u8") !== -1) {
        var finalUrl = data.deismackanal.replace(/edge4\./g, "edge3.");
        return {
          url: finalUrl,
          headers: {
            "User-Agent": _HEADERS["User-Agent"],
            "Referer": base.site,
            "Origin": base.site
          }
        };
      }
      return null;
    }).catch(function() {
      clearTimeout(tm);
      return null;
    });
  });
}
var _cachedMatches = null;
var _cachedMatchesTime = 0;
var MATCHES_TTL = 3 * 60 * 1e3;
function fetchTaraftariumMatches() {
  var now = Date.now();
  if (_cachedMatches && now - _cachedMatchesTime < MATCHES_TTL) {
    return Promise.resolve(_cachedMatches);
  }
  return resolveActiveBase().then(function(base) {
    var matchesUrl = base.api + "/load/matches.php";
    return fetch(matchesUrl, { headers: _HEADERS }).then(function(res) {
      return res.text();
    }).then(function(html) {
      var regex = /<a[^>]*href="matches\?id=([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
      var m;
      var list = [];
      while ((m = regex.exec(html)) !== null) {
        var id = m[1];
        var body = m[2];
        var timeM = body.match(/class="event"[^>]*>\s*([^<]+)/);
        var homeM = body.match(/class="home"[^>]*>\s*([^<]+)/);
        var awayM = body.match(/class="away"[^>]*>\s*([^<]+)/);
        var typeM = m[0].match(/data-matchtype="([^"]+)"/);
        var sportType = typeM ? typeM[1].trim() : "Futbol";
        var timeStr = timeM ? timeM[1].trim() : "";
        var home = homeM ? homeM[1].trim() : "";
        var away = awayM ? awayM[1].trim() : "";
        var emoji = "\u26BD\uFE0F";
        if (/basket/i.test(sportType)) emoji = "\u{1F3C0}";
        else if (/voley/i.test(sportType)) emoji = "\u{1F3D0}";
        else if (/tenis/i.test(sportType)) emoji = "\u{1F3BE}";
        var formattedTitle = emoji + " " + sportType + " | " + (timeStr ? timeStr + " " : "") + home + (away ? " - " + away : "");
        list.push({
          id,
          title: formattedTitle,
          sport: sportType,
          time: timeStr,
          home,
          away
        });
      }
      _cachedMatches = list;
      _cachedMatchesTime = now;
      return list;
    }).catch(function() {
      return _cachedMatches || [];
    });
  });
}
function getMeta(args) {
  var targetId = typeof args === "string" ? args : args && args.id ? args.id : null;
  if (!targetId) return Promise.resolve({ meta: null });
  var cleanM = String(targetId).toLowerCase();
  if (cleanM.indexOf("tv:taraftarium24") === 0 || cleanM.indexOf("tv:mahsunsports") === 0) {
    return fetchTaraftariumMatches().then(function(matches) {
      var videos = [];
      TARAFTARIUM_CHANNELS.forEach(function(ch) {
        videos.push({
          id: "tv:taraftarium24:ch:" + ch.id,
          title: "\u{1F534} " + ch.name + " [7/24 Canl\u0131]",
          released: (/* @__PURE__ */ new Date()).toISOString()
        });
      });
      matches.forEach(function(m) {
        videos.push({
          id: "tv:taraftarium24:match:" + m.id,
          title: m.title,
          released: (/* @__PURE__ */ new Date()).toISOString()
        });
      });
      return {
        meta: {
          id: cleanM.indexOf("tv:mahsunsports") === 0 ? "tv:mahsunsports" : "tv:taraftarium24",
          type: "tv",
          name: "Taraftarium24",
          poster: TARAFTARIUM_LOGO,
          background: TARAFTARIUM_LOGO,
          description: "Taraftarium24 Canl\u0131 Ma\xE7lar ve 7/24 Spor Kanallar\u0131 \u2014 Futbol, Basketbol, Voleybol, Tenis ve Canl\u0131 TV",
          genres: ["Spor"],
          videos
        }
      };
    }).catch(function() {
      return { meta: null };
    });
  }
  return fetchChannels().then(function(content) {
    var lines = content.split("\n");
    var name = targetId.replace(/^tv:/, "");
    var logo = "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/canli/default_tv.png";
    var searchKey = cleanKey(targetId.replace(/^tv:/, ""));
    var lang = "";
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
          lang = parseTvgLang(line);
          var logoMatch = line.match(/tvg-logo="([^"]+)"/i);
          if (logoMatch) logo = logoMatch[1];
          break;
        }
      }
    }
    var epg = getNowPlayingInfo(searchKey, name);
    return {
      meta: {
        id: targetId,
        type: "tv",
        name,
        poster: logo,
        background: logo,
        description: epg && epg.formattedText ? channelDescription(name, lang) + "\n" + epg.formattedText : channelDescription(name, lang),
        videos: [{
          id: targetId,
          title: epg && epg.current ? epg.current : name,
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
  return /bein|ssport|sspor|tivibu|smartspor|smarts|exxen|tabii|eurosport|nba|cbcs/.test(key);
}
function getStreams(args) {
  return __async(this, null, function* () {
    var targetId = typeof args === "string" ? args : args ? args.id : "";
    if (!targetId) {
      var e = [];
      e.streams = [];
      return e;
    }
    var cleanT = String(targetId || "").toLowerCase();
    var searchKey = cleanKey(targetId.replace(/^tv:/, ""));
    if (cleanT.indexOf("tv:taraftarium24:match:") === 0 || cleanT.indexOf("tv:mahsunsports:match:") === 0) {
      var matchId = targetId.split(":").pop();
      var sObj = yield fetchTaraftariumStream(matchId);
      var streams = [];
      if (sObj && sObj.url) {
        streams.push({
          name: "\u231C Taraftarium24 \u231F",
          title: "Canl\u0131 Ma\xE7 Ak\u0131\u015F\u0131 [HD]",
          url: sObj.url,
          headers: sObj.headers,
          behaviorHints: { isLive: true }
        });
      }
      streams.streams = streams;
      return streams;
    }
    if (cleanT.indexOf("tv:taraftarium24:ch:") === 0 || cleanT.indexOf("tv:mahsunsports:ch:") === 0) {
      var chId = targetId.split(":").pop();
      var chDef = TARAFTARIUM_CHANNELS.find(function(c) {
        return c.id === chId;
      });
      var chLabel = chDef ? chDef.name : chId;
      var sObj2 = yield fetchTaraftariumStream(chId);
      var streams2 = [];
      if (sObj2 && sObj2.url) {
        streams2.push({
          name: "\u231C Taraftarium24 \u231F",
          title: chLabel + " [Canl\u0131 HD]",
          url: sObj2.url,
          headers: sObj2.headers,
          behaviorHints: { isLive: true }
        });
      }
      streams2.streams = streams2;
      return streams2;
    }
    if (searchKey === "taraftarium24" || searchKey === "mahsunsports" || cleanT === "tv:taraftarium24" || cleanT === "tv:mahsunsports") {
      var subIdx = String(targetId.replace(/^tv:(?:taraftarium24|mahsunsports):?/i, ""));
      if (subIdx && /^\d+$/.test(subIdx)) {
        var idx = parseInt(subIdx, 10);
        var matches = yield fetchTaraftariumMatches();
        var totalCh = TARAFTARIUM_CHANNELS.length;
        if (idx < totalCh) {
          var ch = TARAFTARIUM_CHANNELS[idx];
          var s = yield fetchTaraftariumStream(ch.id);
          var st = [];
          if (s && s.url) st.push({ name: "\u231C Taraftarium24 \u231F", title: ch.name + " [Canl\u0131 HD]", url: s.url, headers: s.headers, behaviorHints: { isLive: true } });
          st.streams = st;
          return st;
        } else {
          var mIdx = idx - totalCh;
          var m = matches[mIdx];
          if (m) {
            var sm = yield fetchTaraftariumStream(m.id);
            var stm = [];
            if (sm && sm.url) stm.push({ name: "\u231C Taraftarium24 \u231F", title: m.title + " [HD]", url: sm.url, headers: sm.headers, behaviorHints: { isLive: true } });
            stm.streams = stm;
            return stm;
          }
        }
        var empty = [];
        empty.streams = [];
        return empty;
      }
      var sDefault = yield fetchTaraftariumStream("bein-sports-1");
      var streamsDef = [];
      if (sDefault && sDefault.url) {
        streamsDef.push({
          name: "\u231C Taraftarium24 \u231F",
          title: "BEIN SPORTS 1 [Canl\u0131 HD]",
          url: sDefault.url,
          headers: sDefault.headers,
          behaviorHints: { isLive: true }
        });
      }
      streamsDef.streams = streamsDef;
      return streamsDef;
    }
    var content;
    try {
      content = yield fetchChannels();
    } catch (err) {
      var ec = [];
      ec.streams = [];
      return ec;
    }
    var lines = content.split("\n");
    var streams = [];
    var seenUrls = {};
    var matchedBackup = "";
    var matchedName = "";
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (line.indexOf("#EXTINF") !== -1) {
        var tvgIdMatch = line.match(/tvg-id="([^"]+)"/i);
        var tvgNameMatch = line.match(/tvg-name="([^"]+)"/i);
        var nameMatch = line.match(/"\s*,\s*(.+)$/);
        var backupMatch = line.match(/tvg-backup="([^"]+)"/i);
        var srcAttrMatch = line.match(/tvg-src="([^"]+)"/i);
        var aliasName = nameMatch ? nameMatch[1].trim() : line.split(",").pop().trim();
        var namedSrcs = [];
        if (srcAttrMatch && srcAttrMatch[1]) {
          var srcParts = srcAttrMatch[1].split("|");
          for (var psi = 0; psi + 1 < srcParts.length; psi += 2) {
            var srcName = (srcParts[psi] || "").trim();
            var srcUrl = (srcParts[psi + 1] || "").trim();
            if (srcName && srcUrl) namedSrcs.push({ name: srcName, url: srcUrl });
          }
        }
        var cId = cleanKey(tvgIdMatch ? tvgIdMatch[1] : "");
        var cName = cleanKey(tvgNameMatch ? tvgNameMatch[1] : "");
        var aName = cleanKey(aliasName);
        if (cId === searchKey || cName === searchKey || aName === searchKey || aName.length > 2 && (aName.includes(searchKey) || searchKey.includes(aName))) {
          if (!matchedName) matchedName = aliasName;
          var encrypted = isEncryptedChannel(aliasName, cId);
          var backupAttr = backupMatch ? backupMatch[1] : "";
          if (backupAttr) matchedBackup = backupAttr;
          var tChannelId = matchTaraftariumChannelId(cId || aName);
          if (tChannelId) {
            try {
              var tStream = yield fetchTaraftariumStream(tChannelId);
              if (tStream && tStream.url && !seenUrls[tStream.url]) {
                seenUrls[tStream.url] = true;
                streams.push({
                  name: "\u231C Taraftarium24 \u231F",
                  title: aliasName + " [Canl\u0131 HD]",
                  url: tStream.url,
                  headers: tStream.headers,
                  behaviorHints: { isLive: true }
                });
              }
            } catch (e2) {
            }
          }
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
                } else {
                  sObj.headers = _HEADERS;
                }
                streams.push(sObj);
              }
              break;
            }
            if (urlLine.indexOf("#EXTINF") === 0) break;
          }
          for (var nsi = 0; nsi < namedSrcs.length; nsi++) {
            var ns = namedSrcs[nsi];
            if (/^https?:\/\//i.test(ns.url) && !seenUrls[ns.url]) {
              seenUrls[ns.url] = true;
              streams.push({
                name: encrypted ? "\u231C Anthology Spor \u231F" : "\u231C Anthology \u231F",
                title: ns.name + (encrypted ? " [Canl\u0131 HD]" : " [Canl\u0131 HD]"),
                url: ns.url,
                headers: _HEADERS,
                behaviorHints: { isLive: true }
              });
            }
          }
          var backups = [];
          var b1 = line.match(/tvg-backup="([^"]+)"/i);
          var b2 = line.match(/tvg-backup2="([^"]+)"/i);
          var b3 = line.match(/tvg-backup3="([^"]+)"/i);
          if (b1) b1[1].split("|").forEach(function(u) {
            if (u && u.trim()) backups.push(u.trim());
          });
          if (b2) b2[1].split("|").forEach(function(u) {
            if (u && u.trim()) backups.push(u.trim());
          });
          if (b3) b3[1].split("|").forEach(function(u) {
            if (u && u.trim()) backups.push(u.trim());
          });
          if (backups.length > 0) {
            for (var bkIdx = 0; bkIdx < backups.length; bkIdx++) {
              var bUrl = backups[bkIdx];
              if (!seenUrls[bUrl]) {
                seenUrls[bUrl] = true;
                var bLabel = aliasName + (backups.length > 1 ? " [Yedek Ak\u0131\u015F " + (bkIdx + 1) + "]" : " [Yedek Ak\u0131\u015F]");
                streams.push({
                  name: encrypted ? "\u231C Anthology Spor \xB7 Yedek \u231F" : "\u231C Anthology \xB7 Yedek \u231F",
                  title: bLabel,
                  url: bUrl,
                  headers: _HEADERS,
                  behaviorHints: { isLive: true }
                });
              }
            }
          } else {
            for (var bk in KNOWN_BACKUPS) {
              if ((cId === bk || searchKey === bk) && !seenUrls[KNOWN_BACKUPS[bk]]) {
                seenUrls[KNOWN_BACKUPS[bk]] = true;
                streams.push({
                  name: "\u231C Anthology \xB7 Yedek \u231F",
                  title: aliasName + " [Yedek Ak\u0131\u015F]",
                  url: KNOWN_BACKUPS[bk],
                  headers: _HEADERS,
                  behaviorHints: { isLive: true }
                });
              }
            }
          }
        }
      }
      if (streams.length >= 8) break;
    }
    streams.streams = streams;
    return streams;
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
  module.exports = wrapAll({ getStreams, getMeta, getCatalog }, cfgReady);
} else {
  g = typeof globalThis !== "undefined" ? globalThis : typeof global !== "undefined" ? global : window;
  g.getStreams = getStreams;
  g.getMeta = getMeta;
  g.getCatalog = getCatalog;
}
var g;

if (typeof globalThis !== 'undefined' && typeof module !== 'undefined' && module.exports) {
    if (module.exports.getStreams) globalThis.getStreams = module.exports.getStreams;
    if (module.exports.getCatalog) globalThis.getCatalog = module.exports.getCatalog;
    if (module.exports.getMeta) globalThis.getMeta = module.exports.getMeta;
    if (module.exports.getSubtitles) globalThis.getSubtitles = module.exports.getSubtitles;
}

