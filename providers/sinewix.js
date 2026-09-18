/**
 * Anthology Provider: sinewix
 * Built from src/sinewix/index.js
 * Build Date: 2026-09-18T16:40:17.351Z
 */
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};

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

// src/sinewix/index.js
var { loadConfig, val, wrapAll } = require_config();
var _cfgReady = null;
function cfgReady() {
  if (!_cfgReady) {
    _cfgReady = loadConfig().then(function() {
      var v;
      v = val("urls.movies.sinewix.api_base");
      if (v) API_BASE = String(v).replace(/\/+$/, "");
      v = val("urls.movies.sinewix.panel_base");
      if (v) PANEL_BASE = String(v).replace(/\/+$/, "");
      if (STREAM_HEADERS) {
        STREAM_HEADERS.Referer = PANEL_BASE + "/";
        STREAM_HEADERS.Origin = PANEL_BASE;
      }
    });
  }
  return _cfgReady;
}
var __getOwnPropNames2 = Object.getOwnPropertyNames;
var __commonJS2 = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames2(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
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
var require_quality = __commonJS2({
  "src/shared/quality.js"(exports2, module2) {
    function getQualityScore(s) {
      if (!s) return 0;
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
var { sortStreamsByQuality } = require_quality();
var API_BASE = "https://ydfvfdizipanel.ru/public/api";
var PANEL_BASE = "https://ydfvfdizipanel.ru";
var API_KEY = "9iQNC5HQwPlaFuJDkhncJ5XTJ8feGXOJatAA";
var API_HEADERS = {
  "hash256": "711bff4afeb47f07ab08a0b07e85d3835e739295e8a6361db77eebd93d96306b",
  "signature": "3082058830820370a00302010202145bbfbba9791db758ad12295636e094ab4b07dc24300d06092a864886f70d01010b05003074310b3009060355040613025553311330110603550408130a43616c69666f726e6961311630140603550407130d4d6f756e7461696e205669657731143012060355040a130b476f6f676c6520496e632e3110300e060355040b1307416e64726f69643110300e06035504031307416e64726f69643020170d3231313231353232303433335a180f32303531313231353232303433335a3074310b3009060355040613025553311330110603550408130a43616c69666f726e6961311630140603550407130d4d6f756e7461696e205669657731143012060355040a130b476f6f676c6520496e632e3110300e060355040b1307416e64726f69643110300e06035504031307416e64726f696430820222300d06092a864886f70d01010105000382020f003082020a0282020100a5106a24bb3f9c0aaf3a2b228f794b5eaf1757ba758b19736a39d1bdc73fc983a7237b8d5ca5156cfa999c1dab3418bbc2be0920e0ee001c8aa4812d1dae75d080f09e91e0abda83ff9a76e8384a4429f4849248069a59505b12ac2c14ba2e4d1a13afcdaf54e508697ff928a9f738e6f4a6fc27409c55329eb149b5ff89c5a2d7c06bf9e62086f955cad17d7be2623ee9d5ec56068eadc23cb0965a13ff97d49fe10ef41afc6eeca36b4ace9582097faff89f590bc831cdb3a69eec5d15b67c3f2cad49e37ed053733e3d2d400c47755b932bdbe15d749fd6ad1dce30ba5e66094dfb6ee6f64cafb807e11b19a990c5d078c6d6701cda0bdeb21e99404ff166074f4c89b04c418f4e7940db5c78647c475bcfb85d4c4e836ee7d7c1d53e9e736b5d96d4b4d8b98209064b729ac6a682d55a6a930e518d849898bb28329ca0aaa133b5e5270a9d5940cac6af4802a57fd971efda91abb602882dd6aa6ce2b236b57b52ee2481498f0cacbcc2c36c238bc84becad7eaaf1125b9a1ca9ded6c79f3f283a52050377809b2a9995d66e1636b0ed426fdd8685c47cb18e82077f4aefcc07887e1dc58b4d64be1632f0e7b4625da6f40c65a8512a6454a4b96963e7f876136e6c0069a519a79ad632078ed965aa12482458060c030ed50db706d854f88cb004630b49285d8af8b471ff8f6070687826412287b50049bcb7d1b6b62ef90203010001a310300e300c0603551d13040530030101ff300d06092a864886f70d01010b0500038202010051c0b7bd793181dc29ca777d3773f928a366c8469ecf2fa3cfb076e8831970d19bb2b96e44e8ccc647cf0696bb824ac61c23d958525d283cab26037b04d58aa79bf92192db843adf5c26a980f081d2f0e14f759fc5ff4c5bb3dce0860299bfe7b349a8155a2efaf731ba25ce796a80c1442c7bf80f8c1a7912ff0b6f6592264315337251a846460194fa594f81f38f9e5233a63201e931ad9cab5bf119f24025613f307194eaa6eb39a83f3c05a49ba34455b1aff7c6839bbb657d9392ffdf397432af6e56ba9534a8b07d7060fe09691c6cf07cb5324f67b3cc0871a8c621d81fe71d71085c55206a4f57e25f774fd4b979b299e8bb076b50fca42fa57da2d519fd35a4a7c0137babaed4345f8031b63b6a71f5e8268f709d658ccd7c2a58849379d25bfa598c3f4a2c3d9b7d89285fefeb7f0ec65137d38b08ce432a15688b624a179e6a4a505ebc3bcdfbc4d4330508ee2d8d0f016924dcec21a6838ef7d834c6f43bde4a5201ed0b3bb4e9bd377b470e36bcf5bc3d56169dbd8e39567aa7dce4d1a8a8a54a5e1aa6fb1a8aab0062669a966f96e15ccce6fe12ea5e6a8b8c8823bdc94988ca39759fd1cc8fd8ae5c3d74db50b174cf7d77655016c075c91d439ed01cc0a9f695c99fad3b5495fb6cb1e01a5fa020cc6022a85c07ec55f9eba89719f86e49d34ab5bd208c5f70cced2b7b7963c014f8404432979b506de29e",
  "User-Agent": "EasyPlex (Android 14; SM-A546B; Samsung Galaxy A54 5G; tr)",
  "Accept": "application/json"
};
var STREAM_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "Referer": PANEL_BASE + "/",
  "Origin": PANEL_BASE
};
function resolveMediaFireLink(link) {
  return fetch(link).then(function(res) {
    return res.text();
  }).then(function(html) {
    var match = html.match(/href="(https:\/\/download\d+\.mediafire\.com[^"]+)"/);
    return match ? match[1] : link;
  }).catch(function() {
    return link;
  });
}
function buildStreams(videos, sinewixName) {
  if (!Array.isArray(videos)) return Promise.resolve([]);
  return Promise.all(
    videos.map(function(v) {
      var link = v.link;
      var serverName = v.server || "Sunucu";
      var isMF = link && link.includes("mediafire.com");
      var isDual = v.lang && /dual/i.test(v.lang) || link && /dual/i.test(link);
      var langStr = isDual ? "DUAL (TR/EN)" : v.lang || "T\xFCrk\xE7e";
      var displayTitle = "\u231C S\u0130NEW\u0130X \u231F | " + (isMF ? "MED\u0130AF\u0130RE" : serverName.toUpperCase()) + " (" + langStr + " - 1080p MKV)";
      if (isMF) {
        return resolveMediaFireLink(link).then(function(finalUrl) {
          return {
            name: "SineWix",
            title: displayTitle,
            url: finalUrl,
            quality: "1080p",
            format: "mkv",
            isHls: false,
            headers: STREAM_HEADERS,
            behaviorHints: {
              notWebReady: true,
              proxyHeaders: { request: STREAM_HEADERS }
            },
            provider: "sinewix"
          };
        });
      }
      return Promise.resolve({
        name: "SineWix",
        title: displayTitle,
        url: link,
        quality: "1080p",
        format: "mkv",
        isHls: false,
        headers: STREAM_HEADERS,
        behaviorHints: {
          notWebReady: true,
          proxyHeaders: { request: STREAM_HEADERS }
        },
        provider: "sinewix"
      });
    })
  );
}
function searchAndFetch(title, originalTitle, targetImdb, mediaType, seasonNum, episodeNum, targetYear, targetTmdbId) {
  return __async(this, null, function* () {
    try {
      var query = originalTitle || title || "";
      if (!query) return [];
      var searchUrl = API_BASE + "/search/" + encodeURIComponent(query) + "/" + API_KEY;
      var res = yield fetch(searchUrl, { headers: API_HEADERS });
      var data = yield res.json().catch(function() {
        return {};
      });
      var results = data.search || [];
      if (results.length === 0 && title && title.toLowerCase() !== query.toLowerCase()) {
        var fUrl = API_BASE + "/search/" + encodeURIComponent(title) + "/" + API_KEY;
        var fRes = yield fetch(fUrl, { headers: API_HEADERS });
        var fData = yield fRes.json().catch(function() {
          return {};
        });
        results = fData.search || [];
      }
      if (!results || results.length === 0) return [];
      var path = mediaType === "movie" ? "media/detail" : "series/show";
      var detailedItems = yield Promise.all(results.map(function(item) {
        return fetch(API_BASE + "/" + path + "/" + item.id + "/" + API_KEY, { headers: API_HEADERS }).then(function(r) {
          return r.json();
        }).catch(function() {
          return null;
        });
      }));
      var cleanTmdb = targetTmdbId ? String(targetTmdbId) : null;
      var bestMatch = detailedItems.find(function(item) {
        if (!item) return false;
        if (cleanTmdb && item.tmdb_id && String(item.tmdb_id) === cleanTmdb) return true;
        if (targetImdb && item.imdb_external_id && item.imdb_external_id === targetImdb) return true;
        var itemYear = (item.release_date || item.first_air_date || "").split("-")[0];
        var itemTitle = (item.title || item.name || "").toLowerCase().trim();
        var origMatch = originalTitle && itemTitle === originalTitle.toLowerCase().trim();
        var titleMatch = title && itemTitle === title.toLowerCase().trim();
        return (origMatch || titleMatch) && (!targetYear || !itemYear || itemYear === targetYear);
      });
      if (!bestMatch && detailedItems.length > 0) {
        bestMatch = detailedItems.find(function(item) {
          if (!item) return false;
          var itemTitle = (item.title || item.name || "").toLowerCase().trim();
          return originalTitle && itemTitle.includes(originalTitle.toLowerCase().trim()) || title && itemTitle.includes(title.toLowerCase().trim());
        });
      }
      if (!bestMatch) return [];
      var vList = [];
      if (mediaType === "movie") {
        vList = bestMatch.videos || [];
      } else {
        var s = (bestMatch.seasons || []).find(function(sea) {
          return parseInt(sea.season_number) === parseInt(seasonNum);
        });
        if (s && s.episodes) {
          var e = s.episodes.find(function(ep) {
            return parseInt(ep.episode_number) === parseInt(episodeNum);
          });
          if (e) vList = e.videos || [];
        }
      }
      return yield buildStreams(vList, bestMatch.title || bestMatch.name || title);
    } catch (e2) {
      return [];
    }
  });
}
function resolveTmdbInfo(rawId, mediaType) {
  return __async(this, null, function* () {
    var TMDB_KEY = "4ef0d7355d9ffb5151e987764708ce96";
    var cleanId = String(rawId).replace(/^tmdb:/, "").split(":")[0].trim();
    var isImdb = cleanId.startsWith("tt");
    var isTV = mediaType === "tv" || mediaType === "series";
    try {
      if (isImdb) {
        var findUrl = "https://api.themoviedb.org/3/find/" + cleanId + "?api_key=" + TMDB_KEY + "&external_source=imdb_id";
        var r = yield fetch(findUrl);
        var d = yield r.json();
        var item = isTV ? d.tv_results && d.tv_results[0] : d.movie_results && d.movie_results[0];
        if (!item) return null;
        return {
          id: item.id,
          tmdb_id: item.id,
          title: item.title || item.name,
          original_title: item.original_title || item.original_name,
          release_date: item.release_date || item.first_air_date || "",
          imdb_id: cleanId
        };
      } else {
        var tmdbType = isTV ? "tv" : "movie";
        var tmdbUrl = "https://api.themoviedb.org/3/" + tmdbType + "/" + cleanId + "?api_key=" + TMDB_KEY + "&language=tr-TR&append_to_response=external_ids";
        var res = yield fetch(tmdbUrl);
        var data = yield res.json();
        if (!data || !data.title && !data.name) return null;
        data.tmdb_id = data.id;
        return data;
      }
    } catch (e) {
      return null;
    }
  });
}
function getCatalog(args) {
  return __async(this, null, function* () {
    try {
      var query = args && args.search || args && args.extra && args.extra.search || args && args.query || "";
      var isMovie = args && (args.type === "movie" || args.id === "anthology_sinewix_movies");
      if (query) {
        var sRes = yield fetch(API_BASE + "/search/" + encodeURIComponent(query) + "/" + API_KEY, { headers: API_HEADERS });
        var sData = yield sRes.json();
        var items = (sData.search || []).map(function(it) {
          var mType = it.type === "movie" || it.title ? "movie" : "series";
          var mId = mType === "movie" ? "sinewix:movie:" + it.id : "sinewix:series:" + it.id;
          var poster = (it.poster_path || "").replace("http://", "https://");
          var bg = (it.backdrop_path || "").replace("http://", "https://");
          return {
            id: mId,
            type: mType === "movie" ? "movie" : "tv",
            name: it.title || it.name,
            poster,
            background: bg,
            description: it.overview || "",
            genres: ["SineWix"]
          };
        });
        return { metas: items };
      }
      if (isMovie) {
        var mRes = yield fetch(API_BASE + "/search/film/" + API_KEY, { headers: API_HEADERS });
        var mData = yield mRes.json();
        var mItems = (mData.search || []).map(function(it) {
          var poster = (it.poster_path || "").replace("http://", "https://");
          var bg = (it.backdrop_path || "").replace("http://", "https://");
          return {
            id: "sinewix:movie:" + it.id,
            type: "movie",
            name: it.title || it.name,
            poster,
            background: bg,
            description: it.overview || "",
            genres: ["SineWix", "Film"]
          };
        });
        return { metas: mItems };
      }
      var serRes = yield fetch(API_BASE + "/series/popular/" + API_KEY, { headers: API_HEADERS });
      var serData = yield serRes.json();
      var sItems = (serData.popularSeries || []).map(function(it) {
        var poster = (it.poster_path || "").replace("http://", "https://");
        var bg = (it.backdrop_path || "").replace("http://", "https://");
        return {
          id: "sinewix:series:" + it.id,
          type: "tv",
          name: it.name,
          poster,
          background: bg,
          description: it.overview || "",
          genres: ["SineWix", "Pop\xFCler Dizi"]
        };
      });
      return { metas: sItems };
    } catch (e) {
      return { metas: [] };
    }
  });
}
function getMeta(args) {
  return __async(this, null, function* () {
    try {
      var rawId = typeof args === "string" ? args : args && args.id ? args.id : "";
      if (!rawId) return { meta: null };
      if (rawId.startsWith("sinewix:movie:")) {
        var mId = rawId.replace("sinewix:movie:", "");
        var res = yield fetch(API_BASE + "/media/detail/" + mId + "/" + API_KEY, { headers: API_HEADERS });
        var it = yield res.json();
        var poster = (it.poster_path || "").replace("http://", "https://");
        var bg = (it.backdrop_path || "").replace("http://", "https://");
        return {
          meta: {
            id: rawId,
            type: "movie",
            name: it.title || it.name,
            poster,
            background: bg,
            description: it.overview || "",
            genres: ["SineWix", "Film"],
            videos: [{ id: rawId, title: it.title || it.name }]
          }
        };
      }
      if (rawId.startsWith("sinewix:series:")) {
        var sId = rawId.replace("sinewix:series:", "");
        var sRes = yield fetch(API_BASE + "/series/show/" + sId + "/" + API_KEY, { headers: API_HEADERS });
        var sIt = yield sRes.json();
        var sPoster = (sIt.poster_path || "").replace("http://", "https://");
        var sBg = (sIt.backdrop_path || "").replace("http://", "https://");
        var videos = [];
        (sIt.seasons || []).forEach(function(sea) {
          var sNum = sea.season_number !== void 0 && sea.season_number !== null && !isNaN(parseInt(sea.season_number)) ? parseInt(sea.season_number) : 1;
          (sea.episodes || []).forEach(function(ep) {
            var eNum = ep.episode_number !== void 0 && ep.episode_number !== null && !isNaN(parseInt(ep.episode_number)) ? parseInt(ep.episode_number) : 1;
            videos.push({
              id: "sinewix:ep:" + sId + ":" + sNum + ":" + eNum,
              title: ep.name || sNum + ". Sezon " + eNum + ". B\xF6l\xFCm",
              season: sNum,
              episode: eNum
            });
          });
        });
        return {
          meta: {
            id: rawId,
            type: "tv",
            name: sIt.name,
            poster: sPoster,
            background: sBg,
            description: sIt.overview || "",
            genres: ["SineWix", "Pop\xFCler Dizi"],
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
function getStreams(id, mediaType, seasonNum, episodeNum) {
  return __async(this, null, function* () {
    try {
      if (typeof id === "object" && id) {
        seasonNum = id.season || seasonNum;
        episodeNum = id.episode || episodeNum;
        mediaType = id.type || mediaType;
        id = id.id || id.tmdb_id;
      }
      if (typeof id === "string" && !id.startsWith("sinewix:")) {
        var cleanId = id.trim();
        if (cleanId.includes(":")) {
          var p = cleanId.split(":");
          id = p[0];
          if (p[1]) seasonNum = p[1];
          if (p[2]) episodeNum = p[2];
          if (seasonNum) mediaType = "tv";
        }
      }
      if (!mediaType) {
        mediaType = seasonNum || episodeNum ? "tv" : "movie";
      }
      if (typeof id === "string" && id.startsWith("sinewix:movie:")) {
        var mId = id.replace("sinewix:movie:", "");
        var mRes = yield fetch(API_BASE + "/media/detail/" + mId + "/" + API_KEY, { headers: API_HEADERS });
        var mData = yield mRes.json();
        return yield buildStreams(mData.videos || [], mData.title || mData.name);
      }
      if (typeof id === "string" && id.startsWith("sinewix:series:")) {
        var showMeta = yield getMeta(id);
        if (showMeta && showMeta.meta && Array.isArray(showMeta.meta.videos) && showMeta.meta.videos.length > 0) {
          return yield getStreams(showMeta.meta.videos[0].id);
        }
      }
      if (typeof id === "string" && id.startsWith("sinewix:ep:")) {
        var parts = id.replace("sinewix:ep:", "").split(":");
        var showId = parts[0];
        var targetSeason = parseInt(parts[1]) || 1;
        var targetEpisode = parseInt(parts[2]) || 1;
        var sRes = yield fetch(API_BASE + "/series/show/" + showId + "/" + API_KEY, { headers: API_HEADERS });
        var sData = yield sRes.json();
        var targetSeasonObj = (sData.seasons || []).find(function(s) {
          return parseInt(s.season_number) === targetSeason;
        });
        if (targetSeasonObj && targetSeasonObj.episodes) {
          var targetEpObj = targetSeasonObj.episodes.find(function(e) {
            return parseInt(e.episode_number) === targetEpisode;
          });
          if (targetEpObj && targetEpObj.videos) {
            return yield buildStreams(targetEpObj.videos, sData.name);
          }
        }
        return [];
      }
      var data = yield resolveTmdbInfo(id, mediaType);
      if (!data) return [];
      var ot = data.original_title || data.original_name || data.title || data.name;
      var releaseDate = data.release_date || data.first_air_date || "";
      var year = releaseDate ? releaseDate.split("-")[0] : "";
      var targetImdb = data.imdb_id || data.external_ids && data.external_ids.imdb_id;
      var targetTmdbId = data.tmdb_id || data.id;
      var streams = yield searchAndFetch(data.title || data.name, ot, targetImdb, mediaType, seasonNum || 1, episodeNum || 1, year, targetTmdbId);
      return streams || [];
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
if (typeof module !== "undefined") module.exports = wrapAll({ getStreams, getMeta, getCatalog }, cfgReady);
if (typeof globalThis !== "undefined") {
  globalThis.getStreams = getStreams;
  globalThis.getMeta = getMeta;
  globalThis.getCatalog = getCatalog;
}
if (typeof globalThis !== "undefined" && typeof module !== "undefined" && module.exports) {
  if (module.exports.getStreams) globalThis.getStreams = module.exports.getStreams;
  if (module.exports.getCatalog) globalThis.getCatalog = module.exports.getCatalog;
  if (module.exports.getMeta) globalThis.getMeta = module.exports.getMeta;
  if (module.exports.getSubtitles) globalThis.getSubtitles = module.exports.getSubtitles;
}

if (typeof globalThis !== 'undefined' && typeof module !== 'undefined' && module.exports) {
    if (module.exports.getStreams) globalThis.getStreams = module.exports.getStreams;
    if (module.exports.getCatalog) globalThis.getCatalog = module.exports.getCatalog;
    if (module.exports.getMeta) globalThis.getMeta = module.exports.getMeta;
    if (module.exports.getSubtitles) globalThis.getSubtitles = module.exports.getSubtitles;
}

