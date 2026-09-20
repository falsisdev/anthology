/**
 * Anthology Provider: trdiziizle
 * Built from src/trdiziizle/index.js
 * Build Date: 2026-09-20T20:49:56.271Z
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

// src/shared/http.js
var require_http = __commonJS({
  "src/shared/http.js"(exports2, module2) {
    var DEFAULT_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
    function timeoutSignal2(ms) {
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
        options.signal = timeoutSignal2(ms);
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
      timeoutSignal: timeoutSignal2,
      fetchWithTimeout
    };
  }
});

// src/shared/turkish_series.js
var require_turkish_series = __commonJS({
  "src/shared/turkish_series.js"(exports2, module2) {
    var TMDB_API_BASE = "https://api.themoviedb.org/3";
    function normalizeSeriesId2(raw) {
      var out = { id: "", kind: "unknown", season: 0, episode: 0 };
      if (typeof raw !== "string") return out;
      var val2 = raw.trim();
      var seg = val2.split(":");
      if (seg.length >= 3 && /^\d+$/.test(seg[seg.length - 1]) && /^\d+$/.test(seg[seg.length - 2])) {
        out.season = parseInt(seg[seg.length - 2], 10);
        out.episode = parseInt(seg[seg.length - 1], 10);
        seg = seg.slice(0, seg.length - 2);
        val2 = seg.join(":");
      } else if (seg.length === 2 && /^\d+$/.test(seg[1])) {
        out.episode = parseInt(seg[1], 10);
        val2 = seg[0];
      }
      var core = String(val2).trim();
      core = core.replace(/^(cinemata|cine|tmdb|tvdb|imdb|metadata|mal|id|movieid|seriesid|showid|slug|tv):/i, "");
      if (/^tt\d+$/i.test(core)) {
        out.id = core;
        out.kind = "imdb";
      } else if (/^\d+$/.test(core)) {
        out.id = core;
        out.kind = "tmdb";
      } else if (core) {
        out.id = core;
        out.kind = "title";
      }
      return out;
    }
    function asciiFold2(s) {
      s = String(s || "");
      try {
        if (typeof s.normalize === "function") s = s.normalize("NFD");
      } catch (e) {
      }
      s = s.replace(/[\u0300-\u036f]/g, "");
      s = s.toLowerCase();
      var map = { "\xE7": "c", "\u011F": "g", "\u0131": "i", "\u0130": "i", "\xF6": "o", "\u015F": "s", "\xFC": "u", "\xE2": "a", "\xEE": "i", "\xFB": "u" };
      var out = "";
      for (var i = 0; i < s.length; i++) {
        var ch = s.charAt(i);
        out += map[ch] !== void 0 ? map[ch] : ch;
      }
      return out;
    }
    function cleanTitle2(t) {
      return asciiFold2(String(t || "")).replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
    }
    function tokensMatch(a, b) {
      var ta = cleanTitle2(a).split(" ").filter(function(x) {
        return x.length > 1;
      });
      var tb = cleanTitle2(b).split(" ").filter(function(x) {
        return x.length > 1;
      });
      if (!ta.length || !tb.length) return 0;
      var hits = 0;
      for (var i = 0; i < ta.length; i++) {
        for (var j = 0; j < tb.length; j++) {
          if (ta[i] === tb[j]) {
            hits++;
            break;
          }
        }
      }
      return hits / Math.max(ta.length, tb.length);
    }
    function tmdbJson(url) {
      return __async(this, null, function* () {
        try {
          var res = yield fetch(url, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
              "Accept": "application/json"
            }
          });
          if (!res.ok) return null;
          return yield res.json();
        } catch (e) {
          return null;
        }
      });
    }
    function pickResults(data, preferTv) {
      if (!data) return null;
      if (preferTv) {
        if (data.tv_results && data.tv_results[0]) return { type: "tv", item: data.tv_results[0] };
        if (data.movie_results && data.movie_results[0]) return { type: "movie", item: data.movie_results[0] };
      } else {
        if (data.movie_results && data.movie_results[0]) return { type: "movie", item: data.movie_results[0] };
        if (data.tv_results && data.tv_results[0]) return { type: "tv", item: data.tv_results[0] };
      }
      return null;
    }
    function resolveSeriesInfo2(rawId, mediaType, apiKey) {
      return __async(this, null, function* () {
        var out = { title: "", origTitle: "", numericId: "", imdbId: "", aliases: [], seasons: [], kind: "unknown", type: "tv" };
        var key = apiKey || "500330721680edb6d5f7f12ba7cd9023";
        var norm = normalizeSeriesId2(rawId);
        if (!norm.id) return out;
        out.kind = norm.kind;
        var wantTv = mediaType === "tv" || mediaType === "series" || mediaType === "show" || norm.season > 0 || norm.kind !== "movie";
        if (mediaType === "movie") wantTv = false;
        var numericId = "";
        var name = "";
        var original = "";
        var foundType = wantTv ? "tv" : "movie";
        if (norm.kind === "imdb") {
          var fd = yield tmdbJson(TMDB_API_BASE + "/find/" + norm.id + "?api_key=" + key + "&external_source=imdb_id&language=tr-TR");
          var hit = pickResults(fd, wantTv);
          if (!hit && wantTv) {
            hit = pickResults(fd, false);
          }
          if (hit) {
            foundType = hit.type;
            numericId = String(hit.item.id);
            name = hit.item.name || hit.item.title || "";
            original = hit.item.original_name || hit.item.original_title || "";
          }
        } else if (norm.kind === "tmdb") {
          numericId = norm.id;
        } else {
          var sd = yield tmdbJson(TMDB_API_BASE + "/search/tv?query=" + encodeURIComponent(norm.id) + "&api_key=" + key + "&language=tr-TR&page=1");
          var results = sd && sd.results || [];
          var best = null;
          var bestScore = -1;
          var target = cleanTitle2(norm.id);
          for (var i = 0; i < results.length; i++) {
            var r = results[i];
            var score = tokensMatch(r.name, norm.id);
            if (cleanTitle2(r.name) === target) score = 1;
            if (score > bestScore) {
              bestScore = score;
              best = r;
            }
          }
          if (!best && results.length > 0) best = results[0];
          if (best) {
            numericId = String(best.id);
            name = best.name || "";
            original = best.original_name || "";
          }
        }
        if (!numericId) return out;
        out.numericId = numericId;
        out.type = foundType;
        var dres = yield tmdbJson(TMDB_API_BASE + "/" + foundType + "/" + numericId + "?api_key=" + key + "&language=tr-TR");
        if (dres) {
          name = dres.name || dres.title || name;
          original = dres.original_name || dres.original_title || original;
          if (foundType === "tv" && dres.seasons) out.seasons = dres.seasons;
        }
        out.title = name || norm.id;
        out.origTitle = original || name || norm.id;
        var ext = yield tmdbJson(TMDB_API_BASE + "/" + foundType + "/" + numericId + "/external_ids?api_key=" + key);
        if (ext && ext.imdb_id) {
          out.imdbId = ext.imdb_id;
          out.aliases.push(ext.imdb_id);
        }
        var trs = yield tmdbJson(TMDB_API_BASE + "/" + foundType + "/" + numericId + "/translations?api_key=" + key);
        if (trs && trs.translations) {
          for (var t = 0; t < trs.translations.length; t++) {
            var trName = trs.translations[t].data && trs.translations[t].data.name;
            if (trName && trName !== name && trName !== original) {
              out.aliases.push(trName);
            }
          }
        }
        if (foundType === "movie") {
          var alt = yield tmdbJson(TMDB_API_BASE + "/movie/" + numericId + "/alternative_titles?api_key=" + key + "&country=TR");
          if (alt && alt.titles) {
            for (var a = 0; a < alt.titles.length; a++) {
              var tn = alt.titles[a].title;
              if (tn && tn !== name && tn !== original && out.aliases.indexOf(tn) === -1) out.aliases.push(tn);
            }
          }
        }
        var seen = {};
        seen[asciiFold2(name)] = true;
        seen[asciiFold2(original)] = true;
        var aliases = [];
        for (var k = 0; k < out.aliases.length; k++) {
          var fa = asciiFold2(out.aliases[k]);
          if (!fa || seen[fa]) continue;
          seen[fa] = true;
          aliases.push(out.aliases[k]);
        }
        if (aliases.length > 8) aliases.length = 8;
        out.aliases = aliases;
        return out;
      });
    }
    function seriesSearchTitles2(show) {
      var titles = [];
      function push(t) {
        t = String(t || "").trim();
        if (!t) return;
        for (var k = 0; k < titles.length; k++) {
          if (asciiFold2(titles[k]) === asciiFold2(t)) return;
          if (asciiFold2(titles[k]) === asciiFold2(t).replace(/[^a-z0-9]+/g, " ").trim() && asciiFold2(t).replace(/[^a-z0-9]+/g, " ").trim() === asciiFold2(titles[k]).replace(/[^a-z0-9]+/g, " ").trim()) return;
        }
        titles.push(t);
      }
      push(show && show.title);
      push(show && (show.orig || show.origTitle));
      push(show && show.name);
      var als = show && (show.alt || show.aliases);
      if (als) {
        for (var j = 0; j < als.length; j++) push(als[j]);
      }
      return titles;
    }
    module2.exports = {
      normalizeSeriesId: normalizeSeriesId2,
      resolveSeriesInfo: resolveSeriesInfo2,
      seriesSearchTitles: seriesSearchTitles2,
      asciiFold: asciiFold2
    };
  }
});

// src/shared/unpacker.js
var require_unpacker = __commonJS({
  "src/shared/unpacker.js"(exports2, module2) {
    function unpackDeanEdwards2(str) {
      if (!str || typeof str !== "string") return null;
      var match = str.match(/eval\(function\(p,a,c,k,e,[rd]\)\s*\{.+?\}\s*\(\s*([x\x27\x22].+?)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([x\x27\x22].+?)\.split\(\s*[\x27\x22]\|[\x27\x22]\s*\)/);
      if (!match) return null;
      var p = match[1];
      if (p.startsWith("'") && p.endsWith("'") || p.startsWith('"') && p.endsWith('"')) {
        p = p.slice(1, -1);
      }
      p = p.replace(/\\x27/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
      var a = parseInt(match[2], 10);
      var c = parseInt(match[3], 10);
      var kStr = match[4];
      if (kStr.startsWith("'") && kStr.endsWith("'") || kStr.startsWith('"') && kStr.endsWith('"')) {
        kStr = kStr.slice(1, -1);
      }
      var k = kStr.split("|");
      function baseN(val3, radix) {
        if (radix === 10) return String(val3);
        var chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
        var res = "";
        do {
          res = chars[val3 % radix] + res;
          val3 = Math.floor(val3 / radix);
        } while (val3 > 0);
        return res;
      }
      for (var i = c - 1; i >= 0; i--) {
        var key = baseN(i, a);
        var val2 = k[i] || key;
        if (val2 !== key) {
          var reg = new RegExp("\\b" + key + "\\b", "g");
          p = p.replace(reg, val2);
        }
      }
      return p;
    }
    module2.exports = {
      unpackDeanEdwards: unpackDeanEdwards2
    };
  }
});

// src/trdiziizle/index.js
var { sortStreamsByQuality } = require_quality();
var { loadConfig, val, wrapAll } = require_config();
var { timeoutSignal } = require_http();
var { normalizeSeriesId, resolveSeriesInfo, seriesSearchTitles } = require_turkish_series();
var { unpackDeanEdwards } = require_unpacker();
var _cfgReady = null;
function cfgReady() {
  if (!_cfgReady) {
    _cfgReady = loadConfig().then(function() {
      var v = val("urls.series.trdiziizle.base");
      if (v) BASE_URL = String(v).replace(/\/+$/, "");
      if (HEADERS) HEADERS.Referer = BASE_URL + "/";
    });
  }
  return _cfgReady;
}
var BASE_URL = "https://www.trdiziizle.tv/tr2";
var TMDB_API_KEY = "500330721680edb6d5f7f12ba7cd9023";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
  "Referer": BASE_URL + "/"
};
var useTimeoutSignal = timeoutSignal;
function asciiFold(s) {
  s = String(s || "");
  try {
    if (typeof s.normalize === "function") s = s.normalize("NFD");
  } catch (e) {
  }
  s = s.replace(/[\u0300-\u036f]/g, "");
  var map = { "\xE7": "c", "\u011F": "g", "\u0131": "i", "\u0130": "I", "\xF6": "o", "\u015F": "s", "\xFC": "u", "\xE2": "a", "\xEE": "i", "\xFB": "u" };
  var out = "";
  var lower = s.toLowerCase();
  for (var i = 0; i < lower.length; i++) {
    var ch = lower.charAt(i);
    out += map[ch] !== void 0 ? map[ch] : ch;
  }
  return out;
}
function cleanTitle(t) {
  return asciiFold(String(t || "")).replace(/[^a-z0-9]+/g, " ").trim();
}
function decodeHtmlEntities(str) {
  if (!str) return "";
  return String(str).replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&#(\d+);/g, function(m, d) {
    return String.fromCharCode(parseInt(d, 10));
  });
}
function fadeFetch(url, opts, ms) {
  opts = opts || {};
  opts.signal = useTimeoutSignal(ms || 15e3);
  opts.headers = opts.headers || {};
  if (!opts.headers["User-Agent"]) opts.headers["User-Agent"] = HEADERS["User-Agent"];
  return fetch(url, opts);
}
function fetchText(url, opts, ms) {
  return __async(this, null, function* () {
    opts = opts || {};
    if (typeof opts === "number") {
      ms = opts;
      opts = {};
    }
    var r = yield fadeFetch(url, opts, ms);
    if (!r.ok) return "";
    return yield r.text();
  });
}
function siteReachable() {
  return __async(this, null, function* () {
    try {
      var r = yield fadeFetch(BASE_URL + "/", {}, 12e3);
      return r.status === 200;
    } catch (e) {
      return false;
    }
  });
}
function wpSearch(term) {
  return __async(this, null, function* () {
    var q = encodeURIComponent(term);
    var html = yield fetchText(BASE_URL + "/?s=" + q);
    if (!html) return [];
    var results = [];
    var re = /<article[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    var m;
    while ((m = re.exec(html)) !== null) {
      var title = decodeHtmlEntities(m[2].replace(/<[^>]+>/g, " ")).trim();
      if (title && m[1]) results.push({ title, url: m[1] });
    }
    if (!results.length) {
      var re2 = /<h[123][^>]*class="[^"]*(entry-title|post-title)[^"]*"[^>]*>[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
      while ((m = re2.exec(html)) !== null) {
        var t2 = decodeHtmlEntities(m[3].replace(/<[^>]+>/g, " ")).trim();
        if (t2 && m[2]) results.push({ title: t2, url: m[2] });
      }
    }
    return results;
  });
}
function bestWPMatch(results, keywords) {
  if (!results.length) return null;
  var best = null;
  var bestScore = -1;
  for (var i = 0; i < results.length; i++) {
    var name = cleanTitle(results[i].title);
    for (var k = 0; k < keywords.length; k++) {
      var kw = cleanTitle(keywords[k]);
      if (!kw) continue;
      var score = 0;
      if (name === kw) score = 100;
      else if (name.indexOf(kw) !== -1 || kw.indexOf(name) !== -1) score = 60 + Math.min(name.length, kw.length) / Math.max(name.length, kw.length) * 30;
      else if (name.indexOf("dizi") !== -1) {
        var cleaned = name.replace(/\bdizi\b/g, " ").replace(/\s+/g, " ").trim();
        if (cleaned === kw) score = 90;
        else if (cleaned.indexOf(kw) !== -1 || kw.indexOf(cleaned) !== -1) score = 55;
      }
      if (score > bestScore) {
        bestScore = score;
        best = results[i];
      }
    }
  }
  if (bestScore >= 50) return best;
  return null;
}
function extractIframes(html) {
  var out = [];
  var re = /<iframe[^>]+src=["']([^"']+)["'][^>]*>/gi;
  var m;
  while ((m = re.exec(html)) !== null) {
    var src = decodeHtmlEntities(m[1]);
    if (src && /^(https?:)?\/\//i.test(src)) out.push(src);
  }
  return out;
}
function resolveIframeStream(src) {
  return __async(this, null, function* () {
    try {
      var abs = src.indexOf("//") === 0 ? "https:" + src : src.indexOf("http") === 0 ? src : BASE_URL + src;
      var host = "";
      var hm = abs.match(/^https?:\/\/([^\/?#]+)/i);
      if (hm) host = hm[1].toLowerCase();
      if (host.indexOf("youtube") !== -1 || host.indexOf("youtu.be") !== -1) {
        var ytMatch = abs.match(/(?:youtube\.com\/(?:embed|watch\?v=)|youtu\.be\/)([\w-]{6,})/);
        if (!ytMatch) return [];
        var ytId = ytMatch[1];
        return [{
          url: "https://www.youtube.com/watch?v=" + ytId,
          name: "TrDizi\u0130zle",
          title: "\u231C TrDizi\u0130zle \u231F | YouTube",
          quality: "1080p",
          format: "mp4",
          isHls: false
        }];
      }
      var html = yield fetchText(abs, { "Referer": BASE_URL + "/" }, 15e3);
      if (!html) return [];
      var streams = [];
      var m3 = html.match(/https?:[^"'\s\\]+\.m3u8(?:\?[^"'\s\\]*)?/g);
      var m4 = html.match(/https?:[^"'\s\\]+\.mp4(?:\?[^"'\s\\]*)?/g);
      var sources = [];
      if (m3) for (var i = 0; i < m3.length; i++) sources.push({ url: m3[i], hls: true });
      if (m4) for (var j = 0; j < m4.length; j++) sources.push({ url: m4[j], hls: false });
      if (!sources.length) {
        var dec = unpackDeanEdwards(html);
        if (dec) {
          var dm3 = dec.match(/https?:[^"'\s\\]+\.m3u8(?:\?[^"'\s\\]*)?/g);
          var dm4 = dec.match(/https?:[^"'\s\\]+\.mp4(?:\?[^"'\s\\]*)?/g);
          if (dm3) for (var x = 0; x < dm3.length; x++) sources.push({ url: dm3[x], hls: true });
          if (dm4) for (var y = 0; y < dm4.length; y++) sources.push({ url: dm4[y], hls: false });
        }
      }
      var seen = {};
      for (var s = 0; s < sources.length; s++) {
        var su = sources[s].url;
        if (/\.(png|jpe?g|gif|css|js|svg)(\?|$)/i.test(su)) continue;
        if (seen[su]) continue;
        seen[su] = true;
        streams.push({
          url: su,
          name: "TrDizi\u0130zle",
          title: "\u231C TrDizi\u0130zle \u231F | " + (sources[s].hls ? "HLS" : "MP4"),
          quality: "1080p",
          format: sources[s].hls ? "hls" : "mp4",
          isHls: sources[s].hls,
          headers: { "Referer": BASE_URL + "/", "User-Agent": HEADERS["User-Agent"] }
        });
      }
      return streams;
    } catch (e) {
      return [];
    }
  });
}
function episodeStreams(epUrl) {
  return __async(this, null, function* () {
    var html = yield fetchText(epUrl);
    if (!html) return [];
    var iframes = extractIframes(html);
    var streams = [];
    for (var i = 0; i < Math.min(iframes.length, 8); i++) {
      var one = yield resolveIframeStream(iframes[i]);
      for (var j = 0; j < one.length; j++) streams.push(one[j]);
    }
    return streams;
  });
}
function getCatalog(args) {
  return __async(this, null, function* () {
    try {
      var q = "";
      if (args && typeof args === "object" && !Array.isArray(args)) {
        q = args.search || args.extra && args.extra.search || "";
      }
      q = String(q || "");
      if (q) {
        var res = yield wpSearch(q);
        var metas = [];
        for (var g = 0; g < res.length; g++) metas.push({ id: "trdiziizle:link:" + encodeURIComponent(res[g].url), type: "series", name: res[g].title });
        return { metas: metas.slice(0, 24) };
      }
      var html = yield fetchText(BASE_URL + "/");
      var metas = [];
      var re = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
      var m, seen = {};
      while ((m = re.exec(html)) !== null) {
        var title = decodeHtmlEntities(m[2].replace(/<[^>]+>/g, " ")).trim();
        if (!title || title.length < 3) continue;
        var href = m[1];
        if (!/\/(?:category|tag|dizi|diziler|liste|yabanci-dizi|yerli-dizi)\//i.test(href)) continue;
        if (seen[href]) continue;
        seen[href] = true;
        metas.push({ id: "trdiziizle:link:" + encodeURIComponent(href), type: "series", name: title });
        if (metas.length >= 24) break;
      }
      return { metas };
    } catch (e) {
      return { metas: [] };
    }
  });
}
function getMeta(id) {
  return __async(this, null, function* () {
    try {
      var raw = String(id || "");
      var url = "";
      if (raw.indexOf("trdiziizle:link:") === 0) url = raw.slice("trdiziizle:link:".length);
      else if (raw.indexOf("trdiziizle:") === 0) url = decodeURIComponent(raw.slice("trdiziizle:".length));
      else if (raw.indexOf(":") !== -1 && raw.indexOf(":") !== -1) {
        var pr = raw.split(":");
        url = pr[pr.length - 1];
      }
      if (url.indexOf("http") !== 0) return { meta: null };
      var html = yield fetchText(url);
      if (!html) return { meta: null };
      var eps = [];
      var re = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
      var m, seen = {};
      while ((m = re.exec(html)) !== null) {
        var href = m[1];
        if (!/bolum|episode|izle/i.test(href)) continue;
        if (seen[href]) continue;
        var t = decodeHtmlEntities(m[2].replace(/<[^>]+>/g, " ")).trim();
        if (!t) continue;
        seen[href] = true;
        var epsMatch = t.match(/(?:(\d+)\.\s*sezon|sezon\s*(\d+)|S(\d+))[^\d]*?(?:(\d+)\.\s*bolum|bolum\s*(\d+)|[EB](\d+))/i);
        var season = 1, episode = eps.length + 1;
        if (epsMatch) {
          var sN = parseInt(epsMatch[1] || epsMatch[2] || epsMatch[3], 10);
          if (sN) season = sN;
          var eN = parseInt(epsMatch[4] || epsMatch[5] || epsMatch[6], 10);
          if (eN) episode = eN;
        }
        eps.push({ id: "trdiziizle:link:" + href, type: "series", season, episode, name: t, title: t });
        if (eps.length >= 80) break;
      }
      if (!eps.length) return { meta: null };
      return { meta: { id: raw, type: "series", name: "TrDizi\u0130zle", videos: eps } };
    } catch (e) {
      return { meta: null };
    }
  });
}
function getStreams(_0) {
  return __async(this, arguments, function* (args) {
    try {
      if (!(yield siteReachable())) return [];
      var tmdbId, mediaType = "tv", seasonNum, episodeNum;
      if (args && typeof args === "object" && !Array.isArray(args)) {
        tmdbId = args.id;
        mediaType = args.type || mediaType;
        seasonNum = args.season;
        episodeNum = args.episode;
      } else {
        tmdbId = arguments[0];
        mediaType = arguments[1] || mediaType;
        seasonNum = arguments[2];
        episodeNum = arguments[3];
      }
      var raw = String(tmdbId || "");
      var idNorm = normalizeSeriesId(raw);
      if (!seasonNum && idNorm.season > 0) seasonNum = idNorm.season;
      if (!episodeNum && idNorm.episode > 0) episodeNum = idNorm.episode;
      if (raw.indexOf("trdiziizle:") === 0) {
        var link = raw.indexOf("trdiziizle:link:") === 0 ? raw.slice("trdiziizle:link:".length) : decodeURIComponent(raw.slice("trdiziizle:".length));
        return yield episodeStreams(link);
      }
      var info;
      if (idNorm.kind === "title") {
        info = { title: idNorm.id, origTitle: idNorm.id, aliases: [], kind: "title", type: "tv" };
      } else {
        info = yield resolveSeriesInfo(raw, mediaType, TMDB_API_KEY);
        if (!info || !info.title && !info.origTitle) {
          if (idNorm.kind === "title") info = { title: idNorm.id, origTitle: idNorm.id, aliases: [], kind: "title", type: "tv" };
          else return [];
        }
      }
      var keywords = seriesSearchTitles(info);
      var matches = yield wpSearch(keywords[0]);
      var hit = bestWPMatch(matches, keywords);
      if (!hit) return [];
      var list = yield fetchText(hit.url);
      if (!list) return [];
      var seasonRe = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
      var m, seasonUrls = [];
      while ((m = seasonRe.exec(list)) !== null) {
        var lbl = decodeHtmlEntities(m[2].replace(/<[^>]+>/g, " ")).trim();
        if (/[1-9]\.\s*sezon|sezon\s*[1-9]/i.test(lbl) && /bolum|izle/i.test(m[1])) seasonUrls.push({ url: m[1], label: lbl, season: parseInt((lbl.match(/[1-9]+/) || [1])[0], 10) });
      }
      var targetUrl = "";
      if (seasonNum > 1) {
        for (var s = 0; s < seasonUrls.length; s++) if (seasonUrls[s].season === parseInt(seasonNum, 10)) {
          targetUrl = seasonUrls[s].url;
          break;
        }
      }
      if (!targetUrl) targetUrl = hit.url;
      var seasonHtml = yield fetchText(targetUrl);
      if (!seasonHtml) return [];
      var epRe = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
      var em, epUrls = [];
      while ((em = epRe.exec(seasonHtml)) !== null) {
        var lbl2 = decodeHtmlEntities(em[2].replace(/<[^>]+>/g, " ")).trim();
        var epN = parseInt((String(lbl2).match(/(?:bolum|episode|Bölüm|^)[\s:.-]*(\d+)/i) || [])[1], 10);
        if (isNaN(epN)) epN = parseInt((String(lbl2).match(/(\d+)\s*\.?\s*bolum/i) || [])[1], 10);
        if (!em[1] || !epN) continue;
        epUrls.push({ url: em[1], n: epN });
      }
      var targetEp = null;
      for (var e = 0; e < epUrls.length; e++) if (epUrls[e].n === parseInt(episodeNum, 10)) {
        targetEp = epUrls[e];
        break;
      }
      if (!targetEp) return [];
      return yield episodeStreams(targetEp.url);
    } catch (e2) {
      return [];
    }
  });
}
var _origGetStreams = getStreams;
getStreams = function() {
  return __async(this, arguments, function* () {
    var res = yield _origGetStreams.apply(this, arguments);
    return sortStreamsByQuality(res);
  });
};
if (typeof module !== "undefined") module.exports = wrapAll({ getStreams, getCatalog, getMeta }, cfgReady);
if (typeof globalThis !== "undefined") {
  globalThis.getStreams = getStreams;
  globalThis.getCatalog = getCatalog;
  globalThis.getMeta = getMeta;
}

if (typeof globalThis !== 'undefined' && typeof module !== 'undefined' && module.exports) {
    if (module.exports.getStreams) globalThis.getStreams = module.exports.getStreams;
    if (module.exports.getCatalog) globalThis.getCatalog = module.exports.getCatalog;
    if (module.exports.getMeta) globalThis.getMeta = module.exports.getMeta;
    if (module.exports.getSubtitles) globalThis.getSubtitles = module.exports.getSubtitles;
}

