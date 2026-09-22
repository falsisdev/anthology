/**
 * Anthology Provider: anthology_diziler
 * Built from src/anthology_diziler/index.js
 * Build: v1.8.22 (anthology build system)
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
            signal: timeoutSignal2(3500)
          });
          if (!res.ok) return null;
          var data = yield res.json();
          if (!data.streamingData) return null;
          if (data.streamingData.hlsManifestUrl) {
            return {
              url: data.streamingData.hlsManifestUrl,
              quality: "1080p",
              isHls: true,
              format: "hls",
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

// src/anthology_diziler/index.js
var { sortStreamsByQuality } = require_quality();
var { loadConfig, val, wrapAll } = require_config();
var { timeoutSignal } = require_http();
var { normalizeSeriesId, resolveSeriesInfo, seriesSearchTitles } = require_turkish_series();
var { resolveYouTubeMp4 } = require_ytmp4();
var _cfgReady = null;
function cfgReady() {
  if (!_cfgReady) {
    _cfgReady = loadConfig().then(function() {
      var v;
      v = val("urls.series.anthology_diziler");
      if (v && typeof v === "object") {
        if (v.now) NOW_BASE = String(v.now).replace(/\/+$/, "");
        if (v.show) SHOW_BASE = String(v.show).replace(/\/+$/, "");
        if (v.kanald) KANALD_BASE = String(v.kanald).replace(/\/+$/, "");
        if (v.atv) ATV_BASE = String(v.atv).replace(/\/+$/, "");
        if (v.star) STAR_BASE = String(v.star).replace(/\/+$/, "");
        if (v.trt1) TRT1_BASE = String(v.trt1).replace(/\/+$/, "");
        if (v.tv2) TV2_BASE = String(v.tv2).replace(/\/+$/, "");
      }
    });
  }
  return _cfgReady;
}
var NOW_BASE = "https://www.nowtv.com.tr";
var SHOW_BASE = "https://www.showtv.com.tr";
var KANALD_BASE = "https://kanald.com.tr";
var ATV_BASE = "https://www.atv.com.tr";
var STAR_BASE = "https://www.startv.com.tr";
var TRT1_BASE = "https://www.trt1.com.tr";
var TV2_BASE = "https://www.tv2.com.tr";
var TMDB_API_KEY = "500330721680edb6d5f7f12ba7cd9023";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8"
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
function slugify(s) {
  return asciiFold(s).replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").trim();
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
    return yield fetchBody(url, opts, ms);
  });
}
function fetchBody(url, opts, ms) {
  return __async(this, null, function* () {
    var r = yield fadeFetch(url, opts, ms);
    var t = yield r.text().catch(function() {
      return "";
    });
    return r.ok ? t : t;
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
function mkStream(url, label, format, isHls, quality, headers) {
  return {
    url,
    name: "Anthology Dizi",
    title: "\u231C Anthology Dizi \u231F | " + label,
    quality: quality || "1080p",
    format,
    isHls,
    headers: headers || { "User-Agent": HEADERS["User-Agent"] }
  };
}
function nowEpisodePage(showSlug, episodeNum) {
  return __async(this, null, function* () {
    try {
      var html = yield fetchText(NOW_BASE + "/" + showSlug + "/bolum/" + episodeNum);
      if (!html) return null;
      var vid = (html.match(/video_id["']?\s*[:=]\s*["']?(\d+)/i) || [])[1];
      if (!vid) return null;
      var r = yield fetch(NOW_BASE + "/ajax/stream", {
        method: "POST",
        headers: {
          "User-Agent": HEADERS["User-Agent"],
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "X-Requested-With": "XMLHttpRequest",
          "Origin": NOW_BASE,
          "Referer": NOW_BASE + "/"
        },
        body: "video_id=" + vid,
        signal: useTimeoutSignal(15e3)
      });
      if (!r.ok) return null;
      var j = yield r.json().catch(function() {
        return null;
      });
      if (!j || j.code !== 200 || !j.video_url) return null;
      return mkStream(j.video_url, "NOW TV | " + showSlug + " EP" + episodeNum, "hls", true, "1080p", { "User-Agent": HEADERS["User-Agent"], "Referer": NOW_BASE + "/" });
    } catch (e) {
      return null;
    }
  });
}
function parseShowHorMedia(html) {
  var m = html.match(/data-hope-video=['"]/i);
  var body = null;
  if (m) {
    var q = m[0][m[0].length - 1];
    var b = html.slice(m.index + m[0].length);
    var out = "", esc = false;
    for (var k2 = 0; k2 < b.length; k2++) {
      var ch = b[k2];
      if (esc) {
        out += ch;
        esc = false;
      } else if (ch === "\\") {
        out += ch;
        esc = true;
      } else if (ch === q) {
        break;
      } else out += ch;
    }
    body = out;
  }
  if (body !== null) {
    var j;
    try {
      j = JSON.parse(body.replace(/&quot;/g, '"'));
    } catch (e) {
      j = null;
    }
    var mm = j && j.media && j.media.m3u8 || [];
    var src = "";
    for (var k = 0; k < mm.length; k++) {
      if (mm[k] && typeof mm[k].src === "string") {
        src = mm[k].src;
        break;
      }
      if (typeof mm[k] === "string") {
        src = mm[k];
        break;
      }
    }
    if (src) return src;
  }
  var vm = html.match(/https:\/\/vmcdn\.ciner\.com\.tr\/[^"'\s\\]+\.m3u8[^"'\s\\]*/i);
  if (vm) return vm[0];
  return "";
}
function showEpisodePage(showSlug, seasonNum, episodeNum) {
  return __async(this, null, function* () {
    try {
      var listing = yield fetchText(SHOW_BASE + "/kanal/dizi/tum_bolumler/" + showSlug);
      if (listing) {
        var slugEsc = String(showSlug).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        var re = new RegExp("(\\/dizi\\/tum_bolumler\\/" + slugEsc + "-sezon-(\\d+)-bolum-(\\d+)-izle\\/\\d+)", "gi");
        var m, targetUrl = "";
        while ((m = re.exec(listing)) !== null) {
          var sN = parseInt(m[2], 10);
          var eN = parseInt(m[3], 10);
          if (sN === parseInt(seasonNum, 10) && eN === parseInt(episodeNum, 10)) {
            targetUrl = m[1];
            break;
          }
        }
        if (targetUrl) {
          var html = yield fetchText(SHOW_BASE + targetUrl);
          if (html) {
            var src = parseShowHorMedia(html);
            if (src) return mkStream(src, "Show TV | " + showSlug + " S" + seasonNum + "E" + episodeNum, "hls", true, "1080p", { "User-Agent": HEADERS["User-Agent"], "Referer": SHOW_BASE + "/" });
          }
        }
      }
      var listingAll = yield fetchText(SHOW_BASE + "/kanal/dizi/tum_bolumler/" + showSlug);
      if (listingAll) {
        var reAll = new RegExp("(\\/dizi\\/tum_bolumler\\/" + slugEsc + "-sezon-(\\d+)-bolum-(\\d+)-izle\\/\\d+)", "gi");
        var allM, sBest = null, eBest = null, uBest = "";
        while ((allM = reAll.exec(listingAll)) !== null) {
          var sA = parseInt(allM[2], 10);
          var eA = parseInt(allM[3], 10);
          var wantS = parseInt(seasonNum, 10);
          var wantE = parseInt(episodeNum, 10);
          if (sA === wantS && eA === wantE) {
            sBest = sA;
            eBest = eA;
            uBest = allM[1];
            break;
          }
          if (sA === wantS) {
            if (sBest === null || Math.abs(eA - wantE) < Math.abs(eBest - wantE)) {
              sBest = sA;
              eBest = eA;
              uBest = allM[1];
            }
          }
        }
        if (uBest) {
          var htmlB = yield fetchText(SHOW_BASE + uBest);
          if (htmlB) {
            var srcB = parseShowHorMedia(htmlB);
            if (srcB) return mkStream(srcB, "Show TV | " + showSlug + " S" + seasonNum + "E" + episodeNum, "hls", true, "1080p", { "User-Agent": HEADERS["User-Agent"], "Referer": SHOW_BASE + "/" });
          }
        }
      }
    } catch (e) {
    }
    return null;
  });
}
function kanaldEpisode(showSlug, episodeNum) {
  return __async(this, null, function* () {
    try {
      var urls = [
        KANALD_BASE + "/" + showSlug + "/bolumler/" + showSlug + "-" + episodeNum + "-bolum",
        KANALD_BASE + "/" + showSlug + "/bolumler/" + showSlug + "-son-bolum"
      ];
      for (var i = 0; i < urls.length; i++) {
        var html = yield fetchText(urls[i]);
        if (!html) continue;
        var m3 = html.match(/https?:\/\/kanaldvod\.duhnet\.tv\/[^"'\s\\]+\.smil\/playlist\.m3u8[^"'\s\\]*/i);
        if (m3) return mkStream(m3[0], "KanalD | " + showSlug + " EP" + episodeNum, "hls", true, "1080p", { "User-Agent": HEADERS["User-Agent"], "Referer": KANALD_BASE + "/" });
      }
    } catch (e) {
    }
    return null;
  });
}
function starResolve(rid) {
  return __async(this, null, function* () {
    try {
      var reference = "StarTv_" + rid;
      var url = "https://dygvideo.dygdigital.com/api/video_info?akamai=true&PublisherId=1&ReferenceId=" + encodeURIComponent(reference) + "&SecretKey=NtvApiSecret2014*";
      var j = yield fetchJson(url, {}, 2e4);
      if (!j || !j.data || !j.data.flavors || !j.data.flavors.hls) return null;
      var streams = [];
      streams.push(mkStream(j.data.flavors.hls, "Star TV | " + reference, "hls", true, "1080p", { "User-Agent": HEADERS["User-Agent"], "Referer": STAR_BASE + "/" }));
      for (var k in j.data.flavors) {
        if (!Object.prototype.hasOwnProperty.call(j.data.flavors, k)) continue;
        var v = j.data.flavors[k];
        if (typeof v === "string" && /\.mp4(?:\?|$)/i.test(v)) {
          streams.push(mkStream(v, "Star TV | " + reference + " [MP4]", "mp4", false, "1080p", { "User-Agent": HEADERS["User-Agent"], "Referer": STAR_BASE + "/" }));
        }
      }
      return streams;
    } catch (e) {
      return null;
    }
  });
}
function starEpisode(showSlug, episodeNum) {
  return __async(this, null, function* () {
    try {
      var html = yield fetchText(STAR_BASE + "/" + showSlug + "/" + episodeNum + "-bolum-izle");
      if (!html) return null;
      var rid = (html.match(/"referenceId":"([a-f0-9]{24})"/) || [])[1];
      if (!rid) {
        var m = html.match(/referenceId[:"]?\s*["']?([a-f0-9]{24})/);
        if (m) rid = m[1];
      }
      if (!rid) return null;
      return yield starResolve(rid);
    } catch (e) {
      return null;
    }
  });
}
function atvEpisode(showSlug, episodeNum) {
  return __async(this, null, function* () {
    try {
      var html = yield fetchText(ATV_BASE + "/" + showSlug + "/" + episodeNum + "-bolum/izle");
      if (!html) return null;
      var vid = (html.match(/name="videoId"\s+value="([^"]+)"/) || [])[1] || (html.match(/data-video[-]?id["']?\s*[:=]\s*["']?([a-f0-9-]{6,})/i) || [])[1];
      if (!vid) {
        var alt = (html.match(/videoId["']?\s*[:=]\s*["']?([a-f0-9-]{6,})/i) || [])[1];
        if (alt) vid = alt;
      }
      if (!vid) return null;
      var gv = yield fetchJson("https://videojs.tmgrup.com.tr/getvideo/0fe2a405-8afa-4238-b429-e5f96aec3a5c/" + vid, { "Referer": ATV_BASE + "/" }, 15e3);
      if (gv && gv.video && gv.video.VideoUrl && gv.video.VideoUrl.indexOf("http") === 0) {
        return mkStream(gv.video.VideoUrl, "ATV | " + showSlug + " EP" + episodeNum, "hls", true, "1080p", { "User-Agent": HEADERS["User-Agent"], "Referer": ATV_BASE + "/" });
      }
    } catch (e) {
    }
    return null;
  });
}
function tv2Episode(showSlug, episodeNum, seasonNum) {
  return __async(this, null, function* () {
    try {
      var paths = [
        "/diziler/guncel/" + showSlug + "/bolumler",
        "/programlar/guncel/" + showSlug + "/bolumler"
      ];
      var url, foundPage = "", hadListing = false;
      for (var p = 0; p < paths.length; p++) {
        url = TV2_BASE + paths[p];
        var listing = yield fetchText(url);
        if (!listing) continue;
        hadListing = true;
        var re = new RegExp("(\\/diziler\\/guncel\\/" + String(showSlug).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\/bolumler\\/" + String(showSlug).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "-[" + String(episodeNum) + "]+-bolum)", "gi");
        var m;
        while ((m = re.exec(listing)) !== null) {
          var num = m[1].match(/-(\d+)-bolum$/);
          if (num && parseInt(num[1], 10) === parseInt(episodeNum, 10)) {
            foundPage = m[1];
            break;
          }
        }
        if (foundPage) break;
      }
      if (!foundPage) return null;
      var html = yield fetchText(TV2_BASE + foundPage);
      if (!html) return null;
      var cid = (html.match(/data-id="([a-zA-Z0-9]{20,})"/) || [])[1] || (html.match(/data-id\s*=\s*"([a-zA-Z0-9]{20,})"/) || [])[1];
      if (!cid) return null;
      var j = yield fetchJson(TV2_BASE + "/action/media/" + cid, { "Referer": TV2_BASE + "/" }, 15e3);
      if (!j || j.Status !== "Success" || !j.Media || !j.Media.Link || !j.Media.Link.SecurePath) return null;
      var secure = j.Media.Link.SecurePath || "";
      var defaultSvc = (j.Media.Link.DefaultServiceUrl || "https://tv2vod.duhnet.tv").replace(/\/+$/, "");
      var full;
      if (/^https?:/i.test(secure)) full = secure;
      else if (secure.indexOf("//") === 0) full = "https:" + secure;
      else full = defaultSvc + "/" + secure.replace(/^\/+/, "");
      return mkStream(full, "TV2 | " + showSlug + " EP" + episodeNum, "hls", true, "1080p", { "User-Agent": HEADERS["User-Agent"], "Referer": TV2_BASE + "/" });
    } catch (e) {
    }
    return null;
  });
}
function trt1Episode(title, episodeNum) {
  return __async(this, null, function* () {
    try {
      var query = title + " " + episodeNum + ". B\xF6l\xFCm";
      var html = yield fetchText("https://www.youtube.com/results?search_query=" + encodeURIComponent(query), { "User-Agent": HEADERS["User-Agent"] }, 1e4);
      if (!html) return null;
      var ids = [];
      var re = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
      var m;
      while ((m = re.exec(html)) !== null) ids.push(m[1]);
      var seen = {};
      for (var i = 0; i < ids.length; i++) {
        if (seen[ids[i]]) continue;
        seen[ids[i]] = true;
        var st = yield resolveYouTubeMp4(ids[i]);
        if (st) return [mkStream(st.url, "TRT1 | " + title + " EP" + episodeNum + " (YouTube)", st.format, st.isHls, st.quality || "1080p", st.headers)];
      }
    } catch (e) {
    }
    return null;
  });
}
function parseRawId(raw) {
  if (raw.indexOf(":") !== -1) {
    var parts = raw.split(":");
    var sNum = 1, eNum = 1;
    for (var i = 0; i < parts.length; i++) {
      var n = parseInt(parts[i], 10);
      if (!isNaN(n) && i === parts.length - 1) eNum = n;
      else if (!isNaN(n) && i === parts.length - 2) sNum = n;
    }
    return { slug: decodeURIComponent(parts[parts.length - 1]), sNum, eNum };
  }
  return { slug: "", sNum: 1, eNum: 1 };
}
function resolveNetworks(title, keywords) {
  return __async(this, null, function* () {
    var candidates = [];
    var seen = {};
    function add(s) {
      s = String(s || "").replace(/\s+/g, " ").trim();
      if (!s || seen[s]) return;
      seen[s] = true;
      candidates.push(slugify(s));
    }
    add(title);
    add(slugify(title));
    for (var i = 0; i < keywords.length; i++) add(keywords[i]);
    var base = candidates.slice();
    for (var b = 0; b < base.length; b++) {
      var noA = base[b].replace(/^(the|bir)-/, "");
      if (noA !== base[b]) add(noA);
      add(base[b].replace(/-/g, ""));
    }
    return candidates;
  });
}
function nowEpisodeSitemapSlugs() {
  return __async(this, null, function* () {
    var sm = yield fetchText(NOW_BASE + "/sitemap.xml");
    var subs = sm.match(/<loc>([^<]+sitemap_episodes_[^<]+)<\/loc>/gi) || [];
    var slugs = {};
    for (var i = 0; i < subs.length && i < 8; i++) {
      var uri = decodeHtmlEntities(subs[i].replace(/<\/?loc>/g, ""));
      var sub = yield fetchText(uri);
      var re = /<loc>https:\/\/www\.nowtv\.com\.tr\/([^/<]+)\/bolum\/(\d+)<\/loc>/gi;
      var m;
      while ((m = re.exec(sub)) !== null) {
        if (!slugs[m[1]]) slugs[m[1]] = parseInt(m[2], 10);
        else if (parseInt(m[2], 10) > slugs[m[1]]) slugs[m[1]] = parseInt(m[2], 10);
      }
    }
    return slugs;
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
      var slugs = yield nowEpisodeSitemapSlugs();
      var metas = [];
      if (q) {
        var qf = cleanTitle(q);
        for (var slug in slugs) {
          var tn = decodeHtmlEntities(slug.replace(/-/g, " "));
          if (cleanTitle(tn).indexOf(qf) === -1) continue;
          metas.push({ id: "anthology_diziler:now:" + slug, type: "series", name: tn });
          if (metas.length >= 24) break;
        }
        return { metas };
      }
      var html = yield fetchText(NOW_BASE + "/");
      var junk = ["gizlilik-politikasi", "dizi-izle", "program-izle", "now-haber", "yayin-akisi", "uygulama", "kurumsal", "canli-yayin", "iletisim", "duyurular", "hakkimizda", "kullanim-kosullari", "kvkk", "cerez-politikasi", "site-haritasi", "reklam", "canli-tv"];
      var re2 = /<a[^>]+href=["']https:\/\/www\.nowtv\.com\.tr\/([^/"']+)/gi;
      var m2, seen2 = {};
      while ((m2 = re2.exec(html)) !== null) {
        var slug2 = m2[1];
        if (junk.indexOf(slug2) !== -1 || /^[0-9]/.test(slug2) || seen2[slug2]) continue;
        if (!slugs[slug2]) continue;
        seen2[slug2] = true;
        var name = decodeHtmlEntities(slug2.replace(/-/g, " "));
        metas.push({ id: "anthology_diziler:now:" + slug2, type: "series", name });
        if (metas.length >= 20) break;
      }
      if (!metas.length) {
        for (var slug3 in slugs) {
          if (metas.length >= 20) break;
          metas.push({ id: "anthology_diziler:now:" + slug3, type: "series", name: decodeHtmlEntities(slug3.replace(/-/g, " ")) });
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
      if (raw.indexOf("anthology_diziler:") !== 0) return { meta: null };
      var canal = "";
      if (raw.indexOf(":now:") !== -1) canal = "now";
      else if (raw.indexOf(":show:") !== -1) canal = "show";
      else if (raw.indexOf(":kanald:") !== -1) canal = "kanald";
      else if (raw.indexOf(":star:") !== -1) canal = "star";
      else if (raw.indexOf(":atv:") !== -1) canal = "atv";
      else if (raw.indexOf(":trt1:") !== -1) canal = "trt1";
      var marker = "anthology_diziler:" + canal + ":";
      var rest = raw.slice(marker.length);
      var slug = decodeURIComponent(rest.split(":")[0] || "");
      if (!slug) return { meta: null };
      var name = slug.replace(/-/g, " ");
      if (canal === "now") {
        var sm = yield fetchText(NOW_BASE + "/sitemap.xml");
        var smSub = (sm.match(/<loc>([^<]+sitemap_episodes[^<]+)<\/loc>/i) || [])[1];
        if (smSub) {
          var sub = yield fetchText(smSub);
          var re = new RegExp("<loc>https:\\/\\/www\\.nowtv\\.com\\.tr\\/" + slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\/bolum\\/(\\d+)<\\/loc>", "gi");
          var m, videos = [];
          while ((m = re.exec(sub)) !== null) videos.push(m[1]);
          videos.sort(function(a, b) {
            return parseInt(a, 10) - parseInt(b, 10);
          });
          var eps = [];
          for (var i = 0; i < videos.length && i < 40; i++) {
            eps.push({ id: "anthology_diziler:now:" + slug + ":" + Math.max(1, i + 1) + ":" + videos[i], type: "series", season: 1, episode: i + 1, name: "B\xF6l\xFCm " + (i + 1), title: name + " B\xF6l\xFCm " + (i + 1), releaseInfo: "1x" + String(i + 1).padStart(2, "0") });
          }
          if (eps.length) return { meta: { id: raw, type: "series", name, videos: eps } };
        }
      }
      return { meta: { id: raw, type: "series", name, videos: [] } };
    } catch (e) {
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
      var season = parseInt(seasonNum) || 1;
      var episode = parseInt(episodeNum) || 1;
      var canal = "";
      var slug = "";
      if (raw.indexOf("anthology_diziler:") === 0) {
        if (raw.indexOf(":now:") !== -1) canal = "now";
        else if (raw.indexOf(":show:") !== -1) canal = "show";
        else if (raw.indexOf(":kanald:") !== -1) canal = "kanald";
        else if (raw.indexOf(":star:") !== -1) canal = "star";
        else if (raw.indexOf(":atv:") !== -1) canal = "atv";
        else if (raw.indexOf(":trt1:") !== -1) canal = "trt1";
        else if (raw.indexOf(":tv2:") !== -1) canal = "tv2";
        var parsed = parseRawId(raw);
        slug = parsed.slug;
        var marker = "anthology_diziler:" + canal + ":";
        var rest = raw.slice(marker.length);
        var parts = rest.split(":");
        slug = decodeURIComponent(parts[0]);
        for (var i = 1; i < parts.length; i++) {
          var n = parseInt(parts[i], 10);
          if (!isNaN(n) && i === parts.length - 1) episode = n;
          else if (!isNaN(n) && i === parts.length - 2) season = n;
        }
      }
      var info = null;
      if (!slug) {
        if (idNorm.kind === "title") {
          info = { title: idNorm.id, origTitle: idNorm.id, aliases: [], kind: "title", type: "tv" };
        } else {
          info = yield resolveSeriesInfo(raw, mediaType, TMDB_API_KEY);
          if (!info || !info.title && !info.origTitle) {
            if (idNorm.kind === "title") info = { title: idNorm.id, origTitle: idNorm.id, aliases: [], kind: "title", type: "tv" };
            else return [];
          }
        }
      }
      var title = info ? info.title || info.origTitle : slug.replace(/-/g, " ");
      var keywords = info ? seriesSearchTitles(info) : [title];
      var slugs = slug ? [slug] : yield resolveNetworks(title, keywords);
      var all = [];
      var nowLabel = info ? title : slug.replace(/-/g, " ");
      var showSlug = slugs[0];
      if (!canal || canal === "now") {
        var one = yield nowEpisodePage(showSlug, episode);
        if (one) all.push(one);
        if (!one && season > 0) {
          var alt = yield nowEpisodePage(showSlug, episode + (season - 1) * 30);
          if (alt) all.push(alt);
        }
      }
      if (!canal || canal === "show") {
        var so = yield showEpisodePage(showSlug, season, episode);
        if (so) all.push(so);
      }
      if (!canal || canal === "kanald") {
        var ka = yield kanaldEpisode(showSlug, episode);
        if (ka) all.push(ka);
      }
      if (!canal || canal === "star") {
        var st = yield starEpisode(showSlug, episode);
        if (st) for (var x = 0; x < st.length; x++) all.push(st[x]);
      }
      if (!canal || canal === "atv") {
        var at = yield atvEpisode(showSlug, episode);
        if (at) all.push(at);
      }
      if (!canal || canal === "trt1" || !canal && all.length === 0) {
        var tr = yield trt1Episode(title, episode);
        if (tr) for (var y = 0; y < tr.length; y++) all.push(tr[y]);
      }
      if (!canal || canal === "tv2") {
        var t2 = yield tv2Episode(showSlug, episode);
        if (t2) all.push(t2);
      }
      return all;
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

