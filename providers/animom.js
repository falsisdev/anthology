/**
 * Anthology Provider: animom
 * Built from src/animom/index.js
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

// src/animom/index.js
var { sortStreamsByQuality } = require_quality();
var { loadConfig, val, wrapAll } = require_config();
var { timeoutSignal } = require_http();
var { normalizeSeriesId, resolveSeriesInfo, seriesSearchTitles, asciiFold } = require_turkish_series();
var _cfgReady = null;
function cfgReady() {
  if (!_cfgReady) {
    _cfgReady = loadConfig().then(function() {
      var v = val("urls.anime.animom.base");
      if (v) BASE_URL = String(v).replace(/\/+$/, "");
      if (v) HDPLAYER_HOST = "https://hdplayersystem.com";
      if (HEADERS) HEADERS.Referer = BASE_URL + "/";
    });
  }
  return _cfgReady;
}
var BASE_URL = "https://animom.org";
var HDPLAYER_HOST = "https://hdplayersystem.com";
var SITE_NAME = "AniMOM";
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
  "Accept": "application/json, text/javascript, */*; q=0.01"
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
function animomSearch(query) {
  return __async(this, null, function* () {
    try {
      var res = yield fetch(BASE_URL + "/search", {
        method: "POST",
        headers: Object.assign({}, AJAX_HEADERS, { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" }),
        body: "query=" + encodeURIComponent(query),
        signal: timeoutSignal(9e3)
      });
      if (!res.ok) return [];
      var data = yield res.json();
      if (!data || !data.success || !data.theme) return [];
      return parseSearchHtml(data.theme);
    } catch (e) {
      return [];
    }
  });
}
function parseSearchHtml(html) {
  var out = [];
  var blocks = html.match(/<li class="w-1\/2">[\s\S]*?<\/li>/g) || [];
  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    var a = b.match(/href="([^"]*\/anime\/[^"]+)"/);
    var img = b.match(/data-src="([^"]+)"/);
    var alt = b.match(/alt="([^"]*)"/);
    if (!a) continue;
    var slug = a[1].split("/").pop();
    var name = alt && alt[1] || slug;
    out.push({
      slug,
      url: a[1],
      name: decodeHtmlEntities(name),
      poster: img && img[1] || ""
    });
  }
  return out;
}
function parseEpisodeLinks(html, slug) {
  var out = [];
  var seen = {};
  var hrefs = html.match(/href="https:\/\/animom\.org\/anime\/[^"]+"/g) || [];
  for (var i = 0; i < hrefs.length; i++) {
    var url = hrefs[i].replace(/^href="/, "").replace(/"$/, "");
    var m = url.match(/\/sezon-(\d+)\/bolum-(\d+)/);
    var s = 1, e = 0;
    if (m) {
      s = parseInt(m[1], 10);
      e = parseInt(m[2], 10);
    } else {
      var m2 = url.match(/anime\/[^\/]*?-(\d+)-bolum/);
      if (!m2) continue;
      e = parseInt(m2[1], 10);
      if (isNaN(e)) continue;
      s = 1;
    }
    if (isNaN(e) || e < 1) continue;
    var key = s + ":" + e;
    if (seen[key]) continue;
    seen[key] = true;
    out.push({ season: s, episode: e, url });
  }
  out.sort(function(aa, bb) {
    return aa.season - bb.season || aa.episode - bb.episode;
  });
  return out;
}
function resolveHdPlayer(hash) {
  return __async(this, null, function* () {
    try {
      var res = yield fetch(HDPLAYER_HOST + "/player/index.php?data=" + hash + "&do=getVideo", {
        method: "POST",
        headers: Object.assign({}, AJAX_HEADERS, {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "Referer": HDPLAYER_HOST + "/video/" + hash,
          "Origin": HDPLAYER_HOST
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
      if (!data || !data.securedLink) return [];
      var quality = yield probeHlsHeight(data.securedLink);
      if (!quality) quality = "720p";
      var ref = HDPLAYER_HOST + "/";
      return [buildStream(SITE_NAME, "\u231C " + SITE_NAME + " \u231F | HDPlayer [" + quality + " HLS]", data.securedLink, quality, "hls", true, ref)];
    } catch (e) {
      return [];
    }
  });
}
function probeHlsHeight(url) {
  return __async(this, null, function* () {
    try {
      var r = yield fetch(url, { headers: { "User-Agent": HEADERS["User-Agent"], "Referer": HDPLAYER_HOST + "/" }, signal: timeoutSignal(6e3) });
      if (!r.ok) return null;
      var txt = yield r.text();
      var m = txt.match(/RESOLUTION=\d+x(\d+)/g);
      if (m) {
        var max = 0;
        for (var i = 0; i < m.length; i++) {
          var h = parseInt(m[i].match(/x(\d+)/)[1], 10);
          if (h > max) max = h;
        }
        if (max) return max + "p";
      }
      return null;
    } catch (e) {
      return null;
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
function resolveYourUpload(embedId) {
  return __async(this, null, function* () {
    try {
      var videoUrl = "http://www.vidcache.net:8161/" + embedId + ".mp4";
      return [buildStream(SITE_NAME, "\u231C " + SITE_NAME + " \u231F | YourUpload [Direct MP4]", videoUrl, "720p", "mp4", false, BASE_URL + "/")];
    } catch (e) {
      return [];
    }
  });
}
function extractFrames(html) {
  var out = [];
  var seen = {};
  var df = html.match(/data-frame="([^"]+)"/g) || [];
  for (var i = 0; i < df.length; i++) {
    var u = df[i].replace(/^data-frame="/, "").replace(/"$/, "");
    if (!seen[u]) {
      seen[u] = true;
      out.push(u);
    }
  }
  var ifr = html.match(/<iframe[^>]+src="([^"]+)"/g) || [];
  for (var k = 0; k < ifr.length; k++) {
    var u2 = ifr[k].match(/src="([^"]+)"/);
    if (!u2) continue;
    u2 = u2[1];
    if (!u2 || u2.indexOf("http") !== 0) continue;
    if (!seen[u2]) {
      seen[u2] = true;
      out.push(u2);
    }
  }
  return out;
}
function resolveEpisodeStreams(epUrl) {
  return __async(this, null, function* () {
    try {
      var res = yield fetch(epUrl, { headers: HEADERS, signal: timeoutSignal(1e4) });
      if (!res.ok) return [];
      var html = yield res.text();
      var frames = extractFrames(html);
      var results = [];
      for (var i = 0; i < frames.length; i++) {
        var url = frames[i];
        var mm = url.match(/hdplayersystem\.com\/(?:video|player\/index\.php\?data=)\/([a-f0-9]+)/i);
        var mh = url.match(/player\/index\.php\?data=([a-f0-9]+)/i);
        if (mm || mh) {
          var hash = mm && mm[1] || mh && mh[1];
          var hs = yield resolveHdPlayer(hash);
          for (var a = 0; a < hs.length; a++) results.push(hs[a]);
        } else if (url.indexOf("video.sibnet.ru") !== -1) {
          var sib = yield resolveSibnet(url);
          for (var b = 0; b < sib.length; b++) results.push(sib[b]);
        } else if (url.indexOf("yourupload.com/embed/") !== -1) {
          var yId = url.match(/embed\/([^\/?#]+)/);
          if (yId) {
            var yup = yield resolveYourUpload(yId[1]);
            for (var c = 0; c < yup.length; c++) results.push(yup[c]);
          }
        }
      }
      return results;
    } catch (e) {
      return [];
    }
  });
}
function fetchAnimePage(slug) {
  return __async(this, null, function* () {
    try {
      var res = yield fetch(BASE_URL + "/anime/" + slug, { headers: HEADERS, signal: timeoutSignal(1e4) });
      if (!res.ok) return null;
      return yield res.text();
    } catch (e) {
      return null;
    }
  });
}
function pickPoster(html) {
  var m = html.match(/"image":\s*"([^"]+)"/);
  if (m) return m[1];
  var og = html.match(/property="og:image" content="([^"]+)"/);
  if (og) return og[1];
  return "";
}
function pickTitle(html) {
  var og = html.match(/property="og:title" content="([^"]+)"/);
  if (og) return decodeHtmlEntities(og[1]).replace(/\s*-\s*.*$/i, "").trim();
  var t = html.match(/<title>([^<]+)<\/title>/);
  if (t) return decodeHtmlEntities(t[1]).replace(/\s*-\s*.*$/i, "").trim();
  return "";
}
function resolveMatch(show) {
  return __async(this, null, function* () {
    var titles = seriesSearchTitles(show);
    var best = null;
    var bestScore = 0;
    for (var i = 0; i < titles.length && bestScore < 1; i++) {
      var results = yield animomSearch(titles[i]);
      for (var j = 0; j < results.length; j++) {
        var sc = scoreMatch(results[j].name, show);
        if (sc > bestScore) {
          bestScore = sc;
          best = results[j];
        }
      }
    }
    if (best && bestScore >= 0.5) return best;
    return null;
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
function scoreMatch(name, show) {
  var candidates = [show.title, show.origTitle].concat(show.aliases || []);
  var nameClean = ultraClean(name);
  for (var i = 0; i < candidates.length; i++) {
    if (!candidates[i]) continue;
    if (nameClean === ultraClean(candidates[i])) return 1;
  }
  var best = 0;
  for (var k = 0; k < candidates.length; k++) {
    if (!candidates[k]) continue;
    var t = tokensMatch(name, candidates[k]);
    if (t > best) best = t;
  }
  return best;
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
        if (tmdbId.indexOf("animom:show:") === 0) {
          id = tmdbId.replace("animom:show:", "");
        } else if (tmdbId.indexOf("animom:ep:") === 0) {
          var epParts = tmdbId.replace("animom:ep:", "").split(":");
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
      var slug = "";
      if (typeof id === "string" && id.indexOf("/") === -1 && id.indexOf(".") === -1 && /^(?!tt\d+$|\d+$)[a-z0-9-]+$/i.test(id) && (tmdbId && String(tmdbId).indexOf("animom:") === 0)) {
        slug = id;
      }
      if (!slug) {
        var show = yield resolveSeriesInfo(id, mediaType || "series");
        if (!show || !show.title) return out;
        var match = yield resolveMatch(show);
        if (!match) return out;
        slug = match.slug;
      }
      var pageHtml = yield fetchAnimePage(slug);
      if (pageHtml) {
        var episodes = parseEpisodeLinks(pageHtml, slug);
        var ep = null;
        for (var i = 0; i < episodes.length; i++) {
          var okS = episodes[i].season === finalSeason || finalSeason <= 1 && episodes[i].season === 1 || finalSeason <= 0 && episodes[i].season === 1;
          if (okS && episodes[i].episode === finalEpisode) {
            ep = episodes[i];
            break;
          }
        }
        if (ep) {
          out = yield resolveEpisodeStreams(ep.url);
          return out;
        }
        if (finalSeason > 0 && finalEpisode > 0 && episodes.length > 0 && episodes[0].url.indexOf("/sezon-") !== -1) {
          var guess = BASE_URL + "/anime/" + slug + "/sezon-" + finalSeason + "/bolum-" + finalEpisode;
          out = yield resolveEpisodeStreams(guess);
          return out;
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
      if (typeof id === "string" && id.indexOf("animom:show:") === 0) {
        slug = id.replace("animom:show:", "");
      }
      if (!slug) {
        var show = yield resolveSeriesInfo(id, "series");
        if (!show || !show.title) return null;
        var match = yield resolveMatch(show);
        if (!match) return null;
        slug = match.slug;
      }
      var html = yield fetchAnimePage(slug);
      if (!html) return null;
      var episodes = parseEpisodeLinks(html, slug);
      var videos = [];
      for (var i = 0; i < episodes.length; i++) {
        videos.push({
          id: "animom:ep:" + slug + ":" + episodes[i].season + ":" + episodes[i].episode,
          name: episodes[i].season + ". Sezon " + episodes[i].episode + ". B\xF6l\xFCm",
          season: episodes[i].season,
          number: episodes[i].episode,
          title: episodes[i].season + ". Sezon " + episodes[i].episode + ". B\xF6l\xFCm"
        });
      }
      return {
        meta: {
          id: "animom:show:" + slug,
          type: "series",
          name: pickTitle(html) || slug,
          poster: pickPoster(html),
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
    try {
      var metas = [];
      if (args && args.search) {
        var results = yield animomSearch(args.search);
        for (var i = 0; i < results.length; i++) {
          metas.push({
            id: "animom:show:" + results[i].slug,
            type: "series",
            name: results[i].name,
            poster: results[i].poster
          });
        }
        return { metas };
      }
      var res = yield fetch(BASE_URL + "/home", { headers: HEADERS, signal: timeoutSignal(1e4) });
      if (!res.ok) return { metas: [] };
      var html = yield res.text();
      var re = /<a\s+class="block"\s+href="https:\/\/animom\.org\/anime\/([^"\?\/]+)"[^>]*>\s*<img[^>]*\sdata-src="([^"]+)"[^>]*alt="([^"]*)"/g;
      var m;
      var seen = {};
      while ((m = re.exec(html)) !== null) {
        var slug = m[1];
        if (seen[slug]) continue;
        seen[slug] = true;
        metas.push({
          id: "animom:show:" + slug,
          type: "series",
          name: decodeHtmlEntities(m[3]) || slug,
          poster: m[2]
        });
        if (metas.length >= 30) break;
      }
      return { metas };
    } catch (e) {
      return { metas: [] };
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

