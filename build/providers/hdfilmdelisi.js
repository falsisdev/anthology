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
var CONFIG = (typeof require !== "undefined" ? (function() {
  try {
    return require("./config");
  } catch (e) {
    return require("./urls");
  }
})() : null) || (typeof globalThis !== "undefined" ? globalThis.CONFIG || globalThis.URLS : null) || {};
var URLS = CONFIG.urls || CONFIG;
var BASE_URL = URLS.hdfilmdelisi && URLS.hdfilmdelisi.base || "https://hdfilmdelisi.one";
var TMDB_API_KEY = "500330721680edb6d5f7f12ba7cd9023";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
  "Referer": BASE_URL + "/"
};
var VIDMODY_HEADERS = {
  "User-Agent": HEADERS["User-Agent"],
  "Referer": "https://vidmody.com/",
  "Origin": "https://player.vidmody.com"
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
          }
        }
      } else {
        var type = mediaType === "tv" || mediaType === "series" ? "tv" : "movie";
        var tRes = yield fetchWithTimeout("https://api.themoviedb.org/3/" + type + "/" + cleanId + "?api_key=" + TMDB_API_KEY + "&language=tr-TR", {}, 1e4);
        if (tRes.ok) {
          var td = yield tRes.json();
          title = td.name || td.title || "";
          origTitle = td.original_name || td.original_title || "";
        }
      }
      return { title, origTitle };
    } catch (e) {
      return { title: "", origTitle: "" };
    }
  });
}
function apiSearch(query) {
  return __async(this, null, function* () {
    try {
      var res = yield fetchWithTimeout(BASE_URL + "/api/search?q=" + encodeURIComponent(query), {
        headers: { "User-Agent": HEADERS["User-Agent"], "Referer": BASE_URL + "/" }
      }, 15e3);
      if (!res.ok) return [];
      var data = yield res.json();
      return data && (data.results || data.films) || [];
    } catch (e) {
      return [];
    }
  });
}
function pickBest(results, title) {
  if (!results || results.length === 0) return null;
  var cleanTarget = ultraClean(title);
  var nameOf = function(r) {
    return r.baslik || r.orijinalBaslik || r.title || "";
  };
  for (var i = 0; i < results.length; i++) {
    if (ultraClean(nameOf(results[i])) === cleanTarget) return results[i];
  }
  for (var j = 0; j < results.length; j++) {
    var c = ultraClean(nameOf(results[j]));
    if (c.includes(cleanTarget) || cleanTarget.includes(c)) return results[j];
  }
  return results[0];
}
function vidmodyDecrypt(hex, key) {
  try {
    var sb = "";
    for (var i = 0; i < hex.length; i += 2) {
      sb += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    }
    var rev = sb.split("").reverse().join("");
    var decoded;
    if (typeof Buffer !== "undefined") {
      decoded = Buffer.from(rev, "base64");
    } else if (typeof atob === "function") {
      var bin = atob(rev);
      decoded = [];
      for (var k = 0; k < bin.length; k++) decoded.push(bin.charCodeAt(k));
    } else {
      return "";
    }
    var out = "";
    for (var b = 0; b < decoded.length; b++) {
      var byte = typeof decoded[b] === "number" ? decoded[b] : decoded.charCodeAt(b);
      out += String.fromCharCode((byte - key + 256) % 256);
    }
    return out.replace(/\\x([0-9a-fA-F]{2})/g, function(m, h) {
      return String.fromCharCode(parseInt(h, 16));
    });
  } catch (e) {
    return "";
  }
}
function extractVidmodyFile(pageUrl) {
  return __async(this, null, function* () {
    try {
      var res = yield fetchWithTimeout(pageUrl, { headers: HEADERS }, 15e3);
      if (!res.ok) return null;
      var html = yield res.text();
      var vm = html.match(/https?:[\\/]+player\.vidmody\.com[\\/][a-zA-Z0-9=\\/]+/);
      if (!vm) return null;
      var playerUrl = vm[0].split("\\").join("/");
      var pRes = yield fetchWithTimeout(playerUrl, {
        headers: { "User-Agent": HEADERS["User-Agent"], "Referer": pageUrl }
      }, 15e3);
      if (!pRes.ok) return null;
      var pHtml = yield pRes.text();
      var dMatch = pHtml.match(/(?:decrypt|\))\s*\(\s*["']([0-9a-fA-F]+)["']\s*,\s*(\d+)\s*\)/);
      if (!dMatch) return null;
      var block = vidmodyDecrypt(dMatch[1], parseInt(dMatch[2]));
      var fMatch = block.match(/file:\s*['"](https?:\/\/[^'"]+)['"]/);
      if (!fMatch) return null;
      var subs = [];
      var subRe = /https?:\/\/[^\s"'\\]+\.vtt/gi;
      var sm;
      var seen = /* @__PURE__ */ new Set();
      while ((sm = subRe.exec(pHtml + " " + block)) !== null) {
        if (seen.has(sm[0]) || /thumb/i.test(sm[0])) continue;
        seen.add(sm[0]);
        var lang = /tur/i.test(sm[0]) ? "tur" : "eng";
        subs.push({ id: lang, lang, url: sm[0] });
      }
      return { file: fMatch[1], playerUrl, subtitles: subs };
    } catch (e) {
      return null;
    }
  });
}
function toStream(file, subtitles) {
  var isHls = /\.m3u8/i.test(file) || file.includes("vidmody.com/vs/");
  var headers = isHls && file.includes("vidmody.com") ? { "User-Agent": HEADERS["User-Agent"], "Referer": "https://vidmody.com/" } : { "User-Agent": HEADERS["User-Agent"], "Referer": "https://player.vidmody.com/" };
  return {
    name: "HDFilmDelisi",
    title: "\u231C HDFilmDelisi \u231F | VidMody (1080p HLS)",
    url: file,
    quality: "1080p",
    provider: "hdfilmdelisi",
    headers,
    format: "hls",
    isHls: true,
    behaviorHints: { notWebReady: true, proxyHeaders: { request: headers } },
    subtitles: subtitles || []
  };
}
function getCatalog(args) {
  return __async(this, null, function* () {
    try {
      var query = args && args.search || args && args.extra && args.extra.search || args && args.query || "";
      var url = query ? BASE_URL + "/api/search?q=" + encodeURIComponent(query) : BASE_URL + "/api/films?page=1&sort=newest&limit=20";
      var res = yield fetchWithTimeout(url, { headers: { "User-Agent": HEADERS["User-Agent"] } }, 15e3);
      if (!res.ok) return { metas: [] };
      var data = yield res.json();
      var items = data.results || data.films || [];
      var metas = items.slice(0, 30).map(function(f) {
        var title = f.baslik || f.title || "Film";
        return {
          id: "hdfilmdelisi:movie:" + (f.slug || f.id),
          type: "movie",
          name: title + (f.yayinYili ? " (" + f.yayinYili + ")" : ""),
          poster: f.afis || "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png",
          background: f.afis || "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png",
          genres: [f.kategoriler && f.kategoriler[0] && f.kategoriler[0].ad || "Film", "HDFilmDelisi"],
          description: (f.orijinalBaslik || title) + " - HDFilmDelisi"
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
      if (!rawId || !rawId.startsWith("hdfilmdelisi:")) return { meta: null };
      var slug = rawId.split(":").slice(2).join(":");
      var pageUrl = BASE_URL + "/film/" + slug;
      var res = yield fetchWithTimeout(pageUrl, { headers: HEADERS }, 15e3);
      if (!res.ok) return { meta: null };
      var html = yield res.text();
      var titleMatch = html.match(/<title>([^<]+)<\/title>/i);
      var title = titleMatch ? titleMatch[1].split("|")[0].split("-")[0].trim() : "HDFilmDelisi";
      var ogImg = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
      var poster = ogImg ? ogImg[1] : "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png";
      return {
        meta: {
          id: rawId,
          type: "movie",
          name: title,
          poster,
          background: poster,
          description: title + " - HDFilmDelisi",
          genres: ["Film", "HDFilmDelisi"],
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
      if (typeof tmdbIdOrArgs === "string" && tmdbIdOrArgs.startsWith("hdfilmdelisi:movie:")) {
        var slug = tmdbIdOrArgs.split(":").slice(2).join(":");
        var found = yield extractVidmodyFile(BASE_URL + "/film/" + slug);
        return found ? [toStream(found.file, found.subtitles)] : [];
      }
      var info = yield resolveTmdbInfo(tmdbIdOrArgs, mediaType);
      var searchTitles = [info.title, info.origTitle].filter(Boolean);
      if (searchTitles.length === 0) return [];
      for (var t = 0; t < searchTitles.length; t++) {
        var results = yield apiSearch(searchTitles[t]);
        if (!results || results.length === 0) continue;
        var best = pickBest(results, searchTitles[t]);
        if (!best || !best.slug) continue;
        var vf = yield extractVidmodyFile(BASE_URL + "/film/" + best.slug);
        if (vf) return [toStream(vf.file, vf.subtitles)];
      }
      return [];
    } catch (e) {
      return [];
    }
  });
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams, getMeta, getCatalog };
}
if (typeof globalThis !== "undefined") {
  globalThis.getStreams = getStreams;
  globalThis.getMeta = getMeta;
  globalThis.getCatalog = getCatalog;
}
