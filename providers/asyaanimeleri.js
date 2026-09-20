/**
 * Anthology Provider: asyaanimeleri
 * Built from src/asyaanimeleri/index.js
 * Build Date: 2026-09-20T19:00:24.648Z
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

// src/asyaanimeleri/index.js
var { loadConfig, val, wrapAll } = require_config();
var _cfgReady = null;
function cfgReady() {
  if (!_cfgReady) {
    _cfgReady = loadConfig().then(function() {
      var v;
      v = val("urls.anime.asyaanimeleri.base");
      if (v) BASE_URL = String(v).replace(/\/+$/, "");
      if (HEADERS) HEADERS.Referer = BASE_URL + "/";
    });
  }
  return _cfgReady;
}
var BASE_URL = "https://asyaanimeleri.top";
var TMDB_API_KEY = "500330721680edb6d5f7f12ba7cd9023";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Referer": BASE_URL + "/"
};
function timeoutSignal(ms) {
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(ms);
  }
  var controller = new AbortController();
  setTimeout(function() {
    controller.abort();
  }, ms);
  return controller.signal;
}
function ultraClean(str) {
  if (!str) return "";
  return str.toString().toLowerCase().replace(/[ıİ]/g, "i").replace(/[üÜ]/g, "u").replace(/[öÖ]/g, "o").replace(/[şŞ]/g, "s").replace(/[ğĞ]/g, "g").replace(/[çÇ]/g, "c").replace(/[âîûÂÎÛ]/g, function(c) {
    return { "\xE2": "a", "\xEE": "i", "\xFB": "u", "\xC2": "a", "\xCE": "i", "\xDB": "u" }[c] || c;
  }).replace(/[^a-z0-9]/g, "").trim();
}
function decodeHtmlEntities(str) {
  if (!str) return "";
  return str.toString().replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&#8211;/g, "-").replace(/&#8217;/g, "'").replace(/&#8220;/g, '"').replace(/&#8221;/g, '"').replace(/&#(\d+);/g, function(match, dec) {
    return String.fromCharCode(dec);
  }).trim();
}
function safeBase64Decode(str) {
  try {
    if (typeof atob === "function") return atob(str);
    if (typeof Buffer !== "undefined") return Buffer.from(str, "base64").toString("utf8");
  } catch (e) {
  }
  return "";
}
function resolveTmdbInfo(id, mediaType) {
  return __async(this, null, function* () {
    try {
      var cleanId = String(id || "").trim();
      if (cleanId.indexOf(":") !== -1) cleanId = cleanId.split(":")[0];
      var numericId = null;
      var titles = [];
      if (cleanId.indexOf("tt") === 0) {
        var findRes = yield fetch("https://api.themoviedb.org/3/find/" + cleanId + "?api_key=" + TMDB_API_KEY + "&external_source=imdb_id", { signal: timeoutSignal(6e3) });
        if (findRes.ok) {
          var fData = yield findRes.json();
          var item = mediaType === "tv" || mediaType === "series" ? fData.tv_results && fData.tv_results[0] : fData.movie_results && fData.movie_results[0];
          if (item) {
            numericId = item.id;
            if (item.name) titles.push(item.name);
            if (item.title) titles.push(item.title);
            if (item.original_name) titles.push(item.original_name);
            if (item.original_title) titles.push(item.original_title);
          }
        }
      } else {
        numericId = cleanId;
      }
      if (numericId) {
        var type = mediaType === "tv" || mediaType === "series" ? "tv" : "movie";
        var enRes = yield fetch("https://api.themoviedb.org/3/" + type + "/" + numericId + "?api_key=" + TMDB_API_KEY, { signal: timeoutSignal(6e3) });
        if (enRes.ok) {
          var enData = yield enRes.json();
          if (enData.name) titles.push(enData.name);
          if (enData.title) titles.push(enData.title);
          if (enData.original_name) titles.push(enData.original_name);
          if (enData.original_title) titles.push(enData.original_title);
        }
        var trRes = yield fetch("https://api.themoviedb.org/3/" + type + "/" + numericId + "?api_key=" + TMDB_API_KEY + "&language=tr-TR", { signal: timeoutSignal(6e3) });
        if (trRes.ok) {
          var trData = yield trRes.json();
          if (trData.name) titles.push(trData.name);
          if (trData.title) titles.push(trData.title);
        }
        var altRes = yield fetch("https://api.themoviedb.org/3/" + type + "/" + numericId + "/alternative_titles?api_key=" + TMDB_API_KEY, { signal: timeoutSignal(6e3) });
        if (altRes.ok) {
          var altData = yield altRes.json();
          var alts = altData.titles || altData.results || [];
          for (var i = 0; i < alts.length; i++) {
            var a = alts[i];
            if (a.title && /^[a-zA-Z0-9\s:.,!?'-]+$/.test(a.title)) {
              titles.push(a.title);
            }
          }
        }
      }
      var seen = {};
      var uniqueTitles = [];
      for (var j = 0; j < titles.length; j++) {
        var t = decodeHtmlEntities(titles[j]).trim();
        var u = ultraClean(t);
        if (u && !seen[u]) {
          seen[u] = true;
          uniqueTitles.push(t);
        }
      }
      return { titles: uniqueTitles, numericId };
    } catch (e) {
      return { titles: [], numericId: id };
    }
  });
}
function searchSeries(query) {
  return __async(this, null, function* () {
    try {
      var url = BASE_URL + "/?s=" + encodeURIComponent(query);
      var res = yield fetch(url, { headers: HEADERS, signal: timeoutSignal(8e3) });
      if (!res.ok) return [];
      var html = yield res.text();
      var listupdMatch = html.match(/<div class="listupd">([\s\S]*?)<div class="pagination">/i) || html.match(/<div class="listupd">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/i);
      var targetArea = listupdMatch ? listupdMatch[1] : html;
      var results = [];
      var regex = /<a href="(https:\/\/asyaanimeleri\.top\/series\/[^"]+)"[^>]*title="([^"]+)"/gi;
      var m;
      var seenUrls = {};
      while ((m = regex.exec(targetArea)) !== null) {
        var sUrl = m[1];
        var sTitle = decodeHtmlEntities(m[2]);
        if (!seenUrls[sUrl]) {
          seenUrls[sUrl] = true;
          results.push({ url: sUrl, title: sTitle });
        }
      }
      return results;
    } catch (e) {
      return [];
    }
  });
}
function pickBestSeries(candidates, targetTitle, targetSeason, isMovie) {
  if (!candidates || !candidates.length) return null;
  var cleanTarget = ultraClean(targetTitle);
  if (isMovie) {
    var movieCandidates = candidates.filter(function(c) {
      return /movie|film/i.test(c.title) || /movie|film/i.test(c.url);
    });
    if (movieCandidates.length) return movieCandidates[0];
  }
  if (targetSeason > 1) {
    var seasonRegex = new RegExp("(?:" + targetSeason + "\\.?[\\s-]*sezon|season[\\s-]*" + targetSeason + "|part[\\s-]*" + targetSeason + ")", "i");
    var sMatch = candidates.find(function(c) {
      return seasonRegex.test(c.title) || seasonRegex.test(c.url);
    });
    if (sMatch) return sMatch;
  } else {
    var nonOtherSeasons = candidates.filter(function(c) {
      var isOther = /[2-9]\.?[\\s-]*sezon|season[\\s-]*[2-9]|part[\\s-]*[2-9]/i.test(c.title) || /[2-9]-sezon/i.test(c.url);
      var isM = /movie|film/i.test(c.title) || /movie|film/i.test(c.url);
      return !isOther && !isM;
    });
    if (nonOtherSeasons.length) {
      var exact = nonOtherSeasons.find(function(c) {
        return ultraClean(c.title) === cleanTarget;
      });
      return exact || nonOtherSeasons[0];
    }
  }
  for (var i = 0; i < candidates.length; i++) {
    var cClean = ultraClean(candidates[i].title);
    if (cClean === cleanTarget || cleanTarget && cClean.indexOf(cleanTarget) !== -1) {
      return candidates[i];
    }
  }
  return candidates[0];
}
function parseEpisodes(detailHtml) {
  var episodes = [];
  var eplisterIdx = detailHtml.indexOf('class="eplister"');
  if (eplisterIdx === -1) return episodes;
  var sub = detailHtml.slice(eplisterIdx);
  var endIdx = sub.indexOf("</ul>");
  if (endIdx !== -1) sub = sub.slice(0, endIdx);
  var liRegex = /<li[^>]*>\s*<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/li>/gi;
  var m;
  while ((m = liRegex.exec(sub)) !== null) {
    var epUrl = m[1];
    var inner = m[2];
    var numMatch = inner.match(/<div class="epl-num">([^<]+)<\/div>/i);
    var titleMatch = inner.match(/<div class="epl-title">([^<]+)<\/div>/i);
    var dateMatch = inner.match(/<div class="epl-date">([^<]+)<\/div>/i);
    var epNum = numMatch ? decodeHtmlEntities(numMatch[1]).trim() : "";
    var epTitle = titleMatch ? decodeHtmlEntities(titleMatch[1]).trim() : "";
    var epDate = dateMatch ? decodeHtmlEntities(dateMatch[1]).trim() : "";
    episodes.push({
      url: epUrl,
      num: epNum,
      title: epTitle,
      date: epDate
    });
  }
  return episodes;
}
function matchEpisode(episodes, targetEp, isMovie) {
  if (!episodes || !episodes.length) return null;
  if (isMovie) {
    var movieEp = episodes.find(function(e) {
      return /movie|film/i.test(e.num) || /movie|film/i.test(e.title) || /movie|film/i.test(e.url);
    });
    if (movieEp) return movieEp;
    return episodes[0];
  }
  for (var i = 0; i < episodes.length; i++) {
    var numStr = String(episodes[i].num || "").trim();
    if (numStr.indexOf("-") === -1) {
      var num = parseInt(numStr);
      if (!isNaN(num) && num === targetEp) return episodes[i];
    }
    var m = episodes[i].url.match(/-(\d+)-bolum/i);
    if (m && parseInt(m[1]) === targetEp && episodes[i].url.indexOf("-" + targetEp + "-") === -1) {
      return episodes[i];
    }
  }
  for (var j = 0; j < episodes.length; j++) {
    var rangeMatch = episodes[j].num.match(/^(\d+)\s*-\s*(\d+)$/) || episodes[j].url.match(/(\d+)-(\d+)-bolum/i);
    if (rangeMatch) {
      var start = parseInt(rangeMatch[1]);
      var end = parseInt(rangeMatch[2]);
      if (targetEp >= start && targetEp <= end) return episodes[j];
    }
  }
  return null;
}
function resolveSibnet(iframeUrl) {
  return __async(this, null, function* () {
    try {
      var fullUrl = iframeUrl.startsWith("//") ? "https:" + iframeUrl : iframeUrl;
      var res = yield fetch(fullUrl, {
        headers: Object.assign({}, HEADERS, { "Referer": BASE_URL + "/" }),
        signal: timeoutSignal(7e3)
      });
      if (!res.ok) return null;
      var html = yield res.text();
      var m = html.match(/player\.src\(\[\{src:\s*["']?([^"'\s>]+)/i);
      if (m) {
        var videoPath = m[1];
        var videoUrl = videoPath.startsWith("http") ? videoPath : "https://video.sibnet.ru" + videoPath;
        var sibHeaders = {
          "Referer": "https://video.sibnet.ru/",
          "User-Agent": HEADERS["User-Agent"]
        };
        return {
          name: "AsyaAnimeleri",
          title: "\u231C AsyaAnimeleri \u231F | Sibnet [1080p MP4]",
          url: videoUrl,
          quality: "1080p",
          format: "mp4",
          isHls: false,
          headers: sibHeaders,
          behaviorHints: {
            notWebReady: false,
            proxyHeaders: { request: sibHeaders }
          }
        };
      }
    } catch (e) {
    }
    return null;
  });
}
function resolveOkRu(iframeUrl) {
  return __async(this, null, function* () {
    try {
      var fullUrl = iframeUrl.startsWith("//") ? "https:" + iframeUrl : iframeUrl;
      var res = yield fetch(fullUrl, {
        headers: { "User-Agent": HEADERS["User-Agent"] },
        signal: timeoutSignal(7e3)
      });
      if (!res.ok) return [];
      var html = yield res.text();
      var m = html.match(/data-options=["']([^"']+)["']/i);
      if (!m) return [];
      var decoded = decodeHtmlEntities(m[1]);
      var opts = JSON.parse(decoded);
      var vids = opts.flashvars && opts.flashvars.videos ? opts.flashvars.videos : [];
      var streams = [];
      var nameMap = { "full": "1080p", "hd": "720p", "sd": "480p", "low": "360p", "lowest": "240p", "mobile": "240p" };
      for (var i = 0; i < vids.length; i++) {
        var v = vids[i];
        if (!v.url) continue;
        var q = nameMap[v.name] || v.name || "720p";
        var okHeaders = { "User-Agent": HEADERS["User-Agent"] };
        streams.push({
          name: "AsyaAnimeleri",
          title: "\u231C AsyaAnimeleri \u231F | Ok.ru [" + q.toUpperCase() + " MP4]",
          url: v.url,
          quality: q,
          format: "mp4",
          isHls: false,
          headers: okHeaders,
          behaviorHints: {
            notWebReady: false,
            proxyHeaders: { request: okHeaders }
          }
        });
      }
      if (opts.flashvars && opts.flashvars.hlsManifestUrl) {
        var okHlsHeaders = { "User-Agent": HEADERS["User-Agent"] };
        streams.push({
          name: "AsyaAnimeleri",
          title: "\u231C AsyaAnimeleri \u231F | Ok.ru [HLS Master]",
          url: opts.flashvars.hlsManifestUrl,
          quality: "1080p",
          format: "hls",
          isHls: true,
          headers: okHlsHeaders,
          behaviorHints: {
            notWebReady: false,
            proxyHeaders: { request: okHlsHeaders }
          }
        });
      }
      return streams;
    } catch (e) {
    }
    return [];
  });
}
function resolveMailRu(iframeUrl) {
  return __async(this, null, function* () {
    try {
      var m = iframeUrl.match(/\/embed\/(\d+)/) || iframeUrl.match(/meta\/(\d+)/);
      if (!m) return [];
      var vid = m[1];
      var metaUrl = "https://my.mail.ru/+/video/meta/" + vid;
      var res = yield fetch(metaUrl, {
        headers: {
          "User-Agent": HEADERS["User-Agent"],
          "Referer": "https://my.mail.ru/video/embed/" + vid
        },
        signal: timeoutSignal(7e3)
      });
      if (!res.ok) return [];
      var data = yield res.json();
      var streams = [];
      var vids = data.videos || [];
      for (var i = 0; i < vids.length; i++) {
        var v = vids[i];
        if (!v.url) continue;
        var u = v.url.startsWith("//") ? "https:" + v.url : v.url;
        var q = v.key || "1080p";
        var mailHeaders = {
          "Referer": "https://my.mail.ru/video/embed/" + vid,
          "User-Agent": HEADERS["User-Agent"]
        };
        streams.push({
          name: "AsyaAnimeleri",
          title: "\u231C AsyaAnimeleri \u231F | Mail.ru [" + q.toUpperCase() + " MP4]",
          url: u,
          quality: q,
          format: "mp4",
          isHls: false,
          headers: mailHeaders,
          behaviorHints: {
            notWebReady: false,
            proxyHeaders: { request: mailHeaders }
          }
        });
      }
      return streams;
    } catch (e) {
    }
    return [];
  });
}
function resolveRumble(iframeUrl) {
  return __async(this, null, function* () {
    try {
      var m = iframeUrl.match(/rumble\.com\/embed\/([a-zA-Z0-9]+)/i);
      if (!m) return [];
      var vid = m[1];
      var apiUrl = "https://rumble.com/embedJS/u3/?request=video&ver=2&v=" + vid;
      var res = yield fetch(apiUrl, {
        headers: { "User-Agent": HEADERS["User-Agent"] },
        signal: timeoutSignal(7e3)
      });
      if (!res.ok) return [];
      var data = yield res.json();
      var hlsUrl = data.u && data.u.hls && data.u.hls.url || data.ua && data.ua.hls && data.ua.hls.auto && data.ua.hls.auto.url || (typeof (data.u && data.u.hls) === "string" ? data.u.hls : null);
      if (hlsUrl && typeof hlsUrl === "string") {
        var rHeaders = { "User-Agent": HEADERS["User-Agent"] };
        return [{
          name: "AsyaAnimeleri",
          title: "\u231C AsyaAnimeleri \u231F | Rumble [1080p HLS Master]",
          url: hlsUrl,
          quality: "1080p",
          format: "hls",
          isHls: true,
          headers: rHeaders,
          behaviorHints: {
            notWebReady: false,
            proxyHeaders: { request: rHeaders }
          }
        }];
      }
    } catch (e) {
    }
    return [];
  });
}
function fetchEpisodeMirrors(episodeUrl) {
  return __async(this, null, function* () {
    try {
      var res = yield fetch(episodeUrl, { headers: HEADERS, signal: timeoutSignal(8e3) });
      if (!res.ok) return [];
      var html = yield res.text();
      var iframes = [];
      var seenIframes = {};
      var mirrorRegex = /<option value="([A-Za-z0-9+/=]+)"[^>]*>\s*([^<\n\r]+)/g;
      var m;
      while ((m = mirrorRegex.exec(html)) !== null) {
        try {
          var decoded = safeBase64Decode(m[1]);
          var srcMatch = decoded.match(/src=["']?([^"'\s>]+)/i);
          if (srcMatch && !seenIframes[srcMatch[1]]) {
            seenIframes[srcMatch[1]] = true;
            iframes.push(srcMatch[1]);
          }
        } catch (e) {
        }
      }
      var pembedMatch = html.match(/id="pembed"[^>]*>[\s\S]*?<iframe[^>]+src=["']([^"']+)["']/i);
      if (pembedMatch && !seenIframes[pembedMatch[1]]) {
        seenIframes[pembedMatch[1]] = true;
        iframes.push(pembedMatch[1]);
      }
      var promises = iframes.map(function(src) {
        return __async(this, null, function* () {
          if (src.indexOf("sibnet.ru") !== -1) {
            var s = yield resolveSibnet(src);
            return s ? [s] : [];
          } else if (src.indexOf("ok.ru") !== -1) {
            return yield resolveOkRu(src);
          } else if (src.indexOf("mail.ru") !== -1) {
            return yield resolveMailRu(src);
          } else if (src.indexOf("rumble.com") !== -1) {
            return yield resolveRumble(src);
          }
          return [];
        });
      });
      var results = yield Promise.all(promises);
      var allStreams = [];
      var seenStreamUrls = {};
      for (var i = 0; i < results.length; i++) {
        var list = results[i];
        for (var j = 0; j < list.length; j++) {
          var st = list[j];
          if (st && st.url && !seenStreamUrls[st.url]) {
            seenStreamUrls[st.url] = true;
            allStreams.push(st);
          }
        }
      }
      return allStreams;
    } catch (e) {
      return [];
    }
  });
}
function getCatalog(args) {
  return __async(this, null, function* () {
    try {
      var page = 1;
      if (args && args.extra && args.extra.skip) {
        page = Math.floor(args.extra.skip / 20) + 1;
      }
      var query = args && args.extra && args.extra.search ? args.extra.search : "";
      var url = "";
      if (query) {
        url = BASE_URL + "/?s=" + encodeURIComponent(query);
      } else {
        url = page > 1 ? BASE_URL + "/series/page/" + page + "/?order=popular" : BASE_URL + "/series/?order=popular";
      }
      var res = yield fetch(url, { headers: HEADERS, signal: timeoutSignal(8e3) });
      if (!res.ok) return { metas: [] };
      var html = yield res.text();
      var metas = [];
      var seen = {};
      var artRegex = /<article class="bs"[^>]*>[\s\S]*?<a href="(https:\/\/asyaanimeleri\.top\/series\/[^"]+)"[^>]*title="([^"]+)"[\s\S]*?<img[^>]+src="([^"]+)"/gi;
      var m;
      while ((m = artRegex.exec(html)) !== null) {
        var sUrl = m[1];
        var sTitle = decodeHtmlEntities(m[2]);
        var sPoster = m[3];
        var slug = sUrl.replace("https://asyaanimeleri.top/series/", "").replace(/\/$/, "");
        if (!seen[slug]) {
          seen[slug] = true;
          metas.push({
            id: "asyaanimeleri:show:" + slug,
            type: "series",
            name: sTitle,
            poster: sPoster,
            posterShape: "poster"
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
      var rawId = typeof args === "object" && args !== null ? args.id : args;
      if (!rawId) return { meta: null };
      var slug = rawId.replace(/^asyaanimeleri:(?:show:|ep:)?/, "").replace(/\/$/, "");
      var detailUrl = BASE_URL + "/series/" + slug + "/";
      var res = yield fetch(detailUrl, { headers: HEADERS, signal: timeoutSignal(8e3) });
      if (!res.ok) return { meta: null };
      var html = yield res.text();
      var titleMatch = html.match(/<h1 class="entry-title"[^>]*>([^<]+)<\/h1>/i) || html.match(/<title>([^<]+)<\/title>/i);
      var title = titleMatch ? decodeHtmlEntities(titleMatch[1]).replace(/ - Asya Animeleri.*$/i, "").trim() : slug;
      var posterMatch = html.match(/class="thumb"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"/i);
      var poster = posterMatch ? posterMatch[1] : "";
      var descMatch = html.match(/class="entry-content entry-content-single"[^>]*>([\s\S]*?)<\/div>/i);
      var desc = descMatch ? decodeHtmlEntities(descMatch[1].replace(/<[^>]+>/g, "")).trim() : "";
      var episodes = parseEpisodes(html);
      var videos = [];
      for (var i = 0; i < episodes.length; i++) {
        var ep = episodes[i];
        var epNum = parseInt(ep.num) || episodes.length - i;
        var epSlug = ep.url.replace(BASE_URL + "/", "").replace(/\/$/, "");
        videos.push({
          id: "asyaanimeleri:ep:" + epSlug,
          title: ep.title || "B\xF6l\xFCm " + ep.num,
          season: 1,
          episode: epNum,
          released: ep.date
        });
      }
      return {
        meta: {
          id: "asyaanimeleri:show:" + slug,
          type: "series",
          name: title,
          poster,
          posterShape: "poster",
          background: poster,
          description: desc,
          videos
        }
      };
    } catch (e) {
      return { meta: null };
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
      var isTv = mediaType === "tv" || mediaType === "series";
      var finalSeason = parseInt(seasonNum) || 1;
      var finalEpisode = parseInt(episodeNum) || 1;
      if (typeof tmdbId === "string" && tmdbId.indexOf("asyaanimeleri:ep:") === 0) {
        var epSlug = tmdbId.replace("asyaanimeleri:ep:", "").replace(/\/$/, "");
        var epUrl = BASE_URL + "/" + epSlug + "/";
        return yield fetchEpisodeMirrors(epUrl);
      }
      if (typeof tmdbId === "string" && tmdbId.indexOf("asyaanimeleri:show:") === 0) {
        var showMeta = yield getMeta(tmdbId);
        if (showMeta && showMeta.meta && Array.isArray(showMeta.meta.videos) && showMeta.meta.videos.length > 0) {
          var matchedV = showMeta.meta.videos.find(function(v) {
            return v.episode === finalEpisode;
          }) || showMeta.meta.videos[0];
          return yield getStreams(matchedV.id, mediaType, seasonNum, episodeNum);
        }
      }
      if (typeof tmdbId === "string" && tmdbId.indexOf(":") !== -1) {
        var parts = tmdbId.split(":");
        if (parts.length >= 3) {
          var s = parseInt(parts[parts.length - 2]);
          var e = parseInt(parts[parts.length - 1]);
          if (!isNaN(s)) finalSeason = s;
          if (!isNaN(e)) finalEpisode = e;
        }
      }
      var info = yield resolveTmdbInfo(tmdbId, mediaType);
      if (!info.titles || !info.titles.length) return [];
      var matchedSeries = null;
      for (var i = 0; i < info.titles.length; i++) {
        var q = info.titles[i];
        var list = yield searchSeries(q);
        if (list && list.length > 0) {
          matchedSeries = pickBestSeries(list, q, finalSeason, !isTv);
          if (matchedSeries) break;
        }
      }
      if (!matchedSeries) return [];
      var sRes = yield fetch(matchedSeries.url, { headers: HEADERS, signal: timeoutSignal(8e3) });
      if (!sRes.ok) return [];
      var sHtml = yield sRes.text();
      var epList = parseEpisodes(sHtml);
      if (!epList.length) return [];
      var targetEpisode = matchEpisode(epList, finalEpisode, !isTv);
      if (!targetEpisode) return [];
      return yield fetchEpisodeMirrors(targetEpisode.url);
    } catch (e2) {
      return [];
    }
  });
}
function sortStreamsByQuality(streams) {
  if (!Array.isArray(streams) || streams.length <= 1) return streams || [];
  function getQualityScore(s) {
    if (!s) return 0;
    var score = 0;
    var text = ((s.title || "") + " " + (s.name || "") + " " + (s.quality || "")).toLowerCase();
    if (/\b(4k|2160p|uhd)\b/.test(text)) score = 2160;
    else if (/\b(2k|1440p|qhd)\b/.test(text)) score = 1440;
    else if (/\b(1080p|fhd|full[\s-]?hd)\b/.test(text)) score = 1080;
    else if (/\b(720p)\b/.test(text)) score = 720;
    else if (/\b(540p)\b/.test(text)) score = 540;
    else if (/\b(480p)\b/.test(text)) score = 480;
    else if (/\b(360p)\b/.test(text)) score = 360;
    else if (/\b(240p)\b/.test(text)) score = 240;
    else if (/\b(hd)\b/.test(text) && !/\b(full[\s-]?hd)\b/.test(text)) score = 720;
    else if (/\b(sd)\b/.test(text)) score = 480;
    if (!score && s.url) {
      var u = String(s.url).toLowerCase();
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
  return streams.slice().sort(function(a, b) {
    return getQualityScore(b) - getQualityScore(a);
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

