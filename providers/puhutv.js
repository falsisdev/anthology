/**
 * Anthology Provider: puhutv
 * Built from src/puhutv/index.js
 * Build Date: 2026-09-20T18:46:54.080Z
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

// src/puhutv/index.js
var { sortStreamsByQuality } = require_quality();
var { loadConfig, val, wrapAll } = require_config();
var { timeoutSignal } = require_http();
var { normalizeSeriesId, resolveSeriesInfo, seriesSearchTitles } = require_turkish_series();
var _cfgReady = null;
function cfgReady() {
  if (!_cfgReady) {
    _cfgReady = loadConfig().then(function() {
      var v = val("urls.series.puhutv.base");
      if (v) BASE_URL = String(v).replace(/\/+$/, "");
      if (HEADERS) HEADERS.Referer = BASE_URL + "/";
    });
  }
  return _cfgReady;
}
var BASE_URL = "https://puhutv.com";
var DYG_API = "https://dygvideo.dygdigital.com/api/video_info";
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
function slugify(s) {
  return asciiFold(s).replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").trim();
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
    var r = yield fadeFetch(url, opts, ms);
    if (!r.ok) return "";
    return yield r.text();
  });
}
function fetchJson(url, opts, ms) {
  return __async(this, null, function* () {
    var t = yield fetchText(url, opts, ms);
    if (!t) return null;
    try {
      return JSON.parse(t);
    } catch (e) {
      return null;
    }
  });
}
function pagePropsFrom(html) {
  var m = String(html || "").match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/i);
  if (!m) return null;
  try {
    var nd = JSON.parse(m[1]);
    return nd && nd.props && nd.props.pageProps || null;
  } catch (e) {
    return null;
  }
}
function fetchCatalogPage(pageSlug) {
  return __async(this, null, function* () {
    var html = yield fetchText(BASE_URL + "/" + pageSlug);
    var pp = pagePropsFrom(html);
    if (!pp || !pp.data) return [];
    var root = pp.data.data || pp.data;
    var containers = root.container_items || [];
    var items = [];
    function push(it) {
      if (!it) return;
      var name = decodeHtmlEntities(it.display_name || it.name || "");
      if (!name) return;
      items.push({
        name,
        detaySlug: it.meta && it.meta.slug || "",
        watchSlug: it.to_watch_asset_slug || it.content_slug || "",
        poster: it.image_vertical_mobile || it.image || "",
        type: it.type === "title_movie" ? "movie" : "series",
        year: it.meta && it.meta.productionDate || ""
      });
    }
    for (var c = 0; c < containers.length; c++) {
      var group = containers[c].items || containers[c].titles || [];
      for (var i = 0; i < group.length; i++) push(group[i]);
    }
    var seen = {};
    var out = [];
    for (var j = 0; j < items.length; j++) {
      var key = items[j].detaySlug || slugify(items[j].name);
      if (seen[key]) continue;
      seen[key] = true;
      out.push(items[j]);
    }
    return out;
  });
}
function bestCatalogMatch(items, keywords) {
  if (!items.length) return null;
  var best = null;
  var bestScore = -1;
  for (var i = 0; i < items.length; i++) {
    var name = cleanTitle(items[i].name);
    for (var k = 0; k < keywords.length; k++) {
      var kw = cleanTitle(keywords[k]);
      if (!kw) continue;
      var score = 0;
      if (name === kw) score = 100;
      else if (name.indexOf(kw) !== -1 || kw.indexOf(name) !== -1) score = 60 + Math.min(name.length, kw.length) / Math.max(name.length, kw.length) * 30;
      else {
        var tA = name.split(" ");
        var tB = kw.split(" ");
        var hits = 0;
        for (var a = 0; a < tA.length; a++) for (var b = 0; b < tB.length; b++) if (tA[a].length > 1 && tA[a] === tB[b]) {
          hits++;
          break;
        }
        score = hits / Math.max(tA.length, tB.length);
      }
      if (score > bestScore) {
        bestScore = score;
        best = items[i];
      }
    }
  }
  if (bestScore >= 0.5) return best;
  return null;
}
function fetchDetail(detaySlug) {
  return __async(this, null, function* () {
    if (!detaySlug) return null;
    var candidates = [String(detaySlug)];
    if (candidates[0].indexOf("http") !== 0) {
      candidates.push(detaySlug + "-detay");
      candidates.push(detaySlug + "-1-sezon-bolumleri");
      candidates[0] = BASE_URL + "/" + detaySlug;
    }
    for (var ci = 0; ci < candidates.length; ci++) {
      let addSeason2 = function(sObj) {
        var eps = [];
        var arr = sObj.episodes || [];
        for (var i = 0; i < arr.length; i++) {
          var e = arr[i];
          eps.push({
            name: decodeHtmlEntities(e.display_name || e.name || ""),
            slug: e.slug || "",
            videoId: e.video_id || "",
            position: e.meta && e.meta.position || i + 1,
            image: e.image || ""
          });
        }
        detail.seasons.push({ name: sObj.name || "", episodes: eps });
      };
      var addSeason = addSeason2;
      var url = candidates[ci].indexOf("http") === 0 ? candidates[ci] : BASE_URL + "/" + candidates[ci];
      var html = yield fetchText(url);
      if (!html) continue;
      var pp = pagePropsFrom(html);
      if (!pp) continue;
      var d = pp.details && pp.details.data || pp.movieAssets && pp.movieAssets.data || null;
      if (!d) continue;
      var detail = {
        name: decodeHtmlEntities(d.display_name || d.name || ""),
        poster: d.image || d.image_vertical_mobile || "",
        seasons: [],
        videoId: d.video_id || ""
      };
      var ed = pp.episodeData && pp.episodeData.data;
      if (Array.isArray(ed) && ed.length) {
        for (var k = 0; k < ed.length; k++) addSeason2(ed[k]);
      } else if (ed && ed.episodes) {
        addSeason2(ed);
      }
      return detail;
    }
    return null;
  });
}
function findEpisode(detail, season, episode) {
  if (!detail || !detail.seasons || !detail.seasons.length) return null;
  var fallback = null;
  for (var s = 0; s < detail.seasons.length; s++) {
    var eps = detail.seasons[s].episodes;
    for (var e = 0; e < eps.length; e++) {
      if (eps[e].position === episode) {
        if (!fallback) fallback = eps[e];
        if (detail.seasons.length === 1 || s + 1 === season) return eps[e];
      }
    }
  }
  return fallback;
}
function dygVideo(videoId) {
  return __async(this, null, function* () {
    var url = DYG_API + "?akamai=true&PublisherId=29&ReferenceId=" + encodeURIComponent(videoId) + "&SecretKey=NtvApiSecret2014*";
    var data = yield fetchJson(url, {}, 2e4);
    if (!data || !data.data || !data.data.flavors) return null;
    var fl = data.data.flavors;
    var hls = fl.hls || "";
    var mp4s = [];
    for (var k in fl) {
      if (!Object.prototype.hasOwnProperty.call(fl, k)) continue;
      var v = fl[k];
      if (typeof v === "string" && /\.mp4(?:\?|$)/i.test(v)) mp4s.push(v);
    }
    var tracks = [];
    var tr = data.data.tracks;
    if (Array.isArray(tr)) {
      for (var i = 0; i < Math.min(tr.length, 20); i++) {
        var t = tr[i];
        var sUrl = t && (t.url || t.file || t.src || "");
        if (sUrl) {
          var lang = String(t.lang || t.language || "tr").toLowerCase().slice(0, 2);
          tracks.push({
            id: "puhutv-sub-" + (i + 1),
            url: sUrl,
            file: sUrl,
            link: sUrl,
            lang,
            language: lang === "en" ? "English" : lang === "tr" ? "T\xFCrk\xE7e" : lang.toUpperCase(),
            label: (t.label || lang).toString(),
            name: (t.label || lang).toString(),
            title: (t.label || lang).toString(),
            format: "vtt",
            type: "text/vtt",
            mimeType: "text/vtt"
          });
        }
      }
    }
    return { hls, mp4s, tracks };
  });
}
function buildStreams(label, videoId) {
  return __async(this, null, function* () {
    var streams = [];
    var r = yield dygVideo(videoId);
    if (!r) return streams;
    var base = "\u231C PuhuTV \u231F | " + label;
    var headers = { "Referer": BASE_URL + "/", "User-Agent": HEADERS["User-Agent"] };
    if (r.hls) {
      streams.push({ url: r.hls, name: "PuhuTV", title: base + " [HLS]", quality: "1080p", format: "hls", isHls: true, headers, subtitles: r.tracks });
    }
    for (var m = 0; m < r.mp4s.length; m++) {
      streams.push({ url: r.mp4s[m], name: "PuhuTV", title: base + " [MP4]", quality: "1080p", format: "mp4", isHls: false, headers, subtitles: r.tracks });
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
      var pages = ["yerli-diziler", "filmler"];
      var metas = [];
      var seen = {};
      var cq = cleanTitle(q);
      for (var p = 0; p < pages.length; p++) {
        var items = yield fetchCatalogPage(pages[p]);
        for (var i = 0; i < items.length; i++) {
          var it = items[i];
          var key = slugify(it.name);
          if (seen[key]) continue;
          if (cq && cleanTitle(it.name).indexOf(cq) === -1) continue;
          seen[key] = true;
          metas.push({
            id: (it.type === "movie" ? "puhutv:movie:" : "puhutv:show:") + key,
            type: it.type === "movie" ? "movie" : "series",
            name: it.name,
            poster: it.poster,
            year: it.year
          });
        }
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
      var type = "series";
      var detailSlug = "";
      if (raw.indexOf(":") !== -1) {
        var pr = raw.split(":");
        detailSlug = pr[pr.length - 1];
        if (pr.indexOf("movie") !== -1) type = "movie";
      }
      if (!detailSlug) return { meta: null };
      var detail = yield fetchDetail(detailSlug);
      if (!detail || !detail.name && !detail.seasons.length && !detail.videoId) return { meta: null };
      if (type === "movie") {
        if (!detail.videoId) return { meta: { id: raw, type: "movie", name: detail.name, poster: detail.poster, videos: [] } };
        return { meta: { id: raw, type: "movie", name: detail.name, poster: detail.poster, videos: [{ id: raw + ":video", type: "movie", name: detail.name, title: detail.name }] } };
      }
      var videos = [];
      for (var s = 0; s < detail.seasons.length; s++) {
        var seasonName = detail.seasons[s].name || "";
        var sNum = parseInt((String(seasonName).match(/(\d+)/) || [])[1], 10) || s + 1;
        for (var e = 0; e < detail.seasons[s].episodes.length; e++) {
          var ep = detail.seasons[s].episodes[e];
          videos.push({
            id: "puhutv:ep:" + detailSlug + ":" + sNum + ":" + ep.position,
            type: "series",
            season: sNum,
            episode: ep.position,
            name: ep.name,
            title: (seasonName ? seasonName + " " : "") + ep.name,
            releaseInfo: String(sNum) + "x" + (ep.position < 10 ? "0" + ep.position : ep.position),
            thumbnail: ep.image
          });
          if (videos.length >= 60) break;
        }
        if (videos.length >= 60) break;
      }
      return { meta: { id: "puhutv:show:" + detailSlug, type: "series", name: detail.name, poster: detail.poster, videos } };
    } catch (e2) {
      return { meta: null };
    }
  });
}
function getStreams(_0) {
  return __async(this, arguments, function* (args) {
    try {
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
      if (raw.indexOf("puhutv:") === 0) {
        var parts = raw.split(":");
        var detaySlug = parts[parts.length - 1];
        var sNum = parseInt(parts[parts.length - 2], 10) || 1;
        var eNum = parseInt(parts[parts.length - 1], 10) || 1;
        var detail = yield fetchDetail(detaySlug);
        if (detail && detail.videoId) return yield buildStreams(detail.name, detail.videoId);
        var ep = findEpisode(detail, sNum, eNum);
        if (!ep || !ep.videoId) return [];
        return yield buildStreams((detail.name || "") + " S" + sNum + "E" + String(eNum).padStart(2, "0"), ep.videoId);
      }
      var season = parseInt(seasonNum) || 1;
      var episode = parseInt(episodeNum) || 1;
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
      var isMovie = mediaType === "movie" || info.type === "movie";
      var pages = isMovie ? ["filmler"] : ["yerli-diziler"];
      var items = yield fetchCatalogPage(pages[0]);
      var hit = bestCatalogMatch(items, keywords);
      if (!hit) return [];
      var dSlug = hit.detaySlug || hit.watchSlug;
      var detail = yield fetchDetail(dSlug);
      if (detail && detail.videoId && isMovie) {
        return yield buildStreams(hit.name, detail.videoId);
      }
      if (!detail || !detail.seasons.length) return [];
      var mEpisode = findEpisode(detail, season, episode);
      if (mEpisode && mEpisode.videoId) {
        return yield buildStreams(hit.name + " S" + season + "E" + String(episode).padStart(2, "0"), mEpisode.videoId);
      }
      if (season > 1 && dSlug) {
        var baseSlug = slugify(hit.name);
        var detail2 = yield fetchDetail(baseSlug + "-" + season + "-sezon-bolumleri");
        var ep2 = findEpisode(detail2, season, episode);
        if (ep2 && ep2.videoId) return yield buildStreams(hit.name + " S" + season + "E" + String(episode).padStart(2, "0"), ep2.videoId);
      }
      return [];
    } catch (e) {
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

