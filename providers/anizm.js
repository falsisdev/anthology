/**
 * Anthology Provider: anizm
 * Built from src/anizm/index.js
 * Build: v1.8.40 (anthology build system)
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
    function cleanTitle(t) {
      return asciiFold2(String(t || "")).replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
    }
    function tokensMatch2(a, b) {
      var ta = cleanTitle(a).split(" ").filter(function(x) {
        return x.length > 1;
      });
      var tb = cleanTitle(b).split(" ").filter(function(x) {
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
          var target = cleanTitle(norm.id);
          for (var i = 0; i < results.length; i++) {
            var r = results[i];
            var score = tokensMatch2(r.name, norm.id);
            if (cleanTitle(r.name) === target) score = 1;
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

// src/anizm/index.js
var { sortStreamsByQuality } = require_quality();
var { loadConfig, val, wrapAll } = require_config();
var { timeoutSignal } = require_http();
var { unpackDeanEdwards } = require_unpacker();
var { normalizeSeriesId, resolveSeriesInfo, seriesSearchTitles, asciiFold } = require_turkish_series();
var _cfgReady = null;
function cfgReady() {
  if (!_cfgReady) {
    _cfgReady = loadConfig().then(function() {
      var v = val("urls.anime.anizm.base");
      if (v) BASE_URL = String(v).replace(/\/+$/, "");
      var p = val("urls.anime.anizm.player_api");
      if (p) PLAYER_API = String(p).replace(/\/+$/, "");
      if (HEADERS) HEADERS.Referer = BASE_URL + "/";
    });
  }
  return _cfgReady;
}
var BASE_URL = "https://anizm.net";
var PLAYER_API = "https://anizmplayer.com";
var SITE_NAME = "Anizm";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Referer": BASE_URL + "/",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8"
};
var AJAX_HEADERS = {
  "User-Agent": HEADERS["User-Agent"],
  "Referer": BASE_URL + "/",
  "X-Requested-With": "XMLHttpRequest",
  "Accept": "application/json, text/plain, */*"
};
function ultraClean(str) {
  if (!str) return "";
  return asciiFold(str).replace(/[^a-z0-9]+/g, "").trim();
}
function decodeHtmlEntities(str) {
  if (!str) return "";
  return str.toString().replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&#8211;/g, "-").replace(/&#8217;/g, "'").replace(/&#(\d+);/g, function(m, d) {
    return String.fromCharCode(parseInt(d, 10));
  }).trim();
}
function isCfBlocked(status, body) {
  if (status === 403 || status === 429) return true;
  if (!body) return false;
  var b = String(body).substring(0, 4096);
  return b.indexOf("Just a moment") !== -1 || b.indexOf("cf-chl") !== -1 || b.indexOf("cf-mitigated") !== -1;
}
function buildStream(name, title, url, quality, format, isHls, ref) {
  var sHeaders = { "User-Agent": HEADERS["User-Agent"], "Referer": ref };
  return {
    name,
    title,
    url,
    quality,
    format,
    isHls,
    headers: sHeaders,
    behaviorHints: {
      notWebReady: false,
      proxyHeaders: { request: sHeaders }
    }
  };
}
function anizmSearch(query) {
  return __async(this, null, function* () {
    var out = [];
    try {
      var v3Res = yield fetch(BASE_URL + "/arama-onerileri?q=" + encodeURIComponent(query), { headers: AJAX_HEADERS, signal: timeoutSignal(6e3) });
      if (v3Res.ok) {
        var v3Json = yield v3Res.json();
        var list = v3Json && v3Json.results || [];
        for (var r = 0; r < list.length; r++) {
          var it3 = list[r];
          var slug = String(it3.url || "").replace(/^https?:\/\/[^\/]+\//, "").replace(/\/+$/, "");
          if (!slug) continue;
          var title3 = decodeHtmlEntities(it3.title || "");
          var isRecap = /\brecap\b|\bözet\b/i.test(title3);
          out.push({
            slug,
            name: title3,
            original: title3,
            english: isRecap ? "" : query,
            year: it3.year || "",
            poster: it3.poster || "",
            lastEpisode: ""
          });
        }
        if (out.length > 0) return out;
      }
    } catch (e) {
    }
    try {
      var res = yield fetch(BASE_URL + "/searchAnime?query=" + encodeURIComponent(query) + "&page=1", { headers: AJAX_HEADERS, signal: timeoutSignal(6e3) });
      if (!res.ok) return [];
      var j;
      try {
        j = yield res.json();
      } catch (e) {
        return [];
      }
      var data = j && j.data || [];
      for (var i = 0; i < data.length; i++) {
        var it = data[i];
        out.push({
          slug: it.info_slug || "",
          name: decodeHtmlEntities(it.info_title || ""),
          original: decodeHtmlEntities(it.info_titleoriginal || ""),
          english: decodeHtmlEntities(it.info_titleenglish || ""),
          year: it.info_year || "",
          poster: it.info_poster || "",
          lastEpisode: it.lastEpisode && it.lastEpisode[0] && it.lastEpisode[0].episode_slug || ""
        });
      }
      return out;
    } catch (e) {
      return [];
    }
  });
}
function tokensMatch(a, b) {
  var ta = ultraClean(a).split(" ").filter(function(x) {
    return x.length > 1;
  });
  var tb = ultraClean(b).split(" ").filter(function(x) {
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
function scoreMatch(item, show) {
  var names = typeof item === "object" && item !== null ? [item.name, item.english, item.original].filter(Boolean) : [String(item || "")];
  var candidates = [show.title, show.origTitle].concat(show.aliases || []).filter(Boolean);
  var best = 0;
  for (var i = 0; i < names.length; i++) {
    var nClean = ultraClean(names[i]);
    for (var j = 0; j < candidates.length; j++) {
      var cClean = ultraClean(candidates[j]);
      if (nClean && cClean && nClean === cClean) return 1;
      var t = tokensMatch(names[i], candidates[j]);
      if (t > best) best = t;
    }
  }
  return best;
}
function hasSeasonMarker(title, season) {
  var c = ultraClean(title);
  var ordinals = { 2: "2nd|second|sezon2", 3: "3rd|third|sezon3", 4: "4th|fourth|sezon4", 5: "5th|fifth|sezon5" };
  var num = "season" + String(season).replace(/^0+/, "");
  var re = new RegExp("(" + (ordinals[season] || "season" + season) + ")", "i");
  return re.test(c) || c.indexOf(num) !== -1;
}
function resolveMatch(show, requestedSeason) {
  return __async(this, null, function* () {
    var titles = seriesSearchTitles(show);
    var best = null;
    var bestScore = 0;
    for (var i = 0; i < titles.length && bestScore < 1; i++) {
      var q = titles[i];
      var results = yield anizmSearch(q);
      for (var j = 0; j < results.length; j++) {
        var sc = scoreMatch(results[j], show);
        if (requestedSeason && requestedSeason > 1) {
          var nameForSeason = results[j].name || results[j].english || results[j].original || "";
          if (!hasSeasonMarker(nameForSeason, requestedSeason)) {
            sc = Math.min(sc, 0.4);
          }
        }
        if (sc > bestScore) {
          bestScore = sc;
          best = results[j];
        }
      }
      if (requestedSeason && requestedSeason > 1) {
        var sq = q + " season " + requestedSeason;
        var res2 = yield anizmSearch(sq);
        for (var k = 0; k < res2.length; k++) {
          var name2 = res2[k].name || res2[k].english || res2[k].original || "";
          if (!hasSeasonMarker(name2, requestedSeason)) continue;
          var sc2 = scoreMatch(res2[k], show) + 0.05;
          if (sc2 > bestScore) {
            bestScore = sc2;
            best = res2[k];
          }
        }
      }
    }
    if (best && bestScore >= 0.5) return best;
    return null;
  });
}
function fetchHtml(url, headers, ms) {
  return __async(this, null, function* () {
    try {
      var res = yield fetch(url, { headers: headers || HEADERS, signal: timeoutSignal(ms || 1e4) });
      var text = yield res.text();
      if (isCfBlocked(res.status, text)) return null;
      return { status: res.status, text };
    } catch (e) {
      return null;
    }
  });
}
function parseEpisodeList(html) {
  var out = [];
  var seen = {};
  var v3matches = Array.from(html.matchAll(/href=["'](https:\/\/anizm\.net\/[^"']*-(\d+)-bolum(?:-[^"']*)?)["']/gi));
  for (var i = 0; i < v3matches.length; i++) {
    var u = v3matches[i][1];
    var ep = parseInt(v3matches[i][2], 10);
    if (ep > 0 && !seen[ep]) {
      seen[ep] = true;
      out.push({ season: 1, episode: ep, url: u, title: ep + ". B\xF6l\xFCm" });
    }
  }
  if (out.length) {
    out.sort(function(a2, b2) {
      return a2.episode - b2.episode;
    });
    return out;
  }
  var blocks = html.match(/<div class="[^"]*bolumKutucugu[^"]*">[\s\S]*?<\/a>\s*<\/div>/g) || [];
  for (var j = 0; j < blocks.length; j++) {
    var b = blocks[j];
    var a = b.match(/href="(https:\/\/anizm\.net\/[^"]+)"/);
    var num = b.match(/class="episodeBlock[\s\S]*?">\s*([\d\.]+)(?:\s*Bölüm)?/i);
    if (!a) continue;
    var epNum = -1;
    if (num) epNum = parseInt(num[1], 10);
    if (epNum < 0) {
      var mm = a[1].match(/-(\d+)-bolum/);
      if (mm) epNum = parseInt(mm[1], 10);
    }
    if (epNum < 1 || seen[epNum]) continue;
    seen[epNum] = true;
    out.push({ season: 1, episode: epNum, url: a[1], title: epNum + ". B\xF6l\xFCm" });
  }
  out.sort(function(aa, bb) {
    return aa.episode - bb.episode;
  });
  return out;
}
function parseTranslators(html) {
  var out = [];
  var seen = {};
  var v3m = html.match(/data-sources=["'](https:\/\/anizm\.net\/bolum\/\d+\/cevirmen\/\d+)["']/g) || [];
  for (var i = 0; i < v3m.length; i++) {
    var uMatch = v3m[i].match(/https:\/\/anizm\.net\/bolum\/\d+\/cevirmen\/\d+/);
    if (uMatch) {
      var u = uMatch[0];
      if (!seen[u]) {
        seen[u] = true;
        out.push(u);
      }
    }
  }
  var m = html.match(/translator=["'](https:\/\/anizm\.net\/episode\/\d+\/translator\/\d+)["']/g) || [];
  for (var j = 0; j < m.length; j++) {
    var u2 = m[j].replace(/^translator=["']/, "").replace(/["']$/, "");
    if (!seen[u2]) {
      seen[u2] = true;
      out.push(u2);
    }
  }
  return out;
}
function fetchTranslatorVideos(translatorUrl) {
  return __async(this, null, function* () {
    try {
      var res = yield fetch(translatorUrl, { headers: AJAX_HEADERS, signal: timeoutSignal(8e3) });
      if (!res.ok) return [];
      var text = yield res.text();
      try {
        var j = JSON.parse(text);
        if (j && Array.isArray(j.videos)) {
          var v3out = [];
          for (var vi = 0; vi < j.videos.length; vi++) {
            var v = j.videos[vi];
            if (v && v.id) {
              var vUrl = translatorUrl.replace(/\/cevirmen\/\d+$/, "/video/" + v.id);
              v3out.push(vUrl);
            }
          }
          if (v3out.length) return v3out;
        }
      } catch (e) {
      }
      var out = [];
      var seen = {};
      var vm = text.match(/video=["'](https:\/\/anizm\.net\/video\/\d+)["']/g) || [];
      for (var i = 0; i < vm.length; i++) {
        var u = vm[i].replace(/^video=["']/, "").replace(/["']$/, "");
        if (!seen[u]) {
          seen[u] = true;
          out.push(u);
        }
      }
      return out;
    } catch (e) {
      return [];
    }
  });
}
function resolveAnizmPlayer(hash) {
  return __async(this, null, function* () {
    try {
      var res = yield fetch(PLAYER_API + "/player/index.php?data=" + hash + "&do=getVideo", {
        method: "POST",
        headers: Object.assign({}, AJAX_HEADERS, {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "Referer": PLAYER_API + "/",
          "Origin": PLAYER_API
        }),
        body: "hash=" + hash + "&r=" + encodeURIComponent(BASE_URL + "/"),
        signal: timeoutSignal(9e3)
      });
      if (!res.ok) return [];
      var data;
      try {
        data = yield res.json();
      } catch (e) {
        return [];
      }
      if (!data) return [];
      var streamUrl = data.videoSource || data.securedLink;
      if (!streamUrl) return [];
      var playUrl = streamUrl.includes(".txt") ? streamUrl + "#.m3u8" : streamUrl;
      var quality = "1080p";
      return [buildStream(SITE_NAME, "\u231C " + SITE_NAME + " \u231F | AnizmPlayer [" + quality + " HLS]", playUrl, quality, "hls", true, PLAYER_API + "/")];
    } catch (e) {
      return [];
    }
  });
}
function resolveOkRu(frameUrl) {
  return __async(this, null, function* () {
    try {
      var fullUrl = frameUrl.indexOf("//") === 0 ? "https:" + frameUrl : frameUrl;
      var res = yield fetch(fullUrl, { headers: { "User-Agent": HEADERS["User-Agent"] }, signal: timeoutSignal(8e3) });
      if (!res.ok) return [];
      var html = yield res.text();
      var m = html.match(/data-options=["']([^"']+)["']/i);
      if (!m) return [];
      var opts;
      try {
        opts = JSON.parse(decodeHtmlEntities(m[1]));
      } catch (e) {
        return [];
      }
      var fv = opts.flashvars || {};
      var metadata = fv.metadata;
      if (typeof metadata === "string") {
        try {
          metadata = JSON.parse(metadata);
        } catch (e) {
          metadata = {};
        }
      }
      if (!metadata || typeof metadata !== "object") metadata = {};
      var vids = metadata.videos || fv.videos || [];
      var streams = [];
      var nameMap = { "full": "1080p", "hd": "720p", "sd": "480p", "low": "360p", "lowest": "240p", "mobile": "240p" };
      for (var i = 0; i < vids.length; i++) {
        var v = vids[i];
        if (!v || !v.url) continue;
        var q = nameMap[v.name] || v.name || "720p";
        streams.push(buildStream(SITE_NAME, "\u231C " + SITE_NAME + " \u231F | Ok.ru [" + q.toUpperCase() + " MP4]", v.url, q, "mp4", false, "https://ok.ru/"));
      }
      var hlsUrl = metadata.hlsManifestUrl || fv.hlsManifestUrl;
      if (hlsUrl) {
        streams.push(buildStream(SITE_NAME, "\u231C " + SITE_NAME + " \u231F | Ok.ru [HLS]", hlsUrl, "720p", "hls", true, "https://ok.ru/"));
      }
      return streams;
    } catch (e) {
      return [];
    }
  });
}
function resolveSibnet(frameUrl) {
  return __async(this, null, function* () {
    try {
      var fullUrl = frameUrl.indexOf("//") === 0 ? "https:" + frameUrl : frameUrl;
      var res = yield fetch(fullUrl, { headers: { "User-Agent": HEADERS["User-Agent"], "Referer": BASE_URL + "/" }, signal: timeoutSignal(8e3) });
      if (!res.ok) return [];
      var html = yield res.text();
      var m = html.match(/player\.src\(\[\{src:\s*["']?([^"'\s>]+)/i);
      if (!m) return [];
      var videoPath = m[1];
      var videoUrl = videoPath.indexOf("http") === 0 ? videoPath : "https://video.sibnet.ru" + videoPath;
      return [buildStream(SITE_NAME, "\u231C " + SITE_NAME + " \u231F | Sibnet [Direct MP4]", videoUrl, "720p", "mp4", false, "https://video.sibnet.ru/")];
    } catch (e) {
      return [];
    }
  });
}
function resolvePlayerPage(vidUrl) {
  return __async(this, null, function* () {
    var vidId = (vidUrl.match(/\/video\/(\d+)/) || [])[1];
    if (!vidId) return [];
    var results = [];
    if (vidUrl.includes("/bolum/")) {
      try {
        var r = yield fetch(vidUrl, { headers: AJAX_HEADERS, signal: timeoutSignal(8e3) });
        if (r.ok) {
          var j = yield r.json();
          if (j && j.url) {
            var playerP = yield fetchHtml(j.url, HEADERS, 9e3);
            if (playerP) {
              var m = yield analyzePlayerHtml(playerP.text);
              for (var mi = 0; mi < m.length; mi++) {
                var sList = yield m[mi]();
                for (var si = 0; si < sList.length; si++) results.push(sList[si]);
              }
            }
          }
        }
      } catch (e) {
      }
      if (results.length) return results;
    }
    var playerPage = yield fetchHtml(BASE_URL + "/player/" + vidId, HEADERS, 9e3);
    if (playerPage) {
      var methods = yield analyzePlayerHtml(playerPage.text);
      for (var i = 0; i < methods.length; i++) {
        var m2 = yield methods[i]();
        for (var k = 0; k < m2.length; k++) results.push(m2[k]);
      }
      if (results.length) return results;
    }
    try {
      var res = yield fetch(vidUrl, { headers: AJAX_HEADERS, signal: timeoutSignal(8e3) });
      var text = yield res.text();
      if (!isCfBlocked(res.status, text)) {
        var pm = text.match(/player\/(\d+)/);
        if (pm && pm[1] !== vidId) {
          var player2 = yield fetchHtml(BASE_URL + "/player/" + pm[1], HEADERS, 9e3);
          if (player2) {
            var methods2 = yield analyzePlayerHtml(player2.text);
            for (var j2 = 0; j2 < methods2.length; j2++) {
              var m3 = yield methods2[j2]();
              for (var k2 = 0; k2 < m3.length; k2++) results.push(m3[k2]);
            }
          }
        }
      }
    } catch (e) {
    }
    return results;
  });
}
function analyzePlayerHtml(html) {
  return __async(this, null, function* () {
    var res = [];
    var evals = Array.from(html.matchAll(/eval\(function\(p,a,c,k,e,d\)[\s\S]*?<\/script>/gi));
    for (var ei = 0; ei < evals.length; ei++) {
      var snippet = evals[ei][0].replace(/<\/script>$/i, "").trim();
      var unpacked = unpackDeanEdwards(snippet);
      if (unpacked) {
        var fp = unpacked.match(/FirePlayer\(["']([^"']+)["']/);
        if (fp) {
          (function(hash) {
            res.push(function() {
              return resolveAnizmPlayer(hash);
            });
          })(fp[1]);
          break;
        }
      }
    }
    var embeds = [];
    var em = html.match(/(?:src|data-src|href)="([^"]*ok\.ru\/videoembed\/[^"]+)"/g) || [];
    for (var i = 0; i < em.length; i++) {
      var u = em[i].match(/"([^"]+)/)[1];
      embeds.push(u);
    }
    for (var k = 0; k < embeds.length; k++) {
      (function(emUrl) {
        res.push(function() {
          return resolveOkRu(emUrl);
        });
      })(embeds[k]);
    }
    var sib = html.match(/(?:src|data-src|href)="([^"]*video\.sibnet\.ru\/shell\.php\?videoid=[^"]+)"/g) || [];
    for (var s = 0; s < sib.length; s++) {
      (function(sibUrl) {
        res.push(function() {
          return resolveSibnet(sibUrl);
        });
      })(sib[s].match(/"([^"]+)/)[1]);
    }
    return res;
  });
}
function buildEpisodeUrl(slug, season, episode) {
  return __async(this, null, function* () {
    var urls = [
      BASE_URL + "/" + slug + "-" + episode + "-bolum-izle",
      BASE_URL + "/" + slug + "-" + episode + "-bolum-final-izle",
      BASE_URL + "/" + slug + "-" + episode + "-bolum-final",
      BASE_URL + "/" + slug + "-" + episode + "-bolum"
    ];
    for (var i = 0; i < urls.length; i++) {
      var r = yield fetchHtml(urls[i], HEADERS, 9e3);
      if (r) return urls[i];
    }
    return null;
  });
}
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    var out = [];
    try {
      var id = tmdbId;
      var finalSeason = season || 0;
      var finalEpisode = episode || 0;
      if (typeof tmdbId === "object" && tmdbId !== null) {
        id = tmdbId.id || "";
        mediaType = mediaType || tmdbId.type || "series";
        finalSeason = tmdbId.season || 0;
        finalEpisode = tmdbId.episode || 0;
      } else if (typeof tmdbId === "string" && tmdbId.indexOf(":") !== -1) {
        if (tmdbId.indexOf("anizm:show:") === 0) {
          id = tmdbId.replace("anizm:show:", "");
        } else if (tmdbId.indexOf("anizm:ep:") === 0) {
          var epParts = tmdbId.replace("anizm:ep:", "").split(":");
          id = epParts[0];
          if (epParts[1]) finalSeason = parseInt(epParts[1], 10) || 0;
          if (epParts[2]) finalEpisode = parseInt(epParts[2], 10) || 0;
        } else {
          var parts = tmdbId.split(":");
          var s = parseInt(parts[parts.length - 2], 10);
          var e = parseInt(parts[parts.length - 1], 10);
          if (!isNaN(s) && !isNaN(e)) {
            finalSeason = s;
            finalEpisode = e;
          }
          id = parts[0];
        }
      }
      if (!finalEpisode && finalSeason < 1) finalEpisode = 1;
      var slug = "";
      var show = null;
      if (typeof id === "string" && String(tmdbId).indexOf("anizm:") === 0 && id.indexOf("/") === -1) {
        slug = id;
      }
      if (!slug) {
        show = yield resolveSeriesInfo(id, mediaType || "series");
        if (!show || !show.title) return out;
        var match = yield resolveMatch(show, finalSeason);
        if (match) slug = match.slug;
      }
      if (slug) {
        var epUrl = yield buildEpisodeUrl(slug, finalSeason, finalEpisode);
        if (epUrl) {
          var page = yield fetchHtml(epUrl, HEADERS, 1e4);
          if (page) {
            var translators = parseTranslators(page.text);
            var visited = {};
            var consecutiveFails = 0;
            for (var i = 0; i < translators.length && out.length < 6 && consecutiveFails < 2; i++) {
              var videos = yield fetchTranslatorVideos(translators[i]);
              for (var j = 0; j < videos.length && out.length < 6 && consecutiveFails < 2; j++) {
                if (visited[videos[j]]) continue;
                visited[videos[j]] = true;
                var s = yield resolvePlayerPage(videos[j]);
                if (s && s.length > 0) {
                  consecutiveFails = 0;
                  for (var k = 0; k < s.length; k++) out.push(s[k]);
                } else {
                  consecutiveFails++;
                }
              }
            }
          }
        }
      }
      if (out.length === 0 && show) {
        var titles = seriesSearchTitles(show);
        var dwSlug = "";
        for (var t = 0; t < titles.length && !dwSlug; t++) {
          var q = titles[t];
          if (!q || q.length < 2) continue;
          try {
            var sr = yield fetch("https://diziwatch.org/api/ara?q=" + encodeURIComponent(q), {
              headers: { "User-Agent": HEADERS["User-Agent"], "Accept": "application/json", "Referer": "https://diziwatch.org/" },
              signal: timeoutSignal(4e3)
            });
            if (sr.ok) {
              var arr = yield sr.json();
              if (Array.isArray(arr) && arr.length > 0 && arr[0].slug) dwSlug = arr[0].slug;
            }
          } catch (e2) {
          }
        }
        if (dwSlug) {
          var sN = finalSeason > 0 ? finalSeason : 1;
          var eN = finalEpisode > 0 ? finalEpisode : 1;
          try {
            var epRes = yield fetch("https://diziwatch.org/dizi/" + dwSlug + "/sezon-" + sN + "/bolum-" + eN, {
              headers: { "User-Agent": HEADERS["User-Agent"], "Referer": "https://diziwatch.org/" },
              signal: timeoutSignal(6e3)
            });
            if (epRes.ok) {
              var dwHtml = yield epRes.text();
              var reH = /anizmplayer\.com\/video\/([a-f0-9]{24,40})/gi;
              var mh;
              var hashes = [];
              while ((mh = reH.exec(dwHtml)) !== null) {
                if (hashes.indexOf(mh[1]) === -1) hashes.push(mh[1]);
                if (hashes.length >= 3) break;
              }
              for (var hi = 0; hi < hashes.length; hi++) {
                var sAp = yield resolveAnizmPlayer(hashes[hi]);
                for (var si = 0; si < sAp.length; si++) out.push(sAp[si]);
              }
            }
          } catch (e2) {
          }
        }
      }
      return out;
    } catch (e2) {
      return out;
    }
  });
}
function getMeta(id) {
  return __async(this, null, function* () {
    try {
      var slug = "";
      if (typeof id === "string" && id.indexOf("anizm:show:") === 0) {
        slug = id.replace("anizm:show:", "");
      }
      if (!slug) {
        var show = yield resolveSeriesInfo(id, "series");
        if (!show || !show.title) return null;
        var match = yield resolveMatch(show, 0);
        if (!match) return null;
        slug = match.slug;
      }
      var page = yield fetchHtml(BASE_URL + "/anime/" + slug, HEADERS, 1e4);
      if (!page) return null;
      var episodes = parseEpisodeList(page.text);
      var videos = [];
      for (var i = 0; i < episodes.length; i++) {
        videos.push({
          id: "anizm:ep:" + slug + ":1:" + episodes[i].episode,
          name: episodes[i].title,
          season: 1,
          number: episodes[i].episode,
          title: episodes[i].title
        });
      }
      var poster = "";
      var pm = page.text.match(/infoPosterImgItem[^"]*"[^>]*src="([^"]+)"/i);
      if (!pm) pm = page.text.match(/src="([^"]*storage\/pcovers\/[^"]+)"/i);
      if (pm) poster = pm[1].indexOf("http") === 0 ? pm[1] : BASE_URL + pm[1];
      var name = slug;
      var nm = page.text.match(/animeTitle[^>]*>([^<]+)</i);
      if (!nm) nm = page.text.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
      if (!nm) nm = page.text.match(/og:title" content="([^"]+)/i);
      if (nm) {
        name = decodeHtmlEntities(nm[1]).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
        name = name.split("|")[0].replace(/\s*izle\s*$/i, "").trim() || name;
      }
      return {
        meta: {
          id: "anizm:show:" + slug,
          type: "series",
          name,
          poster,
          videos
        }
      };
    } catch (e) {
      return null;
    }
  });
}
function getCatalog(args) {
  return __async(this, null, function* () {
    var metas = [];
    try {
      if (args && args.search) {
        var results = yield anizmSearch(args.search);
        for (var i = 0; i < results.length; i++) {
          if (!results[i].slug) continue;
          metas.push({
            id: "anizm:show:" + results[i].slug,
            type: "series",
            name: results[i].name || results[i].english || results[i].slug,
            poster: results[i].poster ? results[i].poster.indexOf("http") === 0 ? results[i].poster : "https://cdn.anizm.net/storage/pcovers/" + results[i].poster : ""
          });
        }
        return { metas };
      }
      var page = yield fetchHtml(BASE_URL + "/", HEADERS, 1e4);
      if (page) {
        var seen = {};
        var seriesCards = Array.from(page.text.matchAll(/<article[^>]*class="[^"]*v3-series-card[^"]*"[^>]*>[\s\S]*?<a[^>]+href="https:\/\/anizm\.net\/([^"\/]+)"[\s\S]*?alt="([^"]*?)(?:\s+posteri)?"[\s\S]*?<\/article>/gi));
        for (var sc = 0; sc < seriesCards.length && metas.length < 30; sc++) {
          var m = seriesCards[sc];
          var slug = m[1];
          if (!slug || seen[slug] || slug === "manifest.json") continue;
          seen[slug] = true;
          var name = (m[2] || "").trim() || slug;
          metas.push({
            id: "anizm:show:" + slug,
            type: "series",
            name: decodeHtmlEntities(name),
            poster: ""
          });
        }
        if (metas.length < 15) {
          var epCards = Array.from(page.text.matchAll(/<article[^>]*class="[^"]*v3-episode-card[^"]*"[^>]*>[\s\S]*?<a[^>]+href="https:\/\/anizm\.net\/([^"\/]+)"[\s\S]*?alt="([^"]*?)(?:\s+posteri)?"[\s\S]*?<\/article>/gi));
          for (var ec = 0; ec < epCards.length && metas.length < 30; ec++) {
            var em = epCards[ec];
            var rawSlug = em[1] || "";
            var cleanSlug = rawSlug.replace(/-\d+-bolum(?:-(?:final|izle|fragman))*$/i, "");
            if (!cleanSlug || seen[cleanSlug] || cleanSlug === "manifest.json") continue;
            seen[cleanSlug] = true;
            var epName = (em[2] || "").trim() || cleanSlug;
            metas.push({
              id: "anizm:show:" + cleanSlug,
              type: "series",
              name: decodeHtmlEntities(epName),
              poster: ""
            });
          }
        }
      }
      return { metas };
    } catch (e) {
      return { metas };
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

