/**
 * Anthology Provider: youtube_dizifilm
 * Built from src/youtube_dizifilm/index.js
 * Build: v1.8.25 (anthology build system)
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
    function seriesSearchTitles(show) {
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
      seriesSearchTitles,
      asciiFold: asciiFold2
    };
  }
});

// src/shared/ytmp4.js
var require_ytmp4 = __commonJS({
  "src/shared/ytmp4.js"(exports2, module2) {
    var { timeoutSignal: timeoutSignal2 } = require_http();
    function resolveYouTubeMp42(ytId) {
      return __async(this, null, function* () {
        try {
          var key = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";
          var res = yield fetch("https://www.youtube.com/youtubei/v1/player?key=" + key, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "User-Agent": "com.google.android.youtube/20.10.38 (Linux; U; Android 11) gzip"
            },
            body: JSON.stringify({
              context: { client: { clientName: "ANDROID", clientVersion: "20.10.38" } },
              videoId: ytId
            }),
            signal: timeoutSignal2(6e3)
          });
          if (!res.ok) return null;
          var data = yield res.json();
          if (!data.streamingData) return null;
          var details = data.videoDetails || {};
          var author = details.author || null;
          var channelId = details.channelId || null;
          var videoTitle = details.title || null;
          var viewCount = details.viewCount || null;
          if (data.streamingData.hlsManifestUrl) {
            return {
              url: data.streamingData.hlsManifestUrl,
              quality: "1080p",
              isHls: true,
              format: "hls",
              author,
              channelId,
              videoTitle,
              viewCount,
              headers: { "User-Agent": "com.google.android.youtube/20.10.38 (Linux; U; Android 11) gzip" }
            };
          }
          if (data.streamingData.formats) {
            var formats = data.streamingData.formats.filter(function(f) {
              return f.url && (f.mimeType || "").indexOf("mp4") !== -1;
            });
            if (formats.length > 0) {
              return {
                url: formats[0].url,
                quality: formats[0].qualityLabel || "360p",
                isHls: false,
                format: "mp4",
                author,
                channelId,
                videoTitle,
                viewCount,
                headers: { "User-Agent": "com.google.android.youtube/20.10.38 (Linux; U; Android 11) gzip" }
              };
            }
          }
        } catch (e) {
        }
        return null;
      });
    }
    module2.exports = { resolveYouTubeMp4: resolveYouTubeMp42 };
    if (typeof globalThis !== "undefined") globalThis.resolveYouTubeMp4 = resolveYouTubeMp42;
  }
});

// src/youtube_dizifilm/index.js
var { sortStreamsByQuality } = require_quality();
var { loadConfig, val, wrapAll } = require_config();
var { timeoutSignal } = require_http();
var { normalizeSeriesId, resolveSeriesInfo } = require_turkish_series();
var { resolveYouTubeMp4 } = require_ytmp4();
var _cfgReady = null;
function cfgReady() {
  if (!_cfgReady) {
    _cfgReady = loadConfig().then(function() {
      var v;
      v = val("api_keys.tmdb");
      if (v) TMDB_API_KEY = String(v);
      v = val("urls.youtube.innertube_key");
      if (v) INNERTUBE_KEY = String(v);
    });
  }
  return _cfgReady;
}
var TMDB_API_KEY = "500330721680edb6d5f7f12ba7cd9023";
var INNERTUBE_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";
var POPULAR_DIZILER = [
  { tmdbId: "34587", name: "Kurtlar Vadisi", year: "2003", poster: "https://image.tmdb.org/t/p/w500/yX6JEIijuH6KNCgO8I2yLKu2Psb.jpg", channel: "Kurtlar Vadisi" },
  { tmdbId: "32519", name: "Ezel", year: "2009", poster: "https://image.tmdb.org/t/p/w500/pHSjh4MINU2JnK7qQvjogQaX3wr.jpg", channel: "Ezel" },
  { tmdbId: "32433", name: "A\u015Fk-\u0131 Memnu", year: "2008", poster: "https://image.tmdb.org/t/p/w500/bJbL2fG6t4b7qH9eE2K3jP0v5a7.jpg", channel: "Kanal D" },
  { tmdbId: "39176", name: "Behzat \xC7.", year: "2010", poster: "https://image.tmdb.org/t/p/w500/iL8P2aX8n7j9t9K8p1v0m5k3b7g.jpg", channel: "Adam Film" },
  { tmdbId: "39352", name: "Leyla ile Mecnun", year: "2011", poster: "https://image.tmdb.org/t/p/w500/8tH8rZ2vG8o1m3k5b7p9q0r1s2t.jpg", channel: "TRT 1" },
  { tmdbId: "43865", name: "Kuzey G\xFCney", year: "2011", poster: "https://image.tmdb.org/t/p/w500/q2m7b9k5p3j8r1v0m5k3b7g9q0r.jpg", channel: "Kuzey G\xFCney" },
  { tmdbId: "32520", name: "Avrupa Yakas\u0131", year: "2004", poster: "https://image.tmdb.org/t/p/w500/v1m5k3b7g9q0r1s2t8h8rZ2vG8o.jpg", channel: "Avrupa Yakas\u0131" },
  { tmdbId: "60682", name: "Karde\u015F Pay\u0131", year: "2014", poster: "https://image.tmdb.org/t/p/w500/3j8r1v0m5k3b7g9q0r1s2t8h8rZ.jpg", channel: "Karde\u015F Pay\u0131" },
  { tmdbId: "32522", name: "Geni\u015F Aile", year: "2009", poster: "https://image.tmdb.org/t/p/w500/8r1v0m5k3b7g9q0r1s2t8h8rZ2v.jpg", channel: "D Productions" },
  { tmdbId: "32521", name: "Cennet Mahallesi", year: "2004", poster: "https://image.tmdb.org/t/p/w500/m5k3b7g9q0r1s2t8h8rZ2vG8o1m.jpg", channel: "Erler Film T\xFCrker \u0130nano\u011Flu" },
  { tmdbId: "32524", name: "Akasya Dura\u011F\u0131", year: "2008", poster: "https://image.tmdb.org/t/p/w500/7g9q0r1s2t8h8rZ2vG8o1m3k5b7.jpg", channel: "Erler Film" },
  { tmdbId: "61483", name: "Medcezir", year: "2013", poster: "https://image.tmdb.org/t/p/w500/9q0r1s2t8h8rZ2vG8o1m3k5b7p9.jpg", channel: "Medcezir" },
  { tmdbId: "68349", name: "\u0130\xE7erde", year: "2016", poster: "https://image.tmdb.org/t/p/w500/r1s2t8h8rZ2vG8o1m3k5b7p9q0r.jpg", channel: "\u0130\xE7erde" },
  { tmdbId: "74431", name: "\xC7ukur", year: "2017", poster: "https://image.tmdb.org/t/p/w500/2t8h8rZ2vG8o1m3k5b7p9q0r1s2.jpg", channel: "\xC7ukur" },
  { tmdbId: "39351", name: "Muhte\u015Fem Y\xFCzy\u0131l", year: "2011", poster: "https://image.tmdb.org/t/p/w500/8h8rZ2vG8o1m3k5b7p9q0r1s2t8.jpg", channel: "Tims Productions" },
  { tmdbId: "32523", name: "Yaprak D\xF6k\xFCm\xFC", year: "2006", poster: "https://image.tmdb.org/t/p/w500/o1m3k5b7p9q0r1s2t8h8rZ2vG8o.jpg", channel: "Kanal D" },
  { tmdbId: "46648", name: "Karaday\u0131", year: "2012", poster: "https://image.tmdb.org/t/p/w500/m3k5b7p9q0r1s2t8h8rZ2vG8o1m.jpg", channel: "Karaday\u0131" },
  { tmdbId: "112454", name: "G\xF6n\xFCl Da\u011F\u0131", year: "2020", poster: "https://image.tmdb.org/t/p/w500/5b7p9q0r1s2t8h8rZ2vG8o1m3k5.jpg", channel: "TRT 1" }
];
var POPULAR_FILMLER = [
  { tmdbId: "38794", name: "Tosun Pa\u015Fa", year: "1976", poster: "https://image.tmdb.org/t/p/w500/aE8cMuRNYltzzW36N2hC3zyZQm2.jpg", channel: "ARZU F\u0130LM" },
  { tmdbId: "16842", name: "Hababam S\u0131n\u0131f\u0131", year: "1975", poster: "https://image.tmdb.org/t/p/w500/q2m7b9k5p3j8r1v0m5k3b7g9q0r.jpg", channel: "ARZU F\u0130LM" },
  { tmdbId: "38795", name: "\u015Eaban O\u011Flu \u015Eaban", year: "1977", poster: "https://image.tmdb.org/t/p/w500/v1m5k3b7g9q0r1s2t8h8rZ2vG8o.jpg", channel: "ARZU F\u0130LM" },
  { tmdbId: "38796", name: "S\xFCt Karde\u015Fler", year: "1976", poster: "https://image.tmdb.org/t/p/w500/3j8r1v0m5k3b7g9q0r1s2t8h8rZ.jpg", channel: "ARZU F\u0130LM" },
  { tmdbId: "38798", name: "Kibar Feyzo", year: "1978", poster: "https://image.tmdb.org/t/p/w500/8r1v0m5k3b7g9q0r1s2t8h8rZ2v.jpg", channel: "ARZU F\u0130LM" },
  { tmdbId: "38797", name: "\xC7\xF6p\xE7\xFCler Kral\u0131", year: "1977", poster: "https://image.tmdb.org/t/p/w500/m5k3b7g9q0r1s2t8h8rZ2vG8o1m.jpg", channel: "ARZU F\u0130LM" },
  { tmdbId: "38799", name: "Ne\u015Feli G\xFCnler", year: "1978", poster: "https://image.tmdb.org/t/p/w500/7g9q0r1s2t8h8rZ2vG8o1m3k5b7.jpg", channel: "ARZU F\u0130LM" },
  { tmdbId: "88451", name: "Davaro", year: "1981", poster: "https://image.tmdb.org/t/p/w500/9q0r1s2t8h8rZ2vG8o1m3k5b7p9.jpg", channel: "G\xFCl\u015Fah Film" },
  { tmdbId: "88452", name: "Z\xFC\u011F\xFCrt A\u011Fa", year: "1985", poster: "https://image.tmdb.org/t/p/w500/r1s2t8h8rZ2vG8o1m3k5b7p9q0r.jpg", channel: "Fanatik Film" },
  { tmdbId: "38800", name: "Kap\u0131c\u0131lar Kral\u0131", year: "1976", poster: "https://image.tmdb.org/t/p/w500/2t8h8rZ2vG8o1m3k5b7p9q0r1s2.jpg", channel: "ARZU F\u0130LM" },
  { tmdbId: "12621", name: "Organize \u0130\u015Fler", year: "2005", poster: "https://image.tmdb.org/t/p/w500/8h8rZ2vG8o1m3k5b7p9q0r1s2t8.jpg", channel: "BKM" },
  { tmdbId: "12620", name: "Vizontele", year: "2001", poster: "https://image.tmdb.org/t/p/w500/o1m3k5b7p9q0r1s2t8h8rZ2vG8o.jpg", channel: "BKM" },
  { tmdbId: "12619", name: "G.O.R.A.", year: "2004", poster: "https://image.tmdb.org/t/p/w500/m3k5b7p9q0r1s2t8h8rZ2vG8o1m.jpg", channel: "BKM" }
];
function asciiFold(s) {
  s = String(s || "");
  try {
    if (typeof s.normalize === "function") s = s.normalize("NFD");
  } catch (e) {
  }
  s = s.replace(/[\u0300-\u036f]/g, "");
  var map = { "\xE7": "c", "\u011F": "g", "\u0131": "i", "\u0130": "i", "\xF6": "o", "\u015F": "s", "\xFC": "u", "\xE2": "a", "\xEE": "i", "\xFB": "u" };
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
function parseDurationSec(str) {
  if (!str) return 0;
  var parts = String(str).split(":").map(function(p) {
    return parseInt(p, 10);
  });
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}
function matchesEpisode(videoTitle, season, episode, cumEpisode) {
  var norm = asciiFold(videoTitle);
  var epCandidates = [episode];
  if (cumEpisode && cumEpisode !== episode) {
    epCandidates.push(cumEpisode);
  }
  var matchedEp = false;
  for (var i = 0; i < epCandidates.length; i++) {
    var ep = epCandidates[i];
    var epRegexes = [
      new RegExp("(?:^|[^0-9])" + ep + "\\s*\\.?\\s*(?:bolum|bolumu|b|episode|ep)(?:[^0-9]|$)", "i"),
      new RegExp("(?:bolum|bolumu|episode|ep)\\s*[:#-]?\\s*" + ep + "(?:[^0-9]|$)", "i"),
      new RegExp("(?:^|[^0-9])b" + ep + "(?:[^0-9]|$)", "i"),
      new RegExp("(?:^|\\s)-?\\s*" + ep + "\\.bolum", "i")
    ];
    if (epRegexes.some(function(r) {
      return r.test(norm);
    })) {
      matchedEp = true;
      break;
    }
  }
  if (!matchedEp) return false;
  if (season > 1) {
    var otherSeasonRegex = /(?:^|[^0-9])([1-9]\d?)\s*\.?\s*(?:sezon|season)(?:[^0-9]|$)/i;
    var sMatch = norm.match(otherSeasonRegex);
    if (sMatch && parseInt(sMatch[1], 10) !== season) {
      return false;
    }
  }
  return true;
}
var KNOWN_CHANNELS = {
  "arzu film": "2.1M Abone",
  "trt nostalji": "667B Abone",
  "kanal d": "10.5M Abone",
  "show tv": "9.8M Abone",
  "star tv": "7.2M Abone",
  "atv": "12.8M Abone",
  "trt 1": "8.5M Abone",
  "kurtlar vadisi": "3.2M Abone",
  "ezel": "2.4M Abone",
  "bkm": "4.5M Abone",
  "fanatik film": "3.1M Abone",
  "fanatik klasik film": "1.8M Abone",
  "gulsah film": "1.2M Abone",
  "hanimin ciftligi": "197B Abone",
  "leyla ile mecnun": "1.8M Abone",
  "kuzey guney": "1.5M Abone",
  "avrupa yakasi": "1.6M Abone",
  "cukur": "7.8M Abone",
  "icerde": "3.9M Abone",
  "medcezir": "2.9M Abone",
  "karadayi": "1.1M Abone",
  "yaprak dokumu": "1.4M Abone",
  "gonul dagi": "2.3M Abone",
  "kardes payi": "1.9M Abone",
  "genis aile": "1.1M Abone",
  "cennet mahallesi": "1.5M Abone",
  "akasya duragi": "1.7M Abone",
  "muhtesem yuzyil": "3.8M Abone",
  "behzat c.": "1.2M Abone"
};
function getChannelSubscriberBadge(channel, isVerified) {
  if (!channel) return isVerified ? "\u2714" : "";
  var norm = cleanTitle(channel);
  var sub = KNOWN_CHANNELS[norm];
  if (sub) return isVerified ? "\u2714 (" + sub + ")" : "(" + sub + ")";
  return isVerified ? "\u2714" : "";
}
function parseViewCount(str) {
  if (!str) return 0;
  var s = String(str).toLowerCase().replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  var mnMatch = s.match(/([0-9]+(?:[.,][0-9]+)?)\s*(?:mn|m|milyon)/i);
  if (mnMatch) return parseFloat(mnMatch[1].replace(",", ".")) * 1e6;
  var bMatch = s.match(/([0-9]+(?:[.,][0-9]+)?)\s*(?:b|k|bin)/i);
  if (bMatch) return parseFloat(bMatch[1].replace(",", ".")) * 1e3;
  var clean = s.replace(/[^0-9]/g, "");
  return parseInt(clean, 10) || 0;
}
function formatNumberCompact(n) {
  var num = parseInt(n, 10);
  if (isNaN(num)) return "";
  if (num >= 1e6) return (num / 1e6).toFixed(1).replace(".0", "").replace(".", ",") + " Mn";
  if (num >= 1e3) return (num / 1e3).toFixed(0) + " B";
  return String(num);
}
function matchesTitle(videoTitle, targetTitle) {
  var vNorm = asciiFold(videoTitle).toLowerCase();
  var tNorm = asciiFold(targetTitle).toLowerCase();
  var tWords = tNorm.split(/\s+/).filter(function(w) {
    return w.length > 1;
  });
  var allWords = tWords.length > 0 && tWords.every(function(w) {
    return new RegExp("\\b" + w + "\\b", "i").test(vNorm);
  });
  if (!allWords) return false;
  var spinOffs = ["pusu", "teror", "gladio", "irak", "filistin", "vatan"];
  for (var s = 0; s < spinOffs.length; s++) {
    var sp = spinOffs[s];
    if (tNorm.indexOf(sp) === -1 && new RegExp("\\b" + sp + "\\b", "i").test(vNorm)) {
      return false;
    }
  }
  return true;
}
function searchYouTube(query) {
  return __async(this, null, function* () {
    try {
      var resMweb = yield fetch("https://www.youtube.com/youtubei/v1/search?key=" + INNERTUBE_KEY, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          context: {
            client: {
              clientName: "MWEB",
              clientVersion: "2.20240313.00.00",
              hl: "tr",
              gl: "TR"
            }
          }
        }),
        signal: timeoutSignal(6e3)
      });
      if (resMweb.ok) {
        var dataMweb = yield resMweb.json();
        var resultsMweb = _parseInnertubeMwebSearch(dataMweb);
        if (resultsMweb.length > 0) return resultsMweb;
      }
    } catch (e) {
    }
    try {
      var resWeb = yield fetch("https://www.youtube.com/youtubei/v1/search?key=" + INNERTUBE_KEY, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          context: {
            client: {
              clientName: "WEB",
              clientVersion: "2.20240313.00.00",
              hl: "tr",
              gl: "TR"
            }
          }
        }),
        signal: timeoutSignal(6e3)
      });
      if (resWeb.ok) {
        var dataWeb = yield resWeb.json();
        var results = _parseInnertubeWebSearch(dataWeb);
        if (results.length > 0) return results;
      }
    } catch (e2) {
    }
    try {
      var resAnd = yield fetch("https://www.youtube.com/youtubei/v1/search?key=" + INNERTUBE_KEY, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "com.google.android.youtube/20.10.38 (Linux; U; Android 11) gzip",
          "X-Goog-Api-Format-Version": "2"
        },
        body: JSON.stringify({
          query,
          context: {
            client: {
              clientName: "ANDROID",
              clientVersion: "20.10.38",
              hl: "tr",
              gl: "TR"
            }
          }
        }),
        signal: timeoutSignal(6e3)
      });
      if (resAnd.ok) {
        var dataAnd = yield resAnd.json();
        return _parseInnertubeAndroidSearch(dataAnd);
      }
    } catch (e3) {
    }
    return [];
  });
}
function _parseInnertubeMwebSearch(data) {
  var results = [];
  var seenIds = {};
  try {
    var slr = data && data.contents && data.contents.sectionListRenderer && data.contents.sectionListRenderer.contents || [];
    for (var s = 0; s < slr.length; s++) {
      var items = slr[s].itemSectionRenderer && slr[s].itemSectionRenderer.contents || [];
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        var v = it.videoWithContextRenderer || it.compactVideoRenderer || it.videoRenderer;
        if (!v) continue;
        var vidId = v.videoId;
        if (!vidId && v.navigationEndpoint && v.navigationEndpoint.watchEndpoint) {
          vidId = v.navigationEndpoint.watchEndpoint.videoId;
        }
        if (!vidId || seenIds[vidId]) continue;
        seenIds[vidId] = true;
        var title = v.headline && v.headline.runs && v.headline.runs[0] && v.headline.runs[0].text || v.title && v.title.runs && v.title.runs[0] && v.title.runs[0].text || v.title && v.title.simpleText || "";
        var channel = v.shortBylineText && v.shortBylineText.runs && v.shortBylineText.runs[0] && v.shortBylineText.runs[0].text || v.ownerText && v.ownerText.runs && v.ownerText.runs[0] && v.ownerText.runs[0].text || "";
        var durText = v.lengthText && v.lengthText.runs && v.lengthText.runs[0] && v.lengthText.runs[0].text || v.lengthText && v.lengthText.simpleText || "";
        var durSec = parseDurationSec(durText);
        var viewsText = v.shortViewCountText && v.shortViewCountText.runs && v.shortViewCountText.runs[0] && v.shortViewCountText.runs[0].text || v.shortViewCountText && v.shortViewCountText.simpleText || v.viewCountText && v.viewCountText.simpleText || "";
        viewsText = viewsText.replace(/\u00a0/g, " ").replace(/\s*görüntüleme\s*/i, "").trim();
        var viewsNum = parseViewCount(viewsText);
        results.push({
          id: vidId,
          title,
          duration: durText,
          durationSec: durSec,
          channel,
          views: viewsText,
          viewsNum,
          isVerified: true
        });
      }
    }
  } catch (e) {
  }
  return results;
}
function _parseInnertubeWebSearch(data) {
  var results = [];
  var seenIds = {};
  try {
    var contents = data && data.contents && data.contents.twoColumnSearchResultsRenderer && data.contents.twoColumnSearchResultsRenderer.primaryContents && data.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer && data.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents || [];
    for (var s = 0; s < contents.length; s++) {
      var itemSection = contents[s].itemSectionRenderer && contents[s].itemSectionRenderer.contents;
      for (var i = 0; i < (itemSection || []).length; i++) {
        var vr = itemSection[i].videoRenderer;
        if (!vr || !vr.videoId) continue;
        var vid = vr.videoId;
        if (seenIds[vid]) continue;
        seenIds[vid] = true;
        var title = vr.title && vr.title.runs && vr.title.runs[0] && vr.title.runs[0].text || vr.title && vr.title.simpleText || "";
        var duration = vr.lengthText && vr.lengthText.simpleText || vr.lengthText && vr.lengthText.runs && vr.lengthText.runs[0] && vr.lengthText.runs[0].text || "";
        var channel = vr.ownerText && vr.ownerText.runs && vr.ownerText.runs[0] && vr.ownerText.runs[0].text || "";
        var views = vr.shortViewCountText && vr.shortViewCountText.simpleText || vr.viewCountText && vr.viewCountText.simpleText || "";
        views = views.replace(/\u00a0/g, " ").replace(/\s*görüntüleme\s*/i, "").trim();
        var isVerified = false;
        if (Array.isArray(vr.ownerBadges)) {
          isVerified = vr.ownerBadges.some(function(b) {
            return b && b.metadataBadgeRenderer && b.metadataBadgeRenderer.style && b.metadataBadgeRenderer.style.indexOf("VERIFIED") !== -1;
          });
        }
        results.push({
          id: vid,
          title,
          duration,
          durationSec: parseDurationSec(duration),
          channel,
          views,
          viewsNum: parseViewCount(views),
          isVerified
        });
      }
    }
  } catch (e) {
  }
  return results;
}
function _parseInnertubeAndroidSearch(data) {
  var results = [];
  var seenIds = {};
  try {
    var sections = data && data.contents && data.contents.sectionListRenderer && data.contents.sectionListRenderer.contents || [];
    for (var s = 0; s < sections.length; s++) {
      var items = sections[s].itemSectionRenderer && sections[s].itemSectionRenderer.contents || [];
      for (var i = 0; i < items.length; i++) {
        var vr = items[i].compactVideoRenderer || items[i].videoRenderer;
        if (!vr || !vr.videoId) continue;
        var vid = vr.videoId;
        if (seenIds[vid]) continue;
        seenIds[vid] = true;
        var title = vr.title && vr.title.runs && vr.title.runs[0] && vr.title.runs[0].text || vr.title && vr.title.simpleText || "";
        var duration = vr.lengthText && vr.lengthText.simpleText || "";
        var channel = vr.shortBylineText && vr.shortBylineText.runs && vr.shortBylineText.runs[0] && vr.shortBylineText.runs[0].text || vr.ownerText && vr.ownerText.runs && vr.ownerText.runs[0] && vr.ownerText.runs[0].text || "";
        var views = vr.shortViewCountText && vr.shortViewCountText.runs && vr.shortViewCountText.runs[0] && vr.shortViewCountText.runs[0].text || vr.viewCountText && vr.viewCountText.simpleText || "";
        views = views.replace(/\u00a0/g, " ").replace(/\s*görüntüleme\s*/i, "").trim();
        var isVerified = false;
        var badges = vr.badges || vr.ownerBadges;
        if (Array.isArray(badges)) {
          isVerified = badges.some(function(b) {
            return b && b.metadataBadgeRenderer && b.metadataBadgeRenderer.style && b.metadataBadgeRenderer.style.indexOf("VERIFIED") !== -1;
          });
        }
        results.push({
          id: vid,
          title,
          duration,
          durationSec: parseDurationSec(duration),
          channel,
          views,
          viewsNum: parseViewCount(views),
          isVerified
        });
      }
    }
  } catch (e) {
  }
  return results;
}
function getStreams(tmdbIdOrArgs, mediaType, seasonNum, episodeNum) {
  return __async(this, null, function* () {
    try {
      var rawId = tmdbIdOrArgs;
      var sNum = seasonNum || 1;
      var eNum = episodeNum || 1;
      var mType = mediaType || "movie";
      if (typeof tmdbIdOrArgs === "object" && tmdbIdOrArgs !== null) {
        rawId = tmdbIdOrArgs.id || tmdbIdOrArgs.url || "";
        mType = tmdbIdOrArgs.type || tmdbIdOrArgs.mediaType || mType;
        sNum = tmdbIdOrArgs.season || tmdbIdOrArgs.seasonNum || sNum;
        eNum = tmdbIdOrArgs.episode || tmdbIdOrArgs.episodeNum || eNum;
      }
      rawId = String(rawId || "").trim();
      var directYtId = null;
      if (/^[a-zA-Z0-9_-]{11}$/.test(rawId)) {
        directYtId = rawId;
      } else if (rawId.startsWith("youtube:video:")) {
        directYtId = rawId.replace("youtube:video:", "");
      } else if (rawId.includes("youtube.com/") || rawId.includes("youtu.be/")) {
        var m = rawId.match(/(?:youtube\.com\/(?:embed|watch\?v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        if (m) directYtId = m[1];
      }
      if (directYtId) {
        var streams = [];
        var streamData = yield resolveYouTubeMp4(directYtId);
        var chName = streamData && streamData.author || "YouTube";
        var badge = getChannelSubscriberBadge(chName, true);
        var streamName = "\u{1F4FA} " + chName + (badge ? " " + badge : "");
        var vTitle = streamData && streamData.videoTitle || "";
        var vViews = streamData && streamData.viewCount ? formatNumberCompact(streamData.viewCount) : "";
        var viewsTag = vViews ? " \xB7 \u{1F441} " + vViews : "";
        if (streamData && streamData.url) {
          var qBase = streamData.quality || (streamData.isHls ? "1080p" : "360p");
          streams.push({
            name: streamName,
            title: "\u231C YouTube \u231F | " + streamName + " (" + qBase + ")",
            description: vTitle + viewsTag,
            url: streamData.url,
            quality: qBase,
            isHls: !!streamData.isHls,
            format: streamData.format || (streamData.isHls ? "hls" : "mp4"),
            provider: "youtube_dizifilm",
            headers: streamData.headers,
            behaviorHints: { headers: streamData.headers }
          });
        }
        streams.push({
          name: streamName,
          title: "\u231C YouTube \u231F | " + streamName + " (YouTube Embed)",
          description: vTitle + viewsTag,
          ytId: directYtId,
          provider: "youtube_dizifilm"
        });
        return sortStreamsByQuality(streams);
      }
      if (rawId.startsWith("youtube:")) {
        var parts = rawId.split(":");
        if (parts[1] === "tv" || parts[1] === "series" || parts[1] === "movie") {
          mType = parts[1] === "movie" ? "movie" : "series";
          rawId = parts[2];
          if (parts[3]) sNum = parseInt(parts[3], 10) || sNum;
          if (parts[4]) eNum = parseInt(parts[4], 10) || eNum;
        }
      } else {
        var idNorm = normalizeSeriesId(rawId);
        if (idNorm.id) rawId = idNorm.id;
        if (!seasonNum && idNorm.season > 0) sNum = idNorm.season;
        if (!episodeNum && idNorm.episode > 0) eNum = idNorm.episode;
      }
      var isSeries = mType === "tv" || mType === "series";
      var info = yield resolveSeriesInfo(rawId, mType, TMDB_API_KEY);
      var targetTitle = info.title || rawId;
      var cumEpisode = eNum;
      if (isSeries && sNum > 1 && Array.isArray(info.seasons) && info.seasons.length > 0) {
        var sum = 0;
        for (var s = 0; s < info.seasons.length; s++) {
          var sn = info.seasons[s].season_number;
          if (sn > 0 && sn < sNum) {
            sum += info.seasons[s].episode_count || 0;
          }
        }
        if (sum > 0) cumEpisode = sum + eNum;
      }
      var searchQueries = [];
      if (isSeries) {
        var epTarget = cumEpisode && cumEpisode !== eNum ? cumEpisode : eNum;
        searchQueries.push(targetTitle + " " + epTarget + ". B\xF6l\xFCm");
        if (sNum > 1 && epTarget === eNum) {
          searchQueries.push(targetTitle + " " + sNum + ". Sezon " + eNum + ". B\xF6l\xFCm");
        }
      } else {
        searchQueries.push(targetTitle + " Full \u0130zle");
        searchQueries.push(targetTitle + " Tek Par\xE7a");
      }
      var searchResultsArr = yield Promise.all(searchQueries.map(function(q) {
        return searchYouTube(q);
      }));
      var candidateVideos = [];
      var seenVid = {};
      var minDuration = isSeries ? 900 : 2400;
      for (var a = 0; a < searchResultsArr.length; a++) {
        var vids = searchResultsArr[a] || [];
        for (var v = 0; v < vids.length; v++) {
          var vid = vids[v];
          if (seenVid[vid.id]) continue;
          seenVid[vid.id] = true;
          if (vid.durationSec > 0 && vid.durationSec < minDuration) continue;
          if (!matchesTitle(vid.title, targetTitle)) continue;
          if (isSeries && !matchesEpisode(vid.title, sNum, eNum, cumEpisode)) continue;
          candidateVideos.push(vid);
          if (candidateVideos.length >= 4) break;
        }
        if (candidateVideos.length >= 4) break;
      }
      if (candidateVideos.length === 0) return [];
      candidateVideos.sort(function(x, y) {
        return (y.viewsNum || 0) - (x.viewsNum || 0);
      });
      var channelSeen = {};
      var topCandidates = [];
      for (var c = 0; c < candidateVideos.length; c++) {
        var cand = candidateVideos[c];
        var chKey = cleanTitle(cand.channel) || cand.id;
        if (!channelSeen[chKey]) {
          channelSeen[chKey] = true;
          topCandidates.push(cand);
          if (topCandidates.length >= 2) break;
        }
      }
      if (topCandidates.length < 2 && candidateVideos.length > 0) {
        for (var c2 = 0; c2 < candidateVideos.length; c2++) {
          var cand2 = candidateVideos[c2];
          if (topCandidates.indexOf(cand2) === -1) {
            topCandidates.push(cand2);
            if (topCandidates.length >= 2) break;
          }
        }
      }
      var resolvedArr = yield Promise.all(topCandidates.map(function(tc) {
        return resolveYouTubeMp4(tc.id).catch(function() {
          return null;
        });
      }));
      var streams = [];
      for (var i = 0; i < topCandidates.length; i++) {
        var candObj = topCandidates[i];
        var resolved = resolvedArr[i];
        var badge2 = getChannelSubscriberBadge(candObj.channel, candObj.isVerified);
        var streamName2 = "\u{1F4FA} " + (candObj.channel || "YouTube") + (badge2 ? " " + badge2 : "");
        var viewsLabel = candObj.views ? " \xB7 \u{1F441} " + candObj.views : "";
        if (resolved && resolved.url) {
          var qLabel = resolved.quality || (resolved.isHls ? "1080p" : "360p");
          streams.push({
            name: streamName2,
            title: "\u231C YouTube \u231F | " + streamName2 + " (" + qLabel + ")",
            description: candObj.title + viewsLabel,
            url: resolved.url,
            quality: qLabel,
            isHls: !!resolved.isHls,
            format: resolved.format || (resolved.isHls ? "hls" : "mp4"),
            provider: "youtube_dizifilm",
            headers: resolved.headers,
            behaviorHints: { headers: resolved.headers }
          });
        }
        streams.push({
          name: streamName2,
          title: "\u231C YouTube \u231F | " + streamName2 + " (YouTube Embed)",
          description: candObj.title + viewsLabel,
          ytId: candObj.id,
          provider: "youtube_dizifilm"
        });
      }
      return sortStreamsByQuality(streams);
    } catch (e) {
      return [];
    }
  });
}
function getCatalog(args) {
  return __async(this, null, function* () {
    try {
      var catalogId = args && args.id || "anthology_youtube_diziler";
      var searchQuery = args && (args.search || args.extra && args.extra.search) || "";
      if (searchQuery) {
        var searchResults = yield searchYouTube(searchQuery + " Full");
        var searchMetas = searchResults.filter(function(v) {
          return v.durationSec >= 600;
        }).slice(0, 20).map(function(v) {
          return {
            id: "youtube:video:" + v.id,
            type: catalogId.includes("dizi") ? "series" : "movie",
            name: v.title,
            poster: "https://i.ytimg.com/vi/" + v.id + "/hqdefault.jpg",
            description: (v.channel ? v.channel + " \xB7 " : "") + v.duration + (v.views ? " \xB7 " + v.views : ""),
            releaseInfo: v.duration
          };
        });
        return { metas: searchMetas };
      }
      var isSeries = catalogId.includes("dizi");
      var pool = isSeries ? POPULAR_DIZILER : POPULAR_FILMLER;
      var metas = pool.map(function(item) {
        return {
          id: "youtube:" + (isSeries ? "tv" : "movie") + ":" + item.tmdbId,
          type: isSeries ? "series" : "movie",
          name: item.name,
          poster: item.poster,
          description: "YouTube Resm\xEE Yay\u0131nc\u0131: " + item.channel,
          releaseInfo: item.year
        };
      });
      return { metas };
    } catch (e) {
      return { metas: [] };
    }
  });
}
function getMeta(id) {
  return __async(this, null, function* () {
    try {
      var rawId = String(id || "").trim();
      if (rawId.startsWith("youtube:video:")) {
        var vid = rawId.replace("youtube:video:", "");
        return {
          meta: {
            id: rawId,
            type: "movie",
            name: "YouTube Video (" + vid + ")",
            poster: "https://i.ytimg.com/vi/" + vid + "/hqdefault.jpg",
            background: "https://i.ytimg.com/vi/" + vid + "/maxresdefault.jpg",
            description: "Do\u011Frudan YouTube video ak\u0131\u015F\u0131"
          }
        };
      }
      if (rawId.startsWith("youtube:")) {
        var parts = rawId.split(":");
        var mType = parts[1];
        var tmdbId = parts[2];
        if (mType === "movie") {
          var resM = yield fetch("https://api.themoviedb.org/3/movie/" + tmdbId + "?api_key=" + TMDB_API_KEY + "&language=tr-TR", { signal: timeoutSignal(6e3) });
          if (resM.ok) {
            var dm = yield resM.json();
            return {
              meta: {
                id: rawId,
                type: "movie",
                name: dm.title || dm.name,
                poster: dm.poster_path ? "https://image.tmdb.org/t/p/w500" + dm.poster_path : void 0,
                background: dm.backdrop_path ? "https://image.tmdb.org/t/p/original" + dm.backdrop_path : void 0,
                description: dm.overview || "",
                releaseInfo: (dm.release_date || "").slice(0, 4)
              }
            };
          }
        } else if (mType === "tv" || mType === "series") {
          var resTv = yield fetch("https://api.themoviedb.org/3/tv/" + tmdbId + "?api_key=" + TMDB_API_KEY + "&language=tr-TR", { signal: timeoutSignal(6e3) });
          if (resTv.ok) {
            var dt = yield resTv.json();
            var videos = [];
            if (Array.isArray(dt.seasons)) {
              for (var s = 0; s < dt.seasons.length; s++) {
                var sObj = dt.seasons[s];
                var sNum = sObj.season_number;
                if (sNum <= 0) continue;
                var epCount = sObj.episode_count || 0;
                for (var e = 1; e <= epCount; e++) {
                  videos.push({
                    id: "youtube:series:" + tmdbId + ":" + sNum + ":" + e,
                    season: sNum,
                    episode: e,
                    title: sNum + ". Sezon " + e + ". B\xF6l\xFCm",
                    name: sNum + ". Sezon " + e + ". B\xF6l\xFCm",
                    releaseInfo: sNum + "x" + (e < 10 ? "0" + e : e)
                  });
                }
              }
            }
            return {
              meta: {
                id: rawId,
                type: "series",
                name: dt.name,
                poster: dt.poster_path ? "https://image.tmdb.org/t/p/w500" + dt.poster_path : void 0,
                background: dt.backdrop_path ? "https://image.tmdb.org/t/p/original" + dt.backdrop_path : void 0,
                description: dt.overview || "",
                releaseInfo: (dt.first_air_date || "").slice(0, 4),
                videos
              }
            };
          }
        }
      }
      return null;
    } catch (e2) {
      return null;
    }
  });
}
var _exports = wrapAll({ getStreams, getCatalog, getMeta }, cfgReady);
if (typeof module !== "undefined" && module.exports) {
  module.exports = _exports;
}
if (typeof globalThis !== "undefined") {
  globalThis.getStreams = _exports.getStreams;
  globalThis.getCatalog = _exports.getCatalog;
  globalThis.getMeta = _exports.getMeta;
}

if (typeof globalThis !== 'undefined' && typeof module !== 'undefined' && module.exports) {
    if (module.exports.getStreams) globalThis.getStreams = module.exports.getStreams;
    if (module.exports.getCatalog) globalThis.getCatalog = module.exports.getCatalog;
    if (module.exports.getMeta) globalThis.getMeta = module.exports.getMeta;
    if (module.exports.getSubtitles) globalThis.getSubtitles = module.exports.getSubtitles;
}

