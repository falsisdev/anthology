/**
 * Anthology Provider: dizibak
 * Built from src/dizibak/index.js
 * Build Date: 2026-09-18T16:40:17.311Z
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

// src/dizibak/index.js
var { sortStreamsByQuality } = require_quality();
var { loadConfig, val, wrapAll } = require_config();
var _cfgReady = null;
function cfgReady() {
  if (!_cfgReady) {
    _cfgReady = loadConfig().then(function() {
      var v;
      v = val("urls.series.dizibak.base");
      if (v) BASE_URL = String(v).replace(/\/+$/, "");
      v = val("urls.series.dizibak.player");
      if (v) EMBED_HOST = String(v).replace(/^https?:\/\//, "").replace(/\/+$/, "");
      if (HEADERS) HEADERS.Referer = BASE_URL + "/";
    });
  }
  return _cfgReady;
}
var TMDB_API_KEY = "500330721680edb6d5f7f12ba7cd9023";
var BASE_URL = "https://dizibak.net";
var EMBED_HOST = "player.dizibak.net";
var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
var HEADERS = { "User-Agent": UA, "Referer": BASE_URL + "/" };
function getHtml(url, headers) {
  return __async(this, null, function* () {
    var res = yield fetch(url, { headers: Object.assign({}, HEADERS, headers || {}) });
    if (!res.ok) return "";
    return res.text();
  });
}
function getSearchNonce() {
  return __async(this, null, function* () {
    var html = yield getHtml(BASE_URL + "/");
    var m = html && html.match(/live_search_obj[\s\S]*?nonce["']?\s*[:=]\s*["']([^"']+)["']/);
    return m ? m[1] : "";
  });
}
function liveSearch(keyword, nonce) {
  return __async(this, null, function* () {
    var body = new URLSearchParams();
    body.set("action", "live_search");
    body.set("keyword", keyword);
    body.set("nonce", nonce || "");
    var res = yield fetch(BASE_URL + "/wp-admin/admin-ajax.php", {
      method: "POST",
      headers: {
        "User-Agent": UA,
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Requested-With": "XMLHttpRequest",
        "Referer": BASE_URL + "/"
      },
      body: body.toString()
    });
    if (!res.ok) return null;
    var json;
    try {
      json = yield res.json();
    } catch (e) {
      return null;
    }
    return json;
  });
}
function loadPlayer(postId, nonce, referer) {
  return __async(this, null, function* () {
    var body = new URLSearchParams();
    body.set("action", "load_player_content");
    body.set("post_id", postId);
    body.set("nonce", nonce || "");
    var res = yield fetch(BASE_URL + "/wp-admin/admin-ajax.php", {
      method: "POST",
      headers: {
        "User-Agent": UA,
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Requested-With": "XMLHttpRequest",
        "Referer": referer || BASE_URL + "/"
      },
      body: body.toString()
    });
    if (!res.ok) return null;
    var json;
    try {
      json = yield res.json();
    } catch (e) {
      return null;
    }
    return json;
  });
}
function unpackPacked(src) {
  var match = src.match(/eval\(function\s*\(p,a,c,k,e,d\)\{[\s\S]*?\}\('([\s\S]*?)',(\d+),(\d+),'([\s\S]*?)'\s*\.split\('\|'\),0,\{\}\)\)/);
  if (!match) return null;
  var packed = match[1];
  var radix = parseInt(match[2], 10);
  var count = parseInt(match[3], 10);
  var words = match[4].split("|");
  var out = packed;
  for (var i = 0; i < count; i++) {
    if (!words[i]) continue;
    out = out.replace(new RegExp("\\b" + i.toString(radix) + "\\b", "g"), words[i]);
  }
  return out;
}
function resolveTmdbInfo(id, mediaType) {
  return __async(this, null, function* () {
    try {
      var cleanId = String(id || "").trim();
      if (cleanId.indexOf(":") !== -1) cleanId = cleanId.split(":")[0];
      var numericId = null;
      var title = "";
      var origTitle = "";
      if (cleanId.indexOf("tt") === 0) {
        var findRes = yield fetch("https://api.themoviedb.org/3/find/" + cleanId + "?api_key=" + TMDB_API_KEY + "&external_source=imdb_id");
        if (findRes.ok) {
          var fData = yield findRes.json();
          var item = mediaType === "tv" || mediaType === "series" ? fData.tv_results && fData.tv_results[0] : fData.movie_results && fData.movie_results[0];
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
        var type = mediaType === "tv" || mediaType === "series" ? "tv" : "movie";
        var tRes = yield fetch("https://api.themoviedb.org/3/" + type + "/" + numericId + "?api_key=" + TMDB_API_KEY + "&language=tr-TR");
        if (tRes.ok) {
          var tData = yield tRes.json();
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
function extractStreamFromEmbed(embedUrl, referer) {
  return __async(this, null, function* () {
    try {
      var html = yield getHtml(embedUrl, { "Referer": referer });
      if (!html) return [];
      var decoded = unpackPacked(html);
      var fileRegex = /file["']?\s*:\s*["']([^"']+)["']/g;
      var streams = [];
      var m;
      while (m = fileRegex.exec(decoded || html)) {
        var url = m[1].replace(/\\\\\//g, "/").replace(/\\\//g, "/");
        if (url.indexOf(".m3u8") !== -1 || url.indexOf(".mp4") !== -1) {
          streams.push(url);
        }
      }
      return streams;
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
      if (typeof tmdbId === "string" && tmdbId.indexOf(":") !== -1 && !tmdbId.startsWith("dizibak:")) {
        var parts = tmdbId.split(":");
        if (parts.length >= 3) {
          var s = parseInt(parts[parts.length - 2]);
          var e = parseInt(parts[parts.length - 1]);
          if (!isNaN(s)) seasonNum = s;
          if (!isNaN(e)) episodeNum = e;
          tmdbId = parts[0];
        }
      }
      if (mediaType === "movie") return [];
      if (!mediaType) mediaType = "tv";
      if (typeof tmdbId === "string" && tmdbId.indexOf("dizibak:show:") === 0) {
        var slug = tmdbId.replace("dizibak:show:", "");
        var showPage = yield getHtml(BASE_URL + "/diziler/" + slug + "/");
        return yield resolveShowForStreams(showPage, seasonNum, episodeNum, tmdbId);
      }
      var season = parseInt(seasonNum) || 1;
      var episode = parseInt(episodeNum) || 1;
      var info = yield resolveTmdbInfo(tmdbId, mediaType);
      var queries = [info.title, info.origTitle].filter(Boolean);
      if (queries.length === 0) return [];
      var nonce = yield getSearchNonce();
      var showUri = "";
      for (var qi = 0; qi < queries.length; qi++) {
        var q = queries[qi];
        var normQ = normalizeTitle(q);
        var search = yield liveSearch(q, nonce);
        var diziler = search && search.data && search.data.diziler;
        if (!diziler) continue;
        for (var di = 0; di < diziler.length; di++) {
          var item = diziler[di];
          var normTitle = normalizeTitle(item.title || "");
          if (normTitle.indexOf(normQ) !== -1 || normQ.indexOf(normTitle) !== -1) {
            showUri = item.link || "";
            break;
          }
        }
        if (showUri) break;
      }
      if (!showUri) return [];
      var showHtml = yield getHtml(showUri.startsWith("http") ? showUri : BASE_URL + showUri);
      if (!showHtml) return [];
      return yield resolveShowForStreams(showHtml, season, episode, showUri);
    } catch (err) {
      return [];
    }
  });
}
function resolveShowForStreams(showHtml, season, episode, showUri) {
  return __async(this, null, function* () {
    var streams = [];
    var epRegex = /href="([^"]+)"/g;
    var m;
    var matches = [];
    while (m = epRegex.exec(showHtml)) {
      var href = m[1];
      var em = href.match(/-(\d+)-sezon-(\d+)-bolum/);
      if (!em) continue;
      var s = parseInt(em[1]);
      var e = parseInt(em[2]);
      if (!isNaN(s) && !isNaN(e)) matches.push({ href, s, e });
    }
    if (matches.length === 0) return streams;
    var chosen = null;
    for (var i = 0; i < matches.length; i++) {
      if (matches[i].s === season && matches[i].e === episode) {
        chosen = matches[i];
        break;
      }
    }
    if (!chosen) return streams;
    var epUrl = chosen.href.startsWith("http") ? chosen.href : BASE_URL + chosen.href;
    var epHtml = yield getHtml(epUrl);
    if (!epHtml) return streams;
    var pidM = epHtml.match(/data-post-id="(\d+)"/);
    var nonceM = epHtml.match(/data-nonce="([^"]+)"/);
    if (!pidM || !nonceM) return streams;
    var pc = yield loadPlayer(pidM[1], nonceM[1], epUrl);
    var data = pc && pc.data;
    if (!data) return streams;
    var iframeM = data.match(/<iframe[^>]+src=["']([^"']+)["']/i);
    if (!iframeM) return streams;
    var embedUrl = iframeM[1].replace(/\\\//g, "/");
    if (embedUrl.indexOf("player.dizibak.net") !== -1 || embedUrl.indexOf("dizibak.net") !== -1) {
      embedUrl = embedUrl.replace(/^https?:\/\/[^\/]+/, "https://" + EMBED_HOST);
    }
    if (embedUrl.indexOf("http") !== 0) embedUrl = "https:" + embedUrl;
    var urls = yield extractStreamFromEmbed(embedUrl, epUrl);
    var showTitle = (showHtml.match(/<h1[^>]*>([^<]+)<\/h1>/) || ["", "DiziBak"])[1].trim();
    var seen = {};
    for (var ui = 0; ui < urls.length; ui++) {
      var u = urls[ui];
      if (seen[u]) continue;
      seen[u] = true;
      var isHls = u.indexOf(".m3u8") !== -1;
      streams.push({
        name: showTitle + " S" + season + "E" + episode,
        title: "\u231C DiziBak \u231F | " + (isHls ? "HLS" : "MP4"),
        url: u,
        quality: "1080p",
        type: isHls ? "hls" : "mp4",
        provider: "dizibak",
        headers: {
          "Referer": "https://" + EMBED_HOST + "/",
          "User-Agent": UA
        },
        behaviorHints: {
          notWebReady: true,
          proxyHeaders: {
            request: {
              "Referer": "https://" + EMBED_HOST + "/",
              "User-Agent": UA
            }
          }
        }
      });
    }
    return streams;
  });
}
function resolveShowVideos(showHtml) {
  return __async(this, null, function* () {
    var matches = [];
    var epRegex = /href="([^"]+)"/g;
    var m;
    while (m = epRegex.exec(showHtml)) {
      var href = m[1];
      var em = href.match(/-(\d+)-sezon-(\d+)-bolum/);
      if (!em) continue;
      var s = parseInt(em[1]);
      var e = parseInt(em[2]);
      if (!isNaN(s) && !isNaN(e)) matches.push({ slug: href.replace(BASE_URL, "").replace(/^\//, "").replace(/\/$/, ""), s, e });
    }
    var unique = {};
    var videos = [];
    for (var i = 0; i < matches.length; i++) {
      var key = matches[i].s + "-" + matches[i].e;
      if (unique[key]) continue;
      unique[key] = true;
      videos.push({
        id: "dizibak:ep:" + matches[i].slug,
        title: matches[i].s + ". Sezon " + matches[i].e + ". B\xF6l\xFCm",
        season: matches[i].s,
        episode: matches[i].e
      });
    }
    videos.sort(function(a, b) {
      return a.season - b.season || a.episode - b.episode;
    });
    return videos;
  });
}
function getCatalog(args) {
  return __async(this, null, function* () {
    try {
      var query = args && args.search || args && args.extra && args.extra.search || args && args.query || "";
      var metas = [];
      var seenTitles = {};
      if (query) {
        var nonce = yield getSearchNonce();
        var search = yield liveSearch(query, nonce);
        var diziler = search && search.data && search.data.diziler;
        if (diziler) {
          for (var i = 0; i < diziler.length; i++) {
            var item = diziler[i];
            var title = (item.title || "").trim();
            if (!title || seenTitles[title]) continue;
            seenTitles[title] = true;
            metas.push({
              id: "dizibak:show:" + item.slugOrId || title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
              type: "tv",
              name: title,
              poster: item.thumb || "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png",
              background: item.thumb || "",
              genres: ["Yabanc\u0131 Dizi", "DiziBak"],
              description: title + " - DiziBak"
            });
          }
        }
        return { metas };
      }
      var html = yield getHtml(BASE_URL + "/");
      if (html) {
        var linkRegex = /href="(https:\/\/dizibak\.net\/[^"]+?-\d+-sezon-\d+-bolum\/?)"/g;
        var m;
        var seen = {};
        while (m = linkRegex.exec(html)) {
          var slug = m[1].replace("https://dizibak.net/", "").replace(/\/$/, "");
          var showName = slug.replace(/-\d+-sezon-\d+-bolum/, "");
          if (seen[showName] || metas.length >= 50) continue;
          seen[showName] = true;
          var imgM = html.slice(Math.max(0, m.index - 400), m.index).match(/data-src="([^"]+)"|src="([^"]+)"|poster="([^"]+)"/);
          metas.push({
            id: "dizibak:show:" + showName,
            type: "tv",
            name: showName.split("-").join(" "),
            poster: imgM && (imgM[1] || imgM[2] || imgM[3]) || "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png",
            genres: ["Yabanc\u0131 Dizi", "DiziBak"],
            description: showName.split("-").join(" ") + " - DiziBak"
          });
        }
      }
      return { metas };
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
      var epMatch = rawId.match(/^dizibak:ep:(.+)$/);
      if (epMatch) {
        var epSlug = epMatch[1];
        var epUrl = BASE_URL + "/" + epSlug + "/";
        var html = yield getHtml(epUrl);
        if (!html) return { meta: null };
        var titleM = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<title>([^<]+)<\/title>/i);
        var name = titleM ? titleM[1].replace(/<[^>]+>/g, "").replace(/\s*izle\s*$/i, "").trim() : "DiziBak";
        var sM = name.match(/(\d+)\s*\.?\s*sezon/i) || epSlug.match(/-(\d+)-sezon-/i);
        var eM = name.match(/(\d+)\s*\.?\s*bölüm/i) || epSlug.match(/-(\d+)-bolum-?/i);
        return {
          meta: {
            id: rawId,
            type: "tv",
            name,
            poster: "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png",
            genres: ["Yabanc\u0131 Dizi", "DiziBak"],
            description: name + " - DiziBak",
            videos: [{
              id: rawId,
              title: name,
              season: sM ? parseInt(sM[1]) : 1,
              episode: eM ? parseInt(eM[1]) : 1
            }]
          }
        };
      }
      var showMatch = rawId.match(/^dizibak:show:(.+)$/);
      if (showMatch) {
        var showSlug = showMatch[1];
        var showUrl = BASE_URL + "/diziler/" + showSlug + "/";
        var shtml = yield getHtml(showUrl);
        if (!shtml) return { meta: null };
        var stM = shtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || shtml.match(/<title>([^<]+)<\/title>/i);
        var sname = stM ? stM[1].replace(/<[^>]+>/g, "").replace(/\s*izle\s*$/i, "").trim() : showSlug.split("-").join(" ");
        var videos = yield resolveShowVideos(shtml);
        return {
          meta: {
            id: rawId,
            type: "tv",
            name: sname,
            poster: "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png",
            genres: ["Yabanc\u0131 Dizi", "DiziBak"],
            description: sname + " - DiziBak",
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

