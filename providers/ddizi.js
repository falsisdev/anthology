/**
 * Anthology Provider: ddizi
 * Built from src/ddizi/index.js
 * Build Date: 2026-09-20T20:49:56.216Z
 */
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
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
    function asciiFold(s) {
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
      return asciiFold(String(t || "")).replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
    }
    function tokensMatch(a, b) {
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
            var score = tokensMatch(r.name, norm.id);
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
        seen[asciiFold(name)] = true;
        seen[asciiFold(original)] = true;
        var aliases = [];
        for (var k = 0; k < out.aliases.length; k++) {
          var fa = asciiFold(out.aliases[k]);
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
          if (asciiFold(titles[k]) === asciiFold(t)) return;
          if (asciiFold(titles[k]) === asciiFold(t).replace(/[^a-z0-9]+/g, " ").trim() && asciiFold(t).replace(/[^a-z0-9]+/g, " ").trim() === asciiFold(titles[k]).replace(/[^a-z0-9]+/g, " ").trim()) return;
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
      asciiFold
    };
  }
});

// src/ddizi/index.js
var { sortStreamsByQuality } = require_quality();
var { loadConfig, val, wrapAll } = require_config();
var { timeoutSignal } = require_http();
var { normalizeSeriesId, seriesSearchTitles, resolveSeriesInfo } = require_turkish_series();
var _cfgReady = null;
function cfgReady() {
  if (!_cfgReady) {
    _cfgReady = loadConfig().then(function() {
      var v;
      v = val("urls.series.ddizi.base");
      if (v) BASE_URL = String(v).replace(/\/+$/, "");
      if (HEADERS) HEADERS.Referer = BASE_URL + "/";
    });
  }
  return _cfgReady;
}
var BASE_URL = "https://www.ddizi.im";
var TMDB_API_KEY = "500330721680edb6d5f7f12ba7cd9023";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Referer": BASE_URL + "/"
};
function resolveYouTubeMp4(ytId) {
  return __async(this, null, function* () {
    try {
      const key = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";
      const res = yield fetch(`https://www.youtube.com/youtubei/v1/player?key=${key}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "com.google.android.youtube/20.10.38 (Linux; U; Android 11) gzip"
        },
        body: JSON.stringify({
          context: {
            client: {
              clientName: "ANDROID",
              clientVersion: "20.10.38"
            }
          },
          videoId: ytId
        }),
        signal: timeoutSignal(3500)
      });
      if (res.ok) {
        const data = yield res.json();
        if (data.streamingData) {
          if (data.streamingData.hlsManifestUrl) {
            return {
              url: data.streamingData.hlsManifestUrl,
              quality: "1080p",
              isHls: true,
              format: "hls",
              headers: {
                "User-Agent": "com.google.android.youtube/20.10.38 (Linux; U; Android 11) gzip"
              }
            };
          }
          if (data.streamingData.formats) {
            const formats = data.streamingData.formats.filter((f) => f.url && (f.mimeType || "").includes("mp4"));
            if (formats.length > 0) {
              return {
                url: formats[0].url,
                quality: formats[0].qualityLabel || "360p",
                isHls: false,
                format: "mp4",
                headers: {
                  "User-Agent": "com.google.android.youtube/20.10.38 (Linux; U; Android 11) gzip"
                }
              };
            }
          }
        }
      }
    } catch (e) {
    }
    return null;
  });
}
function getValidTmdbKey() {
  if (typeof TMDB_API_KEY === "string" && TMDB_API_KEY.length === 32 && !TMDB_API_KEY.startsWith("http")) {
    return TMDB_API_KEY;
  }
  return "500330721680edb6d5f7f12ba7cd9023";
}
function resolveOfficialYouTubeFallback(title, season, episode, cumEpisode) {
  return __async(this, null, function* () {
    try {
      const queries = [];
      if (season > 1) {
        queries.push(`${title} ${season}. Sezon ${episode}. B\xF6l\xFCm`);
        if (cumEpisode && cumEpisode !== episode) {
          queries.push(`${title} ${cumEpisode}. B\xF6l\xFCm`);
        }
      }
      queries.push(`${title} ${episode}. B\xF6l\xFCm`);
      const key = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";
      for (const query of queries) {
        try {
          const res = yield fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, {
            headers: {
              "User-Agent": HEADERS["User-Agent"]
            },
            signal: timeoutSignal(3500)
          });
          if (!res.ok) continue;
          const html = yield res.text();
          const vidMatches = [...html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)].map((m) => m[1]);
          const uniqueVids = [...new Set(vidMatches)].slice(0, 3);
          for (const ytId of uniqueVids) {
            try {
              const pRes = yield fetch(`https://www.youtube.com/youtubei/v1/player?key=${key}`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "User-Agent": "com.google.android.youtube/20.10.38 (Linux; U; Android 11) gzip"
                },
                body: JSON.stringify({
                  context: { client: { clientName: "ANDROID", clientVersion: "20.10.38" } },
                  videoId: ytId
                }),
                signal: timeoutSignal(3e3)
              });
              if (!pRes.ok) continue;
              const data = yield pRes.json();
              const duration = parseInt(data.videoDetails && data.videoDetails.lengthSeconds || "0");
              const vTitle = data.videoDetails && data.videoDetails.title || "";
              if (duration >= 900) {
                const streams = [];
                if (data.streamingData && data.streamingData.hlsManifestUrl) {
                  streams.push({
                    name: "DDizi",
                    title: `\u231C DDizi \u231F | Resmi YouTube HLS (${vTitle.slice(0, 50)})`,
                    url: data.streamingData.hlsManifestUrl,
                    quality: "1080p",
                    provider: "ddizi",
                    format: "hls",
                    isHls: true,
                    headers: {
                      "User-Agent": "com.google.android.youtube/20.10.38 (Linux; U; Android 11) gzip"
                    }
                  });
                }
                if (data.streamingData && data.streamingData.formats) {
                  const formats = data.streamingData.formats.filter((f) => f.url && (f.mimeType || "").includes("mp4"));
                  if (formats.length > 0) {
                    streams.push({
                      name: "DDizi",
                      title: `\u231C DDizi \u231F | Resmi YouTube MP4 (${formats[0].qualityLabel || "720p"})`,
                      url: formats[0].url,
                      quality: formats[0].qualityLabel || "720p",
                      provider: "ddizi",
                      format: "mp4",
                      isHls: false,
                      headers: {
                        "User-Agent": "com.google.android.youtube/20.10.38 (Linux; U; Android 11) gzip"
                      }
                    });
                  }
                }
                streams.push({
                  name: "DDizi",
                  title: `\u231C DDizi \u231F | YouTube (${vTitle.slice(0, 50)})`,
                  ytId,
                  provider: "ddizi"
                });
                if (streams.length > 0) return streams;
              }
            } catch (e) {
            }
          }
        } catch (e) {
        }
      }
    } catch (e) {
    }
    return null;
  });
}
function ultraClean(str) {
  if (!str) return "";
  return str.toString().toLowerCase().replace(/[ıİ]/g, "i").replace(/[üÜ]/g, "u").replace(/[öÖ]/g, "o").replace(/[şŞ]/g, "s").replace(/[ğĞ]/g, "g").replace(/[çÇ]/g, "c").replace(/[^a-z0-9]/g, "").trim();
}
function resolveTmdbInfo(id, mediaType) {
  return __async(this, null, function* () {
    try {
      const info = yield resolveSeriesInfo(id, mediaType, getValidTmdbKey());
      return {
        title: info.title,
        origTitle: info.origTitle,
        numericId: info.numericId || null,
        seasons: info.seasons,
        aliases: info.aliases,
        kind: info.kind,
        type: info.type
      };
    } catch (e) {
      return { title: "", origTitle: "", numericId: null, seasons: [], aliases: [], kind: "unknown", type: "tv" };
    }
  });
}
function getCatalog(args) {
  return __async(this, null, function* () {
    try {
      const query = args && args.search || args && args.extra && args.extra.search || args && args.query || "";
      let url = `${BASE_URL}/`;
      let options = { headers: HEADERS };
      if (query) {
        const form = new URLSearchParams();
        form.append("arama", query);
        url = `${BASE_URL}/arama/`;
        options = {
          method: "POST",
          headers: Object.assign({}, HEADERS, { "Content-Type": "application/x-www-form-urlencoded" }),
          body: form.toString()
        };
      }
      const res = yield fetch(url, options);
      if (!res.ok) return { metas: [] };
      const html = yield res.text();
      let metas = [];
      const seen = /* @__PURE__ */ new Set();
      const seriesMatches = [...html.matchAll(/<a href="([^"]*\/diziler\/([^"]*))"[^>]*>([\s\S]*?)<\/a>/gi)];
      for (const m of seriesMatches) {
        const slug = m[2].replace(/\/$/, "");
        const title = m[3].replace(/<[^>]+>/g, "").trim();
        if (!slug || seen.has(slug) || title.length < 2) continue;
        seen.add(slug);
        metas.push({
          id: `ddizi:show:${slug}`,
          type: "tv",
          name: title,
          poster: "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png",
          background: "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png",
          genres: ["Yerli Dizi", "DDizi"],
          description: `${title} - DDizi Yerli Dizi Ar\u015Fivi`
        });
      }
      if (query) {
        const cleanQuery = ultraClean(query);
        const filtered = metas.filter((m) => ultraClean(m.name).includes(cleanQuery) || ultraClean(m.id).includes(cleanQuery));
        if (filtered.length > 0) {
          metas = filtered;
        }
      }
      const topShows = metas.slice(0, 15);
      yield Promise.all(topShows.map((s) => __async(null, null, function* () {
        try {
          const sSlug = s.id.replace("ddizi:show:", "");
          const sRes = yield fetch(`${BASE_URL}/diziler/${sSlug}`, { headers: HEADERS });
          if (sRes.ok) {
            const sHtml = yield sRes.text();
            const pMatch = sHtml.match(/class="[^"]*(?:dizi-resmi|img-back-cat)[^"]*"[\s\S]*?(?:data-src|src)="([^"]*)"/i);
            if (pMatch) {
              const pUrl = pMatch[1].startsWith("http") ? pMatch[1] : `${BASE_URL}${pMatch[1]}`;
              s.poster = pUrl;
              s.background = pUrl;
            }
          }
        } catch (e) {
        }
      })));
      return { metas };
    } catch (e) {
      return { metas: [] };
    }
  });
}
function getMeta(args) {
  return __async(this, null, function* () {
    try {
      const rawId = typeof args === "string" ? args : args && args.id ? args.id : "";
      if (!rawId) return { meta: null };
      if (rawId.startsWith("ddizi:ep:")) {
        const epSlug = rawId.replace("ddizi:ep:", "");
        const epUrl = `${BASE_URL}/izle/${epSlug}`;
        const res = yield fetch(epUrl, { headers: HEADERS });
        if (!res.ok) return { meta: null };
        const html = yield res.text();
        const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<title>([^<]+)<\/title>/i);
        const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").replace(/\s*izle\s*$/i, "").trim() : "DDizi B\xF6l\xFCm";
        const posterMatch = html.match(/class="[^"]*(?:dizi-resmi|img-back-cat)[^"]*"[\s\S]*?(?:data-src|src)="([^"]*)"/i);
        const poster = posterMatch ? posterMatch[1].startsWith("http") ? posterMatch[1] : `${BASE_URL}${posterMatch[1]}` : "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png";
        const epNumMatch = title.match(/(\d+)\s*\.?\s*bölüm/i);
        const epNum = epNumMatch ? parseInt(epNumMatch[1]) : 1;
        return {
          meta: {
            id: rawId,
            type: "tv",
            name: title,
            poster,
            background: poster,
            description: `${title} - DDizi`,
            genres: ["Yerli Dizi", "DDizi"],
            videos: [{
              id: rawId,
              title,
              season: 1,
              episode: epNum
            }]
          }
        };
      }
      if (rawId.startsWith("ddizi:show:")) {
        const showSlug = rawId.replace("ddizi:show:", "");
        const showUrl = `${BASE_URL}/diziler/${showSlug}`;
        const res = yield fetch(showUrl, { headers: HEADERS });
        if (!res.ok) return { meta: null };
        const html = yield res.text();
        const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<title>([^<]+)<\/title>/i);
        const rawTitle = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").replace(/\s*son\s*bölüm\s*izle.*$/i, "").replace(/\s*\|.*$/i, "").trim() : "DDizi";
        const title = rawTitle.replace(/\s*Full\s*.*$/i, "").trim() || rawTitle;
        const posterMatch = html.match(/class="[^"]*(?:dizi-resmi|img-back-cat)[^"]*"[\s\S]*?(?:data-src|src)="([^"]*)"/i);
        const poster = posterMatch ? posterMatch[1].startsWith("http") ? posterMatch[1] : `${BASE_URL}${posterMatch[1]}` : "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png";
        const pageLinks = [...html.matchAll(/href="([^"]*sayfa-\d+)"/g)];
        const pagesToFetch = [];
        for (const p of pageLinks) {
          const pUrl = p[1].startsWith("http") ? p[1] : `${BASE_URL}${p[1].startsWith("/") ? "" : "/"}${p[1]}`;
          if (!pagesToFetch.includes(pUrl) && pUrl !== showUrl) {
            pagesToFetch.push(pUrl);
          }
        }
        let allHtmls = [html];
        for (const pUrl of pagesToFetch) {
          try {
            const pRes = yield fetch(pUrl, { headers: HEADERS });
            if (pRes.ok) allHtmls.push(yield pRes.text());
          } catch (e) {
          }
        }
        const epMatches = [];
        for (const phtml of allHtmls) {
          epMatches.push(...phtml.matchAll(/<a href="([^"]*\/izle\/([^"]*))"[^>]*>([\s\S]*?)<\/a>/gi));
        }
        const videos = [];
        const seen = /* @__PURE__ */ new Set();
        const slugPart = (showSlug.split("/")[1] || showSlug).replace(/-\d+-son-bolum.*$/i, "").replace(/-izle.*$/i, "");
        const baseSlugKey = ultraClean(slugPart);
        const titleKey = ultraClean(title);
        for (const ep of epMatches) {
          const epSlug = ep[2];
          if (!epSlug || seen.has(epSlug)) continue;
          const epTitle = ep[3].replace(/<[^>]+>/g, "").trim();
          const epClean = ultraClean(epSlug + " " + epTitle);
          if (baseSlugKey && !epClean.includes(baseSlugKey) && titleKey && !epClean.includes(titleKey)) {
            continue;
          }
          seen.add(epSlug);
          const epNumMatch = epTitle.match(/(\d+)\s*\.?\s*bölüm/i) || epSlug.match(/-(\d+)-bolum/i);
          const epNum = epNumMatch ? parseInt(epNumMatch[1]) : 1;
          videos.push({
            id: `ddizi:ep:${epSlug.replace(/\/$/, "")}`,
            title: epTitle || `${epNum}. B\xF6l\xFCm`,
            season: 1,
            episode: epNum
          });
        }
        videos.sort((a, b) => a.season - b.season || a.episode - b.episode);
        return {
          meta: {
            id: rawId,
            type: "tv",
            name: title,
            poster,
            background: poster,
            description: `${title} - DDizi Dizi Ar\u015Fivi`,
            genres: ["Yerli Dizi", "DDizi"],
            videos
          }
        };
      }
      return { meta: null };
    } catch (e) {
      return { meta: null };
    }
  });
}
function extractStreamsFromEpisodePage(epUrl) {
  return __async(this, null, function* () {
    try {
      const epRes = yield fetch(epUrl, { headers: HEADERS });
      if (!epRes.ok) return [];
      const epHtml = yield epRes.text();
      const iframes = [...epHtml.matchAll(/<iframe[^>]+src=["']([^"']+)["']/gi)];
      const streams = [];
      for (const ifr of iframes) {
        let src = ifr[1];
        if (src.startsWith("//")) src = "https:" + src;
        else if (src.startsWith("/")) src = BASE_URL + src;
        if (src.includes("/player/oynat/")) {
          const pRes = yield fetch(src, { headers: __spreadProps(__spreadValues({}, HEADERS), { Referer: epUrl }) });
          if (!pRes.ok) continue;
          const pHtml = yield pRes.text();
          const videoMatches = [
            ...[...pHtml.matchAll(/https?:\/\/[^\s"'<>\\]+\.(?:mp4|m3u8)[^\s"'<>\\]*/gi)].map((m) => m[0]),
            ...[...pHtml.matchAll(/file\s*:\s*["'](https?:\\\/\\\/[^"']+|https?:[^"']+)["']/gi)].map((m) => m[1].replace(/\\\//g, "/"))
          ];
          const seenStreamUrls = /* @__PURE__ */ new Set();
          for (const rawVUrl of videoMatches) {
            const vUrl = rawVUrl.trim();
            if (!vUrl || seenStreamUrls.has(vUrl)) continue;
            seenStreamUrls.add(vUrl);
            if (vUrl.includes("preview/") || vUrl.includes("image/") || vUrl.includes(".svg") || vUrl.includes(".jpg") || vUrl.includes(".png")) continue;
            let quality = "1080p";
            if (vUrl.includes("720") || vUrl.includes("itag=22")) quality = "720p";
            else if (vUrl.includes("480")) quality = "480p";
            else if (vUrl.includes("360") || vUrl.includes("itag=18")) quality = "360p";
            let server = "CDN";
            let streamHeaders = { "User-Agent": HEADERS["User-Agent"] };
            if (vUrl.includes("googlevideo")) {
              const durMatch = vUrl.match(/[?&]dur=([0-9.]+)/);
              if (durMatch && parseFloat(durMatch[1]) < 300) continue;
              server = "Google Direct";
            } else if (vUrl.includes("ciner.com.tr")) {
              server = "Ciner CDN";
              streamHeaders["Referer"] = "https://www.ciner.com.tr/";
            } else if (vUrl.includes("yandex")) {
              server = "Yandex";
              streamHeaders["Referer"] = "https://yadi.sk/";
            } else if (vUrl.includes("twimg")) {
              server = "Fast CDN";
              streamHeaders["Referer"] = "https://twitter.com/";
              streamHeaders["Origin"] = "https://twitter.com";
            } else if (vUrl.includes("tabii.com")) {
              server = "Tabii CDN";
              streamHeaders["Referer"] = "https://www.tabii.com/";
            } else if (vUrl.includes("akamaized")) {
              server = "Akamai";
              streamHeaders["Referer"] = src;
            } else {
              streamHeaders["Referer"] = src;
            }
            var isMp4 = vUrl.toLowerCase().includes(".mp4");
            var isHls = !isMp4;
            streams.push({
              name: "DDizi",
              title: `\u231C DDizi \u231F | ${server} (${quality}${isMp4 ? " MP4" : " HLS"})`,
              url: vUrl,
              quality,
              provider: "ddizi",
              headers: streamHeaders,
              format: isMp4 ? "mp4" : "hls",
              isHls,
              behaviorHints: {
                notWebReady: true,
                proxyHeaders: {
                  request: streamHeaders
                }
              }
            });
          }
        }
        if (src.includes("daily.php") || src.includes("dailymotion.com")) {
          const dmMatch = src.match(/(?:daily\.php\?id=|video\/)([a-zA-Z0-9]+)/);
          if (dmMatch) {
            try {
              const dmRes = yield fetch(`https://www.dailymotion.com/player/metadata/video/${dmMatch[1]}`);
              if (dmRes.ok) {
                const dmData = yield dmRes.json();
                const autoQual = dmData.qualities && dmData.qualities.auto && dmData.qualities.auto[0];
                if (autoQual && autoQual.url) {
                  const dmHeaders = {
                    "User-Agent": HEADERS["User-Agent"],
                    "Referer": "https://www.dailymotion.com/"
                  };
                  streams.push({
                    name: "DDizi",
                    title: "\u231C DDizi \u231F | Dailymotion (1080p HLS)",
                    url: autoQual.url,
                    quality: "1080p",
                    provider: "ddizi",
                    headers: dmHeaders,
                    format: "hls",
                    isHls: true,
                    behaviorHints: {
                      notWebReady: true,
                      proxyHeaders: {
                        request: dmHeaders
                      }
                    }
                  });
                }
              }
            } catch (e) {
            }
          }
        }
        if (src.includes("youtube.php") || src.includes("/player/telif/") || src.includes("youtube.com") || src.includes("youtu.be")) {
          const ytMatch = src.match(/(?:youtube\.php\?id=|v=|youtu\.be\/|\/embed\/)([a-zA-Z0-9_-]{11})/);
          if (ytMatch) {
            const ytId = ytMatch[1];
            let foundDirectMp4 = false;
            const ytStream = yield resolveYouTubeMp4(ytId);
            if (ytStream && ytStream.url) {
              foundDirectMp4 = true;
              const isHls2 = !!ytStream.isHls;
              const fmt = ytStream.format || (isHls2 ? "hls" : "mp4");
              const qualLabel = isHls2 ? `HLS (${ytStream.quality})` : `MP4 (${ytStream.quality})`;
              streams.push({
                name: "DDizi",
                title: `\u231C DDizi \u231F | YouTube ${qualLabel}`,
                url: ytStream.url,
                quality: ytStream.quality,
                provider: "ddizi",
                headers: ytStream.headers,
                format: fmt,
                isHls: isHls2,
                behaviorHints: {
                  notWebReady: true,
                  proxyHeaders: {
                    request: ytStream.headers
                  }
                }
              });
            }
            if (!foundDirectMp4) {
              const invInstances = [
                "https://invidious.f5.si",
                "https://inv.nadeko.net",
                "https://invidious.nerdvpn.de"
              ];
              for (const inst of invInstances) {
                try {
                  const invRes = yield fetch(`${inst}/api/v1/videos/${ytId}?fields=formatStreams,title`, {
                    headers: { "User-Agent": HEADERS["User-Agent"] },
                    signal: timeoutSignal(2500)
                  });
                  if (!invRes.ok) continue;
                  const invData = yield invRes.json();
                  const formats = (invData.formatStreams || []).filter((f) => f.url && f.container === "mp4");
                  if (formats.length > 0) {
                    formats.sort((a, b) => (parseInt(b.quality) || 0) - (parseInt(a.quality) || 0));
                    for (const fmt of formats.slice(0, 1)) {
                      const ytHeaders = { "User-Agent": HEADERS["User-Agent"] };
                      streams.push({
                        name: "DDizi",
                        title: `\u231C DDizi \u231F | YouTube MP4 (${fmt.qualityLabel || fmt.quality || "HD"})`,
                        url: fmt.url,
                        quality: fmt.qualityLabel || "720p",
                        provider: "ddizi",
                        headers: ytHeaders,
                        format: "mp4",
                        isHls: false,
                        behaviorHints: {
                          notWebReady: true,
                          proxyHeaders: {
                            request: ytHeaders
                          }
                        }
                      });
                    }
                    break;
                  }
                } catch (e) {
                }
              }
            }
            streams.push({
              name: "DDizi",
              title: "\u231C DDizi \u231F | YouTube (Resmi Yay\u0131n)",
              ytId,
              provider: "ddizi"
            });
          }
        }
      }
      if (streams.length === 0) {
        for (const ifr of iframes) {
          let src = ifr[1];
          if (src.startsWith("//")) src = "https:" + src;
          else if (src.startsWith("/")) src = BASE_URL + src;
          if (src.includes("youtube") || src.includes("youtu.be") || src.includes("daily")) continue;
          try {
            const pRes = yield fetch(src, { headers: __spreadProps(__spreadValues({}, HEADERS), { Referer: epUrl }) });
            if (!pRes.ok) continue;
            const pHtml = yield pRes.text();
            const videoMatches = [...pHtml.matchAll(/https?:\/\/[^\s"'<>\\]+\.(?:mp4|m3u8)[^\s"'<>\\]*/gi)];
            for (const vm of videoMatches) {
              const vUrl = vm[0].trim();
              if (vUrl.includes("preview/") || vUrl.includes(".jpg") || vUrl.includes(".png")) continue;
              const fallbackHeaders = { "User-Agent": HEADERS["User-Agent"], "Referer": src };
              const isHls2 = vUrl.includes(".m3u8");
              streams.push({
                name: "DDizi",
                title: `\u231C DDizi \u231F | Alternatif Kaynak`,
                url: vUrl,
                provider: "ddizi",
                headers: fallbackHeaders,
                format: isHls2 ? "hls" : "mp4",
                isHls: isHls2,
                behaviorHints: {
                  notWebReady: true,
                  proxyHeaders: {
                    request: fallbackHeaders
                  }
                }
              });
            }
          } catch (e) {
          }
        }
      }
      streams.sort((a, b) => {
        const aIsDirectMp4 = a.url && a.url.includes(".mp4") ? 1 : 0;
        const bIsDirectMp4 = b.url && b.url.includes(".mp4") ? 1 : 0;
        if (bIsDirectMp4 !== aIsDirectMp4) return bIsDirectMp4 - aIsDirectMp4;
        const aQ = parseInt(a.quality) || 0;
        const bQ = parseInt(b.quality) || 0;
        return bQ - aQ;
      });
      return streams;
    } catch (e) {
      return [];
    }
  });
}
function getStreams(tmdbIdOrArgs, mediaType, seasonNum, episodeNum) {
  return __async(this, null, function* () {
    try {
      if (typeof tmdbIdOrArgs === "object" && tmdbIdOrArgs && tmdbIdOrArgs.id) {
        return getStreams(
          tmdbIdOrArgs.id,
          mediaType || tmdbIdOrArgs.type,
          seasonNum || tmdbIdOrArgs.season,
          episodeNum || tmdbIdOrArgs.episode
        );
      }
      if (typeof tmdbIdOrArgs === "string" && tmdbIdOrArgs.startsWith("ddizi:show:")) {
        const showMeta = yield getMeta(tmdbIdOrArgs);
        if (showMeta && showMeta.meta && Array.isArray(showMeta.meta.videos) && showMeta.meta.videos.length > 0) {
          return yield getStreams(showMeta.meta.videos[0].id);
        }
      }
      if (typeof tmdbIdOrArgs === "string" && tmdbIdOrArgs.startsWith("ddizi:ep:")) {
        const slug = tmdbIdOrArgs.replace("ddizi:ep:", "");
        const epUrl = `${BASE_URL}/izle/${slug}`;
        return yield extractStreamsFromEpisodePage(epUrl);
      }
      let id = tmdbIdOrArgs;
      let season = parseInt(seasonNum) || 1;
      let episode = parseInt(episodeNum) || 1;
      const nrm = normalizeSeriesId(id);
      if (nrm.season > 0) season = nrm.season;
      if (nrm.episode > 0) episode = nrm.episode;
      if (nrm.kind === "title") id = nrm.id;
      else if (nrm.id) id = nrm.id;
      else if (typeof id === "string" && id.includes(":")) {
        const parts = id.split(":");
        id = parts[0];
        if (parts.length >= 3) {
          season = parseInt(parts[1]) || season;
          episode = parseInt(parts[2]) || episode;
        }
      }
      const info = yield resolveTmdbInfo(id, mediaType || "tv");
      const searchTitles = seriesSearchTitles(info);
      if (nrm.kind === "title" && searchTitles.length === 0) searchTitles.push(String(id || "").trim());
      if (searchTitles.length === 0) return [];
      let cumEpisode = episode;
      if (season > 1 && Array.isArray(info.seasons) && info.seasons.length > 0) {
        let sum = 0;
        for (let s = 1; s < season; s++) {
          const sObj = info.seasons.find((x) => x.season_number === s);
          if (sObj && sObj.episode_count) {
            sum += sObj.episode_count;
          }
        }
        if (sum > 0) {
          cumEpisode = sum + episode;
        }
      }
      const candidateNums = cumEpisode !== episode ? [cumEpisode, episode] : [episode];
      for (const title of searchTitles) {
        const form = new URLSearchParams();
        form.append("arama", title);
        const sRes = yield fetch(`${BASE_URL}/arama/`, {
          method: "POST",
          headers: Object.assign({}, HEADERS, { "Content-Type": "application/x-www-form-urlencoded" }),
          body: form.toString()
        });
        if (!sRes.ok) continue;
        const sHtml = yield sRes.text();
        const leftMatch = sHtml.match(/class=["']left_sidebar["'][^>]*>([\s\S]*?)class=["']right_sidebar["']/i);
        const contentToSearch = leftMatch ? leftMatch[1] : sHtml.split(/class=["']right_sidebar["']/i)[0] || sHtml;
        const seriesMatches = [...contentToSearch.matchAll(/<a href="([^"]*\/diziler\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)];
        if (seriesMatches.length === 0) continue;
        const cleanTarget = ultraClean(title);
        let matchedShowHref = null;
        for (const sm of seriesMatches) {
          const sName = (sm[3] || "").replace(/<[^>]+>/g, "").trim();
          if (ultraClean(sName) === cleanTarget) {
            matchedShowHref = sm[1];
            break;
          }
        }
        if (!matchedShowHref) {
          for (const sm of seriesMatches) {
            const slugOnly = (sm[2] || "").split("/").pop().replace(/-\d+-son-bolum.*$/i, "").replace(/-izle.*$/i, "");
            if (ultraClean(slugOnly) === cleanTarget) {
              matchedShowHref = sm[1];
              break;
            }
          }
        }
        if (!matchedShowHref) {
          for (const sm of seriesMatches) {
            const sName = (sm[3] || "").replace(/<[^>]+>/g, "").trim();
            const sClean = ultraClean(sName);
            if (sClean.startsWith(cleanTarget) || cleanTarget.startsWith(sClean) || sClean.includes(cleanTarget)) {
              matchedShowHref = sm[1];
              break;
            }
          }
        }
        if (!matchedShowHref) continue;
        if (!matchedShowHref.startsWith("http")) matchedShowHref = `${BASE_URL}${matchedShowHref.startsWith("/") ? "" : "/"}${matchedShowHref}`;
        const pagesToCheck = [matchedShowHref];
        const showRes = yield fetch(matchedShowHref, { headers: HEADERS });
        if (!showRes.ok) continue;
        const showHtml = yield showRes.text();
        const pageLinks = [...showHtml.matchAll(/href="([^"]*sayfa-(\d+)[^"]*)"/g)];
        const sortedPages = pageLinks.map((p) => {
          let pUrl = p[1];
          if (!pUrl.startsWith("http")) pUrl = `${BASE_URL}${pUrl.startsWith("/") ? "" : "/"}${pUrl}`;
          return { url: pUrl, num: parseInt(p[2]) };
        }).sort((a, b) => b.num - a.num);
        for (const sp of sortedPages) {
          if (!pagesToCheck.includes(sp.url)) pagesToCheck.push(sp.url);
        }
        for (const pageUrl of pagesToCheck.slice(0, 30)) {
          const pRes = pageUrl === matchedShowHref ? { ok: true, text: () => Promise.resolve(showHtml) } : yield fetch(pageUrl, { headers: HEADERS });
          if (!pRes.ok) continue;
          const pHtml = yield pRes.text();
          const leftEpMatch = pHtml.match(/class=["']left_sidebar["'][^>]*>([\s\S]*?)class=["']right_sidebar["']/i);
          const pageContent = leftEpMatch ? leftEpMatch[1] : pHtml.split(/class=["']right_sidebar["']/i)[0] || pHtml;
          const epMatches = [...pageContent.matchAll(/<a href="([^"]*\/izle\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)];
          if (epMatches.length === 0) continue;
          let targetEpUrl = null;
          for (const num of candidateNums) {
            const epRegex = new RegExp(`(?:^|\\s|\\.|-)${num}\\.?\\s*b\xF6l\xFCm`, "i");
            const epSlugRegex = new RegExp(`-${num}-bolum`, "i");
            for (const ep of epMatches) {
              const epText = ep[2].replace(/<[^>]+>/g, "").toLowerCase().replace(/\s+/g, " ");
              const epLink = ep[1].toLowerCase();
              if (epRegex.test(epText) || epSlugRegex.test(epLink)) {
                targetEpUrl = ep[1];
                break;
              }
            }
            if (targetEpUrl) break;
          }
          if (!targetEpUrl && season > 1) {
            const seasonRegex = new RegExp(`${season}\\.?\\s*sezon\\s*${episode}\\.?\\s*b\xF6l\xFCm`, "i");
            const seasonSlugRegex = new RegExp(`(?:sezon-${season}-bolum-${episode}|${season}-sezon-${episode}-bolum)`, "i");
            for (const ep of epMatches) {
              const epText = ep[2].replace(/<[^>]+>/g, "").toLowerCase().replace(/\s+/g, " ");
              const epLink = ep[1].toLowerCase();
              if (seasonRegex.test(epText) || seasonSlugRegex.test(epLink)) {
                targetEpUrl = ep[1];
                break;
              }
            }
          }
          if (targetEpUrl) {
            if (!targetEpUrl.startsWith("http")) targetEpUrl = `${BASE_URL}${targetEpUrl.startsWith("/") ? "" : "/"}${targetEpUrl}`;
            const streams = yield extractStreamsFromEpisodePage(targetEpUrl);
            if (streams.length > 0) return streams;
          }
        }
      }
      if (searchTitles.length > 0) {
        const mainTitle = searchTitles[0];
        const ytStreams = yield resolveOfficialYouTubeFallback(mainTitle, season, episode, cumEpisode);
        if (ytStreams && ytStreams.length > 0) {
          return ytStreams;
        }
      }
      return [];
    } catch (e) {
      return [];
    }
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
}
if (typeof globalThis !== "undefined") {
  globalThis.getStreams = getStreams;
  globalThis.getMeta = getMeta;
  globalThis.getCatalog = getCatalog;
}

if (typeof globalThis !== 'undefined' && typeof module !== 'undefined' && module.exports) {
    if (module.exports.getStreams) globalThis.getStreams = module.exports.getStreams;
    if (module.exports.getCatalog) globalThis.getCatalog = module.exports.getCatalog;
    if (module.exports.getMeta) globalThis.getMeta = module.exports.getMeta;
    if (module.exports.getSubtitles) globalThis.getSubtitles = module.exports.getSubtitles;
}

