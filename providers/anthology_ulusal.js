/**
 * Anthology Provider: anthology_ulusal
 * Built from src/anthology_ulusal/index.js
 * Build: v1.8.42 (anthology build system)
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

// src/shared/sport_engine.js
var require_sport_engine = __commonJS({
  "src/shared/sport_engine.js"(exports2, module2) {
    var { loadConfig, val } = require_config();
    var ANTHOLOGY_LIVE_BASE = "https://anthology-live.duckdns.org";
    var ANTHOLOGY_LIVE_USER = "anthology";
    var ANTHOLOGY_LIVE_PASS = "falsisdevwashere";
    var TARAFTARIUM_SITE = "https://taraftarium24-246.top/";
    var TARAFTARIUM_API = "https://teletv15.top";
    var TARAFTARIUM_BASE_NUM = 246;
    var ARDA_SITE = "https://selcuksporkral1.cc";
    var ALEMDAR_SITE = "https://alemdarsport.cfd";
    var MAHSUN_SITE = "https://mahsunsports58.xyz";
    var PAPAZ_SITE = "https://www.papazsports1033.pro";
    var _HEADERS = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "*/*"
    };
    var _cfgReady = null;
    function initSportConfig() {
      if (!_cfgReady) {
        _cfgReady = loadConfig().then(function() {
          var v;
          v = val("urls.live.anthology_live.base");
          if (v) ANTHOLOGY_LIVE_BASE = String(v).replace(/\/+$/, "");
          v = val("urls.live.anthology_live.username");
          if (v) ANTHOLOGY_LIVE_USER = String(v);
          v = val("urls.live.anthology_live.password");
          if (v) ANTHOLOGY_LIVE_PASS = String(v);
          v = val("urls.live.taraftarium.base");
          if (v) TARAFTARIUM_SITE = String(v);
          v = val("urls.live.taraftarium.api_base");
          if (v) TARAFTARIUM_API = String(v).replace(/\/+$/, "");
          v = val("urls.live.taraftarium.base_number");
          if (v && !isNaN(Number(v))) TARAFTARIUM_BASE_NUM = Number(v);
          v = val("urls.live.ardasports.base");
          if (v) ARDA_SITE = String(v).replace(/\/+$/, "");
          v = val("urls.live.alemdarsport.base");
          if (v) ALEMDAR_SITE = String(v).replace(/\/+$/, "");
          v = val("urls.live.mahsunsports.base");
          if (v) MAHSUN_SITE = String(v).replace(/\/+$/, "");
          v = val("urls.live.papazsports.base");
          if (v) PAPAZ_SITE = String(v).replace(/\/+$/, "");
        });
      }
      return _cfgReady;
    }
    function cleanKey(s) {
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
    function findSportChannelMapping(rawStr) {
      if (!rawStr) return null;
      var k = cleanKey(rawStr).replace(/^tv/, "").replace(/tr$/, "");
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
        if (mk.length >= 4 && k.indexOf(mk) === 0 && (k === mk || !/^\d/.test(k.slice(mk.length)))) {
          return SPORT_MAP[mk];
        }
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
      return fetch(baseApi + "/load/channels.php", { headers: _HEADERS }).then(function(res) {
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
          return fetch(candUrl, { headers: _HEADERS }).then(function(r) {
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
        return fetch(apiUrl, { headers: _HEADERS }).then(function(res) {
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
          "User-Agent": _HEADERS["User-Agent"],
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
            "User-Agent": _HEADERS["User-Agent"],
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
              "User-Agent": _HEADERS["User-Agent"],
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
            "User-Agent": _HEADERS["User-Agent"],
            "Referer": ALEMDAR_SITE,
            "Origin": ALEMDAR_SITE
          }
        });
      }
      var channelUrl = ALEMDAR_SITE + "/channel.php?id=" + encodeURIComponent(channelId);
      return fetch(channelUrl, { headers: _HEADERS }).then(function(res) {
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
              "User-Agent": _HEADERS["User-Agent"],
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
      return fetch(probeUrl, { headers: _HEADERS }).then(function(res) {
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
        var fallback = "https://andro.evrenesoglu235.click/checklist/";
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
            "User-Agent": _HEADERS["User-Agent"]
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
          headers: _HEADERS
        });
      }
      var authUrl = PAPAZ_SITE + "/auth.php";
      return fetch(authUrl, {
        method: "POST",
        headers: {
          "User-Agent": _HEADERS["User-Agent"],
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
              "User-Agent": _HEADERS["User-Agent"],
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
    function extractCanonicalKey(s) {
      var raw = (s || "").toString().toLowerCase();
      raw = raw.replace(/^tv[:_]/, "").replace(/\.tr$/, "");
      var cleaned = raw.replace(/[^a-z0-9]/g, "");
      if (cleaned.startsWith("tv") && cleaned.length > 3) cleaned = cleaned.substring(2);
      if (cleaned.endsWith("tr") && cleaned.length > 5) cleaned = cleaned.substring(0, cleaned.length - 2);
      if (/^beinsport?1/i.test(cleaned)) return "beinsports1";
      if (/^beinsport?2/i.test(cleaned)) return "beinsports2";
      if (/^beinsport?3/i.test(cleaned)) return "beinsports3";
      if (/^beinsport?4/i.test(cleaned)) return "beinsports4";
      if (/^beinsport?5/i.test(cleaned)) return "beinsports5";
      if (/^beinsport?max1/i.test(cleaned)) return "beinsportsmax1";
      if (/^beinsport?max2/i.test(cleaned)) return "beinsportsmax2";
      if (/^ssport1?$/i.test(cleaned)) return "ssport";
      if (/^ssport2$/i.test(cleaned)) return "ssport2";
      if (/^ssportplus$/i.test(cleaned)) return "ssportplus";
      if (/^(?:24|24tv|kanal24)$/i.test(cleaned)) return "kanal24";
      if (/^tivibu(spor)?1?$/i.test(cleaned)) return "tivibuspor1";
      if (/^tivibu(spor)?2/i.test(cleaned)) return "tivibuspor2";
      if (/^tivibu(spor)?3/i.test(cleaned)) return "tivibuspor3";
      if (/^tivibu(spor)?4/i.test(cleaned)) return "tivibuspor4";
      if (/^smartspor1|^sporsmart1?$/i.test(cleaned)) return "smartspor1";
      if (/^smartspor2|^sporsmart2/i.test(cleaned)) return "smartspor2";
      if (/^trtspor$/i.test(cleaned)) return "trtspor";
      if (/^trtsporyildiz/i.test(cleaned)) return "trtsporyildiz";
      if (/^aspor/i.test(cleaned)) return "aspor";
      if (/^tv85|tv8bucuk/i.test(cleaned)) return "tv85";
      if (/^exxen(sports?)?1$/i.test(cleaned)) return "exxensports1";
      if (/^exxen(sports?)?2$/i.test(cleaned)) return "exxensports2";
      if (/^exxen(sports?)?3$/i.test(cleaned)) return "exxensports3";
      if (/^exxen(sports?)?4$/i.test(cleaned)) return "exxensports4";
      if (/^exxen(sports?)?5$/i.test(cleaned)) return "exxensports5";
      if (/^exxen(sports?)?6$/i.test(cleaned)) return "exxensports6";
      if (/^exxen(sports?)?7$/i.test(cleaned)) return "exxensports7";
      if (/^exxen(sports?)?8$/i.test(cleaned)) return "exxensports8";
      if (/^tabii(spor)?1$/i.test(cleaned)) return "tabiispor1";
      if (/^tabii(spor)?2$/i.test(cleaned)) return "tabiispor2";
      if (/^tabii(spor)?3$/i.test(cleaned)) return "tabiispor3";
      if (/^tabii(spor)?4$/i.test(cleaned)) return "tabiispor4";
      if (/^tabii(spor)?5$/i.test(cleaned)) return "tabiispor5";
      if (/^tabii(spor)?6$/i.test(cleaned)) return "tabiispor6";
      if (/^tabii(spor)?7$/i.test(cleaned)) return "tabiispor7";
      if (/^tabii(spor)?8$/i.test(cleaned)) return "tabiispor8";
      return cleaned;
    }
    var _sourcesCache = {};
    var _SOURCES_TTL = 3e5;
    function fetchAnthologyLiveSources(canonicalKey) {
      return __async(this, null, function* () {
        if (!canonicalKey) return null;
        var now = Date.now();
        var cached = _sourcesCache[canonicalKey];
        if (cached && now - cached.at < _SOURCES_TTL) {
          return cached.data;
        }
        var sourcesUrl = ANTHOLOGY_LIVE_BASE + "/api/sources?channel=" + encodeURIComponent(canonicalKey);
        try {
          var fetchPromise = fetch(sourcesUrl, { headers: _HEADERS }).then(function(res) {
            if (res && res.status === 200) return res.json();
            return null;
          });
          var sources = yield withTimeout(fetchPromise, 2500);
          if (Array.isArray(sources)) {
            _sourcesCache[canonicalKey] = { at: now, data: sources };
            return sources;
          }
        } catch (e) {
        }
        return null;
      });
    }
    function buildAnthologyLiveStreamEntry(src, canonicalKey, chTitle, authQuery) {
      var streamUrl = ANTHOLOGY_LIVE_BASE + "/live/" + canonicalKey + ".m3u8?" + authQuery;
      if (src.id !== "auto") {
        streamUrl += "&source=" + encodeURIComponent(src.id);
      }
      var cleanName = (src.name || src.id).replace(/[⚡️📡🛡🌐]/g, "").trim();
      var displayProvider = "\u231C Anthology Live \xB7 " + cleanName + " \u231F";
      var displayTitle = chTitle + " [1080p FHD]";
      if (src.id === "auto") {
        displayProvider = "\u231C Anthology Live \xB7 Otomatik \u231F";
        displayTitle = chTitle + " [1080p FHD \xB7 Ultra H\u0131zl\u0131]";
      } else if (src.id === "kool1") {
        displayProvider = "\u231C Anthology Live \xB7 Kool S1 \u231F";
        displayTitle = chTitle + " [Kool.ws \xB7 Sunucu 1]";
      } else if (src.id === "kool6") {
        displayProvider = "\u231C Anthology Live \xB7 Kool S6 \u231F";
        displayTitle = chTitle + " [Kool.ws \xB7 Sunucu 6]";
      } else if (src.id === "kool7") {
        displayProvider = "\u231C Anthology Live \xB7 Kool S7 \u231F";
        displayTitle = chTitle + " [Kool.ws \xB7 Sunucu 7]";
      } else if (src.id === "mahsunsports" || src.id === "papazsports") {
        displayTitle = chTitle + " [1080p HD]";
      }
      return makeStream(
        displayProvider,
        displayTitle,
        streamUrl,
        {
          "User-Agent": _HEADERS["User-Agent"],
          "Accept": "*/*"
        }
      );
    }
    function resolveAnthologyLiveStreams(channelIdOrName, fallbackTitle, opts) {
      return __async(this, null, function* () {
        yield initSportConfig();
        opts = opts || {};
        if (opts.isSport) {
          return resolveMultiSportStreams(channelIdOrName, fallbackTitle);
        }
        var canonicalKey = extractCanonicalKey(channelIdOrName);
        var chTitle = fallbackTitle || String(channelIdOrName).toUpperCase();
        var authQuery = "username=" + encodeURIComponent(ANTHOLOGY_LIVE_USER) + "&password=" + encodeURIComponent(ANTHOLOGY_LIVE_PASS);
        var liveSources = yield fetchAnthologyLiveSources(canonicalKey);
        if (!Array.isArray(liveSources) || liveSources.length === 0) {
          return [];
        }
        var streams = [];
        for (var i = 0; i < liveSources.length; i++) {
          var src = liveSources[i];
          if (!src || !src.id || src.available === false) continue;
          if (src.id === "direct" || src.id === "backup") continue;
          streams.push(buildAnthologyLiveStreamEntry(src, canonicalKey, chTitle, authQuery));
        }
        return streams;
      });
    }
    function resolveMultiSportStreams(channelIdOrName, fallbackTitle) {
      return __async(this, null, function* () {
        yield initSportConfig();
        var map = findSportChannelMapping(channelIdOrName);
        var chTitle = fallbackTitle || map && map.name || String(channelIdOrName).toUpperCase();
        var canonicalKey = extractCanonicalKey(channelIdOrName);
        if (!canonicalKey && map && map.key) canonicalKey = map.key;
        var streams = [];
        var authQuery = "username=" + encodeURIComponent(ANTHOLOGY_LIVE_USER) + "&password=" + encodeURIComponent(ANTHOLOGY_LIVE_PASS);
        var liveSources = yield fetchAnthologyLiveSources(canonicalKey);
        if (!liveSources || liveSources.length === 0) {
          if (map || canonicalKey) {
            liveSources = [
              { id: "auto", name: "\u26A1\uFE0F Otomatik (En H\u0131zl\u0131)", available: true },
              { id: "mahsunsports", name: "Mahsun Sports", available: true },
              { id: "alemdarsport", name: "Alemdar Sport", available: true },
              { id: "taraftarium", name: "Taraftarium24", available: true },
              { id: "ardasports", name: "Sel\xE7uk / Arda", available: true },
              { id: "papazsports", name: "Papaz Sports", available: true }
            ];
          }
        }
        if (Array.isArray(liveSources)) {
          for (var i = 0; i < liveSources.length; i++) {
            var src = liveSources[i];
            if (!src || !src.id || src.available === false) continue;
            streams.push(buildAnthologyLiveStreamEntry(src, canonicalKey, chTitle, authQuery));
          }
        }
        if (streams.length === 0 && map) {
          var pTimeout = 3500;
          var tPromise = map.taraftarium ? withTimeout(fetchTaraftariumStream(map.taraftarium), pTimeout) : Promise.resolve(null);
          var aPromise = map.ardasports ? withTimeout(fetchArdaSportsStream(map.ardasports), pTimeout) : Promise.resolve(null);
          var alPromise = map.alemdarsport ? withTimeout(fetchAlemdarStream(map.alemdarsport), pTimeout) : Promise.resolve(null);
          var mPromise = map.mahsunsports ? withTimeout(fetchMahsunStream(map.mahsunsports), pTimeout) : Promise.resolve(null);
          var pPromise = map.papazsports ? withTimeout(fetchPapazStream(map.papazsports), pTimeout) : Promise.resolve(null);
          var results = yield Promise.all([tPromise, aPromise, alPromise, mPromise, pPromise]);
          if (results[0] && results[0].url) streams.push(makeStream("\u231C Taraftarium24 \u231F", chTitle + " [1080p FHD]", results[0].url, results[0].headers));
          if (results[1] && results[1].url) streams.push(makeStream("\u231C ArdaSports \u231F", chTitle + " [1080p FHD]", results[1].url, results[1].headers));
          if (results[2] && results[2].url) streams.push(makeStream("\u231C AlemdarSport \u231F", chTitle + " [1080p FHD]", results[2].url, results[2].headers));
          if (results[3] && results[3].url) streams.push(makeStream("\u231C MahsunSports \u231F", chTitle + " [1080p HD]", results[3].url, results[3].headers));
          if (results[4] && results[4].url) streams.push(makeStream("\u231C PapazSports \u231F", chTitle + " [1080p HD]", results[4].url, results[4].headers));
        }
        return streams;
      });
    }
    module2.exports = {
      initSportConfig,
      findSportChannelMapping,
      extractCanonicalKey,
      fetchAnthologyLiveSources,
      fetchTaraftariumStream,
      fetchArdaSportsStream,
      fetchAlemdarStream,
      fetchMahsunStream,
      fetchPapazStream,
      resolveMultiSportStreams,
      resolveAnthologyLiveStreams,
      makeStream
    };
  }
});

// src/shared/live_tv_engine.js
var require_live_tv_engine = __commonJS({
  "src/shared/live_tv_engine.js"(exports2, module2) {
    var { parseTvgLang, channelDescription } = require_channel_lang();
    var { sortStreamsByQuality } = require_quality();
    var { loadConfig, val, wrapAll } = require_config();
    var { timeoutSignal } = require_http();
    var { initSportConfig, resolveAnthologyLiveStreams } = require_sport_engine();
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
        _cfgReady = Promise.all([loadConfig(), initSportConfig()]).then(function() {
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
              description: genre + " \u2022 " + channelDescription(ch.name, ch.lang)
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
            var officialStreams = [];
            var proxyStreams = [];
            var seenUrls = {};
            var isLiveProxyUrl = function(u) {
              return u && u.indexOf("/live/") !== -1 && u.indexOf("anthology-live") !== -1;
            };
            if (ch.url) {
              seenUrls[ch.url] = true;
              if (isLiveProxyUrl(ch.url)) {
                proxyStreams.push(buildStreamEntry("\u231C Anthology Live \xB7 Otomatik \u231F", ch.name, ch.name + " [Kool.ws \xB7 Otomatik]", ch.url));
              } else {
                officialStreams.push(buildStreamEntry(streamName, ch.name, ch.name + " [Canl\u0131 HD \xB7 Resmi]", ch.url));
              }
            }
            if (ch.backups && ch.backups.length > 0) {
              for (var bkIdx = 0; bkIdx < ch.backups.length; bkIdx++) {
                var bUrl = ch.backups[bkIdx];
                if (bUrl && !seenUrls[bUrl]) {
                  seenUrls[bUrl] = true;
                  var bSuffix = ch.backups.length > 1 ? " [Yedek Ak\u0131\u015F " + (bkIdx + 1) + "]" : " [Yedek Ak\u0131\u015F]";
                  officialStreams.push(buildStreamEntry(streamName, ch.name + bSuffix, ch.name + bSuffix, bUrl));
                }
              }
            }
            try {
              var liveSources = yield resolveAnthologyLiveStreams(ch.id, ch.name, { isSport: false });
              for (var li = 0; li < liveSources.length; li++) {
                var ls = liveSources[li];
                if (ls && ls.url && !seenUrls[ls.url]) {
                  seenUrls[ls.url] = true;
                  proxyStreams.push(ls);
                }
              }
            } catch (e) {
            }
            var streams = sortStreamsByQuality(officialStreams).concat(proxyStreams);
            streams.streams = streams;
            return streams;
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
          var description = genre + " \u2022 " + channelDescription(ch.name, ch.lang);
          return {
            meta: {
              id: targetId,
              type: "tv",
              name: ch.name,
              poster: ch.logo,
              background: ch.logo,
              description,
              genres: [genre],
              videos: [{ id: targetId, title: ch.name, released: (/* @__PURE__ */ new Date()).toISOString() }]
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

// src/anthology_ulusal/index.js
var { createLiveTvProvider } = require_live_tv_engine();
var provider = createLiveTvProvider({
  streamName: "\u231C Anthology Ulusal \u231F",
  genre: "Ulusal",
  matchGroup: function(group) {
    return (group || "").indexOf("ULUSAL") !== -1;
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

