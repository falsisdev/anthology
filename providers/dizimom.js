/**
 * Anthology Provider: dizimom
 * Built from src/dizimom/index.js
 * Build: v1.8.30 (anthology build system)
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

// src/dizimom/index.js
var { sortStreamsByQuality } = require_quality();
var { loadConfig, val, wrapAll } = require_config();
var _cfgReady = null;
function cfgReady() {
  if (!_cfgReady) {
    _cfgReady = loadConfig().then(function() {
      var v;
      v = val("urls.series.dizimom.base");
      if (v) BASE_URL = String(v).replace(/\/+$/, "");
      if (HEADERS) HEADERS.Referer = BASE_URL + "/";
    });
  }
  return _cfgReady;
}
var cheerio = require("cheerio-without-node-native");
var BASE_URL = "https://ddizimom.net";
var TMDB_API_KEY = "500330721680edb6d5f7f12ba7cd9023";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Referer": "https://ddizimom.net/"
};
function resolveTmdbInfo(id, mediaType) {
  return __async(this, null, function* () {
    try {
      let cleanId = String(id || "").trim();
      if (cleanId.includes(":")) cleanId = cleanId.split(":")[0];
      let numericId = null;
      let title = "";
      let origTitle = "";
      if (cleanId.startsWith("tt")) {
        const findRes = yield fetch(`https://api.themoviedb.org/3/find/${cleanId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`);
        if (findRes.ok) {
          const fData = yield findRes.json();
          const item = mediaType === "tv" || mediaType === "series" ? fData.tv_results && fData.tv_results[0] : fData.movie_results && fData.movie_results[0];
          if (item) {
            numericId = item.id;
            title = item.name || item.title || "";
            origTitle = item.original_name || item.original_title || "";
          }
        }
      } else {
        numericId = cleanId;
      }
      if (numericId && (!title || !origTitle)) {
        const type = mediaType === "tv" || mediaType === "series" ? "tv" : "movie";
        const tRes = yield fetch(`https://api.themoviedb.org/3/${type}/${numericId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
        if (tRes.ok) {
          const tData = yield tRes.json();
          title = tData.name || tData.title || title;
          origTitle = tData.original_name || tData.original_title || origTitle;
        }
      }
      return { title, origTitle, numericId };
    } catch (e) {
      return { title: "", origTitle: "", numericId: id };
    }
  });
}
function normalizeTitle(str) {
  if (!str) return "";
  return str.toLowerCase().replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ç/g, "c").replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
}

function resolvePilavyerStream(epUrl, titlePrefix) {
  return __async(this, null, function* () {
    try {
      var epRes = yield fetch(epUrl, { headers: HEADERS });
      if (!epRes.ok) return [];
      var epHtml = yield epRes.text();
      var pvMatch = epHtml.match(/data-pv=["']([^"']+)["']/i);
      if (!pvMatch) return [];
      var pv = pvMatch[1];
      var sPhpUrl = "https://pilavyerplay.top/assets/js/s.php?s=" + encodeURIComponent(pv);
      var pRes = yield fetch(sPhpUrl, {
        headers: {
          "User-Agent": HEADERS["User-Agent"],
          "Referer": "https://ddizimom.net/"
        }
      });
      if (!pRes.ok) return [];
      var pHtml = yield pRes.text();
      var playerMatch = pHtml.match(/window\.__PLAYER__\s*=\s*(\{[\s\S]*?\});/);
      if (!playerMatch) return [];
      var pData = JSON.parse(playerMatch[1]);
      if (!pData || !pData.stream) return [];
      var subs = [];
      if (Array.isArray(pData.subs)) {
        subs = pData.subs.map(function(s) {
          return {
            id: s.lang || "tr",
            lang: s.lang === "tr" ? "tur" : s.lang === "en" ? "eng" : (s.lang || "tur"),
            language: s.lang || "tr",
            label: s.label || (s.lang === "tr" ? "Türkçe" : "İngilizce"),
            url: s.src,
            format: "vtt",
            type: "text/vtt",
            headers: {
              "User-Agent": HEADERS["User-Agent"],
              "Referer": "https://pilavyerplay.top/"
            }
          };
        });
      }
      var streamTitle = titlePrefix ? ("\u231C DiziMom \u231F | " + titlePrefix + " (1080p HLS)") : "\u231C DiziMom \u231F | Pilavyer \u2022 [TR Altyaz\u0131l\u0131] (1080p HLS)";
      return [{
        name: "DiziMom",
        title: streamTitle,
        url: pData.stream,
        quality: "1080p",
        format: "hls",
        isHls: true,
        headers: {
          "User-Agent": HEADERS["User-Agent"],
          "Referer": "https://pilavyerplay.top/"
        },
        behaviorHints: {
          notWebReady: true,
          proxyHeaders: {
            request: {
              "User-Agent": HEADERS["User-Agent"],
              "Referer": "https://pilavyerplay.top/"
            }
          }
        },
        provider: "dizimom",
        subtitles: subs
      }];
    } catch (e) {
      return [];
    }
  });
}
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
  return __async(this, null, function* () {
    try {
      if (typeof tmdbId === "object" && tmdbId !== null) {
        mediaType = tmdbId.type || mediaType;
        seasonNum = tmdbId.season || seasonNum;
        episodeNum = tmdbId.episode || episodeNum;
        tmdbId = tmdbId.id;
      }
      if (typeof tmdbId === "string" && tmdbId.indexOf(":") !== -1 && !tmdbId.startsWith("dizimom:")) {
        var parts = tmdbId.split(":");
        if (parts.length >= 3) {
          var s = parseInt(parts[parts.length - 2]);
          var e = parseInt(parts[parts.length - 1]);
          if (!isNaN(s)) seasonNum = s;
          if (!isNaN(e)) episodeNum = e;
          tmdbId = parts[0];
        }
      }
      if (!mediaType) {
        mediaType = (seasonNum !== undefined && episodeNum !== undefined) ? "tv" : "movie";
      }

      if (typeof tmdbId === "string" && tmdbId.startsWith("dizimom:ep:")) {
        var epSlug = tmdbId.replace("dizimom:ep:", "").replace(/^\//, "");
        var targetEpUrl = epSlug.startsWith("http") ? epSlug : (`${BASE_URL}/` + (epSlug.startsWith("dizi/") || epSlug.startsWith("film/") ? "" : "dizi/") + epSlug);
        return yield resolvePilavyerStream(targetEpUrl);
      }
      if (typeof tmdbId === "string" && tmdbId.startsWith("dizimom:show:")) {
        var showSlug = tmdbId.replace("dizimom:show:", "").replace(/^\//, "");
        var sNum = parseInt(seasonNum) || 1;
        var eNum = parseInt(episodeNum) || 1;
        var directEpUrl = `${BASE_URL}/dizi/${showSlug}/sezon-${sNum}/bolum-${eNum}`;
        var directRes = yield resolvePilavyerStream(directEpUrl);
        if (directRes && directRes.length > 0) return directRes;
      }

      var info = yield resolveTmdbInfo(tmdbId, mediaType);
      var queries = [info.title, info.origTitle].filter(Boolean);
      if (queries.length === 0) return [];

      var season = parseInt(seasonNum) || 1;
      var episode = parseInt(episodeNum) || 1;
      var isMovie = (mediaType === "movie");

      for (var q of queries) {
        var searchUrl = `${BASE_URL}/ara?q=${encodeURIComponent(q)}`;
        var sRes = yield fetch(searchUrl, { headers: HEADERS });
        if (!sRes.ok) continue;
        var sHtml = yield sRes.text();
        var $ = cheerio.load(sHtml);
        var normQ = normalizeTitle(q);

        var matchedItems = [];
        $("a").each((i, el) => {
          var href = $(el).attr("href") || "";
          var isDiziLink = href.includes("/dizi/") && !href.includes("/sezon-");
          var isFilmLink = href.includes("/film/");
          if ((!isMovie && isDiziLink) || (isMovie && isFilmLink)) {
            var rawText = $(el).text().trim().replace(/\s+/g, " ");
            var normText = normalizeTitle(rawText);
            if (normText.includes(normQ) || normQ.includes(normText)) {
              matchedItems.push({ href: href, title: rawText });
            }
          }
        });

        for (var item of matchedItems.slice(0, 3)) {
          var targetPageUrl = "";
          if (isMovie) {
            targetPageUrl = item.href;
          } else {
            var slug = item.href.split("/dizi/")[1].replace(/\/$/, "");
            targetPageUrl = `${BASE_URL}/dizi/${slug}/sezon-${season}/bolum-${episode}`;
          }

          var label = item.title.replace(/^Dizi\s+HD\s+(\d+\.\d+\s+)?/i, "").replace(/^Film\s+HD\s+(\d+\.\d+\s+)?/i, "").trim();
          var streams = yield resolvePilavyerStream(targetPageUrl, label);
          if (streams && streams.length > 0) {
            return streams;
          }
        }
      }
      return [];
    } catch (err) {
      return [];
    }
  });
}
function getCatalog(args) {
  return __async(this, null, function* () {
    try {
      const query = args && args.search || args && args.extra && args.extra.search || args && args.query || "";
      const metas = [];
      const seen = new Set();
      if (query) {
        const searchUrl = `${BASE_URL}/ara?q=${encodeURIComponent(query)}`;
        const sRes = yield fetch(searchUrl, { headers: HEADERS });
        if (!sRes.ok) return { metas: [] };
        const sHtml = yield sRes.text();
        const $ = cheerio.load(sHtml);
        $("a").each((i, el) => {
          const href = $(el).attr("href") || "";
          if (href.includes("/dizi/") && !href.includes("/sezon-")) {
            const slug = href.split("/dizi/")[1].replace(/\/$/, "");
            if (!slug || seen.has(slug)) return;
            seen.add(slug);
            const rawTitle = $(el).text().trim().replace(/\s+/g, " ");
            const title = rawTitle.replace(/^Dizi\s+HD\s+(\d+\.\d+\s+)?/i, "").replace(/\s+\d{4}$/, "").trim() || slug;
            const img = $(el).find("img").attr("src") || $(el).find("img").attr("data-src") || "";
            const poster = img.startsWith("http") ? img : "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png";
            metas.push({
              id: `dizimom:show:${slug}`,
              type: "tv",
              name: title,
              poster,
              background: poster,
              genres: ["Yabanc\u0131 Dizi", "DiziMom"],
              description: `${title} - DiziMom Ar\u015Fivi`
            });
          }
        });
        return { metas };
      }
      const res = yield fetch(`${BASE_URL}/diziler`, { headers: HEADERS });
      if (!res.ok) return { metas: [] };
      const html = yield res.text();
      const $ = cheerio.load(html);
      $("a").each((i, el) => {
        const href = $(el).attr("href") || "";
        if (href.includes("/dizi/") && !href.includes("/sezon-")) {
          const slug = href.split("/dizi/")[1].replace(/\/$/, "");
          if (!slug || seen.has(slug)) return;
          seen.add(slug);
          const rawTitle = $(el).text().trim().replace(/\s+/g, " ");
          const title = rawTitle.replace(/^Dizi\s+HD\s+(\d+\.\d+\s+)?/i, "").replace(/\s+\d{4}$/, "").trim() || slug;
          const img = $(el).find("img").attr("src") || $(el).find("img").attr("data-src") || "";
          const poster = img.startsWith("http") ? img : "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png";
          metas.push({
            id: `dizimom:show:${slug}`,
            type: "tv",
            name: title,
            poster,
            background: poster,
            genres: ["Yabanc\u0131 Dizi", "DiziMom"],
            description: `${title} - DiziMom Ar\u015Fivi`
          });
        }
      });
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
      if (rawId.startsWith("dizimom:show:")) {
        const showSlug = rawId.replace("dizimom:show:", "");
        const showUrl = `${BASE_URL}/dizi/${showSlug}`;
        const res = yield fetch(showUrl, { headers: HEADERS });
        if (!res.ok) return { meta: null };
        const html = yield res.text();
        const $ = cheerio.load(html);
        const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<title>([^<]+)<\/title>/i);
        const rawTitle = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : showSlug;
        const title = rawTitle.replace(/\s*izle\s*$/i, "").replace(/^Dizi\s+HD\s+(\d+\.\d+\s+)?/i, "").trim();
        const ogImg = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
        const poster = ogImg ? ogImg[1] : "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png";
        const desc = $('meta[name="description"]').attr("content") || `${title} - DiziMom Ar\u015Fivi`;
        const videos = [];
        const seen = new Set();
        $("a").each((i, el) => {
          const href = $(el).attr("href") || "";
          const m = href.match(/\/sezon-(\d+)\/bolum-(\d+)/);
          if (m) {
            const sNum = parseInt(m[1]);
            const eNum = parseInt(m[2]);
            const epKey = `${sNum}:${eNum}`;
            if (seen.has(epKey)) return;
            seen.add(epKey);
            const epText = $(el).text().trim().replace(/\s+/g, " ") || `${sNum}. Sezon ${eNum}. B\xF6l\xFCm`;
            videos.push({
              id: `dizimom:ep:${showSlug}/sezon-${sNum}/bolum-${eNum}`,
              title: epText,
              season: sNum,
              episode: eNum
            });
          }
        });
        videos.sort((a, b) => a.season - b.season || a.episode - b.episode);
        return {
          meta: {
            id: rawId,
            type: "tv",
            name: title,
            poster,
            background: poster,
            description: desc,
            genres: ["Yabanc\u0131 Dizi", "DiziMom"],
            videos
          }
        };
      }
      if (rawId.startsWith("dizimom:ep:")) {
        const epSlug = rawId.replace("dizimom:ep:", "").replace(/^\//, "");
        const epUrl = `${BASE_URL}/dizi/${epSlug}`;
        const res = yield fetch(epUrl, { headers: HEADERS });
        if (!res.ok) return { meta: null };
        const html = yield res.text();
        const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<title>([^<]+)<\/title>/i);
        const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : "DiziMom B\xF6l\xFCm";
        const ogImg = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
        const poster = ogImg ? ogImg[1] : "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png";
        const sMatch = epSlug.match(/sezon-(\d+)/i);
        const eMatch = epSlug.match(/bolum-(\d+)/i);
        const sNum = sMatch ? parseInt(sMatch[1]) : 1;
        const eNum = eMatch ? parseInt(eMatch[1]) : 1;
        return {
          meta: {
            id: rawId,
            type: "tv",
            name: title,
            poster,
            background: poster,
            description: `${title} - DiziMom`,
            genres: ["Yabanc\u0131 Dizi", "DiziMom"],
            videos: [{
              id: rawId,
              title,
              season: sNum,
              episode: eNum
            }]
          }
        };
      }
      return { meta: null };
    } catch (e) {
      return { meta: null };
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
if (typeof module !== "undefined") {
  module.exports = wrapAll({ getStreams, getCatalog, getMeta }, cfgReady);
}
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

