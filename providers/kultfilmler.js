/**
 * Anthology Provider: kultfilmler
 * Built from src/kultfilmler/index.js
 * Build Date: 2026-09-20T20:49:56.248Z
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

// src/kultfilmler/index.js
var { sortStreamsByQuality } = require_quality();
var { loadConfig, val, wrapAll } = require_config();
var _cfgReady = null;
function cfgReady() {
  if (!_cfgReady) {
    _cfgReady = loadConfig().then(function() {
      var v;
      v = val("urls.movies.kultfilmler.base");
      if (v) BASE_URL = String(v).replace(/\/+$/, "");
      if (HEADERS) HEADERS.Referer = BASE_URL + "/";
    });
  }
  return _cfgReady;
}
var BASE_URL = "https://kultfilmler.net";
var TMDB_API_KEY = "500330721680edb6d5f7f12ba7cd9023";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
  "Referer": BASE_URL + "/"
};
function ultraClean(str) {
  if (!str) return "";
  return str.toString().toLowerCase().replace(/[ıİ]/g, "i").replace(/[üÜ]/g, "u").replace(/[öÖ]/g, "o").replace(/[şŞ]/g, "s").replace(/[ğĞ]/g, "g").replace(/[çÇ]/g, "c").replace(/[^a-z0-9]/g, "").trim();
}
function fetchWithTimeout(url, options, ms) {
  var opts = options || {};
  try {
    if (typeof AbortSignal !== "undefined" && AbortSignal.timeout) {
      opts.signal = AbortSignal.timeout(ms || 15e3);
    }
  } catch (e) {
  }
  return fetch(url, opts);
}
function resolveTmdbInfo(id, mediaType) {
  return __async(this, null, function* () {
    try {
      var cleanId = String(id || "").trim();
      if (cleanId.includes(":")) cleanId = cleanId.split(":")[0];
      var numericId = null;
      var title = "";
      var origTitle = "";
      if (cleanId.startsWith("tt")) {
        var findRes = yield fetchWithTimeout("https://api.themoviedb.org/3/find/" + cleanId + "?api_key=" + TMDB_API_KEY + "&external_source=imdb_id", {}, 1e4);
        if (findRes.ok) {
          var fd = yield findRes.json();
          var match = mediaType === "tv" || mediaType === "series" ? fd.tv_results && fd.tv_results[0] : fd.movie_results && fd.movie_results[0];
          if (!match) match = fd.movie_results && fd.movie_results[0] || fd.tv_results && fd.tv_results[0];
          if (match) {
            title = match.name || match.title || "";
            origTitle = match.original_name || match.original_title || "";
            numericId = match.id;
          }
        }
      } else {
        numericId = cleanId;
        var type = mediaType === "tv" || mediaType === "series" ? "tv" : "movie";
        var tRes = yield fetchWithTimeout("https://api.themoviedb.org/3/" + type + "/" + numericId + "?api_key=" + TMDB_API_KEY + "&language=tr-TR", {}, 1e4);
        if (tRes.ok) {
          var td = yield tRes.json();
          title = td.name || td.title || "";
          origTitle = td.original_name || td.original_title || "";
        }
      }
      return { title, origTitle, numericId };
    } catch (e) {
      return { title: "", origTitle: "", numericId: id };
    }
  });
}
function absUrl(href) {
  if (!href) return null;
  if (href.startsWith("http")) return href;
  if (href.startsWith("//")) return "https:" + href;
  if (href.startsWith("/")) return BASE_URL + href;
  return BASE_URL + "/" + href;
}
function parseCards(html) {
  var out = [];
  var seen = /* @__PURE__ */ new Set();
  var re = /<a[^>]+class="[^"]*\bmcard\b[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  var m;
  while ((m = re.exec(html)) !== null) {
    var href = absUrl(m[1]);
    if (!href || seen.has(href)) continue;
    var inner = m[2];
    var titleMatch = inner.match(/<div[^>]+class="[^"]*\bmtx\b[^"]*"[^>]*>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>/i);
    var imgAlt = inner.match(/<img[^>]+class="[^"]*\bpimg\b[^"]*"[^>]*alt="([^"]*)"/i) || inner.match(/<img[^>]+alt="([^"]*)"[^>]*class="[^"]*\bpimg\b[^"]*"/i);
    var imgSrc = inner.match(/<img[^>]+class="[^"]*\bpimg\b[^"]*"[^>]*(?:src|data-src)="([^"]+)"/i) || inner.match(/<img[^>]*(?:src|data-src)="([^"]+)"[^>]*class="[^"]*\bpimg\b[^"]*"/i);
    var title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : imgAlt ? imgAlt[1].trim() : "";
    if (!title) continue;
    seen.add(href);
    out.push({
      title,
      href,
      poster: imgSrc ? absUrl(imgSrc[1]) : "",
      isTv: href.includes("/dizi/")
    });
  }
  return out;
}
function searchSite(query) {
  return __async(this, null, function* () {
    try {
      var res = yield fetchWithTimeout(BASE_URL + "/?s=" + encodeURIComponent(query), { headers: HEADERS }, 15e3);
      if (!res.ok) return [];
      return parseCards(yield res.text());
    } catch (e) {
      return [];
    }
  });
}
function pickBest(cards, title) {
  if (!cards || cards.length === 0) return null;
  var cleanTarget = ultraClean(title);
  for (var i = 0; i < cards.length; i++) {
    if (ultraClean(cards[i].title) === cleanTarget) return cards[i];
  }
  for (var j = 0; j < cards.length; j++) {
    var c = ultraClean(cards[j].title);
    if (c.includes(cleanTarget) || cleanTarget.includes(c)) return cards[j];
  }
  return cards[0];
}
function pushHls(streams, seenUrls, url, label, referer, subs) {
  if (!url || seenUrls.has(url)) return;
  seenUrls.add(url);
  var sHeaders = { "User-Agent": HEADERS["User-Agent"], "Referer": referer || BASE_URL + "/" };
  streams.push({
    name: "KultFilmler",
    title: "\u231C KultFilmler \u231F | " + label,
    url,
    quality: "1080p",
    provider: "kultfilmler",
    headers: sHeaders,
    format: "hls",
    isHls: true,
    behaviorHints: { notWebReady: true, proxyHeaders: { request: sHeaders } },
    subtitles: subs || []
  });
}
function extractVttSubs(html, base) {
  var subs = [];
  var seen = /* @__PURE__ */ new Set();
  var re = /https?:\/\/[^\s"'\\]+\.vtt/gi;
  var m;
  while ((m = re.exec(html)) !== null) {
    var u = m[0];
    if (seen.has(u) || u.includes("thumbnails")) continue;
    seen.add(u);
    var lang = /tur/i.test(u) ? "tur" : /eng/i.test(u) ? "eng" : "tur";
    subs.push({ id: lang, lang, url: u });
  }
  return subs;
}
function resolveVidmoly(iframeUrl, pageUrl, streams, seenUrls) {
  return __async(this, null, function* () {
    try {
      var r = yield fetchWithTimeout(iframeUrl, {
        headers: { "User-Agent": HEADERS["User-Agent"], "Referer": pageUrl, "Sec-Fetch-Dest": "iframe" }
      }, 15e3);
      if (!r.ok) return;
      var t = yield r.text();
      var m = t.match(/file\s*:\s*"([^"]+)"/);
      if (m && m[1].includes(".m3u8")) {
        pushHls(streams, seenUrls, m[1], "VidMoly (HLS)", BASE_URL + "/", extractVttSubs(t));
      }
    } catch (e) {
    }
  });
}
function resolveVidpapi(iframeUrl, pageUrl, streams, seenUrls) {
  return __async(this, null, function* () {
    try {
      var videoId = iframeUrl.split("/").filter(Boolean).pop();
      if (!videoId) return;
      var r = yield fetchWithTimeout(iframeUrl, {
        headers: { "User-Agent": HEADERS["User-Agent"], "Referer": pageUrl }
      }, 15e3);
      if (!r.ok) return;
      var setCookie = "";
      try {
        if (typeof r.headers.getSetCookie === "function") {
          var cookies = r.headers.getSetCookie();
          for (var i = 0; i < cookies.length; i++) {
            if (cookies[i].includes("fireplayer_player=")) {
              setCookie = cookies[i].split(";")[0];
              break;
            }
          }
        } else {
          var sc = r.headers.get("set-cookie") || "";
          var cm = sc.match(/fireplayer_player=([^;]+)/);
          if (cm) setCookie = "fireplayer_player=" + cm[1];
        }
      } catch (e) {
      }
      var iHtml = yield r.text();
      var form = new URLSearchParams();
      form.append("data", videoId);
      form.append("do", "getVideo");
      var apiHeaders = {
        "User-Agent": HEADERS["User-Agent"],
        "Referer": iframeUrl,
        "X-Requested-With": "XMLHttpRequest",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
      };
      if (setCookie) apiHeaders["Cookie"] = setCookie;
      var apiRes = yield fetchWithTimeout("https://vidpapi.xyz/player/index.php?data=" + encodeURIComponent(videoId) + "&do=getVideo", {
        method: "POST",
        headers: apiHeaders,
        body: form.toString()
      }, 15e3);
      if (!apiRes.ok) return;
      var apiText = yield apiRes.text();
      var secMatch = apiText.match(/securedLink"\s*:\s*"([^"]+)"/);
      if (secMatch) {
        var secured = secMatch[1].replace(/\\\//g, "/");
        pushHls(streams, seenUrls, secured, "Vidpapi (HLS)", BASE_URL + "/", extractVttSubs(iHtml));
      }
    } catch (e) {
    }
  });
}
function resolveGeneric(iframeUrl, pageUrl, streams, seenUrls) {
  return __async(this, null, function* () {
    try {
      var r = yield fetchWithTimeout(iframeUrl, {
        headers: { "User-Agent": HEADERS["User-Agent"], "Referer": pageUrl }
      }, 15e3);
      if (!r.ok) return;
      var t = yield r.text();
      var found = false;
      var m3u8Re = /https?:\/\/[^\s"'\\]+\.m3u8[^\s"'\\]*/gi;
      var mm;
      while ((mm = m3u8Re.exec(t)) !== null) {
        var u = mm[0];
        if (/preview|thumb|sprite/i.test(u)) continue;
        pushHls(streams, seenUrls, u, "Direct (HLS)", iframeUrl, extractVttSubs(t));
        found = true;
      }
      if (!found) {
        var fm = t.match(/file\s*:\s*["'](https?:[^"']+\.(?:m3u8|mp4)[^"']*)["']/i);
        if (fm) pushHls(streams, seenUrls, fm[1], "Direct (HLS)", iframeUrl, extractVttSubs(t));
      }
    } catch (e) {
    }
  });
}
function extractStreamsFromContentPage(pageUrl) {
  return __async(this, null, function* () {
    var streams = [];
    try {
      var res = yield fetchWithTimeout(pageUrl, { headers: HEADERS }, 15e3);
      if (!res.ok) return [];
      var html = yield res.text();
      var seenUrls = /* @__PURE__ */ new Set();
      var iframes = [];
      var r1 = html.match(/<div[^>]+id="player"[^>]*>[\s\S]*?<iframe[^>]+src="([^"]+)"/i);
      if (r1) iframes.push(r1[1]);
      var r2 = html.match(/<div[^>]+class="[^"]*kf-embed[^"]*"[^>]*>[\s\S]*?<iframe[^>]+src="([^"]+)"/i);
      if (r2 && iframes.indexOf(r2[1]) === -1) iframes.push(r2[1]);
      var srcData = html.match(/<script[^>]+id="kf-srcdata"[^>]*>([\s\S]*?)<\/script>/i);
      if (srcData) {
        var sr = /src=\\?"([^"\\]+)"/g;
        var sm;
        while ((sm = sr.exec(srcData[1])) !== null) {
          var u = sm[1].replace(/\\\//g, "/");
          if (u.startsWith("//")) u = "https:" + u;
          if (u.startsWith("http") && iframes.indexOf(u) === -1) iframes.push(u);
        }
      }
      for (var i = 0; i < iframes.length; i++) {
        var iframeUrl = iframes[i];
        if (iframeUrl.startsWith("//")) iframeUrl = "https:" + iframeUrl;
        else if (iframeUrl.startsWith("/")) iframeUrl = BASE_URL + iframeUrl;
        if (iframeUrl.includes("vidmoly")) {
          yield resolveVidmoly(iframeUrl, pageUrl, streams, seenUrls);
        } else if (iframeUrl.includes("vidpapi.xyz") || iframeUrl.includes("vidpapi.com")) {
          yield resolveVidpapi(iframeUrl, pageUrl, streams, seenUrls);
        } else if (iframeUrl.includes("youtube.com") || iframeUrl.includes("youtu.be")) {
          continue;
        } else {
          yield resolveGeneric(iframeUrl, pageUrl, streams, seenUrls);
        }
        if (streams.length > 0) break;
      }
    } catch (e) {
    }
    return streams;
  });
}
function getCatalog(args) {
  return __async(this, null, function* () {
    try {
      var query = args && args.search || args && args.extra && args.extra.search || args && args.query || "";
      var url = query ? BASE_URL + "/?s=" + encodeURIComponent(query) : BASE_URL + "/category/aksiyon-filmleri-izle/";
      var res = yield fetchWithTimeout(url, { headers: HEADERS }, 15e3);
      if (!res.ok) return { metas: [] };
      var cards = parseCards(yield res.text());
      var metas = cards.filter(function(c) {
        return !c.isTv;
      }).slice(0, 30).map(function(c) {
        return {
          id: "kultfilmler:movie:" + encodeURIComponent(c.href),
          type: "movie",
          name: c.title,
          poster: c.poster || "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png",
          background: c.poster || "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png",
          genres: ["Film", "KultFilmler"],
          description: c.title + " - KultFilmler"
        };
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
      var rawId = typeof args === "string" ? args : args && args.id ? args.id : "";
      if (!rawId || !rawId.startsWith("kultfilmler:")) return { meta: null };
      var href = decodeURIComponent(rawId.split(":").slice(2).join(":"));
      var res = yield fetchWithTimeout(href, { headers: HEADERS }, 15e3);
      if (!res.ok) return { meta: null };
      var html = yield res.text();
      var titleMatch = html.match(/<h1[^>]+class="[^"]*sec-h[^"]*"[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<h2[^>]+class="[^"]*sec-h[^"]*"[^>]*>([\s\S]*?)<\/h2>/i) || html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
      var title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").replace(/İzle\s*$/i, "").trim() : "KultFilmler";
      var ogImg = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
      var poster = ogImg ? ogImg[1] : "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png";
      if (href.includes("/dizi/")) {
        var videos = [];
        var seen = /* @__PURE__ */ new Set();
        var epRe = /<a[^>]+class="[^"]*\bep\b[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
        var em;
        while ((em = epRe.exec(html)) !== null) {
          var epHref = absUrl(em[1]);
          if (!epHref || seen.has(epHref)) continue;
          var epTxt = em[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
          var sM = epTxt.match(/(\d+)\.\s*Sezon/i) || em[0].match(/data-season="(\d+)"/i);
          var eM = epTxt.match(/(\d+)\.\s*Bölüm/i);
          var sN = sM ? parseInt(sM[1]) : 1;
          var eN = eM ? parseInt(eM[1]) : videos.length + 1;
          seen.add(epHref);
          videos.push({
            id: "kultfilmler:ep:" + encodeURIComponent(epHref),
            title: epTxt || sN + ". Sezon " + eN + ". B\xF6l\xFCm",
            season: sN,
            episode: eN
          });
        }
        videos.sort(function(a, b) {
          return a.season - b.season || a.episode - b.episode;
        });
        return {
          meta: {
            id: rawId,
            type: "tv",
            name: title,
            poster,
            background: poster,
            description: title + " - KultFilmler",
            genres: ["Yabanc\u0131 Dizi", "KultFilmler"],
            videos
          }
        };
      }
      return {
        meta: {
          id: rawId,
          type: "movie",
          name: title,
          poster,
          background: poster,
          description: title + " - KultFilmler",
          genres: ["Film", "KultFilmler"],
          videos: [{ id: rawId, title, released: (/* @__PURE__ */ new Date()).toISOString().split("T")[0] }]
        }
      };
    } catch (e) {
      return { meta: null };
    }
  });
}
function getStreams(tmdbIdOrArgs, mediaType, seasonNum, episodeNum) {
  return __async(this, null, function* () {
    try {
      if (typeof tmdbIdOrArgs === "object" && tmdbIdOrArgs && tmdbIdOrArgs.id) {
        return getStreams(tmdbIdOrArgs.id, mediaType, seasonNum, episodeNum);
      }
      if (typeof tmdbIdOrArgs === "string" && tmdbIdOrArgs.startsWith("kultfilmler:ep:")) {
        return yield extractStreamsFromContentPage(decodeURIComponent(tmdbIdOrArgs.replace("kultfilmler:ep:", "")));
      }
      if (typeof tmdbIdOrArgs === "string" && (tmdbIdOrArgs.startsWith("kultfilmler:show:") || tmdbIdOrArgs.startsWith("kultfilmler:movie:"))) {
        if (tmdbIdOrArgs.startsWith("kultfilmler:show:")) {
          var meta = yield getMeta(tmdbIdOrArgs);
          var vids = meta && meta.meta && meta.meta.videos || [];
          var tgt = vids.find(function(v) {
            return v.season === (parseInt(seasonNum) || 1) && v.episode === (parseInt(episodeNum) || 1);
          }) || vids[0];
          if (tgt) return yield getStreams(tgt.id);
          return [];
        }
        return yield extractStreamsFromContentPage(decodeURIComponent(tmdbIdOrArgs.split(":").slice(2).join(":")));
      }
      var season = parseInt(seasonNum) || 1;
      var episode = parseInt(episodeNum) || 1;
      var info = yield resolveTmdbInfo(tmdbIdOrArgs, mediaType);
      var searchTitles = [info.title, info.origTitle].filter(Boolean);
      if (searchTitles.length === 0) return [];
      for (var t = 0; t < searchTitles.length; t++) {
        var cards = yield searchSite(searchTitles[t]);
        if (!cards || cards.length === 0) continue;
        var wantTv = mediaType === "tv" || mediaType === "series";
        var filtered = cards.filter(function(c) {
          return wantTv ? c.isTv : !c.isTv;
        });
        var best = pickBest(filtered.length > 0 ? filtered : cards, searchTitles[t]);
        if (!best) continue;
        if (best.isTv) {
          var showMeta = yield getMeta("kultfilmler:show:" + encodeURIComponent(best.href));
          var vids2 = showMeta && showMeta.meta && showMeta.meta.videos || [];
          var match = vids2.find(function(v) {
            return v.season === season && v.episode === episode;
          });
          if (match) {
            var epStreams = yield getStreams(match.id);
            if (epStreams.length > 0) return epStreams;
          }
        } else {
          var mStreams = yield extractStreamsFromContentPage(best.href);
          if (mStreams.length > 0) return mStreams;
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

