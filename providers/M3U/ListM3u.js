/**
 * Anthology Provider: m3u_list
 * Built from src/m3u_list/index.js
 * Build: v1.8.29 (anthology build system)
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

// src/shared/sport_engine.js
var require_sport_engine = __commonJS({
  "src/shared/sport_engine.js"(exports2, module2) {
    var { loadConfig: loadConfig2, val: val2 } = require_config();
    var TARAFTARIUM_SITE = "https://taraftarium24-245.top/";
    var TARAFTARIUM_API = "https://teletv15.top";
    var TARAFTARIUM_BASE_NUM = 245;
    var ARDA_SITE = "https://selcuksporkral1.cc";
    var ALEMDAR_SITE = "https://alemdarsport.cfd";
    var MAHSUN_SITE = "https://mahsunsports54.xyz";
    var PAPAZ_SITE = "https://www.papazsports1028.pro";
    var _HEADERS2 = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "*/*"
    };
    var _cfgReady2 = null;
    function initSportConfig2() {
      if (!_cfgReady2) {
        _cfgReady2 = loadConfig2().then(function() {
          var v;
          v = val2("urls.live.taraftarium.base");
          if (v) TARAFTARIUM_SITE = String(v);
          v = val2("urls.live.taraftarium.api_base");
          if (v) TARAFTARIUM_API = String(v).replace(/\/+$/, "");
          v = val2("urls.live.taraftarium.base_number");
          if (v && !isNaN(Number(v))) TARAFTARIUM_BASE_NUM = Number(v);
          v = val2("urls.live.ardasports.base");
          if (v) ARDA_SITE = String(v).replace(/\/+$/, "");
          v = val2("urls.live.alemdarsport.base");
          if (v) ALEMDAR_SITE = String(v).replace(/\/+$/, "");
          v = val2("urls.live.mahsunsports.base");
          if (v) MAHSUN_SITE = String(v).replace(/\/+$/, "");
          v = val2("urls.live.papazsports.base");
          if (v) PAPAZ_SITE = String(v).replace(/\/+$/, "");
        });
      }
      return _cfgReady2;
    }
    function cleanKey2(s) {
      return (s || "").toString().toLowerCase().replace(/[^a-z0-9]/g, "");
    }
    function safeAtob(b64) {
      if (typeof atob === "function") {
        try {
          return atob(b64);
        } catch (e) {
        }
      }
      if (typeof Buffer !== "undefined") {
        try {
          return Buffer.from(b64, "base64").toString("utf8");
        } catch (e) {
        }
      }
      return "";
    }
    function withTimeout(promise, ms) {
      var timer;
      var timeoutPromise = new Promise(function(resolve) {
        timer = setTimeout(function() {
          resolve(null);
        }, ms);
      });
      return Promise.race([
        promise.then(function(res) {
          clearTimeout(timer);
          return res;
        }).catch(function() {
          clearTimeout(timer);
          return null;
        }),
        timeoutPromise
      ]);
    }
    var SPORT_MAP = {
      "beinsports1": {
        name: "BEIN SPORTS 1",
        taraftarium: "bein-sports-1",
        ardasports: "bein-sports-1",
        alemdarsport: "bein1",
        mahsunsports: "androstreamlivebs1",
        papazsports: "100001"
      },
      "beinsports2": {
        name: "BEIN SPORTS 2",
        taraftarium: "bein-sports-2",
        ardasports: "bein-sports-2",
        alemdarsport: "bein2",
        mahsunsports: "androstreamlivebs2",
        papazsports: "100002"
      },
      "beinsports3": {
        name: "BEIN SPORTS 3",
        taraftarium: "bein-sports-3",
        ardasports: "bein-sports-3",
        alemdarsport: "bein3",
        mahsunsports: "androstreamlivebs3",
        papazsports: "100003"
      },
      "beinsports4": {
        name: "BEIN SPORTS 4",
        taraftarium: "bein-sports-4",
        ardasports: "bein-sports-4",
        alemdarsport: "bein4",
        mahsunsports: "androstreamlivebs4",
        papazsports: "100004"
      },
      "beinsports5": {
        name: "BEIN SPORTS 5",
        taraftarium: "bein-sports-5",
        ardasports: "bein-sports-5",
        alemdarsport: "bein5",
        mahsunsports: "androstreamlivebs5",
        papazsports: "100005"
      },
      "beinsportsmax1": {
        name: "BEIN SPORTS MAX 1",
        taraftarium: "bein-sports-max-1",
        ardasports: "bein-sports-max-1",
        alemdarsport: "beinmax1",
        mahsunsports: "androstreamlivebsm1",
        papazsports: "100006"
      },
      "beinsportsmax2": {
        name: "BEIN SPORTS MAX 2",
        taraftarium: "bein-sports-max-2",
        ardasports: "bein-sports-max-2",
        alemdarsport: "beinmax2",
        mahsunsports: "androstreamlivebsm2",
        papazsports: "100007"
      },
      "ssport": {
        name: "S SPORT",
        taraftarium: "s-sport",
        ardasports: "s-sport",
        alemdarsport: "ssport1",
        mahsunsports: "androstreamlivess1",
        papazsports: "100010"
      },
      "ssport1": {
        name: "S SPORT 1",
        taraftarium: "s-sport",
        ardasports: "s-sport",
        alemdarsport: "ssport1",
        mahsunsports: "androstreamlivess1",
        papazsports: "100010"
      },
      "ssport2": {
        name: "S SPORT 2",
        taraftarium: "s-sport-2",
        ardasports: "s-sport-2",
        alemdarsport: "ssport2",
        mahsunsports: "androstreamlivess2",
        papazsports: "100011"
      },
      "ssportplus": {
        name: "S SPORT PLUS",
        mahsunsports: "androstreamlivessplus1",
        alemdarsport: "ssport1"
      },
      "tivibuspor": {
        name: "TIVIBU SPOR",
        alemdarsport: "tivibu1",
        mahsunsports: "androstreamlivets",
        papazsports: "100021"
      },
      "tivibuspor1": {
        name: "TIVIBU SPOR 1",
        alemdarsport: "tivibu1",
        mahsunsports: "androstreamlivets1",
        papazsports: "100021"
      },
      "tivibuspor2": {
        name: "TIVIBU SPOR 2",
        alemdarsport: "tivibu2",
        mahsunsports: "androstreamlivets2",
        papazsports: "100022"
      },
      "tivibuspor3": {
        name: "TIVIBU SPOR 3",
        alemdarsport: "tivibu3",
        mahsunsports: "androstreamlivets3",
        papazsports: "100023"
      },
      "tivibuspor4": {
        name: "TIVIBU SPOR 4",
        alemdarsport: "tivibu4",
        mahsunsports: "androstreamlivets4",
        papazsports: "100024"
      },
      "smartspor1": {
        name: "SMART SPOR 1",
        alemdarsport: "sporsmart",
        mahsunsports: "androstreamlivesm1",
        papazsports: "100030"
      },
      "sporsmart": {
        name: "SPOR SMART 1",
        alemdarsport: "sporsmart",
        mahsunsports: "androstreamlivesm1",
        papazsports: "100030"
      },
      "smartspor2": {
        name: "SMART SPOR 2",
        alemdarsport: "sporsmart2",
        mahsunsports: "androstreamlivesm2",
        papazsports: "100031"
      },
      "sporsmart2": {
        name: "SPOR SMART 2",
        alemdarsport: "sporsmart2",
        mahsunsports: "androstreamlivesm2",
        papazsports: "100031"
      },
      "trtspor": {
        name: "TRT SPOR",
        taraftarium: "trt-spor",
        ardasports: "trt-spor",
        alemdarsport: "trtspor"
      },
      "trtsporyildiz": {
        name: "TRT SPOR YILDIZ",
        alemdarsport: "trtspor2"
      },
      "trt1": {
        name: "TRT 1",
        taraftarium: "trt-1",
        ardasports: "trt-1",
        alemdarsport: "trt1"
      },
      "aspor": {
        name: "A SPOR",
        taraftarium: "a-spor",
        ardasports: "a-spor",
        alemdarsport: "aspor",
        papazsports: "100052"
      },
      "tv85": {
        name: "TV8.5",
        alemdarsport: "tv85",
        papazsports: "100051"
      },
      "nbatv": {
        name: "NBA TV",
        papazsports: "100053"
      },
      "eurosport1": {
        name: "EUROSPORT 1",
        mahsunsports: "androstreamlivees1",
        papazsports: "100056"
      },
      "eurosport2": {
        name: "EUROSPORT 2",
        mahsunsports: "androstreamlivees2",
        papazsports: "100057"
      },
      "cbcsport": {
        name: "CBC SPORT",
        mahsunsports: "androstreamlivecbcs"
      },
      "idmantv": {
        name: "IDMAN TV",
        mahsunsports: "androstreamliveidm"
      },
      "exxentv": {
        name: "EXXEN TV",
        mahsunsports: "androstreamliveexn"
      }
    };
    function findSportChannelMapping2(rawStr) {
      if (!rawStr) return null;
      var k = cleanKey2(rawStr).replace(/^tv/, "").replace(/tr$/, "");
      if (SPORT_MAP[k]) return SPORT_MAP[k];
      if (k.indexOf("beinsportsmax1") !== -1 || k.indexOf("beinmax1") !== -1) return SPORT_MAP["beinsportsmax1"];
      if (k.indexOf("beinsportsmax2") !== -1 || k.indexOf("beinmax2") !== -1) return SPORT_MAP["beinsportsmax2"];
      if (k.indexOf("beinsport1") !== -1 || k.indexOf("bein1") !== -1) return SPORT_MAP["beinsports1"];
      if (k.indexOf("beinsport2") !== -1 || k.indexOf("bein2") !== -1) return SPORT_MAP["beinsports2"];
      if (k.indexOf("beinsport3") !== -1 || k.indexOf("bein3") !== -1) return SPORT_MAP["beinsports3"];
      if (k.indexOf("beinsport4") !== -1 || k.indexOf("bein4") !== -1) return SPORT_MAP["beinsports4"];
      if (k.indexOf("beinsport5") !== -1 || k.indexOf("bein5") !== -1) return SPORT_MAP["beinsports5"];
      if (k.indexOf("ssportplus") !== -1) return SPORT_MAP["ssportplus"];
      if (k.indexOf("ssport2") !== -1) return SPORT_MAP["ssport2"];
      if (k.indexOf("ssport") !== -1) return SPORT_MAP["ssport1"];
      if (k.indexOf("tivibu1") !== -1) return SPORT_MAP["tivibuspor1"];
      if (k.indexOf("tivibu2") !== -1) return SPORT_MAP["tivibuspor2"];
      if (k.indexOf("tivibu3") !== -1) return SPORT_MAP["tivibuspor3"];
      if (k.indexOf("tivibu4") !== -1) return SPORT_MAP["tivibuspor4"];
      if (k.indexOf("tivibu") !== -1) return SPORT_MAP["tivibuspor"];
      if (k.indexOf("smartspor2") !== -1 || k.indexOf("sporsmart2") !== -1) return SPORT_MAP["smartspor2"];
      if (k.indexOf("smartspor") !== -1 || k.indexOf("sporsmart") !== -1) return SPORT_MAP["smartspor1"];
      if (k.indexOf("trtsporyildiz") !== -1) return SPORT_MAP["trtsporyildiz"];
      if (k.indexOf("trtspor") !== -1) return SPORT_MAP["trtspor"];
      if (k.indexOf("aspor") !== -1) return SPORT_MAP["aspor"];
      if (k.indexOf("tv85") !== -1 || k.indexOf("tv8bucuk") !== -1) return SPORT_MAP["tv85"];
      if (k.indexOf("nba") !== -1) return SPORT_MAP["nbatv"];
      if (k.indexOf("eurosport2") !== -1) return SPORT_MAP["eurosport2"];
      if (k.indexOf("eurosport") !== -1) return SPORT_MAP["eurosport1"];
      if (k.indexOf("cbc") !== -1) return SPORT_MAP["cbcsport"];
      if (k.indexOf("idman") !== -1) return SPORT_MAP["idmantv"];
      if (k.indexOf("exxen") !== -1) return SPORT_MAP["exxentv"];
      for (var mk in SPORT_MAP) {
        if (k.indexOf(mk) === 0 || mk.indexOf(k) === 0) return SPORT_MAP[mk];
      }
      return null;
    }
    var _resolvedT24Api = null;
    var _resolvedT24Site = null;
    var _resolvedT24Time = 0;
    var RESOLVER_TTL = 15 * 60 * 1e3;
    function resolveTaraftariumBase() {
      var now = Date.now();
      if (_resolvedT24Api && now - _resolvedT24Time < RESOLVER_TTL) {
        return Promise.resolve({ api: _resolvedT24Api, site: _resolvedT24Site });
      }
      var baseApi = _resolvedT24Api || TARAFTARIUM_API;
      var baseSite = _resolvedT24Site || TARAFTARIUM_SITE;
      return fetch(baseApi + "/load/channels.php", { headers: _HEADERS2 }).then(function(res) {
        if (res && res.status === 200) {
          _resolvedT24Api = baseApi;
          _resolvedT24Site = baseSite;
          _resolvedT24Time = now;
          return { api: _resolvedT24Api, site: _resolvedT24Site };
        }
        throw new Error("T24 API not 200");
      }).catch(function() {
        var num = TARAFTARIUM_BASE_NUM;
        var cands = [num, num + 1, num - 1, num + 2, num + 3, num + 4];
        var i = 0;
        function tryNext() {
          if (i >= cands.length) {
            _resolvedT24Api = baseApi;
            _resolvedT24Site = baseSite;
            _resolvedT24Time = now;
            return Promise.resolve({ api: _resolvedT24Api, site: _resolvedT24Site });
          }
          var curN = cands[i++];
          var candUrl = "https://taraftarium24-" + curN + ".top/";
          return fetch(candUrl, { headers: _HEADERS2 }).then(function(r) {
            return r.text();
          }).then(function(html) {
            if (!html) return tryNext();
            var apiM = html.match(/https:\/\/teletv\d+\.top/i) || html.match(/fetch\(['"](https:\/\/[^'"]*teletv[^'"]*top)/i);
            var foundApi = apiM ? apiM[1] || apiM[0] : baseApi;
            _resolvedT24Api = foundApi.replace(/\/+$/, "");
            _resolvedT24Site = candUrl;
            _resolvedT24Time = now;
            return { api: _resolvedT24Api, site: _resolvedT24Site };
          }).catch(function() {
            return tryNext();
          });
        }
        return tryNext();
      });
    }
    function fetchTaraftariumStream(channelId) {
      if (!channelId) return Promise.resolve(null);
      return resolveTaraftariumBase().then(function(base) {
        var apiUrl = base.api + "/load/yayinlink.php?id=" + encodeURIComponent(channelId);
        return fetch(apiUrl, { headers: _HEADERS2 }).then(function(res) {
          return res.json();
        }).then(function(data) {
          if (data && data.deismackanal && typeof data.deismackanal === "string" && data.deismackanal.indexOf("m3u8") !== -1) {
            var finalUrl = data.deismackanal.replace(/edge4\./g, "edge3.");
            return {
              url: finalUrl,
              headers: {
                "User-Agent": _HEADERS2["User-Agent"],
                "Referer": base.site,
                "Origin": base.site
              }
            };
          }
          return null;
        }).catch(function() {
          return null;
        });
      });
    }
    function fetchArdaSportsStream(channelId) {
      if (!channelId) return Promise.resolve(null);
      var watchUrl = ARDA_SITE + "/channel/watch/" + encodeURIComponent(channelId);
      var refHeader = ARDA_SITE + "/canli-izle/" + encodeURIComponent(channelId);
      return fetch(watchUrl, {
        headers: {
          "User-Agent": _HEADERS2["User-Agent"],
          "Referer": refHeader
        }
      }).then(function(res) {
        return res.text();
      }).then(function(html) {
        var lsMatch = html.match(/src="(\/loadstream\.php\?[^"]+)"/);
        if (!lsMatch) return null;
        var loadUrl = ARDA_SITE + lsMatch[1];
        return fetch(loadUrl, {
          headers: {
            "User-Agent": _HEADERS2["User-Agent"],
            "Referer": watchUrl
          }
        });
      }).then(function(res) {
        return res ? res.text() : null;
      }).then(function(lsHtml) {
        if (!lsHtml) return null;
        var b64Match = lsHtml.match(/['"]([A-Za-z0-9+/=]{40,})\|atob/i) || lsHtml.match(/atob\(['"]([A-Za-z0-9+/=]+)['"]\)/);
        if (!b64Match) return null;
        var decoded = safeAtob(b64Match[1]);
        if (!decoded) return null;
        var streamM = decoded.match(/https?:\/\/[^"'\s\\]+\.m3u8/);
        if (streamM) {
          return {
            url: streamM[0],
            headers: {
              "User-Agent": _HEADERS2["User-Agent"],
              "Referer": ARDA_SITE,
              "Origin": ARDA_SITE
            }
          };
        }
        return null;
      }).catch(function() {
        return null;
      });
    }
    var _cachedAlemdarCdn = null;
    var _cachedAlemdarTime = 0;
    function fetchAlemdarStream(channelId) {
      if (!channelId) return Promise.resolve(null);
      var now = Date.now();
      if (_cachedAlemdarCdn && now - _cachedAlemdarTime < RESOLVER_TTL) {
        var directUrl = _cachedAlemdarCdn.replace("${cid}", channelId);
        return Promise.resolve({
          url: directUrl,
          headers: {
            "User-Agent": _HEADERS2["User-Agent"],
            "Referer": ALEMDAR_SITE,
            "Origin": ALEMDAR_SITE
          }
        });
      }
      var channelUrl = ALEMDAR_SITE + "/channel.php?id=" + encodeURIComponent(channelId);
      return fetch(channelUrl, { headers: _HEADERS2 }).then(function(res) {
        return res.text();
      }).then(function(html) {
        var flotfMatch = html.match(/flotfUrl\s*=\s*[`'"](https:\/\/[^`'"]+index\.m3u8)/);
        if (flotfMatch) {
          var template = flotfMatch[1];
          _cachedAlemdarCdn = template;
          _cachedAlemdarTime = now;
          return {
            url: template.replace("${cid}", channelId),
            headers: {
              "User-Agent": _HEADERS2["User-Agent"],
              "Referer": ALEMDAR_SITE,
              "Origin": ALEMDAR_SITE
            }
          };
        }
        return null;
      }).catch(function() {
        return null;
      });
    }
    var _cachedMahsunBase = null;
    var _cachedMahsunTime = 0;
    function resolveMahsunBaseUrl() {
      var now = Date.now();
      if (_cachedMahsunBase && now - _cachedMahsunTime < RESOLVER_TTL) {
        return Promise.resolve(_cachedMahsunBase);
      }
      var probeUrl = MAHSUN_SITE + "/event.html?id=androstreamlivebs1";
      return fetch(probeUrl, { headers: _HEADERS2 }).then(function(res) {
        return res.text();
      }).then(function(html) {
        var baseMatch = html.match(/["'](https:\/\/andro\.[^"']+\/checklist\/)["']/);
        if (baseMatch) {
          _cachedMahsunBase = baseMatch[1];
          _cachedMahsunTime = now;
          return _cachedMahsunBase;
        }
        throw new Error("No mahsun base");
      }).catch(function() {
        var fallback = "https://andro.evrenesoglu149.click/checklist/";
        _cachedMahsunBase = fallback;
        _cachedMahsunTime = now;
        return fallback;
      });
    }
    function fetchMahsunStream(channelId) {
      if (!channelId) return Promise.resolve(null);
      return resolveMahsunBaseUrl().then(function(base) {
        var streamUrl = base + channelId + ".m3u8";
        return {
          url: streamUrl,
          headers: {
            "User-Agent": _HEADERS2["User-Agent"]
          }
        };
      }).catch(function() {
        return null;
      });
    }
    function fetchPapazStream(channelId) {
      if (!channelId) return Promise.resolve(null);
      if (channelId.indexOf("http") === 0) {
        return Promise.resolve({
          url: channelId,
          headers: _HEADERS2
        });
      }
      var authUrl = PAPAZ_SITE + "/auth.php";
      return fetch(authUrl, {
        method: "POST",
        headers: {
          "User-Agent": _HEADERS2["User-Agent"],
          "Referer": PAPAZ_SITE + "/",
          "Origin": PAPAZ_SITE,
          "X-Requested-With": "XMLHttpRequest",
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
        },
        body: "channel=" + encodeURIComponent(channelId)
      }).then(function(res) {
        return res.json();
      }).then(function(json) {
        if (json && json.URL && json.TOKEN) {
          return {
            url: json.URL,
            headers: {
              "User-Agent": _HEADERS2["User-Agent"],
              "Referer": PAPAZ_SITE + "/",
              "Origin": PAPAZ_SITE,
              "usertoken": json.TOKEN,
              "pl": "PapazSports"
            }
          };
        }
        return null;
      }).catch(function() {
        return null;
      });
    }
    function makeStream(name, title, url, headers) {
      return {
        name,
        title,
        url,
        headers,
        behaviorHints: { isLive: true }
      };
    }
    function resolveMultiSportStreams2(channelIdOrName, fallbackTitle) {
      return __async(this, null, function* () {
        yield initSportConfig2();
        var map = findSportChannelMapping2(channelIdOrName);
        var chTitle = fallbackTitle || map && map.name || String(channelIdOrName).toUpperCase();
        var pTimeout = 4500;
        var tPromise = map && map.taraftarium ? withTimeout(fetchTaraftariumStream(map.taraftarium), pTimeout) : Promise.resolve(null);
        var aPromise = map && map.ardasports ? withTimeout(fetchArdaSportsStream(map.ardasports), pTimeout) : Promise.resolve(null);
        var alPromise = map && map.alemdarsport ? withTimeout(fetchAlemdarStream(map.alemdarsport), pTimeout) : Promise.resolve(null);
        var mPromise = map && map.mahsunsports ? withTimeout(fetchMahsunStream(map.mahsunsports), pTimeout) : Promise.resolve(null);
        var pPromise = map && map.papazsports ? withTimeout(fetchPapazStream(map.papazsports), pTimeout) : Promise.resolve(null);
        var results = yield Promise.all([tPromise, aPromise, alPromise, mPromise, pPromise]);
        var tStream = results[0];
        var aStream = results[1];
        var alStream = results[2];
        var mStream = results[3];
        var pStream = results[4];
        var streams = [];
        if (tStream && tStream.url) {
          streams.push(makeStream("\u231C Taraftarium24 \u231F", chTitle + " [1080p FHD]", tStream.url, tStream.headers));
        }
        if (aStream && aStream.url) {
          streams.push(makeStream("\u231C ArdaSports \u231F", chTitle + " [1080p FHD]", aStream.url, aStream.headers));
        }
        if (alStream && alStream.url) {
          streams.push(makeStream("\u231C AlemdarSport \u231F", chTitle + " [1080p FHD]", alStream.url, alStream.headers));
        }
        if (mStream && mStream.url) {
          streams.push(makeStream("\u231C MahsunSports \u231F", chTitle + " [1080p HD]", mStream.url, mStream.headers));
        }
        if (pStream && pStream.url) {
          streams.push(makeStream("\u231C PapazSports \u231F", chTitle + " [1080p HD]", pStream.url, pStream.headers));
        }
        return streams;
      });
    }
    module2.exports = {
      initSportConfig: initSportConfig2,
      findSportChannelMapping: findSportChannelMapping2,
      fetchTaraftariumStream,
      fetchArdaSportsStream,
      fetchAlemdarStream,
      fetchMahsunStream,
      fetchPapazStream,
      resolveMultiSportStreams: resolveMultiSportStreams2,
      makeStream
    };
  }
});

// src/m3u_list/index.js
var { sortStreamsByQuality } = require_quality();
var { loadConfig, val, wrapAll } = require_config();
var { getNowPlayingInfo } = require_epg();
var { parseTvgLang, channelDescription } = require_channel_lang();
var { initSportConfig, resolveMultiSportStreams, findSportChannelMapping } = require_sport_engine();
var _cfgReady = null;
function cfgReady() {
  if (!_cfgReady) {
    _cfgReady = Promise.all([loadConfig(), initSportConfig()]).then(function() {
      var v;
      v = val("urls.live.m3u_remote");
      if (v) M3U_URL = String(v).replace(/\/+$/, "");
    });
  }
  return _cfgReady;
}
var M3U_URL = "https://raw.githubusercontent.com/falsisdev/anthology/main/providers/M3U/Liste/canli.m3u";
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
      var candidatePaths = [
        path.resolve(__dirname, "M3U", "Liste", "canli.m3u"),
        path.resolve(__dirname, "..", "providers", "M3U", "Liste", "canli.m3u"),
        path.resolve(__dirname, "..", "..", "providers", "M3U", "Liste", "canli.m3u"),
        path.resolve(typeof process !== "undefined" ? process.cwd() : ".", "providers", "M3U", "Liste", "canli.m3u")
      ];
      for (var pi = 0; pi < candidatePaths.length; pi++) {
        if (fs.existsSync(candidatePaths[pi])) {
          cachedText = fs.readFileSync(candidatePaths[pi], "utf8");
          cacheTime = now;
          return Promise.resolve(cachedText);
        }
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
function getMeta(args) {
  var targetId = typeof args === "string" ? args : args ? args.id : "";
  if (!targetId) return Promise.resolve({ meta: null });
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
    var searchKey = cleanKey(targetId.replace(/^tv:/, ""));
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
    var matchedCId = "";
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
          if (!matchedCId) matchedCId = cId;
          var encrypted = isEncryptedChannel(aliasName, cId);
          var backupAttr = backupMatch ? backupMatch[1] : "";
          if (backupAttr) matchedBackup = backupAttr;
          var sportMap = findSportChannelMapping(cId || aName);
          if (encrypted || sportMap) {
            try {
              var sportStreams = yield resolveMultiSportStreams(cId || aName, aliasName);
              for (var si = 0; si < sportStreams.length; si++) {
                var sp = sportStreams[si];
                if (sp && sp.url && !seenUrls[sp.url]) {
                  seenUrls[sp.url] = true;
                  streams.push(sp);
                }
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
          for (var si2 = 0; si2 < namedSrcs.length; si2++) {
            var ns = namedSrcs[si2];
            if (ns.url && !seenUrls[ns.url]) {
              seenUrls[ns.url] = true;
              var ytMatch2 = ns.url.match(/(?:watch\?v=|embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
              var sObj2 = {
                name: encrypted ? "\u231C Anthology Spor \xB7 " + ns.name + " \u231F" : "\u231C Anthology \xB7 " + ns.name + " \u231F",
                title: aliasName + " [" + ns.name + (ytMatch2 ? " \xB7 YouTube" : "") + "]",
                url: ns.url,
                behaviorHints: { isLive: true }
              };
              if (ytMatch2) {
                sObj2.ytId = ytMatch2[1];
              } else {
                sObj2.headers = _HEADERS;
              }
              streams.push(sObj2);
            }
          }
          break;
        }
      }
    }
    if (matchedBackup && !seenUrls[matchedBackup]) {
      seenUrls[matchedBackup] = true;
      streams.push({
        name: isEncryptedChannel(matchedName, matchedCId) ? "\u231C Anthology Spor \xB7 Resmi \u231F" : "\u231C Anthology \xB7 Resmi \u231F",
        title: matchedName + " [Resmi Ak\u0131\u015F]",
        url: matchedBackup,
        headers: _HEADERS,
        behaviorHints: { isLive: true }
      });
    } else {
      for (var bk in KNOWN_BACKUPS) {
        if (searchKey.includes(bk) && !seenUrls[KNOWN_BACKUPS[bk]]) {
          seenUrls[KNOWN_BACKUPS[bk]] = true;
          streams.push({
            name: isEncryptedChannel(matchedName, matchedCId) ? "\u231C Anthology Spor \xB7 Resmi \u231F" : "\u231C Anthology \xB7 Resmi \u231F",
            title: (matchedName || searchKey.toUpperCase()) + " [Resmi Ak\u0131\u015F]",
            url: KNOWN_BACKUPS[bk],
            headers: _HEADERS,
            behaviorHints: { isLive: true }
          });
          break;
        }
      }
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
  module.exports = wrapAll({ getStreams, getCatalog, getMeta }, cfgReady);
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

