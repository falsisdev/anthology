/**
 * Anthology Provider: anthology_belgesel_cocuk
 * Built from src/anthology_belgesel_cocuk/index.js
 * Build: v1.8.43 (anthology build system)
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

// src/shared/kool_catalog.js
var require_kool_catalog = __commonJS({
  "src/shared/kool_catalog.js"(exports2, module2) {
    module2.exports = { "generated_at": "2026-11-22T21:46:56.820Z", "total_variants": 744, "channels": [{ "key": "now", "name": "NOW", "tvg_id": "now.tr", "variants": [{ "koolId": "2578197593", "rawName": "4K TR: NOW HD (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "919108696", "rawName": "NOW TV FHD (1)", "pool": "kool1", "quality": 1080 }, { "koolId": "2769713183", "rawName": "NOW TV RAW (1)", "pool": "kool1", "quality": 900 }, { "koolId": "161305206", "rawName": "NOW TV HD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "998968304", "rawName": "NOW TV HD (H265) (1)", "pool": "kool1", "quality": 720 }, { "koolId": "3105184056", "rawName": "NOW (6)", "pool": "kool6", "quality": 600 }, { "koolId": "145391758", "rawName": "FOX (6)", "pool": "kool6", "quality": 600 }, { "koolId": "1498459094", "rawName": "FOX (7)", "pool": "kool7", "quality": 600 }, { "koolId": "1619828782", "rawName": "NOW TV SD (1)", "pool": "kool1", "quality": 480 }] }, { "key": "trt1", "name": "TRT 1", "tvg_id": "trt1.tr", "variants": [{ "koolId": "1762199258", "rawName": "4K TR: TRT 1 HD (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "3059837792", "rawName": "TRT 1 4K (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "406666682", "rawName": "TRT 1 FHD (1)", "pool": "kool1", "quality": 1080 }, { "koolId": "2346924541", "rawName": "TRT 1 RAW (1)", "pool": "kool1", "quality": 900 }, { "koolId": "194373112", "rawName": "TRT 1 HEVC (1)", "pool": "kool1", "quality": 850 }, { "koolId": "1221669131", "rawName": "TRT 1 HD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "2041026135", "rawName": "TRT 1 (6)", "pool": "kool6", "quality": 600 }, { "koolId": "115261333", "rawName": "TRT 1 (7)", "pool": "kool7", "quality": 600 }, { "koolId": "566281043", "rawName": "TRT 1 SD (1)", "pool": "kool1", "quality": 480 }] }, { "key": "kanald", "name": "Kanal D", "tvg_id": "kanald.tr", "variants": [{ "koolId": "1677679684", "rawName": "4K TR: KANAL D HD (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "1781656098", "rawName": "KANAL D FHD (1)", "pool": "kool1", "quality": 1080 }, { "koolId": "4193250917", "rawName": "KANAL D RAW (1)", "pool": "kool1", "quality": 900 }, { "koolId": "4113822297", "rawName": "KANAL D HEVC (1)", "pool": "kool1", "quality": 850 }, { "koolId": "1130441933", "rawName": "KANAL D HD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "1371306270", "rawName": "KANAL D HD (H265) (1)", "pool": "kool1", "quality": 720 }, { "koolId": "387232860", "rawName": "KANAL D (6)", "pool": "kool6", "quality": 600 }, { "koolId": "231583905", "rawName": "KANAL D (7)", "pool": "kool7", "quality": 600 }, { "koolId": "712040085", "rawName": "KANAL D SD (1)", "pool": "kool1", "quality": 480 }] }, { "key": "beyaztv", "name": "Beyaz TV", "tvg_id": "beyaztv.tr", "variants": [{ "koolId": "805689873", "rawName": "4K TR: BEYAZ TV HD (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "1600348811", "rawName": "BEYAZ TV FHD (1)", "pool": "kool1", "quality": 1080 }, { "koolId": "3434964684", "rawName": "BEYAZ TV RAW (1)", "pool": "kool1", "quality": 900 }, { "koolId": "1510783901", "rawName": "BEYAZ TV HEVC (1)", "pool": "kool1", "quality": 850 }, { "koolId": "2755756005", "rawName": "BEYAZ TV HD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "1020985035", "rawName": "BEYAZ HD+ SD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "3418237531", "rawName": "BEYAZ TV (6)", "pool": "kool6", "quality": 600 }, { "koolId": "275850888", "rawName": "BEYAZ TV (7)", "pool": "kool7", "quality": 600 }] }, { "key": "atv", "name": "ATV", "tvg_id": "atv.tr", "variants": [{ "koolId": "2325261286", "rawName": "4K TR: ATV HD (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "2861010641", "rawName": "ATV FHD (1)", "pool": "kool1", "quality": 1080 }, { "koolId": "962169494", "rawName": "ATV RAW (1)", "pool": "kool1", "quality": 900 }, { "koolId": "3511150491", "rawName": "ATV HEVC (1)", "pool": "kool1", "quality": 850 }, { "koolId": "1332310706", "rawName": "ATV HD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "129909794", "rawName": "ATV HD (H265) (1)", "pool": "kool1", "quality": 720 }, { "koolId": "455930425", "rawName": "ATV (6)", "pool": "kool6", "quality": 600 }, { "koolId": "90085139", "rawName": "ATV EUROPA (1)", "pool": "kool1", "quality": 600 }, { "koolId": "1255594337", "rawName": "ATV (7)", "pool": "kool7", "quality": 600 }, { "koolId": "645431530", "rawName": "ATV SD (1)", "pool": "kool1", "quality": 480 }] }, { "key": "trtspor", "name": "TRT Spor", "tvg_id": "trtspor.tr", "variants": [{ "koolId": "2262969938", "rawName": "4K TR: TRT SPOR HD (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "2952828245", "rawName": "TRT SPOR FHD (1)", "pool": "kool1", "quality": 1080 }, { "koolId": "601788690", "rawName": "TRT SPOR RAW (1)", "pool": "kool1", "quality": 900 }, { "koolId": "312904614", "rawName": "TRT SPOR HD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "2114335424", "rawName": "TRT SPOR (6)", "pool": "kool6", "quality": 600 }, { "koolId": "2781429267", "rawName": "TRT SPOR (7)", "pool": "kool7", "quality": 600 }] }, { "key": "startv", "name": "Star TV", "tvg_id": "startv.tr", "variants": [{ "koolId": "2192971293", "rawName": "4K TR: STAR TV HD (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "2020035128", "rawName": "STAR TV FHD (1)", "pool": "kool1", "quality": 1080 }, { "koolId": "3954790015", "rawName": "STAR TV RAW (1)", "pool": "kool1", "quality": 900 }, { "koolId": "138632579", "rawName": "STAR TV HEVC (1)", "pool": "kool1", "quality": 850 }, { "koolId": "1134124382", "rawName": "STAR HD (H265) (1)", "pool": "kool1", "quality": 720 }, { "koolId": "2720556692", "rawName": "STAR TV HD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "3209892863", "rawName": "STAR HD SD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "699305923", "rawName": "STAR TV (6)", "pool": "kool6", "quality": 600 }, { "koolId": "863472446", "rawName": "STAR TV (7)", "pool": "kool7", "quality": 600 }] }, { "key": "beinsports2", "name": "beIN Sports 2", "tvg_id": "beinsports2.tr", "variants": [{ "koolId": "3694662475", "rawName": "BEIN SPORTS 2 UHD (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "2851539143", "rawName": "BEIN SPORTS 2 HD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "2509466191", "rawName": "BEIN SPORTS 2 (7)", "pool": "kool7", "quality": 600 }, { "koolId": "3236362911", "rawName": "BEIN SPORTS 2 SD (1)", "pool": "kool1", "quality": 480 }] }, { "key": "beinsports1", "name": "beIN Sports 1", "tvg_id": "beinsports1.tr", "variants": [{ "koolId": "2113462398", "rawName": "BEIN SPORTS 8K FEED (1)", "pool": "kool1", "quality": 4320 }, { "koolId": "267105889", "rawName": "BEIN SPORTS 4K FEED(KUTU) (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "1536730627", "rawName": "BEIN SPORTS 4K FEED(UYDU) (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "2403425031", "rawName": "BEIN SPORTS 1 H265 (1)", "pool": "kool1", "quality": 850 }, { "koolId": "593493860", "rawName": "BEIN SPORTS 1 HD (TURKEY) (1)", "pool": "kool1", "quality": 720 }, { "koolId": "3840475653", "rawName": "BEIN SPORTS 1 (720P) (1)", "pool": "kool1", "quality": 720 }, { "koolId": "1363827223", "rawName": "BEIN 1 FEED (720P) (1)", "pool": "kool1", "quality": 720 }, { "koolId": "662179620", "rawName": "BEIN SPORTS 1 HD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "499485497", "rawName": "BEIN SPORTS 720P FEED (1)", "pool": "kool1", "quality": 720 }, { "koolId": "300113394", "rawName": "BEIN SPORTS 1 (6)", "pool": "kool6", "quality": 600 }, { "koolId": "1352421053", "rawName": "BEIN SPORTS 1 50 FPS (1)", "pool": "kool1", "quality": 600 }, { "koolId": "2729088606", "rawName": "BEIN SPORTS 1 FEED (6)", "pool": "kool6", "quality": 600 }, { "koolId": "2233066433", "rawName": "BEIN SPORTS 1 (720PFEED) (1)", "pool": "kool1", "quality": 600 }, { "koolId": "2576216897", "rawName": "BEIN SPORTS 1 + (1)", "pool": "kool1", "quality": 600 }, { "koolId": "1453692314", "rawName": "BEIN SPORTS FEED (OZEL FEED YAYIN) (1)", "pool": "kool1", "quality": 600 }, { "koolId": "3428984703", "rawName": "BEIN SPORTS 1 [LIVE DURING EVENTS ONLY] (7)", "pool": "kool7", "quality": 600 }, { "koolId": "3692337241", "rawName": "BEIN 1 SD (360P) (1)", "pool": "kool1", "quality": 480 }, { "koolId": "2919229346", "rawName": "BEIN 1 SD (480P) (1)", "pool": "kool1", "quality": 480 }, { "koolId": "143239535", "rawName": "BEIN SPOTS1 SD (1)", "pool": "kool1", "quality": 480 }] }, { "key": "showtv", "name": "Show TV", "tvg_id": "showtv.tr", "variants": [{ "koolId": "879588960", "rawName": "4K TR: SHOW TV HD (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "1449499865", "rawName": "SHOW TV FHD (1)", "pool": "kool1", "quality": 1080 }, { "koolId": "3317405854", "rawName": "SHOW TV RAW (1)", "pool": "kool1", "quality": 900 }, { "koolId": "3747646907", "rawName": "SHOW TV HEVC (1)", "pool": "kool1", "quality": 850 }, { "koolId": "351471337", "rawName": "SHOW TV HD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "3537232978", "rawName": "SHOW HD (H265) (1)", "pool": "kool1", "quality": 720 }, { "koolId": "2485009235", "rawName": "SHOW TV (6)", "pool": "kool6", "quality": 600 }, { "koolId": "605929821", "rawName": "SHOW T RK EUROPA (1)", "pool": "kool1", "quality": 600 }] }, { "key": "ssport", "name": "S Sport 1", "tvg_id": "ssport.tr", "variants": [{ "koolId": "2123273598", "rawName": "4K TR: S SPORT (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "3531762195", "rawName": "S-SPORT 1 UHD (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "4036046219", "rawName": "S-SPORT PLUS FHD (1)", "pool": "kool1", "quality": 1080 }, { "koolId": "4160022414", "rawName": "S-SPORTS 1 HD (7)", "pool": "kool7", "quality": 720 }, { "koolId": "919993168", "rawName": "S-SPORT HD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "3346549722", "rawName": "S SPORT (6)", "pool": "kool6", "quality": 600 }, { "koolId": "3718336295", "rawName": "S SPORT (7)", "pool": "kool7", "quality": 600 }, { "koolId": "320290523", "rawName": "S-SPORTS 1 SD (1)", "pool": "kool1", "quality": 480 }] }, { "key": "tv8", "name": "TV8", "tvg_id": "tv8.tr", "variants": [{ "koolId": "2693299013", "rawName": "4K TR: TV8 HD (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "3849481299", "rawName": "TV8 FHD (1)", "pool": "kool1", "quality": 1080 }, { "koolId": "1991010324", "rawName": "TV8 RAW (1)", "pool": "kool1", "quality": 900 }, { "koolId": "1662562034", "rawName": "TV 8 HEVC (1)", "pool": "kool1", "quality": 850 }, { "koolId": "1702470161", "rawName": "TV8 HD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "3298026270", "rawName": "TV 8 HD (H265) (1)", "pool": "kool1", "quality": 720 }, { "koolId": "4292306921", "rawName": "TV 8 (6)", "pool": "kool6", "quality": 600 }, { "koolId": "2196709234", "rawName": "TV 8 (7)", "pool": "kool7", "quality": 600 }, { "koolId": "3695389987", "rawName": "TV 8 SD (1)", "pool": "kool1", "quality": 480 }, { "koolId": "208162889", "rawName": "TV8 SD (1)", "pool": "kool1", "quality": 480 }] }, { "key": "aspor", "name": "A Spor", "tvg_id": "aspor.tr", "variants": [{ "koolId": "1771137539", "rawName": "4K TR: A SPOR HD (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "911836506", "rawName": "A SPOR FHD (1)", "pool": "kool1", "quality": 1080 }, { "koolId": "2777121053", "rawName": "A SPOR RAW (1)", "pool": "kool1", "quality": 900 }, { "koolId": "2556711030", "rawName": "A SPOR HD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "819272696", "rawName": "A SPOR (6)", "pool": "kool6", "quality": 600 }, { "koolId": "1561958971", "rawName": "A SPOR (7)", "pool": "kool7", "quality": 600 }] }, { "key": "cnnturk", "name": "CNN T\xFCrk", "tvg_id": "cnnturk.tr", "variants": [{ "koolId": "2056768647", "rawName": "4K TR: CNN T RK HD (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "3583754923", "rawName": "CNN T RK RAW (1)", "pool": "kool1", "quality": 900 }, { "koolId": "2311285186", "rawName": "CNN T RK HEVC (1)", "pool": "kool1", "quality": 850 }, { "koolId": "4273153967", "rawName": "CNN TURK HD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "2868318534", "rawName": "CNN T RK HD+ SD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "413381526", "rawName": "CNN TURK (6)", "pool": "kool6", "quality": 600 }, { "koolId": "3278683973", "rawName": "CNN TURK (7)", "pool": "kool7", "quality": 600 }] }, { "key": "kanal7", "name": "Kanal 7", "tvg_id": "kanal7.tr", "variants": [{ "koolId": "1092667959", "rawName": "4K TR: KANAL 7 HD (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "2736723250", "rawName": "KANAL 7 FHD (1)", "pool": "kool1", "quality": 1080 }, { "koolId": "817959285", "rawName": "KANAL 7 RAW (1)", "pool": "kool1", "quality": 900 }, { "koolId": "3897412802", "rawName": "KANAL 7 HEVC (1)", "pool": "kool1", "quality": 850 }, { "koolId": "1639889598", "rawName": "KANAL 7 HD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "2842046019", "rawName": "KANAL 7 (6)", "pool": "kool6", "quality": 600 }] }, { "key": "ssport2", "name": "S Sport 2", "tvg_id": "ssport2.tr", "variants": [{ "koolId": "936908274", "rawName": "4K TR: S SPORT 2 (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "3943651030", "rawName": "S-SPORT 2 UHD (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "1183409452", "rawName": "S-SPORT 2 HD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "2038161517", "rawName": "S-SPORTS 2 HD (7)", "pool": "kool7", "quality": 720 }, { "koolId": "1313768516", "rawName": "S SPORT 2 (6)", "pool": "kool6", "quality": 600 }, { "koolId": "1234604880", "rawName": "S SPORT 2 (7)", "pool": "kool7", "quality": 600 }, { "koolId": "2643999032", "rawName": "S-SPORTS 2 SD (1)", "pool": "kool1", "quality": 480 }] }, { "key": "kanal24", "name": "Kanal 24", "tvg_id": "kanal24.tr", "variants": [{ "koolId": "1998168122", "rawName": "4K TR: 24 HD (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "536029186", "rawName": "24 RAW (1)", "pool": "kool1", "quality": 900 }, { "koolId": "1170183149", "rawName": "NOW TV HEVC (1)", "pool": "kool1", "quality": 850 }, { "koolId": "3828793616", "rawName": "24 HABER HD+ SD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "4179564147", "rawName": "KANAL 24 HD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "1702937932", "rawName": "24 (7)", "pool": "kool7", "quality": 600 }, { "koolId": "3822901239", "rawName": "24 TV (6)", "pool": "kool6", "quality": 600 }, { "koolId": "2146960844", "rawName": "KANAL 24 (7)", "pool": "kool7", "quality": 600 }] }, { "key": "beinsports5", "name": "beIN Sports 5", "tvg_id": "beinsports5.tr", "variants": [{ "koolId": "4000315601", "rawName": "BEIN SPORTS 5 FHD (1)", "pool": "kool1", "quality": 1080 }, { "koolId": "2737963486", "rawName": "BEIN SPORTS 5 HD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "3831757618", "rawName": "BEIN SPORTS 5 (6)", "pool": "kool6", "quality": 600 }, { "koolId": "1230448192", "rawName": "BEIN SPORTS 5 (MATCH TIME) (7)", "pool": "kool7", "quality": 600 }, { "koolId": "3391353734", "rawName": "BEIN SPORTS 5 SD (1)", "pool": "kool1", "quality": 480 }] }, { "key": "ahaber", "name": "A Haber", "tvg_id": "ahaber.tr", "variants": [{ "koolId": "1064954896", "rawName": "4K TR: A HABER HD (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "2511732024", "rawName": "A HABER RAW (1)", "pool": "kool1", "quality": 900 }, { "koolId": "3766846723", "rawName": "A HABER HEVC (1)", "pool": "kool1", "quality": 850 }, { "koolId": "535272601", "rawName": "A HABER HD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "1596095882", "rawName": "A HABER (6)", "pool": "kool6", "quality": 600 }, { "koolId": "1174108535", "rawName": "A HABER (7)", "pool": "kool7", "quality": 600 }] }, { "key": "beinsports3", "name": "beIN Sports 3", "tvg_id": "beinsports3.tr", "variants": [{ "koolId": "3410167560", "rawName": "BEIN SPORTS 3 UHD (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "1700595801", "rawName": "BEIN SPORTS 3 HD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "1797459602", "rawName": "BEIN SPORTS 3 (6)", "pool": "kool6", "quality": 600 }, { "koolId": "2834514943", "rawName": "BEIN SPORTS 3 (7)", "pool": "kool7", "quality": 600 }, { "koolId": "206371329", "rawName": "BEIN SPORTS 3 SD (1)", "pool": "kool1", "quality": 480 }] }, { "key": "dmax", "name": "DMAX", "tvg_id": "dmax.tr", "variants": [{ "koolId": "869937351", "rawName": "4K TR: DMAX HD (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "3928493138", "rawName": "DMAX HEVC (1)", "pool": "kool1", "quality": 850 }] }, { "key": "nationalgeographic", "name": "Nat Geo", "tvg_id": "nationalgeographic.tr", "variants": [{ "koolId": "1078355325", "rawName": "4K TR: NATIONAL GEOGRAPHIC HD (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "1514492628", "rawName": "NATIONAL GEOGRAPHIC HD+ (1)", "pool": "kool1", "quality": 720 }, { "koolId": "1960546091", "rawName": "NAT GEO (7)", "pool": "kool7", "quality": 600 }] }, { "key": "sozcutv", "name": "S\xF6zc\xFC TV", "tvg_id": "sozcutv.tr", "variants": [{ "koolId": "960578312", "rawName": "4K TR: SOZCU TV (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "2466905700", "rawName": "S ZC SZC TV (1)", "pool": "kool1", "quality": 600 }, { "koolId": "2036794972", "rawName": "SZC (6)", "pool": "kool6", "quality": 600 }, { "koolId": "1098172953", "rawName": "SOZCU SZC TV SD (1)", "pool": "kool1", "quality": 480 }] }, { "key": "a2", "name": "A2", "tvg_id": "a2.tr", "variants": [{ "koolId": "2019055277", "rawName": "4K TR: A2 HD (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "1905749779", "rawName": "A2 RAW (1)", "pool": "kool1", "quality": 900 }, { "koolId": "1289576145", "rawName": "A2 HEVC (1)", "pool": "kool1", "quality": 850 }, { "koolId": "867875861", "rawName": "A2 HD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "759245925", "rawName": "A2 (6)", "pool": "kool6", "quality": 600 }, { "koolId": "1735806851", "rawName": "A2 (7)", "pool": "kool7", "quality": 600 }, { "koolId": "1835847966", "rawName": "A2 TV SD (1)", "pool": "kool1", "quality": 480 }] }, { "key": "exxensports2", "name": "Exxen Sports 2", "tvg_id": "exxensports2.tr", "variants": [{ "koolId": "3377046146", "rawName": "EXXEN TV SPOR 2 HD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "3961480108", "rawName": "EXXEN SPORTS 2 [LIVE DURING EVENTS ONLY] (7)", "pool": "kool7", "quality": 600 }] }, { "key": "cartoonnetwork", "name": "Cartoon Network", "tvg_id": "cartoonnetwork.tr", "variants": [{ "koolId": "3278185898", "rawName": "4K TR: CARTOON NETWORK (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "1696573723", "rawName": "CARTOON NETWORK (6)", "pool": "kool6", "quality": 600 }, { "koolId": "478549032", "rawName": "CARTOON NETWORK (7)", "pool": "kool7", "quality": 600 }] }, { "key": "benguturk", "name": "Bengu T\xFCrk", "tvg_id": "benguturk.tr", "variants": [{ "koolId": "2702376790", "rawName": "4K TR: BENG T RK (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "3030241554", "rawName": "BENGU TURK (6)", "pool": "kool6", "quality": 600 }] }, { "key": "fbtv", "name": "FB TV", "tvg_id": "fbtv.tr", "variants": [{ "koolId": "3730681078", "rawName": "4K TR: FB TV (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "2512340558", "rawName": "FB TV (1)", "pool": "kool1", "quality": 600 }, { "koolId": "1540748539", "rawName": "FB TV (7)", "pool": "kool7", "quality": 600 }] }, { "key": "teve2", "name": "Teve2", "tvg_id": "teve2.tr", "variants": [{ "koolId": "1917502631", "rawName": "4K TR: TEVE2 HD (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "4229529558", "rawName": "TEVE 2 FHD (1)", "pool": "kool1", "quality": 1080 }, { "koolId": "2773252030", "rawName": "TEVE2 RAW (1)", "pool": "kool1", "quality": 900 }, { "koolId": "1333128393", "rawName": "TEVE 2 HEVC (1)", "pool": "kool1", "quality": 850 }, { "koolId": "4197507696", "rawName": "TEVE 2 (6)", "pool": "kool6", "quality": 600 }, { "koolId": "2549900211", "rawName": "TEVE 2 (7)", "pool": "kool7", "quality": 600 }] }, { "key": "tgrthaber", "name": "TGRT Haber", "tvg_id": "tgrthaber.tr", "variants": [{ "koolId": "1907154704", "rawName": "4K TR: TGRT HABER HD (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "3562740054", "rawName": "TGRT HABER UHD (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "1355881287", "rawName": "TGRT HABER HEVC (1)", "pool": "kool1", "quality": 850 }, { "koolId": "2814392458", "rawName": "TGRT HABER HD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "1718429323", "rawName": "TGRT HABER (6)", "pool": "kool6", "quality": 600 }, { "koolId": "1684631959", "rawName": "TGRT HABER (7)", "pool": "kool7", "quality": 600 }] }, { "key": "trtbelgesel", "name": "TRT Belgesel", "tvg_id": "trtbelgesel.tr", "variants": [{ "koolId": "786973656", "rawName": "4K TR: TRT BELGESEL HD (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "836826697", "rawName": "TRT BELGESEL RAW (1)", "pool": "kool1", "quality": 900 }, { "koolId": "2661394868", "rawName": "TRT BELGESEL HD+ (1)", "pool": "kool1", "quality": 720 }, { "koolId": "599757405", "rawName": "TRT BELGESEL (6)", "pool": "kool6", "quality": 600 }] }, { "key": "globalboxkemalsunal", "name": "Global Box Kemal Sunal", "tvg_id": "globalboxkemalsunal.tr", "variants": [{ "koolId": "4275446197", "rawName": "GLOBAL BOX KEMAL SUNAL (1)", "pool": "kool1", "quality": 600 }] }, { "key": "tv360", "name": "360 TV", "tvg_id": "tv360.tr", "variants": [{ "koolId": "473300573", "rawName": "4K TR: 360 HD (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "1702645191", "rawName": "360 RAW (1)", "pool": "kool1", "quality": 900 }, { "koolId": "3357052453", "rawName": "KANAL 360 HEVC (1)", "pool": "kool1", "quality": 850 }, { "koolId": "865410951", "rawName": "360 (6)", "pool": "kool6", "quality": 480 }, { "koolId": "1651455199", "rawName": "360 (7)", "pool": "kool7", "quality": 480 }, { "koolId": "1893598000", "rawName": "360 PLUS (7)", "pool": "kool7", "quality": 480 }] }, { "key": "davinci", "name": "Da Vinci", "tvg_id": "davinci.tr", "variants": [{ "koolId": "410345406", "rawName": "4K TR: DA VINCI (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "1268465409", "rawName": "DA VINCI LEARNING (7)", "pool": "kool7", "quality": 600 }] }, { "key": "haberturk", "name": "Haberturk", "tvg_id": "haberturk.tr", "variants": [{ "koolId": "4253369376", "rawName": "4K TR: HABERT RK HD (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "2129890787", "rawName": "HABERTURK RAW (1)", "pool": "kool1", "quality": 900 }, { "koolId": "1857563183", "rawName": "HABER TURK HEVC (1)", "pool": "kool1", "quality": 850 }, { "koolId": "2360854158", "rawName": "HABER TURK HD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "1470199900", "rawName": "HABERTURK HD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "464378170", "rawName": "HABER TURK (7)", "pool": "kool7", "quality": 600 }, { "koolId": "2402772380", "rawName": "HABERTURK (6)", "pool": "kool6", "quality": 600 }] }, { "key": "ntv", "name": "NTV", "tvg_id": "ntv.tr", "variants": [{ "koolId": "2073292907", "rawName": "4K TR: NTV HD (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "2862710352", "rawName": "NTV RAW (1)", "pool": "kool1", "quality": 900 }, { "koolId": "1712849933", "rawName": "NTV HABER HEVC (1)", "pool": "kool1", "quality": 850 }, { "koolId": "3194104127", "rawName": "NTV HD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "1220417659", "rawName": "NTV HABER HD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "3164514696", "rawName": "NTV (7)", "pool": "kool7", "quality": 600 }, { "koolId": "1237310964", "rawName": "NTV HABER (7)", "pool": "kool7", "quality": 600 }, { "koolId": "3614694247", "rawName": "NTV SD (1)", "pool": "kool1", "quality": 480 }] }, { "key": "trt2", "name": "Trt2", "tvg_id": "trt2.tr", "variants": [{ "koolId": "3884319033", "rawName": "4K TR: TRT 2 HD (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "2005305132", "rawName": "TRT 2 UHD (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "21895121", "rawName": "TRT2 RAW (1)", "pool": "kool1", "quality": 900 }, { "koolId": "1040706695", "rawName": "TRT 2 (6)", "pool": "kool6", "quality": 600 }] }, { "key": "trthaber", "name": "TRT Haber", "tvg_id": "trthaber.tr", "variants": [{ "koolId": "603651638", "rawName": "4K TR: TRT HABER HD (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "93108665", "rawName": "TRT HABER RAW (1)", "pool": "kool1", "quality": 900 }, { "koolId": "2057965553", "rawName": "TRT HABER HEVC (1)", "pool": "kool1", "quality": 850 }, { "koolId": "2579401878", "rawName": "TRT HABER HD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "2003703357", "rawName": "TRT HABER (6)", "pool": "kool6", "quality": 600 }, { "koolId": "1890976041", "rawName": "TRT HABER (7)", "pool": "kool7", "quality": 600 }] }, { "key": "tv85", "name": "TV8.5", "tvg_id": "tv85.tr", "variants": [{ "koolId": "1886743624", "rawName": "4K TR: TV8,5 HD (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "1908265816", "rawName": "TV 8.5 FHD (1)", "pool": "kool1", "quality": 1080 }, { "koolId": "2412205937", "rawName": "TV8 5 RAW (1)", "pool": "kool1", "quality": 900 }, { "koolId": "3472698776", "rawName": "TV 8.5 HD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "14092376", "rawName": "TV 8.5 (6)", "pool": "kool6", "quality": 600 }, { "koolId": "1830521243", "rawName": "TV 8.5 (7)", "pool": "kool7", "quality": 600 }] }, { "key": "beinmoviesaction", "name": "beIN Movies Action", "tvg_id": "beinmoviesaction.tr", "variants": [{ "koolId": "1873478131", "rawName": "BEIN MOVIES ACTION (6)", "pool": "kool6", "quality": 600 }, { "koolId": "3041245607", "rawName": "BEIN MOVIES ACTION (7)", "pool": "kool7", "quality": 600 }] }, { "key": "fx", "name": "FX", "tvg_id": "fx.tr", "variants": [{ "koolId": "1561495319", "rawName": "4K TR: FX HD (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "2851147991", "rawName": "FX (7)", "pool": "kool7", "quality": 600 }] }, { "key": "haberglobal", "name": "Haber Global", "tvg_id": "haberglobal.tr", "variants": [{ "koolId": "1196626387", "rawName": "4K TR: HABER GLOBAL HD (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "1224377838", "rawName": "GLOBAL HABER HD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "4069774068", "rawName": "HABER GLOBAL HD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "4144668031", "rawName": "HABER GLOBAL HD+ SD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "652210082", "rawName": "HABER GLOBAL (6)", "pool": "kool6", "quality": 600 }, { "koolId": "2483036808", "rawName": "HABER GLOBAL (7)", "pool": "kool7", "quality": 600 }] }, { "key": "natgeowild", "name": "Nat Geo Wild", "tvg_id": "natgeowild.tr", "variants": [{ "koolId": "132416616", "rawName": "4K TR: NATIONAL GEOGRAPHIC WILD HD (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "1519237116", "rawName": "NAT GEO WILD HD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "124345657", "rawName": "NAT GEO WILD HD+ (1)", "pool": "kool1", "quality": 720 }, { "koolId": "3320654968", "rawName": "NAT GEO WILD (6)", "pool": "kool6", "quality": 600 }] }, { "key": "trtsporyildiz", "name": "TRT Spor Y\u0131ld\u0131z", "tvg_id": "trtsporyildiz.tr", "variants": [{ "koolId": "2750507083", "rawName": "4K TR: TRT SPOR YILDIZ (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "3650641237", "rawName": "TRT SPOR 2 HD (7)", "pool": "kool7", "quality": 720 }, { "koolId": "2081577417", "rawName": "TRT SPOR YILDIZ (7)", "pool": "kool7", "quality": 600 }] }, { "key": "viasatexplore", "name": "Viasat Explore", "tvg_id": "viasatexplore.tr", "variants": [{ "koolId": "1451950581", "rawName": "4K TR: VIASAT EXPLORE (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "1785479914", "rawName": "VIASAT EXPLORE (7)", "pool": "kool7", "quality": 600 }] }, { "key": "lovenature", "name": "Love Nature", "tvg_id": "lovenature.tr", "variants": [{ "koolId": "3578706863", "rawName": "4K TR: LOVE NATURE HD (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "3309481234", "rawName": "LOVE NATURE HD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "1078222172", "rawName": "LOVE NATURE HD+ (1)", "pool": "kool1", "quality": 720 }, { "koolId": "2520793577", "rawName": "LOVE NATURE (7)", "pool": "kool7", "quality": 600 }] }, { "key": "exxensports1", "name": "Exxen Sports 1", "tvg_id": "exxensports1.tr", "variants": [{ "koolId": "1842018252", "rawName": "EXXEN SPORTS 1 (7)", "pool": "kool7", "quality": 600 }, { "koolId": "1188258066", "rawName": "EXXEN SPORTS 1 (6)", "pool": "kool6", "quality": 600 }, { "koolId": "2024568982", "rawName": "EXXEN SPOR 1 SD (1)", "pool": "kool1", "quality": 480 }] }, { "key": "tabiispor5", "name": "Tabii Spor 5", "tvg_id": "tabiispor5.tr", "variants": [{ "koolId": "3035603077", "rawName": "TABII SPOR 5 (6)", "pool": "kool6", "quality": 600 }] }, { "key": "babytv", "name": "Baby TV", "tvg_id": "babytv.tr", "variants": [{ "koolId": "1758313456", "rawName": "4K TR: BABYTV (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "2751658995", "rawName": "BABY TV HD (1)", "pool": "kool1", "quality": 720 }] }, { "key": "disneyjr", "name": "Disney Jr.", "tvg_id": "disneyjr.tr", "variants": [{ "koolId": "649228722", "rawName": "4K TR: DISNEY JUNIOR (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "1772892321", "rawName": "DISNEY JR HD+ (1)", "pool": "kool1", "quality": 720 }, { "koolId": "4108765291", "rawName": "DISNEY JR HD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "3963678097", "rawName": "DISNEY JR (7)", "pool": "kool7", "quality": 600 }] }, { "key": "halktv", "name": "Halk TV", "tvg_id": "halktv.tr", "variants": [{ "koolId": "1320391955", "rawName": "4K TR: HALK TV (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "1771999100", "rawName": "HALK TV HD (1)", "pool": "kool1", "quality": 720 }] }, { "key": "number1damar", "name": "Number 1 Damar", "tvg_id": "number1damar.tr", "variants": [{ "koolId": "2432556224", "rawName": "4K TR: NR1 DAMAR HD (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "409852058", "rawName": "NUMBER 1 DAMAR (6)", "pool": "kool6", "quality": 600 }] }, { "key": "viasathistory", "name": "Viasat History", "tvg_id": "viasathistory.tr", "variants": [{ "koolId": "1335130209", "rawName": "4K TR: VIASAT HISTORY HD (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "3480468962", "rawName": "VIASAT HISTORY HD+ (1)", "pool": "kool1", "quality": 720 }] }, { "key": "beinsports4", "name": "beIN Sports 4", "tvg_id": "beinsports4.tr", "variants": [{ "koolId": "2938268353", "rawName": "BEIN SPORTS 4 UHD (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "1872232768", "rawName": "BEIN SPORTS 4 HD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "450076655", "rawName": "BEIN SPORTS 4 (7)", "pool": "kool7", "quality": 600 }, { "koolId": "109703960", "rawName": "BEIN SPORTS 4 SD (1)", "pool": "kool1", "quality": 480 }] }, { "key": "beinsportshaber", "name": "beIN Sports Haber", "tvg_id": "beinsportshaber.tr", "variants": [{ "koolId": "3989995533", "rawName": "BEIN SPORTS HABER HD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "1197336000", "rawName": "BEIN SPORTS HABER (6)", "pool": "kool6", "quality": 600 }, { "koolId": "2806079612", "rawName": "BEIN SPORTS HABER (7)", "pool": "kool7", "quality": 600 }] }, { "key": "fixcinemayesilcam", "name": "Fix Cinema Ye\u015Fil\xE7am", "tvg_id": "fixcinemayesilcam.tr", "variants": [{ "koolId": "4110861662", "rawName": "FIX CINEMA YESILCAM (1)", "pool": "kool1", "quality": 600 }] }, { "key": "trtcocuk", "name": "TRT \xC7ocuk", "tvg_id": "trtcocuk.tr", "variants": [{ "koolId": "3029180506", "rawName": "4K TR: TRT OCUK HD (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "3979837190", "rawName": "TRT COCUK RAW (1)", "pool": "kool1", "quality": 900 }, { "koolId": "685794830", "rawName": "TRT COCUK (6)", "pool": "kool6", "quality": 600 }, { "koolId": "792228122", "rawName": "TRT COCUK (7)", "pool": "kool7", "quality": 600 }] }, { "key": "dreamturk", "name": "Dream T\xFCrk", "tvg_id": "dreamturk.tr", "variants": [{ "koolId": "4266683025", "rawName": "4K TR: DREAM T RK (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "712098411", "rawName": "DREAM TURK (7)", "pool": "kool7", "quality": 600 }] }, { "key": "epicdrama", "name": "Epic Drama", "tvg_id": "epicdrama.tr", "variants": [{ "koolId": "678261693", "rawName": "4K TR: EPIC DRAMA (1)", "pool": "kool1", "quality": 2160 }] }, { "key": "kozatv", "name": "Koza TV", "tvg_id": "kozatv.tr", "variants": [{ "koolId": "2273502354", "rawName": "4K TR: KOZA TV (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "4002657935", "rawName": "KOZA TV HD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "3946938534", "rawName": "KOZA TV (1)", "pool": "kool1", "quality": 600 }] }, { "key": "ulketv", "name": "\xDClke TV", "tvg_id": "ulketv.tr", "variants": [{ "koolId": "1839766333", "rawName": "4K TR: LKE TV HD (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "3641991612", "rawName": "ULKE TV HD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "3203334343", "rawName": "ULKETV HD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "3053206623", "rawName": "\xDCLKE TV (6)", "pool": "kool6", "quality": 600 }, { "koolId": "216740557", "rawName": "ULKE TV (7)", "pool": "kool7", "quality": 600 }] }, { "key": "sinematv2", "name": "Sinema TV 2", "tvg_id": "sinematv2.tr", "variants": [{ "koolId": "295060524", "rawName": "4K TR: S NEMA TV 2 HD (1)", "pool": "kool1", "quality": 2160 }] }, { "key": "smartspor1", "name": "Spor Smart 1", "tvg_id": "smartspor1.tr", "variants": [{ "koolId": "31596047", "rawName": "4K TR: SPOR SMART (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "3763931520", "rawName": "SPOR SMART FHD (1)", "pool": "kool1", "quality": 1080 }, { "koolId": "3445708926", "rawName": "SPOR SMART HEVC (1)", "pool": "kool1", "quality": 850 }, { "koolId": "1313563350", "rawName": "SPOR SMART HD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "4137962062", "rawName": "SMART SPOR 1 (7)", "pool": "kool7", "quality": 600 }, { "koolId": "1771511397", "rawName": "SPOR SMART (6)", "pool": "kool6", "quality": 600 }, { "koolId": "660246670", "rawName": "SPOR SMART SD (1)", "pool": "kool1", "quality": 480 }] }, { "key": "trtmuzik", "name": "TRT M\xFCzik", "tvg_id": "trtmuzik.tr", "variants": [{ "koolId": "970382162", "rawName": "4K TR: TRT M Z K (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "3063329534", "rawName": "TRT MUZIK HD+ (1)", "pool": "kool1", "quality": 720 }, { "koolId": "2332789634", "rawName": "TRT MUZIK (6)", "pool": "kool6", "quality": 600 }] }, { "key": "trtturk", "name": "TRT T\xFCrk", "tvg_id": "trtturk.tr", "variants": [{ "koolId": "3508477481", "rawName": "4K TR: TRT T RK (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "4095879853", "rawName": "TRT TURK RAW (1)", "pool": "kool1", "quality": 900 }, { "koolId": "797768731", "rawName": "TRT TURK (7)", "pool": "kool7", "quality": 600 }] }, { "key": "beinmoviesturk", "name": "beIN Movies T\xFCrk", "tvg_id": "beinmoviesturk.tr", "variants": [{ "koolId": "3390575948", "rawName": "BEIN MOVIES TURK (6)", "pool": "kool6", "quality": 600 }, { "koolId": "1835579025", "rawName": "BEIN MOVIES TURK (7)", "pool": "kool7", "quality": 600 }] }, { "key": "nbatv", "name": "NBA TV", "tvg_id": "nbatv.tr", "variants": [{ "koolId": "2462143546", "rawName": "NBA TV FHD (1)", "pool": "kool1", "quality": 1080 }, { "koolId": "3513867536", "rawName": "NBA TV HD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "2430655089", "rawName": "NBA TV (7)", "pool": "kool7", "quality": 600 }] }, { "key": "boomerang", "name": "Boomerang", "tvg_id": "boomerang.tr", "variants": [{ "koolId": "3510107618", "rawName": "4K TR: BOOMERANG (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "11743931", "rawName": "BOOMERANG HD (1)", "pool": "kool1", "quality": 720 }] }, { "key": "eurosport2", "name": "Eurosport 2", "tvg_id": "eurosport2.tr", "variants": [{ "koolId": "4117227962", "rawName": "4K TR: EUROSPORT 2 HD (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "1821942247", "rawName": "EUROSPORT2 HD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "2237464219", "rawName": "EUROSPORT 2 (7)", "pool": "kool7", "quality": 600 }] }, { "key": "number1turk", "name": "Number 1 T\xFCrk", "tvg_id": "number1turk.tr", "variants": [{ "koolId": "4042887584", "rawName": "4K TR: NUMBER1 TURK HD (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "3548270931", "rawName": "NR1 TURK HD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "344176452", "rawName": "NUMBER 1 TURK (6)", "pool": "kool6", "quality": 600 }] }, { "key": "number1tv", "name": "Number 1", "tvg_id": "number1tv.tr", "variants": [{ "koolId": "1526602599", "rawName": "4K TR: NUMBER1 TV HD (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "4021287013", "rawName": "NR 1 HD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "306690121", "rawName": "NUMBER 1 (6)", "pool": "kool6", "quality": 600 }] }, { "key": "sinemaaksiyon2", "name": "Sinema Aksiyon 2", "tvg_id": "sinemaaksiyon2.tr", "variants": [{ "koolId": "3440711580", "rawName": "4K TR: S NEMA AKS YON 2 HD (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "179563017", "rawName": "SINEMA AKSIYON 2 (7)", "pool": "kool7", "quality": 600 }] }, { "key": "sinematvaksiyon", "name": "Sinema TV Aksiyon", "tvg_id": "sinematvaksiyon.tr", "variants": [{ "koolId": "2246993811", "rawName": "4K TR: S NEMA TV AKS YON HD (1)", "pool": "kool1", "quality": 2160 }] }, { "key": "fixcinemayerli", "name": "Fix Cinema Yerli", "tvg_id": "fixcinemayerli.tr", "variants": [{ "koolId": "239201347", "rawName": "FIX CINEMA YERLI (1)", "pool": "kool1", "quality": 600 }] }, { "key": "eurosport1", "name": "Eurosport 1", "tvg_id": "eurosport1.tr", "variants": [{ "koolId": "2078862937", "rawName": "4K TR: EUROSPORT 1 HD (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "3793200644", "rawName": "EUROSPORT1 HD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "3271328843", "rawName": "EUROSPORT 1 (7)", "pool": "kool7", "quality": 600 }] }, { "key": "flashtv", "name": "Flash TV", "tvg_id": "flashtv.tr", "variants": [{ "koolId": "2687017841", "rawName": "4K TR: FLASH TV (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "2027331096", "rawName": "FLASH TV HD (1)", "pool": "kool1", "quality": 720 }] }, { "key": "krt", "name": "KRT TV", "tvg_id": "krt.tr", "variants": [{ "koolId": "3266397146", "rawName": "4K TR: KRT TV (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "1432853025", "rawName": "KRT HD+ SD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "331685130", "rawName": "KRT (6)", "pool": "kool6", "quality": 600 }] }, { "key": "meltemtv", "name": "Meltem TV", "tvg_id": "meltemtv.tr", "variants": [{ "koolId": "700381068", "rawName": "4K TR: MELTEM TV (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "3628846585", "rawName": "MELTEM TV (1)", "pool": "kool1", "quality": 600 }, { "koolId": "1344824890", "rawName": "MELTEM TV (6)", "pool": "kool6", "quality": 600 }, { "koolId": "1127127807", "rawName": "MELTEM (7)", "pool": "kool7", "quality": 600 }] }, { "key": "sinematv", "name": "Sinema TV", "tvg_id": "sinematv.tr", "variants": [{ "koolId": "2780830033", "rawName": "4K TR: S NEMA TV HD (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "1617719941", "rawName": "SINEMA TV (7)", "pool": "kool7", "quality": 600 }] }, { "key": "trtavaz", "name": "TRT Avaz", "tvg_id": "trtavaz.tr", "variants": [{ "koolId": "2990410352", "rawName": "4K TR: TRT AVAZ (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "2481339809", "rawName": "TRT AVAZ (1)", "pool": "kool1", "quality": 600 }] }, { "key": "beinboxoffice1", "name": "beIN Box Office 1", "tvg_id": "beinboxoffice1.tr", "variants": [{ "koolId": "2930746102", "rawName": "BEIN BOX OFFICE 1 (6)", "pool": "kool6", "quality": 600 }] }, { "key": "beinmoviespremiere2", "name": "beIN Movies Premiere 2", "tvg_id": "beinmoviespremiere2.tr", "variants": [{ "koolId": "2244069093", "rawName": "BEIN MOVIES PREMIERE 2 (6)", "pool": "kool6", "quality": 600 }, { "koolId": "2120218356", "rawName": "BEIN MOVIES PREMIERE 2 (7)", "pool": "kool7", "quality": 600 }] }, { "key": "discoveryid", "name": "Discovery ID", "tvg_id": "discoveryid.tr", "variants": [{ "koolId": "970098662", "rawName": "DISCOVERY IDX HD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "2095404060", "rawName": "DISCOVERY ID (1)", "pool": "kool1", "quality": 600 }] }, { "key": "fixcinemaaction", "name": "Fix Cinema Action", "tvg_id": "fixcinemaaction.tr", "variants": [{ "koolId": "140294889", "rawName": "FIX CINEMA ACTION (1)", "pool": "kool1", "quality": 600 }] }, { "key": "tivibuspor1", "name": "Tivibu Spor 1", "tvg_id": "tivibuspor1.tr", "variants": [{ "koolId": "2896658744", "rawName": "TIVIBUSPOR 1 FHD (1)", "pool": "kool1", "quality": 1080 }, { "koolId": "3654518007", "rawName": "TIVIBUSPOR 1 HD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "2046583925", "rawName": "TIVIBU SPOR 1 HD (7)", "pool": "kool7", "quality": 720 }, { "koolId": "2565972338", "rawName": "TIVIBU SPOR 1 (6)", "pool": "kool6", "quality": 600 }, { "koolId": "1528949791", "rawName": "TIVIBU SPOR 1 (7)", "pool": "kool7", "quality": 600 }] }, { "key": "tivibuspor3", "name": "Tivibu Spor 3", "tvg_id": "tivibuspor3.tr", "variants": [{ "koolId": "2186389950", "rawName": "TIVIBUSPOR 3 FHD (1)", "pool": "kool1", "quality": 1080 }, { "koolId": "2616624010", "rawName": "TIVIBUSPOR 3 HD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "1004102408", "rawName": "TIVIBU SPOR 3 HD (7)", "pool": "kool7", "quality": 720 }, { "koolId": "3794924050", "rawName": "TIVIBU SPOR 3 (6)", "pool": "kool6", "quality": 600 }, { "koolId": "568442751", "rawName": "TIVIBU SPOR 3 (7)", "pool": "kool7", "quality": 600 }] }, { "key": "bloomberght", "name": "Bloomberght", "tvg_id": "bloomberght.tr", "variants": [{ "koolId": "3152079168", "rawName": "4K TR: BLOOMBERG HT HD (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "3578150260", "rawName": "BLOOMBERGHT RAW (1)", "pool": "kool1", "quality": 900 }, { "koolId": "236989031", "rawName": "BLOOMBERG HT HD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "223866535", "rawName": "BLOOMBERG HT (6)", "pool": "kool6", "quality": 600 }, { "koolId": "2603224141", "rawName": "BLOOMBERG (7)", "pool": "kool7", "quality": 600 }] }, { "key": "minikago", "name": "Minika GO", "tvg_id": "minikago.tr", "variants": [{ "koolId": "1230912428", "rawName": "4K TR: M N KA GO (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "2608519906", "rawName": "MINICA GO (1)", "pool": "kool1", "quality": 600 }, { "koolId": "2937701421", "rawName": "MINIKA GO (7)", "pool": "kool7", "quality": 600 }] }, { "key": "sinemaaile2", "name": "Sinema Aile 2", "tvg_id": "sinemaaile2.tr", "variants": [{ "koolId": "3000594763", "rawName": "4K TR: S NEMA A LE 2 HD (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "3131911051", "rawName": "SINEMA AILE 2 (7)", "pool": "kool7", "quality": 600 }] }, { "key": "sinemakomedi", "name": "Sinema Komedi", "tvg_id": "sinemakomedi.tr", "variants": [{ "koolId": "440774949", "rawName": "4K TR: S NEMA KOMED HD (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "257449668", "rawName": "SINEMA KOMEDI (7)", "pool": "kool7", "quality": 600 }] }, { "key": "sinema1001", "name": "Sinema 1001", "tvg_id": "sinema1001.tr", "variants": [{ "koolId": "2761385166", "rawName": "4K TR: S NEMA TV 1001 HD (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "3117683628", "rawName": "SINEMA 1001 (7)", "pool": "kool7", "quality": 600 }] }, { "key": "tv4", "name": "TV 4", "tvg_id": "tv4.tr", "variants": [{ "koolId": "357442962", "rawName": "4K TR: TV 4 (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "975669992", "rawName": "TV 4 (6)", "pool": "kool6", "quality": 600 }] }, { "key": "tvnet", "name": "TV Net", "tvg_id": "tvnet.tr", "variants": [{ "koolId": "1738739277", "rawName": "4K TR: TVNET HD (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "1182480796", "rawName": "TVNET HD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "1225673773", "rawName": "TV NET (6)", "pool": "kool6", "quality": 600 }] }, { "key": "anews", "name": "A News", "tvg_id": "anews.tr", "variants": [{ "koolId": "3415462105", "rawName": "A NEWS RAW (1)", "pool": "kool1", "quality": 900 }, { "koolId": "3878908897", "rawName": "A NEWS HD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "812131629", "rawName": "A NEWS (6)", "pool": "kool6", "quality": 600 }, { "koolId": "1571071214", "rawName": "A NEWS (7)", "pool": "kool7", "quality": 600 }] }, { "key": "apara", "name": "A Para", "tvg_id": "apara.tr", "variants": [{ "koolId": "4202445834", "rawName": "A PARA RAW (1)", "pool": "kool1", "quality": 900 }, { "koolId": "931406409", "rawName": "APARA HD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "3892017014", "rawName": "A PARA (6)", "pool": "kool6", "quality": 600 }, { "koolId": "2318923445", "rawName": "A PARA (7)", "pool": "kool7", "quality": 600 }] }, { "key": "arenaboxaction", "name": "Arena Box Action", "tvg_id": "arenaboxaction.tr", "variants": [{ "koolId": "2853730703", "rawName": "ARENA BOX ACTION (6)", "pool": "kool6", "quality": 600 }] }, { "key": "bbcearth", "name": "BBC Earth", "tvg_id": "bbcearth.tr", "variants": [{ "koolId": "2228496856", "rawName": "BBC EARTH HD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "2618455562", "rawName": "BBC EARTH (6)", "pool": "kool6", "quality": 600 }] }, { "key": "beinmoviesaction2", "name": "beIN Movies Action 2", "tvg_id": "beinmoviesaction2.tr", "variants": [{ "koolId": "650851542", "rawName": "BEIN MOVIES ACTION 2 (7)", "pool": "kool7", "quality": 600 }] }, { "key": "beinmoviesfamily", "name": "beIN Movies Family", "tvg_id": "beinmoviesfamily.tr", "variants": [{ "koolId": "1322228068", "rawName": "BEIN MOVIES FAMILY (7)", "pool": "kool7", "quality": 600 }] }, { "key": "beinmoviespremiere", "name": "beIN Movies Premiere", "tvg_id": "beinmoviespremiere.tr", "variants": [{ "koolId": "942987224", "rawName": "BEIN MOVIES PREMIERE (6)", "pool": "kool6", "quality": 600 }, { "koolId": "2197747964", "rawName": "BEIN MOVIES PREMIERE (7)", "pool": "kool7", "quality": 600 }] }, { "key": "beinseries3", "name": "beIN Series 3", "tvg_id": "beinseries3.tr", "variants": [{ "koolId": "4166418778", "rawName": "BEIN SERIES 3 (6)", "pool": "kool6", "quality": 600 }] }, { "key": "beinseries4", "name": "beIN Series 4", "tvg_id": "beinseries4.tr", "variants": [{ "koolId": "1249271114", "rawName": "BEIN SERIES 4 (6)", "pool": "kool6", "quality": 600 }] }, { "key": "beinseriesscifi", "name": "beIN Series Sci-fi", "tvg_id": "beinseriesscifi.tr", "variants": [{ "koolId": "3016529666", "rawName": "BEIN SERIES SCI-FI (7)", "pool": "kool7", "quality": 600 }] }, { "key": "discoverychannel", "name": "Discovery Channel", "tvg_id": "discoverychannel.tr", "variants": [{ "koolId": "695705778", "rawName": "DISCOVERY CHANNEL HD+ (1)", "pool": "kool1", "quality": 720 }, { "koolId": "3079995901", "rawName": "DISCOVERY CHANNEL (7)", "pool": "kool7", "quality": 600 }] }, { "key": "fixcinemadram", "name": "Fix Cinema Dram", "tvg_id": "fixcinemadram.tr", "variants": [{ "koolId": "2830763591", "rawName": "FIX CINEMA DRAM (1)", "pool": "kool1", "quality": 600 }] }, { "key": "fixcinemafantastic", "name": "Fix Cinema Fantastic", "tvg_id": "fixcinemafantastic.tr", "variants": [{ "koolId": "2459747332", "rawName": "FIX CINEMA FANTASTIC (1)", "pool": "kool1", "quality": 600 }] }, { "key": "fixcinemakorku", "name": "Fix Cinema Korku", "tvg_id": "fixcinemakorku.tr", "variants": [{ "koolId": "2778910791", "rawName": "FIX CINEMA KORKU (1)", "pool": "kool1", "quality": 600 }] }, { "key": "fixcinemanetflix", "name": "Fix Cinema Netflix", "tvg_id": "fixcinemanetflix.tr", "variants": [{ "koolId": "3216985800", "rawName": "FIX CINEMA NETFLIX (1)", "pool": "kool1", "quality": 600 }] }, { "key": "24kitchen", "name": "24 Kitchen", "tvg_id": "24kitchen.tr", "variants": [{ "koolId": "4285350247", "rawName": "24 KITCHEN HD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "3329504843", "rawName": "24 KITCHEN (7)", "pool": "kool7", "quality": 600 }] }, { "key": "minikacocuk", "name": "Minika \xC7ocuk", "tvg_id": "minikacocuk.tr", "variants": [{ "koolId": "248538205", "rawName": "4K TR: M N KA OCUK (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "1127812993", "rawName": "MINIKA COCUK (6)", "pool": "kool6", "quality": 600 }, { "koolId": "4058432171", "rawName": "MINIKA COCUK (7)", "pool": "kool7", "quality": 600 }] }, { "key": "sinemayerli2", "name": "Sinema Yerli 2", "tvg_id": "sinemayerli2.tr", "variants": [{ "koolId": "3971603427", "rawName": "4K TR: S NEMA YERL 2 HD (1)", "pool": "kool1", "quality": 2160 }] }, { "key": "sinemayerli1", "name": "Sinema Yerli 1", "tvg_id": "sinemayerli1.tr", "variants": [{ "koolId": "1897159473", "rawName": "4K TR: S NEMA YERL HD (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "2484805699", "rawName": "SINEMA YERLI 1 (7)", "pool": "kool7", "quality": 600 }] }, { "key": "tjktv", "name": "TJK TV", "tvg_id": "tjktv.tr", "variants": [{ "koolId": "2794936913", "rawName": "4K TR: TJK TV (1)", "pool": "kool1", "quality": 2160 }] }, { "key": "akittv", "name": "Akit TV", "tvg_id": "akittv.tr", "variants": [{ "koolId": "1948681011", "rawName": "AKIT TV (6)", "pool": "kool6", "quality": 600 }, { "koolId": "1862240206", "rawName": "AKIT TV (7)", "pool": "kool7", "quality": 600 }] }, { "key": "animation1", "name": "Animation 1", "tvg_id": "animation1.tr", "variants": [{ "koolId": "727427437", "rawName": "ANIMATION 1 HD (1)", "pool": "kool1", "quality": 720 }] }, { "key": "animaux", "name": "Animaux", "tvg_id": "animaux.tr", "variants": [{ "koolId": "2103702130", "rawName": "ANIMAUX (1)", "pool": "kool1", "quality": 600 }] }, { "key": "beinboxoffice3", "name": "beIN Box Office 3", "tvg_id": "beinboxoffice3.tr", "variants": [{ "koolId": "3564106134", "rawName": "BEIN BOX OFFICE 3 (6)", "pool": "kool6", "quality": 600 }, { "koolId": "879981610", "rawName": "BEIN BOX OFFICE 3 (7)", "pool": "kool7", "quality": 600 }] }, { "key": "beinmoviesstars", "name": "beIN Movies Stars", "tvg_id": "beinmoviesstars.tr", "variants": [{ "koolId": "1963748784", "rawName": "BEIN MOVIES STARS (7)", "pool": "kool7", "quality": 600 }] }, { "key": "beinseries2", "name": "beIN Series 2", "tvg_id": "beinseries2.tr", "variants": [{ "koolId": "3308693738", "rawName": "BEIN SERIES 2 (6)", "pool": "kool6", "quality": 600 }] }, { "key": "beinseriesvice", "name": "beIN Series Vice", "tvg_id": "beinseriesvice.tr", "variants": [{ "koolId": "1125523262", "rawName": "BEIN SERIES VICE (7)", "pool": "kool7", "quality": 600 }] }, { "key": "dreamboxaction", "name": "Dream Box Action", "tvg_id": "dreamboxaction.tr", "variants": [{ "koolId": "3761392013", "rawName": "DREAM BOX ACTION (6)", "pool": "kool6", "quality": 600 }] }, { "key": "exxensports3", "name": "Exxen Sports 3", "tvg_id": "exxensports3.tr", "variants": [{ "koolId": "851841067", "rawName": "EXXEN TV SPOR 3 (1)", "pool": "kool1", "quality": 600 }, { "koolId": "3807939453", "rawName": "EXXEN SPORTS 3 [LIVE DURING EVENTS ONLY] (7)", "pool": "kool7", "quality": 600 }] }, { "key": "fixcinemabilmkurgu", "name": "Fix Cinema Bilimkurgu", "tvg_id": "fixcinemabilmkurgu.tr", "variants": [{ "koolId": "2480231926", "rawName": "FIX CINEMA BILM KURGU (1)", "pool": "kool1", "quality": 600 }] }, { "key": "globalboxyesilcam", "name": "Global Box Ye\u015Fil\xE7am", "tvg_id": "globalboxyesilcam.tr", "variants": [{ "koolId": "2046943434", "rawName": "GLOBAL BOX YE IL AM (1)", "pool": "kool1", "quality": 600 }] }, { "key": "globalboxyerli", "name": "Global Box Yerli", "tvg_id": "globalboxyerli.tr", "variants": [{ "koolId": "2322262210", "rawName": "GLOBAL BOX YERLI (1)", "pool": "kool1", "quality": 600 }] }, { "key": "medyahaber", "name": "Medya Haber", "tvg_id": "medyahaber.tr", "variants": [{ "koolId": "2230968262", "rawName": "MEDYA HABER (6)", "pool": "kool6", "quality": 600 }] }, { "key": "tlc", "name": "TLC", "tvg_id": "tlc.tr", "variants": [{ "koolId": "1766840660", "rawName": "TLC (6)", "pool": "kool6", "quality": 600 }, { "koolId": "951448076", "rawName": "TLC (7)", "pool": "kool7", "quality": 600 }] }, { "key": "tv100", "name": "TV 100", "tvg_id": "tv100.tr", "variants": [{ "koolId": "626790146", "rawName": "4K TR: TV 100 (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "3271096410", "rawName": "TV 100 HEVC (1)", "pool": "kool1", "quality": 850 }, { "koolId": "3769488982", "rawName": "TV 100 (1)", "pool": "kool1", "quality": 600 }, { "koolId": "1685299472", "rawName": "TV 100 (6)", "pool": "kool6", "quality": 600 }] }, { "key": "yesilcam", "name": "Ye\u015Fil\xE7am", "tvg_id": "yesilcam.tr", "variants": [{ "koolId": "1584335383", "rawName": "YESILCAM (6)", "pool": "kool6", "quality": 600 }] }, { "key": "sinema1002", "name": "Sinema 1002", "tvg_id": "sinema1002.tr", "variants": [{ "koolId": "1076643856", "rawName": "4K TR: S NEMA 1002 HD (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "4269042044", "rawName": "SINEMA 1002 (7)", "pool": "kool7", "quality": 600 }] }, { "key": "sinemaaile", "name": "Sinema Aile", "tvg_id": "sinemaaile.tr", "variants": [{ "koolId": "698495811", "rawName": "4K TR: S NEMA A LE HD (1)", "pool": "kool1", "quality": 2160 }] }, { "key": "animalplanet", "name": "Animal Planet", "tvg_id": "animalplanet.tr", "variants": [{ "koolId": "2110161355", "rawName": "ANIMAL PLANET (7)", "pool": "kool7", "quality": 600 }] }, { "key": "atvavrupa", "name": "ATV Avrupa", "tvg_id": "atvavrupa.tr", "variants": [{ "koolId": "3195910351", "rawName": "ATV AVRUPA (6)", "pool": "kool6", "quality": 600 }] }, { "key": "bbcearthpremiere", "name": "BBC Earth Premiere", "tvg_id": "bbcearthpremiere.tr", "variants": [{ "koolId": "3542661904", "rawName": "BBC EARTH PREMIERE (7)", "pool": "kool7", "quality": 600 }] }, { "key": "beingurme", "name": "beIN Gurme", "tvg_id": "beingurme.tr", "variants": [{ "koolId": "950394656", "rawName": "BEIN GURME HD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "3617035414", "rawName": "BEIN GURME (6)", "pool": "kool6", "quality": 600 }, { "koolId": "3583230858", "rawName": "BEIN GURME (7)", "pool": "kool7", "quality": 600 }] }, { "key": "beiniz", "name": "beIN \u0130z TV", "tvg_id": "beiniz.tr", "variants": [{ "koolId": "1691223078", "rawName": "BEIN IZ (6)", "pool": "kool6", "quality": 600 }, { "koolId": "3156178359", "rawName": "BEIN IZ TV (7)", "pool": "kool7", "quality": 600 }] }, { "key": "beinseriescomedy", "name": "beIN Series Comedy", "tvg_id": "beinseriescomedy.tr", "variants": [{ "koolId": "1668144911", "rawName": "BEIN SERIES COMEDY (7)", "pool": "kool7", "quality": 600 }] }, { "key": "beinseriesdrama", "name": "beIN Series Drama", "tvg_id": "beinseriesdrama.tr", "variants": [{ "koolId": "727975195", "rawName": "BEIN SERIES DRAMA (7)", "pool": "kool7", "quality": 600 }] }, { "key": "beinsportsmax1", "name": "beIN Sports Max 1", "tvg_id": "beinsportsmax1.tr", "variants": [{ "koolId": "4071474743", "rawName": "BEIN SPORTS MAX 1 FHD (1)", "pool": "kool1", "quality": 1080 }, { "koolId": "225281423", "rawName": "BEIN SPORTS MAX 1 HD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "2832430535", "rawName": "BEIN SPORTS MAX 1 (7)", "pool": "kool7", "quality": 600 }] }, { "key": "cocuk1", "name": "\xC7ocuk 1", "tvg_id": "cocuk1.tr", "variants": [{ "koolId": "204606561", "rawName": "COCUK 1 HD (1)", "pool": "kool1", "quality": 720 }] }, { "key": "cocuk2", "name": "\xC7ocuk 2", "tvg_id": "cocuk2.tr", "variants": [{ "koolId": "2193427330", "rawName": "COCUK 2 HD (1)", "pool": "kool1", "quality": 720 }] }, { "key": "cocuk3", "name": "\xC7ocuk 3", "tvg_id": "cocuk3.tr", "variants": [{ "koolId": "1310133020", "rawName": "COCUK 3 HD (1)", "pool": "kool1", "quality": 720 }] }, { "key": "discoveryworld", "name": "Discovery World", "tvg_id": "discoveryworld.tr", "variants": [{ "koolId": "3624002307", "rawName": "DISCOVERY WORLD (6)", "pool": "kool6", "quality": 600 }] }, { "key": "diyanettv", "name": "TRT Diyanet", "tvg_id": "diyanettv.tr", "variants": [{ "koolId": "2131958841", "rawName": "DIYANET TV (6)", "pool": "kool6", "quality": 600 }, { "koolId": "458659205", "rawName": "TRT DIYANET (7)", "pool": "kool7", "quality": 600 }] }, { "key": "enowestern", "name": "Eno Western", "tvg_id": "enowestern.tr", "variants": [{ "koolId": "1134525301", "rawName": "ENO WESTERN (7)", "pool": "kool7", "quality": 600 }] }, { "key": "fixcinemacomedy", "name": "Fix Cinema Comedy", "tvg_id": "fixcinemacomedy.tr", "variants": [{ "koolId": "4140720869", "rawName": "FIX CINEMA COMEDY (1)", "pool": "kool1", "quality": 600 }] }, { "key": "fixcinemamacera", "name": "Fix Cinema Macera", "tvg_id": "fixcinemamacera.tr", "variants": [{ "koolId": "2958075443", "rawName": "FIX CINEMA MACERA (1)", "pool": "kool1", "quality": 600 }] }, { "key": "flashhaber", "name": "Flash Haber TV", "tvg_id": "flashhaber.tr", "variants": [{ "koolId": "3806979011", "rawName": "FLASH HABER TV (6)", "pool": "kool6", "quality": 600 }] }, { "key": "foxcrime", "name": "FOX Crime", "tvg_id": "foxcrime.tr", "variants": [{ "koolId": "3150381038", "rawName": "FOX CRIME HEVC (1)", "pool": "kool1", "quality": 850 }] }, { "key": "globalboxaction", "name": "Global Box Action", "tvg_id": "globalboxaction.tr", "variants": [{ "koolId": "2456232539", "rawName": "GLOBAL BOX ACTION (1)", "pool": "kool1", "quality": 600 }] }, { "key": "globalboxcomedy", "name": "Global Box Comedy", "tvg_id": "globalboxcomedy.tr", "variants": [{ "koolId": "1828059735", "rawName": "GLOBAL BOX COMEDY (1)", "pool": "kool1", "quality": 600 }] }, { "key": "globalboxdram", "name": "Global Box Dram", "tvg_id": "globalboxdram.tr", "variants": [{ "koolId": "1040144724", "rawName": "GLOBAL BOX DRAM (1)", "pool": "kool1", "quality": 600 }] }, { "key": "globalboxfantastic", "name": "Global Box Fantastic", "tvg_id": "globalboxfantastic.tr", "variants": [{ "koolId": "1557465046", "rawName": "GLOBAL BOX FANTASTIC (1)", "pool": "kool1", "quality": 600 }] }, { "key": "globalboxkorku", "name": "Global Box Korku", "tvg_id": "globalboxkorku.tr", "variants": [{ "koolId": "562681030", "rawName": "GLOBAL BOX KORKU (1)", "pool": "kool1", "quality": 600 }] }, { "key": "globalboxvizyon", "name": "Global Box Vizyon", "tvg_id": "globalboxvizyon.tr", "variants": [{ "koolId": "2960112808", "rawName": "GLOBAL BOX VIZYON (1)", "pool": "kool1", "quality": 600 }] }, { "key": "horror1", "name": "Horror 1", "tvg_id": "horror1.tr", "variants": [{ "koolId": "3611975312", "rawName": "HORROR 1 HD (1)", "pool": "kool1", "quality": 720 }] }, { "key": "horror2", "name": "Horror 2", "tvg_id": "horror2.tr", "variants": [{ "koolId": "1506105715", "rawName": "HORROR 2 HD (1)", "pool": "kool1", "quality": 720 }] }, { "key": "htspor", "name": "HT Spor", "tvg_id": "htspor.tr", "variants": [{ "koolId": "2773338492", "rawName": "HT SPOR HD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "1240193403", "rawName": "HT SPOR (7)", "pool": "kool7", "quality": 600 }] }, { "key": "hunattv", "name": "Hunat TV", "tvg_id": "hunattv.tr", "variants": [{ "koolId": "1602719314", "rawName": "HUNAT TV (6)", "pool": "kool6", "quality": 600 }] }, { "key": "kanal12", "name": "Kanal 12", "tvg_id": "kanal12.tr", "variants": [{ "koolId": "2917371409", "rawName": "KANAL 12 (6)", "pool": "kool6", "quality": 600 }] }, { "key": "kanal3", "name": "Kanal 3", "tvg_id": "kanal3.tr", "variants": [{ "koolId": "1558612099", "rawName": "KANAL 3 (6)", "pool": "kool6", "quality": 600 }, { "koolId": "1178569854", "rawName": "KANAL 3 (7)", "pool": "kool7", "quality": 600 }] }, { "key": "kanalavrupa", "name": "Kanal Avrupa", "tvg_id": "kanalavrupa.tr", "variants": [{ "koolId": "1096791444", "rawName": "KANAL AVRUPA (6)", "pool": "kool6", "quality": 600 }, { "koolId": "4085283006", "rawName": "KANAL AVRUPA (7)", "pool": "kool7", "quality": 600 }] }, { "key": "kingboxaction", "name": "Kingbox Action", "tvg_id": "kingboxaction.tr", "variants": [{ "koolId": "3186688793", "rawName": "KINGBOX ACTION (1)", "pool": "kool1", "quality": 600 }] }, { "key": "mtvlive", "name": "MTV Live", "tvg_id": "mtvlive.tr", "variants": [{ "koolId": "417807156", "rawName": "MTV LIVE (1)", "pool": "kool1", "quality": 600 }] }, { "key": "nickjr", "name": "Nick Junior", "tvg_id": "nickjr.tr", "variants": [{ "koolId": "707163099", "rawName": "NICK JR HD HD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "85708551", "rawName": "NICK JR (7)", "pool": "kool7", "quality": 600 }, { "koolId": "1384991998", "rawName": "NICK JUNIOR (6)", "pool": "kool6", "quality": 600 }] }, { "key": "nickelodeon", "name": "Nickelodeon", "tvg_id": "nickelodeon.tr", "variants": [{ "koolId": "503443750", "rawName": "NICKELODEON HD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "3029254675", "rawName": "NICKELODEON (6)", "pool": "kool6", "quality": 600 }, { "koolId": "3092562301", "rawName": "NICKELODEON (7)", "pool": "kool7", "quality": 600 }] }, { "key": "niloyatv", "name": "Niloya TV", "tvg_id": "niloyatv.tr", "variants": [{ "koolId": "692811579", "rawName": "NILOYA HD+ (1)", "pool": "kool1", "quality": 720 }, { "koolId": "3491525845", "rawName": "SL NILOYA (6)", "pool": "kool6", "quality": 600 }, { "koolId": "757435988", "rawName": "NILOYA TV (7)", "pool": "kool7", "quality": 600 }] }, { "key": "showmax", "name": "Showmax", "tvg_id": "showmax.tr", "variants": [{ "koolId": "1495761327", "rawName": "SHOW MAX (6)", "pool": "kool6", "quality": 600 }, { "koolId": "1197572527", "rawName": "SHOWMAX (1)", "pool": "kool1", "quality": 600 }] }, { "key": "tabiispor", "name": "Tabii Spor", "tvg_id": "tabiispor.tr", "variants": [{ "koolId": "2259480087", "rawName": "TABII SPOR HD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "184486327", "rawName": "TABII SPOR (6)", "pool": "kool6", "quality": 600 }, { "koolId": "4022148175", "rawName": "TABII SPOR SD (1)", "pool": "kool1", "quality": 480 }] }, { "key": "tgrtbelgesel", "name": "TGRT Belgesel", "tvg_id": "tgrtbelgesel.tr", "variants": [{ "koolId": "3925938631", "rawName": "TGRT BELGESEL (1)", "pool": "kool1", "quality": 600 }, { "koolId": "2753787815", "rawName": "TGRT BELGESEL (6)", "pool": "kool6", "quality": 600 }, { "koolId": "1743993546", "rawName": "TGRT BELGESEL (7)", "pool": "kool7", "quality": 600 }] }, { "key": "tivibuspor", "name": "Tivibu Spor", "tvg_id": "tivibuspor.tr", "variants": [{ "koolId": "1406262118", "rawName": "TIVIBU SPOR RAW (1)", "pool": "kool1", "quality": 900 }] }, { "key": "tivibuspor2", "name": "Tivibu Spor 2", "tvg_id": "tivibuspor2.tr", "variants": [{ "koolId": "2502606333", "rawName": "TIVIBUSPOR 2 FHD (1)", "pool": "kool1", "quality": 1080 }, { "koolId": "1465680660", "rawName": "TIVIBUSPOR 2 HD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "3746683810", "rawName": "TIVIBU SPOR 2 (6)", "pool": "kool6", "quality": 600 }, { "koolId": "478254799", "rawName": "TIVIBU SPOR 2 (7)", "pool": "kool7", "quality": 600 }] }, { "key": "trtworld", "name": "TRT World", "tvg_id": "trtworld.tr", "variants": [{ "koolId": "3985615117", "rawName": "TRT WORLD HEVC (1)", "pool": "kool1", "quality": 850 }, { "koolId": "3107205535", "rawName": "TRT WORLD (7)", "pool": "kool7", "quality": 600 }] }, { "key": "ulusalkanal", "name": "Ulusal Kanal", "tvg_id": "ulusalkanal.tr", "variants": [{ "koolId": "1910048817", "rawName": "ULUSAL KANAL (1)", "pool": "kool1", "quality": 600 }, { "koolId": "885453469", "rawName": "ULUSAL KANAL (7)", "pool": "kool7", "quality": 600 }, { "koolId": "1917903629", "rawName": "ULUSAL KANAL SD (1)", "pool": "kool1", "quality": 480 }] }, { "key": "yabantv", "name": "Yaban TV", "tvg_id": "yabantv.tr", "variants": [{ "koolId": "1788503935", "rawName": "YABAN TV HD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "4204615990", "rawName": "YABAN TV (7)", "pool": "kool7", "quality": 600 }] }, { "key": "powertv", "name": "Power", "tvg_id": "powertv.tr", "variants": [{ "koolId": "1307965662", "rawName": "4K TR: POWER TV HD (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "198132618", "rawName": "POWER (7)", "pool": "kool7", "quality": 600 }] }, { "key": "adiyamanmercantv", "name": "Ad\u0131yaman Mercan TV", "tvg_id": "adiyamanmercantv.tr", "variants": [{ "koolId": "3055235391", "rawName": "ADIYAMAN MERCAN TV (1)", "pool": "kool1", "quality": 600 }] }, { "key": "aksaraykanal68", "name": "Aksaray Kanal 68", "tvg_id": "aksaraykanal68.tr", "variants": [{ "koolId": "955806672", "rawName": "AKSARAY KANAL 68 (1)", "pool": "kool1", "quality": 600 }] }, { "key": "kanalurfa", "name": "Kanal Urfa", "tvg_id": "kanalurfa.tr", "variants": [{ "koolId": "754868351", "rawName": "ANLIURFA KANAL URFA (1)", "pool": "kool1", "quality": 600 }, { "koolId": "847659673", "rawName": "KANAL URFA (6)", "pool": "kool6", "quality": 600 }] }, { "key": "astvbursa", "name": "As TV Bursa", "tvg_id": "astvbursa.tr", "variants": [{ "koolId": "2084587437", "rawName": "AS TV BURSA (7)", "pool": "kool7", "quality": 600 }] }, { "key": "beinsportsmax2", "name": "beIN Sports Max 2", "tvg_id": "beinsportsmax2.tr", "variants": [{ "koolId": "3407936242", "rawName": "BEIN SPORTS MAX 2 FHD (1)", "pool": "kool1", "quality": 1080 }, { "koolId": "2212659820", "rawName": "BEIN SPORTS MAX 2 HD (1)", "pool": "kool1", "quality": 720 }] }, { "key": "cinemaximumbilimkurgu", "name": "Cinemaximum Bilimkurgu", "tvg_id": "cinemaximumbilimkurgu.tr", "variants": [{ "koolId": "91605144", "rawName": "CINEMAXIMUM BILIMKURGU \u029C\u1D05 (1)", "pool": "kool1", "quality": 600 }] }, { "key": "davincikids", "name": "Da Vinci Kids", "tvg_id": "davincikids.tr", "variants": [{ "koolId": "3983067532", "rawName": "DA VINC KIDS HD (1)", "pool": "kool1", "quality": 720 }] }, { "key": "dha", "name": "DHA", "tvg_id": "dha.tr", "variants": [{ "koolId": "4022359276", "rawName": "DHA (6)", "pool": "kool6", "quality": 600 }] }, { "key": "disneychannel", "name": "Disney Channel", "tvg_id": "disneychannel.tr", "variants": [{ "koolId": "3578544716", "rawName": "DISNEY CHANNEL HD (1)", "pool": "kool1", "quality": 720 }] }, { "key": "dizismartmax", "name": "Dizismart Max", "tvg_id": "dizismartmax.tr", "variants": [{ "koolId": "4079530614", "rawName": "DIZI SMART MAX (7)", "pool": "kool7", "quality": 600 }, { "koolId": "1165201807", "rawName": "DIZISMART MAX (6)", "pool": "kool6", "quality": 600 }] }, { "key": "dizismartpremium", "name": "Dizi Smart Premium", "tvg_id": "dizismartpremium.tr", "variants": [{ "koolId": "791616758", "rawName": "DIZI SMART PREMIUM (7)", "pool": "kool7", "quality": 600 }] }, { "key": "edessatv", "name": "Edessa TV", "tvg_id": "edessatv.tr", "variants": [{ "koolId": "2154492528", "rawName": "EDESSA TV (6)", "pool": "kool6", "quality": 600 }] }, { "key": "ekoltv", "name": "Ekol TV", "tvg_id": "ekoltv.tr", "variants": [{ "koolId": "414950309", "rawName": "EKOL TV (6)", "pool": "kool6", "quality": 600 }] }, { "key": "ekoturk", "name": "Ekot\xFCrk", "tvg_id": "ekoturk.tr", "variants": [{ "koolId": "711944272", "rawName": "EKOTURK HD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "2999246297", "rawName": "EKO TURK (7)", "pool": "kool7", "quality": 600 }] }, { "key": "enoaksiyon1", "name": "Eno Aksiyon 1", "tvg_id": "enoaksiyon1.tr", "variants": [{ "koolId": "633768195", "rawName": "ENO AKSIYON 1 (7)", "pool": "kool7", "quality": 600 }] }, { "key": "enovizyon11", "name": "Eno Vizyon 11", "tvg_id": "enovizyon11.tr", "variants": [{ "koolId": "1545196944", "rawName": "ENO VIZYON 11 (7)", "pool": "kool7", "quality": 600 }] }, { "key": "enovizyon14", "name": "Eno Vizyon 14", "tvg_id": "enovizyon14.tr", "variants": [{ "koolId": "2499369696", "rawName": "ENO VIZYON 14 (7)", "pool": "kool7", "quality": 600 }] }, { "key": "enovizyon15", "name": "Eno Vizyon 15", "tvg_id": "enovizyon15.tr", "variants": [{ "koolId": "2845406032", "rawName": "ENO VIZYON 15 (7)", "pool": "kool7", "quality": 600 }] }, { "key": "enovizyon5", "name": "Eno Vizyon 5", "tvg_id": "enovizyon5.tr", "variants": [{ "koolId": "2176192715", "rawName": "ENO VIZYON 5 (7)", "pool": "kool7", "quality": 600 }] }, { "key": "erzurumwebtv", "name": "Erzurum Web TV", "tvg_id": "erzurumwebtv.tr", "variants": [{ "koolId": "1736962708", "rawName": "ERZURUM WEB TV (6)", "pool": "kool6", "quality": 600 }] }, { "key": "estv", "name": "Es TV Eski\u015Fehir", "tvg_id": "estv.tr", "variants": [{ "koolId": "1670462361", "rawName": "ES TV (ESKISEHIR) (6)", "pool": "kool6", "quality": 600 }] }, { "key": "etvkayseri", "name": "ETV Kayseri", "tvg_id": "etvkayseri.tr", "variants": [{ "koolId": "1218353983", "rawName": "ETV KAYSERI (6)", "pool": "kool6", "quality": 600 }] }, { "key": "eurod", "name": "Euro D", "tvg_id": "eurod.tr", "variants": [{ "koolId": "1290434890", "rawName": "EURO D (1)", "pool": "kool1", "quality": 600 }, { "koolId": "3358854668", "rawName": "EURO D (6)", "pool": "kool6", "quality": 600 }, { "koolId": "2784530383", "rawName": "EURO D (7)", "pool": "kool7", "quality": 600 }] }, { "key": "eurostar", "name": "Euro Star", "tvg_id": "eurostar.tr", "variants": [{ "koolId": "1827094680", "rawName": "EURO STAR (1)", "pool": "kool1", "quality": 600 }, { "koolId": "2147614081", "rawName": "EUROSTAR (6)", "pool": "kool6", "quality": 600 }, { "koolId": "3814521935", "rawName": "EURO STAR (7)", "pool": "kool7", "quality": 600 }] }, { "key": "exxensports8", "name": "Exxen Sports 8", "tvg_id": "exxensports8.tr", "variants": [{ "koolId": "1159078202", "rawName": "EXXEN TV SPOR 8 (1)", "pool": "kool1", "quality": 600 }, { "koolId": "1624937917", "rawName": "EXXEN SPORTS 8 (7)", "pool": "kool7", "quality": 600 }] }, { "key": "filmboxaksiyon", "name": "FilmBox Aksiyon", "tvg_id": "filmboxaksiyon.tr", "variants": [{ "koolId": "1130352730", "rawName": "FILMBOX AKSIYON (7)", "pool": "kool7", "quality": 600 }] }, { "key": "filmboxkadirinanir", "name": "FilmBox Kadir \u0130nan\u0131r", "tvg_id": "filmboxkadirinanir.tr", "variants": [{ "koolId": "3268085547", "rawName": "FILMBOX KADIR INANIR (7)", "pool": "kool7", "quality": 600 }] }, { "key": "filmbox", "name": "FilmBox", "tvg_id": "filmbox.tr", "variants": [{ "koolId": "2600387615", "rawName": "FILMBOX+ (7)", "pool": "kool7", "quality": 600 }] }, { "key": "galatasaraytv", "name": "Galatasaray TV", "tvg_id": "galatasaraytv.tr", "variants": [{ "koolId": "338831283", "rawName": "GALATASARAY TV (7)", "pool": "kool7", "quality": 600 }] }, { "key": "gaziantepolaytv", "name": "Gaziantep Olay TV", "tvg_id": "gaziantepolaytv.tr", "variants": [{ "koolId": "2413536917", "rawName": "GAZIANTEP OLAY TV (1)", "pool": "kool1", "quality": 600 }] }, { "key": "iztv", "name": "\u0130Z TV", "tvg_id": "iztv.tr", "variants": [{ "koolId": "3847791361", "rawName": "IZ TV (1)", "pool": "kool1", "quality": 600 }] }, { "key": "kanal58", "name": "Kanal 58", "tvg_id": "kanal58.tr", "variants": [{ "koolId": "2093143206", "rawName": "KANAL 58 (6)", "pool": "kool6", "quality": 600 }, { "koolId": "2802702453", "rawName": "KANAL 58 (7)", "pool": "kool7", "quality": 600 }] }, { "key": "kibrisgenctv", "name": "K\u0131br\u0131s Gen\xE7 TV", "tvg_id": "kibrisgenctv.tr", "variants": [{ "koolId": "3115477419", "rawName": "KIBRIS GEN\xC7 TV (6)", "pool": "kool6", "quality": 600 }] }, { "key": "liderhaber", "name": "Lider Haber", "tvg_id": "liderhaber.tr", "variants": [{ "koolId": "703698868", "rawName": "LIDER HABER (6)", "pool": "kool6", "quality": 600 }] }, { "key": "max007", "name": "Max 007", "tvg_id": "max007.tr", "variants": [{ "koolId": "2857813786", "rawName": "MAX 007 (6)", "pool": "kool6", "quality": 600 }] }, { "key": "maxanimasyon1", "name": "Max Animasyon 1", "tvg_id": "maxanimasyon1.tr", "variants": [{ "koolId": "3343751751", "rawName": "MAX ANIMASYON 1 (6)", "pool": "kool6", "quality": 600 }] }, { "key": "maxpremier", "name": "Max Premier", "tvg_id": "maxpremier.tr", "variants": [{ "koolId": "858266837", "rawName": "MAX PREMIER (6)", "pool": "kool6", "quality": 600 }] }, { "key": "maxturk", "name": "Max T\xFCrk", "tvg_id": "maxturk.tr", "variants": [{ "koolId": "1222272481", "rawName": "MAX TURK (6)", "pool": "kool6", "quality": 600 }] }, { "key": "maxvizyon4", "name": "Max Vizyon 4", "tvg_id": "maxvizyon4.tr", "variants": [{ "koolId": "720191023", "rawName": "MAX VIZYON 4 (6)", "pool": "kool6", "quality": 600 }] }, { "key": "moviesmartaction", "name": "Movie Smart Action", "tvg_id": "moviesmartaction.tr", "variants": [{ "koolId": "1237460948", "rawName": "MOVIE SMART ACTION (7)", "pool": "kool7", "quality": 600 }] }, { "key": "moviesmartclassic", "name": "Movie Smart Classic", "tvg_id": "moviesmartclassic.tr", "variants": [{ "koolId": "3597292408", "rawName": "MOVIE SMART CLASSIC (7)", "pool": "kool7", "quality": 600 }] }, { "key": "moviesmartpremium", "name": "Movie Smart Premium", "tvg_id": "moviesmartpremium.tr", "variants": [{ "koolId": "3830353405", "rawName": "MOVIE SMART PREMIUM (7)", "pool": "kool7", "quality": 600 }] }, { "key": "moviesmartpremium2", "name": "Movie Smart Premium 2", "tvg_id": "moviesmartpremium2.tr", "variants": [{ "koolId": "1194009782", "rawName": "MOVIE SMART PREMIUM 2 (7)", "pool": "kool7", "quality": 600 }] }, { "key": "moviesmartturk", "name": "Movie Smart T\xFCrk", "tvg_id": "moviesmartturk.tr", "variants": [{ "koolId": "353384054", "rawName": "MOVIE SMART TURK (7)", "pool": "kool7", "quality": 600 }] }, { "key": "number1ask", "name": "Number 1 A\u015Fk", "tvg_id": "number1ask.tr", "variants": [{ "koolId": "3098791172", "rawName": "NUMBER 1 ASK (6)", "pool": "kool6", "quality": 600 }] }, { "key": "number1dance", "name": "Number 1 Dance", "tvg_id": "number1dance.tr", "variants": [{ "koolId": "3062704286", "rawName": "NUMBER 1 DANCE (6)", "pool": "kool6", "quality": 600 }] }, { "key": "powerdance", "name": "Power Dance", "tvg_id": "powerdance.tr", "variants": [{ "koolId": "4234416466", "rawName": "POWER DANCE (6)", "pool": "kool6", "quality": 600 }] }, { "key": "powerlove", "name": "Power Love", "tvg_id": "powerlove.tr", "variants": [{ "koolId": "1783508809", "rawName": "POWER LOVE (6)", "pool": "kool6", "quality": 600 }] }, { "key": "powerturktv", "name": "Power T\xFCrk", "tvg_id": "powerturktv.tr", "variants": [{ "koolId": "176662368", "rawName": "POWER TURK TV (6)", "pool": "kool6", "quality": 600 }, { "koolId": "538668348", "rawName": "POWER TURK (7)", "pool": "kool7", "quality": 600 }] }, { "key": "powerturkakustik", "name": "Powerturk Akustik", "tvg_id": "powerturkakustik.tr", "variants": [{ "koolId": "3696281560", "rawName": "POWERTURK AKUSTIK (6)", "pool": "kool6", "quality": 600 }] }, { "key": "powerturkslow", "name": "Powerturk Slow", "tvg_id": "powerturkslow.tr", "variants": [{ "koolId": "398846182", "rawName": "POWERTURK SLOW (6)", "pool": "kool6", "quality": 600 }] }, { "key": "powerturktaptaze", "name": "Powerturk Taptaze", "tvg_id": "powerturktaptaze.tr", "variants": [{ "koolId": "1528106739", "rawName": "POWERTURK TAPTAZE (6)", "pool": "kool6", "quality": 600 }] }, { "key": "proturkkemalsunal", "name": "Proturk Kemal Sunal", "tvg_id": "proturkkemalsunal.tr", "variants": [{ "koolId": "1245475474", "rawName": "PROTURK KEMAL SUNAL (6)", "pool": "kool6", "quality": 600 }] }, { "key": "ssportplus1", "name": "S Sport Plus 1", "tvg_id": "ssportplus1.tr", "variants": [{ "koolId": "3526620942", "rawName": "S-SPORT PLUS 1 MACZAMANI (1)", "pool": "kool1", "quality": 600 }, { "koolId": "2559756791", "rawName": "S-SPORT+1 MAC SAATI (1)", "pool": "kool1", "quality": 600 }] }, { "key": "ssportplus2", "name": "S Sport Plus 2", "tvg_id": "ssportplus2.tr", "variants": [{ "koolId": "2314183566", "rawName": "S-SPORT+2 MAC SAATI (1)", "pool": "kool1", "quality": 600 }, { "koolId": "3276709239", "rawName": "S-SPORT PLUS 2 MACZAMANI (1)", "pool": "kool1", "quality": 600 }] }, { "key": "saransport1", "name": "Saran Sport 1", "tvg_id": "saransport1.tr", "variants": [{ "koolId": "3962972352", "rawName": "SARAN SPORT 1 (7)", "pool": "kool7", "quality": 600 }] }, { "key": "sat7turk", "name": "Sat7 T\xFCrk", "tvg_id": "sat7turk.tr", "variants": [{ "koolId": "2376090646", "rawName": "SAT 7 TURK (1)", "pool": "kool1", "quality": 600 }, { "koolId": "4228046562", "rawName": "SAT 7 T\xDCRK (6)", "pool": "kool6", "quality": 600 }, { "koolId": "3343868905", "rawName": "SAT 7 TURK (7)", "pool": "kool7", "quality": 600 }, { "koolId": "2978732943", "rawName": "SAT7 TURK (7)", "pool": "kool7", "quality": 600 }] }, { "key": "semerkandtv", "name": "Semerkand TV", "tvg_id": "semerkandtv.tr", "variants": [{ "koolId": "4096268883", "rawName": "SEMERKAND TV HD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "786317112", "rawName": "SEMERKAND TV (6)", "pool": "kool6", "quality": 600 }, { "koolId": "2341562915", "rawName": "SEMERKAND (7)", "pool": "kool7", "quality": 600 }] }, { "key": "showturk", "name": "Show T\xFCrk", "tvg_id": "showturk.tr", "variants": [{ "koolId": "2009772533", "rawName": "SHOW TURK (6)", "pool": "kool6", "quality": 600 }, { "koolId": "1880270561", "rawName": "SHOW TURK (7)", "pool": "kool7", "quality": 600 }] }, { "key": "smartcocuk", "name": "Smart \xC7ocuk", "tvg_id": "smartcocuk.tr", "variants": [{ "koolId": "4277750275", "rawName": "SMART COCUK (7)", "pool": "kool7", "quality": 600 }] }, { "key": "tarihtv", "name": "Tarih TV", "tvg_id": "tarihtv.tr", "variants": [{ "koolId": "3856957052", "rawName": "TARIH TV (6)", "pool": "kool6", "quality": 600 }] }, { "key": "tv8int", "name": "TV 8 Int", "tvg_id": "tv8int.tr", "variants": [{ "koolId": "3546432682", "rawName": "TV 8 INTERNATIONAL (6)", "pool": "kool6", "quality": 600 }, { "koolId": "1764745585", "rawName": "TV 8 INT (7)", "pool": "kool7", "quality": 600 }] }, { "key": "yesilcam1", "name": "Ye\u015Fil\xE7am 1", "tvg_id": "yesilcam1.tr", "variants": [{ "koolId": "1952835738", "rawName": "YESILCAM 1 (7)", "pool": "kool7", "quality": 600 }] }, { "key": "yesilcam3", "name": "Ye\u015Fil\xE7am 3", "tvg_id": "yesilcam3.tr", "variants": [{ "koolId": "245742586", "rawName": "YESILCAM 3 (7)", "pool": "kool7", "quality": 600 }] }, { "key": "afyonturk", "name": "Afyon T\xFCrk", "tvg_id": "afyonturk.tr", "variants": [{ "koolId": "1782534194", "rawName": "AFYON TURK (7)", "pool": "kool7", "quality": 600 }] }, { "key": "aksutvkmaras", "name": "Kahramanmara\u015F Aksu TV", "tvg_id": "aksutvkmaras.tr", "variants": [{ "koolId": "2914289476", "rawName": "AKSU TV K MARAS (7)", "pool": "kool7", "quality": 600 }, { "koolId": "1716018058", "rawName": "KAHRAMANMARA AKSU TV (1)", "pool": "kool1", "quality": 600 }] }, { "key": "anadoludernek", "name": "Anadolu Dernek", "tvg_id": "anadoludernek.tr", "variants": [{ "koolId": "1468389014", "rawName": "ANADOLU DERNEK (7)", "pool": "kool7", "quality": 600 }] }, { "key": "artitv", "name": "Art\u0131 TV", "tvg_id": "artitv.tr", "variants": [{ "koolId": "259370032", "rawName": "ARTI TV (7)", "pool": "kool7", "quality": 600 }] }, { "key": "ciftcitv", "name": "\xC7ift\xE7i TV", "tvg_id": "ciftcitv.tr", "variants": [{ "koolId": "3185778667", "rawName": "CIFTCI TV (7)", "pool": "kool7", "quality": 600 }] }, { "key": "cinemaximum4", "name": "Cinemaximum 4", "tvg_id": "cinemaximum4.tr", "variants": [{ "koolId": "4214120173", "rawName": "CINEMAXIMUM 4 \u029C\u1D05 (1)", "pool": "kool1", "quality": 600 }] }, { "key": "cinemaximumbollywood", "name": "Cinemaximum Bollywood", "tvg_id": "cinemaximumbollywood.tr", "variants": [{ "koolId": "2495744105", "rawName": "CINEMAXIMUM BOLLYWOOD \u029C\u1D05 (1)", "pool": "kool1", "quality": 600 }] }, { "key": "discoveryscience", "name": "Discovery Science", "tvg_id": "discoveryscience.tr", "variants": [{ "koolId": "3698852323", "rawName": "DISCOVERY SCIENCE (7)", "pool": "kool7", "quality": 600 }] }, { "key": "trtebalise", "name": "EBA TV Lise", "tvg_id": "trtebalise.tr", "variants": [{ "koolId": "3614565410", "rawName": "EBA TV LISE (6)", "pool": "kool6", "quality": 600 }] }, { "key": "trtebaortaokul", "name": "TRT EBA Ortaokul", "tvg_id": "trtebaortaokul.tr", "variants": [{ "koolId": "3751527622", "rawName": "EBA TV ORTAOKUL (6)", "pool": "kool6", "quality": 600 }, { "koolId": "17020398", "rawName": "TRT EBA ORTAOKUL (7)", "pool": "kool7", "quality": 600 }] }, { "key": "elazigkanal23", "name": "Elaz\u0131\u011F Kanal 23", "tvg_id": "elazigkanal23.tr", "variants": [{ "koolId": "3504045857", "rawName": "ELAZIG KANAL 23 (1)", "pool": "kool1", "quality": 600 }] }, { "key": "elazigkanalfirat", "name": "Elaz\u0131\u011F Kanal Firat", "tvg_id": "elazigkanalfirat.tr", "variants": [{ "koolId": "634397776", "rawName": "ELAZIG KANAL FIRAT (1)", "pool": "kool1", "quality": 600 }] }, { "key": "exxensports5", "name": "Exxen Sports 5", "tvg_id": "exxensports5.tr", "variants": [{ "koolId": "2555007244", "rawName": "EXXEN SPORTS 5 (7)", "pool": "kool7", "quality": 600 }] }, { "key": "ferditayfur", "name": "Ferdi Tayfur", "tvg_id": "ferditayfur.tr", "variants": [{ "koolId": "2308263834", "rawName": "FERDI TAYFUR (1)", "pool": "kool1", "quality": 600 }] }, { "key": "gurbet24tv", "name": "Gurbet24 TV", "tvg_id": "gurbet24tv.tr", "variants": [{ "koolId": "55116964", "rawName": "GURBET24 TV (6)", "pool": "kool6", "quality": 600 }] }, { "key": "historychannel", "name": "History Channel", "tvg_id": "historychannel.tr", "variants": [{ "koolId": "2415331568", "rawName": "HISTORY CHANNEL (7)", "pool": "kool7", "quality": 600 }] }, { "key": "hrt", "name": "HRT", "tvg_id": "hrt.tr", "variants": [{ "koolId": "2826493312", "rawName": "HRT (1)", "pool": "kool1", "quality": 600 }] }, { "key": "idmantv", "name": "\u0130dman TV", "tvg_id": "idmantv.tr", "variants": [{ "koolId": "2368422760", "rawName": "IDMAN TV HD (1)", "pool": "kool1", "quality": 720 }] }, { "key": "ilketv", "name": "\u0130lke TV", "tvg_id": "ilketv.tr", "variants": [{ "koolId": "1743510188", "rawName": "ILKE TV (1)", "pool": "kool1", "quality": 600 }] }, { "key": "kanal26", "name": "Kanal 26", "tvg_id": "kanal26.tr", "variants": [{ "koolId": "87578284", "rawName": "KANAL 26 (7)", "pool": "kool7", "quality": 600 }] }, { "key": "kanal7avrupa", "name": "Kanal 7 Avrupa", "tvg_id": "kanal7avrupa.tr", "variants": [{ "koolId": "498645977", "rawName": "KANAL 7 AVRUPA (7)", "pool": "kool7", "quality": 600 }] }, { "key": "kayserikaytv", "name": "Kayseri Kay TV", "tvg_id": "kayserikaytv.tr", "variants": [{ "koolId": "168048388", "rawName": "KAYSERI KAY TV (1)", "pool": "kool1", "quality": 600 }] }, { "key": "kibriskanalt", "name": "K\u0131br\u0131s Kanal T", "tvg_id": "kibriskanalt.tr", "variants": [{ "koolId": "506213824", "rawName": "KIBRIS KANAL T (6)", "pool": "kool6", "quality": 600 }] }, { "key": "kibristv", "name": "K\u0131br\u0131s TV", "tvg_id": "kibristv.tr", "variants": [{ "koolId": "631930666", "rawName": "KIBRIS TV (6)", "pool": "kool6", "quality": 600 }] }, { "key": "koytv", "name": "K\xF6y TV", "tvg_id": "koytv.tr", "variants": [{ "koolId": "870320507", "rawName": "K\xD6Y TV (6)", "pool": "kool6", "quality": 600 }] }, { "key": "kudustv", "name": "Kud\xFCs TV", "tvg_id": "kudustv.tr", "variants": [{ "koolId": "2114384051", "rawName": "KUDUS TV (1)", "pool": "kool1", "quality": 600 }] }, { "key": "mavikaradeniz", "name": "Mavi Karadeniz", "tvg_id": "mavikaradeniz.tr", "variants": [{ "koolId": "3854689350", "rawName": "MAVI KARADENIZ (1)", "pool": "kool1", "quality": 600 }, { "koolId": "3375018468", "rawName": "MAVI KARADENIZ (7)", "pool": "kool7", "quality": 600 }] }, { "key": "max", "name": "Max", "tvg_id": "max.tr", "variants": [{ "koolId": "816297220", "rawName": "MAX (6)", "pool": "kool6", "quality": 600 }] }, { "key": "maxorjinal", "name": "Max Orijinal", "tvg_id": "maxorjinal.tr", "variants": [{ "koolId": "3560159368", "rawName": "MAX ORJINAL (6)", "pool": "kool6", "quality": 600 }] }, { "key": "maxstarwars", "name": "Max Star Wars", "tvg_id": "maxstarwars.tr", "variants": [{ "koolId": "1921170824", "rawName": "MAX STAR WARS (6)", "pool": "kool6", "quality": 600 }] }, { "key": "maxvizyon", "name": "Max Vizyon", "tvg_id": "maxvizyon.tr", "variants": [{ "koolId": "101690970", "rawName": "MAX VIZYON (6)", "pool": "kool6", "quality": 600 }] }, { "key": "mercantv", "name": "Mercan TV", "tvg_id": "mercantv.tr", "variants": [{ "koolId": "3132704137", "rawName": "MERCAN TV (6)", "pool": "kool6", "quality": 600 }, { "koolId": "3177271965", "rawName": "MERCAN TV (7)", "pool": "kool7", "quality": 600 }] }, { "key": "mersineltv", "name": "Mersin El TV", "tvg_id": "mersineltv.tr", "variants": [{ "koolId": "1480015488", "rawName": "MERSIN EL TV (1)", "pool": "kool1", "quality": 600 }] }, { "key": "mgctv", "name": "MGC TV", "tvg_id": "mgctv.tr", "variants": [{ "koolId": "2591544773", "rawName": "MGC TV (1)", "pool": "kool1", "quality": 600 }] }, { "key": "moviesmartfest", "name": "MovieSmart Fest", "tvg_id": "moviesmartfest.tr", "variants": [{ "koolId": "2904422908", "rawName": "MOVIESMART FEST (6)", "pool": "kool6", "quality": 600 }] }, { "key": "olayturk", "name": "Olay T\xFCrk", "tvg_id": "olayturk.tr", "variants": [{ "koolId": "382635550", "rawName": "OLAY TURK (6)", "pool": "kool6", "quality": 600 }] }, { "key": "on4tv", "name": "On 4 TV", "tvg_id": "on4tv.tr", "variants": [{ "koolId": "2257593699", "rawName": "ON 4 (1)", "pool": "kool1", "quality": 600 }, { "koolId": "1338471740", "rawName": "ON 4 (6)", "pool": "kool6", "quality": 600 }, { "koolId": "4203475144", "rawName": "ON 4 TV (7)", "pool": "kool7", "quality": 600 }] }, { "key": "palstationyabancimzik", "name": "Pal Station Yabanci M\xFCzik", "tvg_id": "palstationyabancimzik.tr", "variants": [{ "koolId": "4201548536", "rawName": "PAL STATION YABANCI M ZIK (1)", "pool": "kool1", "quality": 600 }] }, { "key": "patronbebek", "name": "Patron Bebek", "tvg_id": "patronbebek.tr", "variants": [{ "koolId": "2480284806", "rawName": "PATRON BEBEK HD (1)", "pool": "kool1", "quality": 720 }] }, { "key": "pepetv", "name": "Pepee TV", "tvg_id": "pepetv.tr", "variants": [{ "koolId": "2939972073", "rawName": "PEPE TV (7)", "pool": "kool7", "quality": 600 }, { "koolId": "2502633157", "rawName": "PEPEE TV (1)", "pool": "kool1", "quality": 600 }] }, { "key": "pijamamaskelilertv", "name": "Pijama Maskeliler TV", "tvg_id": "pijamamaskelilertv.tr", "variants": [{ "koolId": "102506186", "rawName": "PIJAMA MASKELILER TV (1)", "pool": "kool1", "quality": 600 }] }, { "key": "pisitv", "name": "Pisi TV", "tvg_id": "pisitv.tr", "variants": [{ "koolId": "349052544", "rawName": "PISI TV (1)", "pool": "kool1", "quality": 600 }, { "koolId": "3728165823", "rawName": "PISI (7)", "pool": "kool7", "quality": 600 }] }, { "key": "redboxturkcepop", "name": "Redbox T\xFCrk\xE7e Pop", "tvg_id": "redboxturkcepop.tr", "variants": [{ "koolId": "2387657693", "rawName": "REDBOX TURKCE POP (1)", "pool": "kool1", "quality": 600 }] }, { "key": "rumelitv", "name": "Rumeli TV", "tvg_id": "rumelitv.tr", "variants": [{ "koolId": "3997988254", "rawName": "RUMELI TV (6)", "pool": "kool6", "quality": 600 }] }, { "key": "ssportplus3", "name": "S Sport Plus 3", "tvg_id": "ssportplus3.tr", "variants": [{ "koolId": "3269372326", "rawName": "S SPORT+3 MAC SAATI (1)", "pool": "kool1", "quality": 600 }] }, { "key": "ssportplus4", "name": "S Sport Plus 4", "tvg_id": "ssportplus4.tr", "variants": [{ "koolId": "1507829436", "rawName": "S SPORT+4 MAC SAATI (1)", "pool": "kool1", "quality": 600 }] }, { "key": "satrantv", "name": "Satran\xE7 TV", "tvg_id": "satrantv.tr", "variants": [{ "koolId": "1192565728", "rawName": "SATRAN\xC7 TV (6)", "pool": "kool6", "quality": 600 }] }, { "key": "seldabagcan", "name": "Selda Ba\u011Fcan", "tvg_id": "seldabagcan.tr", "variants": [{ "koolId": "2451600415", "rawName": "SELDA BAGCAN (1)", "pool": "kool1", "quality": 600 }] }, { "key": "sezenaksu", "name": "Sezen Aksu", "tvg_id": "sezenaksu.tr", "variants": [{ "koolId": "2562804524", "rawName": "SEZEN AKSU (1)", "pool": "kool1", "quality": 600 }] }, { "key": "sportstv", "name": "S\u0131f\u0131r TV", "tvg_id": "sportstv.tr", "variants": [{ "koolId": "1553288763", "rawName": "SIFIR TV HD (1)", "pool": "kool1", "quality": 720 }] }, { "key": "smartspor2", "name": "Spor Smart 2", "tvg_id": "smartspor2.tr", "variants": [{ "koolId": "2726496671", "rawName": "SPOR SMART 2 HD (1)", "pool": "kool1", "quality": 720 }, { "koolId": "907165095", "rawName": "SPOR SMART 2 (6)", "pool": "kool6", "quality": 600 }, { "koolId": "2228088973", "rawName": "SPOR SMART 2 (7)", "pool": "kool7", "quality": 600 }] }, { "key": "sunrtv", "name": "Sun TV", "tvg_id": "sunrtv.tr", "variants": [{ "koolId": "3122863032", "rawName": "SUN TV (1)", "pool": "kool1", "quality": 600 }] }, { "key": "sngerbob", "name": "S\xFCnger Bob", "tvg_id": "sngerbob.tr", "variants": [{ "koolId": "3868582025", "rawName": "S\xDCNGER BOB (6)", "pool": "kool6", "quality": 600 }] }, { "key": "tabiispor1", "name": "Tabii Spor 1", "tvg_id": "tabiispor1.tr", "variants": [{ "koolId": "3830691316", "rawName": "TABII SPOR 1 4K (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "3107708522", "rawName": "TABII SPOR 1 UHD (1)", "pool": "kool1", "quality": 2160 }, { "koolId": "1097795141", "rawName": "TABII SPOR 1 (6)", "pool": "kool6", "quality": 600 }] }, { "key": "tatlisestv", "name": "Tatl\u0131ses TV", "tvg_id": "tatlisestv.tr", "variants": [{ "koolId": "3333865510", "rawName": "TATLISES TV (6)", "pool": "kool6", "quality": 600 }] }, { "key": "taytv", "name": "Tay TV", "tvg_id": "taytv.tr", "variants": [{ "koolId": "1534287048", "rawName": "TAY TV (6)", "pool": "kool6", "quality": 600 }, { "koolId": "2927324913", "rawName": "TAY (7)", "pool": "kool7", "quality": 600 }] }, { "key": "tbmmtv", "name": "TBMM TV", "tvg_id": "tbmmtv.tr", "variants": [{ "koolId": "1770699644", "rawName": "TBMM TV (6)", "pool": "kool6", "quality": 600 }] }, { "key": "tempotv", "name": "Tempo TV", "tvg_id": "tempotv.tr", "variants": [{ "koolId": "870976532", "rawName": "TEMPO TV (1)", "pool": "kool1", "quality": 600 }, { "koolId": "2302552744", "rawName": "TEMPO TV (6)", "pool": "kool6", "quality": 600 }, { "koolId": "3475377621", "rawName": "TEMPO (7)", "pool": "kool7", "quality": 600 }] }, { "key": "tivibuspor4", "name": "Tivibu Spor 4", "tvg_id": "tivibuspor4.tr", "variants": [{ "koolId": "3307062704", "rawName": "TIVIBU SPOR 4 HD (1)", "pool": "kool1", "quality": 720 }] }, { "key": "tmbtv", "name": "TMB", "tvg_id": "tmbtv.tr", "variants": [{ "koolId": "2675123009", "rawName": "TMB (6)", "pool": "kool6", "quality": 600 }, { "koolId": "3465087001", "rawName": "TMB (7)", "pool": "kool7", "quality": 600 }] }, { "key": "tomjerry", "name": "Tom & Jerry", "tvg_id": "tomjerry.tr", "variants": [{ "koolId": "4100185659", "rawName": "TOM & JERRY (1)", "pool": "kool1", "quality": 600 }] }, { "key": "tontv", "name": "Ton TV", "tvg_id": "tontv.tr", "variants": [{ "koolId": "3855597416", "rawName": "TON TV (6)", "pool": "kool6", "quality": 600 }] }, { "key": "trt4k", "name": "TRT 4K", "tvg_id": "trt4k.tr", "variants": [{ "koolId": "3317656516", "rawName": "TRT 4K (6)", "pool": "kool6", "quality": 2160 }] }, { "key": "trteba", "name": "TRT EBA", "tvg_id": "trteba.tr", "variants": [{ "koolId": "3681071746", "rawName": "TRT EBA (6)", "pool": "kool6", "quality": 600 }] }, { "key": "trtkurdi", "name": "TRT Kurd\xEE", "tvg_id": "trtkurdi.tr", "variants": [{ "koolId": "3640225965", "rawName": "TRT KURDI RAW (1)", "pool": "kool1", "quality": 900 }, { "koolId": "175696837", "rawName": "TRT KURDI (7)", "pool": "kool7", "quality": 600 }] }, { "key": "tuncelidersim62tv", "name": "Tunceli Dersim 62 TV", "tvg_id": "tuncelidersim62tv.tr", "variants": [{ "koolId": "942180218", "rawName": "TUNCELI DERSIM 62 TV (1)", "pool": "kool1", "quality": 600 }] }, { "key": "turkhaber", "name": "T\xFCrkhaber TV", "tvg_id": "turkhaber.tr", "variants": [{ "koolId": "2012038243", "rawName": "T\xDCRKHABER TV (6)", "pool": "kool6", "quality": 600 }] }, { "key": "tv1", "name": "TV 1", "tvg_id": "tv1.tr", "variants": [{ "koolId": "4073129368", "rawName": "TV 1 (6)", "pool": "kool6", "quality": 600 }] }, { "key": "tv5", "name": "TV 5", "tvg_id": "tv5.tr", "variants": [{ "koolId": "122135384", "rawName": "TV 5 (6)", "pool": "kool6", "quality": 600 }, { "koolId": "935671761", "rawName": "TV5 (1)", "pool": "kool1", "quality": 600 }, { "koolId": "2055199683", "rawName": "TV 5 (7)", "pool": "kool7", "quality": 600 }] }, { "key": "tvden", "name": "TV Den", "tvg_id": "tvden.tr", "variants": [{ "koolId": "3341720640", "rawName": "TV DEN (6)", "pool": "kool6", "quality": 600 }] }, { "key": "viyanatv", "name": "Viyana TV", "tvg_id": "viyanatv.tr", "variants": [{ "koolId": "3442514805", "rawName": "VIYANA TV (6)", "pool": "kool6", "quality": 600 }] }, { "key": "vizyon58", "name": "Vizyon 58 (Sivas)", "tvg_id": "vizyon58.tr", "variants": [{ "koolId": "3275326615", "rawName": "VIZYON 58 (1)", "pool": "kool1", "quality": 600 }, { "koolId": "1283602496", "rawName": "VIZYON 58 (7)", "pool": "kool7", "quality": 600 }, { "koolId": "2278118654", "rawName": "VIZYON 58 TV SIVAS (7)", "pool": "kool7", "quality": 600 }] }, { "key": "vuslattv", "name": "Vuslat TV", "tvg_id": "vuslattv.tr", "variants": [{ "koolId": "949033122", "rawName": "VUSLAT TV (6)", "pool": "kool6", "quality": 600 }, { "koolId": "1061752758", "rawName": "VUSLAT TV (7)", "pool": "kool7", "quality": 600 }] }, { "key": "xnostaljitrkeklasik", "name": "Nostalji T\xFCrk\xE7e Klasik", "tvg_id": "xnostaljitrkeklasik.tr", "variants": [{ "koolId": "1767757052", "rawName": "X NOSTALJI T RK E KLASIK (1)", "pool": "kool1", "quality": 600 }] }, { "key": "yenikocaelitv", "name": "Yeni Kocaeli TV", "tvg_id": "yenikocaelitv.tr", "variants": [{ "koolId": "758663570", "rawName": "YENI KOCAELI TV (1)", "pool": "kool1", "quality": 600 }] }, { "key": "yesilcam2", "name": "Ye\u015Fil\xE7am 2", "tvg_id": "yesilcam2.tr", "variants": [{ "koolId": "868586058", "rawName": "YESILCAM 2 (7)", "pool": "kool7", "quality": 600 }] }, { "key": "yildiztilbe", "name": "Y\u0131ld\u0131z Tilbe", "tvg_id": "yildiztilbe.tr", "variants": [{ "koolId": "405072201", "rawName": "YILDIZ TILBE (1)", "pool": "kool1", "quality": 600 }] }, { "key": "zerrinozer", "name": "Zerrin \xD6zer", "tvg_id": "zerrinozer.tr", "variants": [{ "koolId": "2655157451", "rawName": "ZERRIN OZER (1)", "pool": "kool1", "quality": 600 }] }, { "key": "zonguldakkanalz", "name": "Zonguldak Kanal Z", "tvg_id": "zonguldakkanalz.tr", "variants": [{ "koolId": "1467834090", "rawName": "ZONGULDAK KANAL Z (1)", "pool": "kool1", "quality": 600 }] }, { "key": "automoto", "name": "Automoto (fr)", "tvg_id": "automoto.tr", "variants": [{ "koolId": "3033512963", "rawName": "AUTOMOTO (FR) (7)", "pool": "kool7", "quality": 600 }] }, { "key": "cinemaximum1", "name": "Cinemaximum 1", "tvg_id": "cinemaximum1.tr", "variants": [{ "koolId": "2323247791", "rawName": "CINEMAXIMUM 1 \u029C\u1D05 (1)", "pool": "kool1", "quality": 600 }] }, { "key": "cinemaximum7", "name": "Cinemaximum 7", "tvg_id": "cinemaximum7.tr", "variants": [{ "koolId": "1657551084", "rawName": "CINEMAXIMUM 7 \u029C\u1D05 (1)", "pool": "kool1", "quality": 600 }] }, { "key": "cinemaximum9", "name": "Cinemaximum 9", "tvg_id": "cinemaximum9.tr", "variants": [{ "koolId": "817501162", "rawName": "CINEMAXIMUM 9 \u029C\u1D05 (1)", "pool": "kool1", "quality": 600 }] }, { "key": "digimax", "name": "Digi Max", "tvg_id": "digimax.tr", "variants": [{ "koolId": "1278447576", "rawName": "DIGI MAX (7)", "pool": "kool7", "quality": 600 }] }, { "key": "dosttv", "name": "Dost TV", "tvg_id": "dosttv.tr", "variants": [{ "koolId": "799884057", "rawName": "DOST TV (7)", "pool": "kool7", "quality": 600 }] }, { "key": "egeilegaga", "name": "Ege \u0130le Gaga", "tvg_id": "egeilegaga.tr", "variants": [{ "koolId": "2625879722", "rawName": "EGE ILE GAGA (7)", "pool": "kool7", "quality": 600 }] }, { "key": "exxensports7", "name": "Exxen Sports 7", "tvg_id": "exxensports7.tr", "variants": [{ "koolId": "3800695404", "rawName": "EXXEN SPORTS 7 (7)", "pool": "kool7", "quality": 600 }] }, { "key": "ferdiozbegen", "name": "Ferdi \xD6zbe\u011Fen", "tvg_id": "ferdiozbegen.tr", "variants": [{ "koolId": "4003996810", "rawName": "FERDI OZBEGEN (1)", "pool": "kool1", "quality": 600 }] }, { "key": "kadirga", "name": "Kad\u0131rga", "tvg_id": "kadirga.tr", "variants": [{ "koolId": "2717283979", "rawName": "KADIRGA (7)", "pool": "kool7", "quality": 600 }] }, { "key": "lalegultv", "name": "Laleg\xFCl TV", "tvg_id": "lalegultv.tr", "variants": [{ "koolId": "3483642933", "rawName": "LALEGUL TV (7)", "pool": "kool7", "quality": 600 }] }, { "key": "pamukkale", "name": "Pamukkale", "tvg_id": "pamukkale.tr", "variants": [{ "koolId": "1647886571", "rawName": "PAMUKKALE (7)", "pool": "kool7", "quality": 600 }] }, { "key": "proturkaction", "name": "Proturk Action", "tvg_id": "proturkaction.tr", "variants": [{ "koolId": "3137956311", "rawName": "PROTURK ACTION (6)", "pool": "kool6", "quality": 600 }] }, { "key": "proturkbilimkurgu", "name": "Proturk Bilim Kurgu", "tvg_id": "proturkbilimkurgu.tr", "variants": [{ "koolId": "6325334", "rawName": "PROTURK BILIM KURGU (6)", "pool": "kool6", "quality": 600 }] }, { "key": "proturkfantastic", "name": "Proturk Fantastic", "tvg_id": "proturkfantastic.tr", "variants": [{ "koolId": "4028396893", "rawName": "PROTURK FANTASTIC (6)", "pool": "kool6", "quality": 600 }] }, { "key": "proturkgerilim", "name": "Proturk Gerilim", "tvg_id": "proturkgerilim.tr", "variants": [{ "koolId": "1293208483", "rawName": "PROTURK GERILIM (6)", "pool": "kool6", "quality": 600 }] }, { "key": "proturkkorku", "name": "Proturk Korku", "tvg_id": "proturkkorku.tr", "variants": [{ "koolId": "1194247131", "rawName": "PROTURK KORKU (6)", "pool": "kool6", "quality": 600 }] }, { "key": "proturkloca1", "name": "Proturk Loca 1", "tvg_id": "proturkloca1.tr", "variants": [{ "koolId": "1869786551", "rawName": "PROTURK LOCA 1 (6)", "pool": "kool6", "quality": 600 }] }, { "key": "proturkloca2", "name": "Proturk Loca 2", "tvg_id": "proturkloca2.tr", "variants": [{ "koolId": "684906343", "rawName": "PROTURK LOCA 2 (6)", "pool": "kool6", "quality": 600 }] }, { "key": "proturkmacera", "name": "Proturk Macera", "tvg_id": "proturkmacera.tr", "variants": [{ "koolId": "50689293", "rawName": "PROTURK MACERA (6)", "pool": "kool6", "quality": 600 }] }, { "key": "proturkorjinal", "name": "Proturk Orijinal", "tvg_id": "proturkorjinal.tr", "variants": [{ "koolId": "1662118634", "rawName": "PROTURK ORJINAL (6)", "pool": "kool6", "quality": 600 }] }, { "key": "proturkvizyon", "name": "Proturk Vizyon", "tvg_id": "proturkvizyon.tr", "variants": [{ "koolId": "2567042852", "rawName": "PROTURK VIZYON (6)", "pool": "kool6", "quality": 600 }] }, { "key": "rehbertv", "name": "Rehber TV", "tvg_id": "rehbertv.tr", "variants": [{ "koolId": "4152354759", "rawName": "REHBER (7)", "pool": "kool7", "quality": 600 }] }, { "key": "ssportplus5", "name": "S Sport Plus 5", "tvg_id": "ssportplus5.tr", "variants": [{ "koolId": "3760487764", "rawName": "S SPORT+5 MAC SAATI (1)", "pool": "kool1", "quality": 600 }] }, { "key": "ssportplus9", "name": "S Sport Plus 9", "tvg_id": "ssportplus9.tr", "variants": [{ "koolId": "2781992112", "rawName": "S SPORT+9 MAC SAATI (1)", "pool": "kool1", "quality": 600 }] }, { "key": "salon1", "name": "Salon 1", "tvg_id": "salon1.tr", "variants": [{ "koolId": "2217333005", "rawName": "SALON 1 (7)", "pool": "kool7", "quality": 600 }] }, { "key": "sevimlidostlar", "name": "Sevimli Dostlar", "tvg_id": "sevimlidostlar.tr", "variants": [{ "koolId": "4154723330", "rawName": "SEVIMLI DOSTLAR (7)", "pool": "kool7", "quality": 600 }] }, { "key": "sinemaaksiyon1", "name": "Sinema Aksiyon 1", "tvg_id": "sinemaaksiyon1.tr", "variants": [{ "koolId": "1293127897", "rawName": "SINEMA AKSIYON 1 (7)", "pool": "kool7", "quality": 600 }] }, { "key": "sinemaxcomedi", "name": "Sinemax Komedi", "tvg_id": "sinemaxcomedi.tr", "variants": [{ "koolId": "846127862", "rawName": "SINEMAX COMEDI (7)", "pool": "kool7", "quality": 600 }] }, { "key": "sinevizyon5", "name": "Sinevizyon 5", "tvg_id": "sinevizyon5.tr", "variants": [{ "koolId": "567459984", "rawName": "SINEVIZYON 5 (7)", "pool": "kool7", "quality": 600 }] }, { "key": "sinevizyonturk5", "name": "Sinevizyon T\xFCrk 5", "tvg_id": "sinevizyonturk5.tr", "variants": [{ "koolId": "4221956709", "rawName": "SINEVIZYON TURK 5 (7)", "pool": "kool7", "quality": 600 }] }, { "key": "sinevizyonturk7", "name": "Sinevizyon T\xFCrk 7", "tvg_id": "sinevizyonturk7.tr", "variants": [{ "koolId": "2170921221", "rawName": "SINEVIZYON TURK 7 (7)", "pool": "kool7", "quality": 600 }] }, { "key": "sirinlertv", "name": "\u015Eirinler TV", "tvg_id": "sirinlertv.tr", "variants": [{ "koolId": "383348303", "rawName": "SIRINLER TV (1)", "pool": "kool1", "quality": 600 }, { "koolId": "1766241745", "rawName": "SIRINLER TV (7)", "pool": "kool7", "quality": 600 }] }, { "key": "tele1", "name": "Tele 1", "tvg_id": "tele1.tr", "variants": [{ "koolId": "1025979520", "rawName": "TELE 1 (7)", "pool": "kool7", "quality": 600 }] }, { "key": "tgrteu", "name": "TGRT EU", "tvg_id": "tgrteu.tr", "variants": [{ "koolId": "182286475", "rawName": "TGRT EU (7)", "pool": "kool7", "quality": 600 }] }, { "key": "trtebailkokul", "name": "TRT EBA \u0130lkokul", "tvg_id": "trtebailkokul.tr", "variants": [{ "koolId": "2287658033", "rawName": "TRT EBA ILKOKUL (7)", "pool": "kool7", "quality": 600 }] }, { "key": "turkrock", "name": "T\xFCrk Rock", "tvg_id": "turkrock.tr", "variants": [{ "koolId": "2245395439", "rawName": "TURK ROCK (1)", "pool": "kool1", "quality": 600 }] }, { "key": "vatantv", "name": "Vatan TV", "tvg_id": "vatantv.tr", "variants": [{ "koolId": "2730047464", "rawName": "VATAN TV (7)", "pool": "kool7", "quality": 600 }] }] };
  }
});

// src/shared/kool_engine.js
var require_kool_engine = __commonJS({
  "src/shared/kool_engine.js"(exports2, module2) {
    var { loadConfig, val } = require_config();
    var { timeoutSignal } = require_http();
    var koolCatalog = require_kool_catalog();
    var DEFAULT_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
    var KOOL_BASE = "https://kool.ws";
    var _koolByKey = null;
    var _koolKeyById = null;
    function poolPriority(pool) {
      if (pool === "kool1") return 1;
      if (pool === "kool6") return 2;
      if (pool === "kool7") return 3;
      return 9;
    }
    function initKoolCatalog() {
      if (_koolByKey) return;
      _koolByKey = {};
      _koolKeyById = {};
      var channels = koolCatalog && Array.isArray(koolCatalog.channels) ? koolCatalog.channels : [];
      for (var i = 0; i < channels.length; i++) {
        var ch = channels[i];
        if (!ch || !ch.key || !Array.isArray(ch.variants) || ch.variants.length === 0) continue;
        var variants = ch.variants.slice().sort(function(a, b) {
          if ((a.quality || 0) !== (b.quality || 0)) {
            return (b.quality || 0) - (a.quality || 0);
          }
          return poolPriority(a.pool) - poolPriority(b.pool);
        });
        _koolByKey[ch.key] = variants;
        for (var j = 0; j < variants.length; j++) {
          if (variants[j].koolId) {
            _koolKeyById[String(variants[j].koolId)] = ch.key;
          }
        }
      }
    }
    function getKoolKeyByUrlOrId(urlOrId) {
      initKoolCatalog();
      if (!urlOrId) return "";
      var m = String(urlOrId).match(/\/live\/play\/(\d+)/);
      var id = m ? m[1] : String(urlOrId).trim();
      return _koolKeyById[id] || "";
    }
    function getKoolPools(channelKey) {
      initKoolCatalog();
      var variants = _koolByKey[channelKey];
      if (!variants || variants.length === 0) return [];
      var order = ["kool1", "kool6", "kool7"];
      var pools = [];
      for (var i = 0; i < order.length; i++) {
        var p = order[i];
        for (var j = 0; j < variants.length; j++) {
          if (variants[j].pool === p) {
            pools.push(p);
            break;
          }
        }
      }
      return pools;
    }
    function resolveSingleKoolVariant(koolBase, variant) {
      return __async(this, null, function* () {
        var playUrl = variant.playUrl || (variant.koolId ? koolBase + "/live/play/" + variant.koolId : "");
        if (!playUrl) return null;
        var apiUrl = koolBase + "/live/resolve?region=TR&language=tr&url=" + encodeURIComponent(playUrl);
        try {
          var res = yield fetch(apiUrl, {
            headers: {
              "User-Agent": DEFAULT_UA,
              "Referer": koolBase + "/",
              "Accept": "application/json, */*"
            },
            signal: timeoutSignal(4500)
          });
          if (!res || res.status < 200 || res.status >= 400) return null;
          var parsed = yield res.json();
          if (!parsed || !parsed.url) return null;
          var headers = { "User-Agent": DEFAULT_UA };
          if (parsed.headers && typeof parsed.headers === "object") {
            for (var hk in parsed.headers) {
              if (Object.prototype.hasOwnProperty.call(parsed.headers, hk)) {
                headers[hk] = parsed.headers[hk];
              }
            }
          }
          return {
            url: parsed.url,
            headers,
            pool: variant.pool || "kool1",
            quality: variant.quality || 720,
            rawName: variant.rawName || ""
          };
        } catch (e) {
          return null;
        }
      });
    }
    function testStreamAlive(streamUrl, headers) {
      return __async(this, null, function* () {
        if (!streamUrl) return false;
        try {
          var res = yield fetch(streamUrl, {
            headers: headers || { "User-Agent": DEFAULT_UA },
            signal: timeoutSignal(3e3)
          });
          if (!res || res.status < 200 || res.status >= 400) return false;
          if (streamUrl.indexOf(".m3u8") !== -1 || streamUrl.indexOf("/sunshine/") !== -1) {
            var txt = yield res.text();
            if (txt && txt.indexOf("#EXTM3U") === -1) {
              return false;
            }
          }
          return true;
        } catch (e) {
          return false;
        }
      });
    }
    function resolveKoolPool(channelKey, pool, koolBase) {
      return __async(this, null, function* () {
        initKoolCatalog();
        var allVariants = _koolByKey[channelKey];
        if (!allVariants || allVariants.length === 0) return null;
        var candidates = !pool || pool === "kool" ? allVariants : allVariants.filter(function(v2) {
          return v2.pool === pool;
        });
        if (candidates.length === 0) return null;
        var maxTries = Math.min(candidates.length, 3);
        for (var i = 0; i < maxTries; i++) {
          var v = candidates[i];
          var resolved = yield resolveSingleKoolVariant(koolBase, v);
          if (!resolved || !resolved.url) continue;
          var alive = yield testStreamAlive(resolved.url, resolved.headers);
          if (alive) {
            return resolved;
          }
        }
        return null;
      });
    }
    function formatKoolStream(resolved, channelName) {
      var poolLabel = "Sunucu 1";
      var shortPool = "Kool S1";
      if (resolved.pool === "kool6") {
        poolLabel = "Sunucu 6";
        shortPool = "Kool S6";
      } else if (resolved.pool === "kool7") {
        poolLabel = "Sunucu 7";
        shortPool = "Kool S7";
      }
      var qualTag = resolved.quality >= 2160 ? "4K UHD" : resolved.quality >= 1080 ? "1080p FHD" : "HD";
      return {
        name: "\u231C " + shortPool + " \u231F",
        title: channelName + " [Kool.ws \xB7 " + poolLabel + " \xB7 " + qualTag + "]",
        url: resolved.url,
        headers: resolved.headers,
        behaviorHints: { isLive: true }
      };
    }
    function resolveAllKoolStreams(channelKey, channelName) {
      return __async(this, null, function* () {
        initKoolCatalog();
        if (!channelKey || !_koolByKey[channelKey]) return [];
        try {
          yield loadConfig();
          var cfgBase = val("urls.live.kool.base");
          if (cfgBase) KOOL_BASE = String(cfgBase).replace(/\/+$/, "");
        } catch (e) {
        }
        var pools = getKoolPools(channelKey);
        if (pools.length === 0) return [];
        var results = yield Promise.all(
          pools.map(function(p) {
            return resolveKoolPool(channelKey, p, KOOL_BASE);
          })
        );
        var streams = [];
        var seen = {};
        for (var i = 0; i < results.length; i++) {
          var r = results[i];
          if (r && r.url && !seen[r.url]) {
            seen[r.url] = true;
            streams.push(formatKoolStream(r, channelName || channelKey));
          }
        }
        return streams;
      });
    }
    module2.exports = {
      initKoolCatalog,
      getKoolKeyByUrlOrId,
      getKoolPools,
      resolveKoolPool,
      resolveAllKoolStreams,
      testStreamAlive
    };
  }
});

// src/shared/sport_engine.js
var require_sport_engine = __commonJS({
  "src/shared/sport_engine.js"(exports2, module2) {
    var { loadConfig, val } = require_config();
    var { resolveAllKoolStreams, getKoolKeyByUrlOrId } = require_kool_engine();
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
      },
      "exxensports1": { name: "EXXEN SPORTS 1", mahsunsports: "androstreamliveexn1" },
      "exxensports2": { name: "EXXEN SPORTS 2", mahsunsports: "androstreamliveexn2" },
      "exxensports3": { name: "EXXEN SPORTS 3", mahsunsports: "androstreamliveexn3" },
      "exxensports4": { name: "EXXEN SPORTS 4", mahsunsports: "androstreamliveexn4" },
      "exxensports5": { name: "EXXEN SPORTS 5", mahsunsports: "androstreamliveexn5" },
      "exxensports6": { name: "EXXEN SPORTS 6", mahsunsports: "androstreamliveexn6" },
      "exxensports7": { name: "EXXEN SPORTS 7", mahsunsports: "androstreamliveexn7" },
      "exxensports8": { name: "EXXEN SPORTS 8", mahsunsports: "androstreamliveexn8" },
      "tabiispor": { name: "TABII SPOR", mahsunsports: "androstreamlivetb" },
      "tabiispor1": { name: "TABII SPOR 1", mahsunsports: "androstreamlivetb1" },
      "tabiispor2": { name: "TABII SPOR 2", mahsunsports: "androstreamlivetb2" },
      "tabiispor3": { name: "TABII SPOR 3", mahsunsports: "androstreamlivetb3" },
      "tabiispor4": { name: "TABII SPOR 4", mahsunsports: "androstreamlivetb4" },
      "tabiispor5": { name: "TABII SPOR 5", mahsunsports: "androstreamlivetb5" },
      "tabiispor6": { name: "TABII SPOR 6", mahsunsports: "androstreamlivetb6" },
      "tabiispor7": { name: "TABII SPOR 7", mahsunsports: "androstreamlivetb7" },
      "tabiispor8": { name: "TABII SPOR 8", mahsunsports: "androstreamlivetb8" }
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
          "Referer": PAPAZ_SITE + "/tv/" + encodeURIComponent(channelId),
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
    function resolveAnthologyLiveStreams(channelIdOrName, fallbackTitle, opts) {
      return __async(this, null, function* () {
        yield initSportConfig();
        opts = opts || {};
        if (opts.isSport) {
          return resolveMultiSportStreams(channelIdOrName, fallbackTitle);
        }
        var koolKeyFromUrl = getKoolKeyByUrlOrId(channelIdOrName);
        var canonicalKey = koolKeyFromUrl || extractCanonicalKey(channelIdOrName);
        var chTitle = fallbackTitle || String(channelIdOrName).toUpperCase();
        return yield resolveAllKoolStreams(canonicalKey, chTitle);
      });
    }
    function resolveMultiSportStreams(channelIdOrName, fallbackTitle) {
      return __async(this, null, function* () {
        yield initSportConfig();
        var map = findSportChannelMapping(channelIdOrName);
        var chTitle = fallbackTitle || map && map.name || String(channelIdOrName).toUpperCase();
        var koolKeyFromUrl = getKoolKeyByUrlOrId(channelIdOrName);
        var canonicalKey = koolKeyFromUrl || extractCanonicalKey(channelIdOrName);
        if (!canonicalKey && map && map.key) canonicalKey = map.key;
        var pTimeout = 3500;
        var tPromise = map && map.taraftarium ? withTimeout(fetchTaraftariumStream(map.taraftarium), pTimeout) : Promise.resolve(null);
        var aPromise = map && map.ardasports ? withTimeout(fetchArdaSportsStream(map.ardasports), pTimeout) : Promise.resolve(null);
        var alPromise = map && map.alemdarsport ? withTimeout(fetchAlemdarStream(map.alemdarsport), pTimeout) : Promise.resolve(null);
        var mPromise = map && map.mahsunsports ? withTimeout(fetchMahsunStream(map.mahsunsports), pTimeout) : Promise.resolve(null);
        var pPromise = map && map.papazsports ? withTimeout(fetchPapazStream(map.papazsports), pTimeout) : Promise.resolve(null);
        var kPromise = canonicalKey ? withTimeout(resolveAllKoolStreams(canonicalKey, chTitle), 5500) : Promise.resolve([]);
        var results = yield Promise.all([mPromise, alPromise, tPromise, aPromise, pPromise, kPromise]);
        var streams = [];
        var seen = {};
        var addStream = function(s) {
          if (s && s.url && !seen[s.url]) {
            seen[s.url] = true;
            streams.push(s);
          }
        };
        if (results[0] && results[0].url) addStream(makeStream("\u231C MahsunSports \u231F", chTitle + " [1080p HD]", results[0].url, results[0].headers));
        if (results[1] && results[1].url) addStream(makeStream("\u231C AlemdarSport \u231F", chTitle + " [1080p FHD]", results[1].url, results[1].headers));
        if (results[2] && results[2].url) addStream(makeStream("\u231C Taraftarium24 \u231F", chTitle + " [1080p FHD]", results[2].url, results[2].headers));
        if (results[3] && results[3].url) addStream(makeStream("\u231C ArdaSports \u231F", chTitle + " [1080p FHD]", results[3].url, results[3].headers));
        if (results[4] && results[4].url) addStream(makeStream("\u231C PapazSports \u231F", chTitle + " [1080p HD]", results[4].url, results[4].headers));
        var koolStreams = Array.isArray(results[5]) ? results[5] : [];
        for (var ki = 0; ki < koolStreams.length; ki++) {
          addStream(koolStreams[ki]);
        }
        return streams;
      });
    }
    module2.exports = {
      initSportConfig,
      findSportChannelMapping,
      extractCanonicalKey,
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
            var isKoolPlaceholder = function(u) {
              return u && (u.indexOf("kool.ws/live/play/") !== -1 || u.indexOf("/live/") !== -1 && u.indexOf("anthology-live") !== -1);
            };
            if (ch.url && !isKoolPlaceholder(ch.url)) {
              seenUrls[ch.url] = true;
              officialStreams.push(buildStreamEntry(streamName, ch.name, ch.name + " [Canl\u0131 HD \xB7 Resmi]", ch.url));
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
              var liveTarget = isKoolPlaceholder(ch.url) ? ch.url : ch.id;
              var liveSources = yield resolveAnthologyLiveStreams(liveTarget, ch.name, { isSport: false });
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

// src/anthology_belgesel_cocuk/index.js
var { createLiveTvProvider } = require_live_tv_engine();
var provider = createLiveTvProvider({
  streamName: "\u231C Anthology Belgesel & \xC7ocuk \u231F",
  genre: "Belgesel & \xC7ocuk",
  matchGroup: function(group) {
    var g = group || "";
    return g.indexOf("BELGESEL") !== -1 || g.indexOf("\xC7OCUK") !== -1;
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

