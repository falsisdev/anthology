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
var PROVIDER_NAME = "Webte\u0130zle";
var CONFIG = (typeof require !== "undefined" ? (function() {
  try {
    return require("./config");
  } catch (e) {
    return require("./urls");
  }
})() : null) || (typeof globalThis !== "undefined" ? globalThis.CONFIG || globalThis.URLS : null) || {};
var URLS = CONFIG.urls || CONFIG;
var BASE_URL = URLS.webteizle && URLS.webteizle.base || "https://webteizle.info";
var TMDB_API_KEY = "500330721680edb6d5f7f12ba7cd9023";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML like Gecko) Chrome/137.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
  "Referer": BASE_URL + "/"
};
function fetchTmdbInfo(tmdbId, mediaType) {
  return __async(this, null, function* () {
    var cleanId = String(tmdbId || "").trim();
    if (cleanId.includes(":")) cleanId = cleanId.split(":")[0];
    var isTV = mediaType === "tv" || mediaType === "series";
    var endpoint = isTV ? "tv" : "movie";
    var isImdb = cleanId.startsWith("tt");
    if (isImdb) {
      var fRes = yield fetch("https://api.themoviedb.org/3/find/" + cleanId + "?api_key=" + TMDB_API_KEY + "&external_source=imdb_id");
      if (fRes.ok) {
        var fData = yield fRes.json();
        var match = isTV ? fData.tv_results && fData.tv_results[0] : fData.movie_results && fData.movie_results[0];
        if (match) {
          return {
            titleTr: match.title || match.name || "",
            titleEn: match.original_title || match.original_name || "",
            year: (match.release_date || match.first_air_date || "").slice(0, 4)
          };
        }
      }
    }
    var res = yield fetch("https://api.themoviedb.org/3/" + endpoint + "/" + cleanId + "?api_key=" + TMDB_API_KEY + "&language=tr-TR");
    if (!res.ok) return { titleTr: "", titleEn: "", year: "" };
    var d = yield res.json();
    return {
      titleTr: d.title || d.name || "",
      titleEn: d.original_title || d.original_name || "",
      year: (d.release_date || d.first_air_date || "").slice(0, 4)
    };
  });
}
function titleToSlug(title) {
  return (title || "").toLowerCase().replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ı/g, "i").replace(/İ/g, "i").replace(/ö/g, "o").replace(/ç/g, "c").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function findFilmPage(titleTr, titleEn) {
  return __async(this, null, function* () {
    var slugTr = titleToSlug(titleTr);
    var slugEn = titleToSlug(titleEn);
    var candidates = [];
    if (slugTr) {
      candidates.push(BASE_URL + "/izle/dublaj/" + slugTr);
      candidates.push(BASE_URL + "/izle/altyazi/" + slugTr);
    }
    if (slugEn && slugEn !== slugTr) {
      candidates.push(BASE_URL + "/izle/dublaj/" + slugEn);
      candidates.push(BASE_URL + "/izle/altyazi/" + slugEn);
    }
    for (var url of candidates) {
      try {
        var r = yield fetch(url, { headers: HEADERS });
        if (r.ok) {
          var html = yield r.text();
          if (html.indexOf("data-id") !== -1 && html.indexOf('id="wip"') !== -1) {
            return { url, html };
          }
        }
      } catch (e) {
      }
    }
    return yield searchFallback(titleTr, titleEn);
  });
}
function searchFallback(titleTr, titleEn) {
  return __async(this, null, function* () {
    var queries = [titleTr, titleEn].filter(Boolean);
    for (var query of queries) {
      try {
        var r = yield fetch(BASE_URL + "/ajax/arama.asp", {
          method: "POST",
          headers: Object.assign({}, HEADERS, {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "X-Requested-With": "XMLHttpRequest"
          }),
          body: "q=" + encodeURIComponent(query)
        });
        if (!r.ok) continue;
        var data = yield r.json();
        if (data.status === "success" && data.results && data.results.filmler && Array.isArray(data.results.filmler.results)) {
          var items = data.results.filmler.results;
          if (items.length > 0) {
            var best = items[0];
            var pageUrl = best.url.startsWith("http") ? best.url : BASE_URL + best.url;
            var pRes = yield fetch(pageUrl, { headers: HEADERS });
            if (pRes.ok) {
              var html = yield pRes.text();
              return { url: pageUrl, html };
            }
          }
        }
      } catch (e) {
      }
    }
    return null;
  });
}
function parseFilmId(html) {
  var m = html.match(/data-id="(\d+)"[^>]*id="wip"/) || html.match(/id="wip"[^>]*data-id="(\d+)"/) || html.match(/button[^>]+id="wip"[^>]+data-id="(\d+)"/) || html.match(/data-id="(\d+)"/);
  return m ? m[1] : null;
}
function parseDilList(html, pageUrl) {
  var diller = [];
  if (html.indexOf("/izle/dublaj/") !== -1 || pageUrl.indexOf("/izle/dublaj/") !== -1) diller.push({ dil: "0", ad: "TR Dublaj" });
  if (html.indexOf("/izle/altyazi/") !== -1 || pageUrl.indexOf("/izle/altyazi/") !== -1) diller.push({ dil: "1", ad: "TR Altyaz\u0131" });
  if (diller.length === 0) {
    diller.push({ dil: "0", ad: "TR Dublaj" });
    diller.push({ dil: "1", ad: "TR Altyaz\u0131" });
  }
  return diller;
}
function fetchAlternatifler(filmId, dil, seasonNum, episodeNum) {
  return __async(this, null, function* () {
    var body = "filmid=" + filmId + "&dil=" + dil + "&s=" + (seasonNum || "") + "&b=" + (episodeNum || "") + "&bot=0";
    try {
      var r = yield fetch(BASE_URL + "/ajax/dataAlternatif3.asp", {
        method: "POST",
        headers: Object.assign({}, HEADERS, {
          "Content-Type": "application/x-www-form-urlencoded",
          "X-Requested-With": "XMLHttpRequest",
          "Origin": BASE_URL
        }),
        body
      });
      if (!r.ok) return [];
      var data = yield r.json();
      return data.status === "success" && Array.isArray(data.data) ? data.data : [];
    } catch (e) {
      return [];
    }
  });
}
function fetchEmbedIframe(embedId) {
  return __async(this, null, function* () {
    try {
      var r = yield fetch(BASE_URL + "/ajax/dataEmbed.asp", {
        method: "POST",
        headers: Object.assign({}, HEADERS, {
          "Content-Type": "application/x-www-form-urlencoded",
          "X-Requested-With": "XMLHttpRequest",
          "Origin": BASE_URL
        }),
        body: "id=" + embedId
      });
      if (!r.ok) return null;
      var html = yield r.text();
      var m = html.match(/<iframe[^>]+src="([^"]+)"/i);
      if (m) return m[1];
      var sm = html.match(/(vidmoly|okru|filemoon|dzen)\s*\(\s*'([^']+)'/i);
      if (sm) {
        var p = sm[1].toLowerCase();
        var vid = sm[2];
        if (p === "vidmoly") return "https://vidmoly.biz/embed-" + vid + ".html";
        if (p === "okru") return "https://odnoklassniki.ru/videoembed/" + vid;
        if (p === "filemoon") return "https://filemoon.sx/e/" + vid;
        if (p === "dzen") return "https://dzen.ru/video/watch/" + vid;
      }
      return null;
    } catch (e) {
      return null;
    }
  });
}
function fetchVidMolyStream(iframeUrl) {
  return __async(this, null, function* () {
    var fullUrl = iframeUrl.startsWith("//") ? "https:" + iframeUrl : iframeUrl;
    fullUrl = fullUrl.replace("vidmoly.to", "vidmoly.biz").replace("vidmoly.net", "vidmoly.biz");
    try {
      var r = yield fetch(fullUrl, {
        headers: {
          "User-Agent": HEADERS["User-Agent"],
          "Referer": BASE_URL + "/"
        }
      });
      if (!r.ok) return null;
      var html = yield r.text();
      var m = html.match(/file\s*:\s*['"](https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*)['"]/i);
      return m ? { url: m[1], type: "hls", referer: "https://vidmoly.biz/" } : null;
    } catch (e) {
      return null;
    }
  });
}
function processEmbed(embedData, dilAd, movieTitle) {
  return __async(this, null, function* () {
    var baslik = (embedData.baslik || "").toLowerCase();
    if (baslik === "pixel" || baslik === "netu") return null;
    var src = yield fetchEmbedIframe(embedData.id);
    if (!src) return null;
    var flag = dilAd.includes("Dublaj") ? "\u{1F1F9}\u{1F1F7} " : "\u{1F310} ";
    var pName = embedData.baslik || "Kaynak";
    if (src.indexOf("vidmoly") !== -1) pName = "VidMoly";
    else if (src.indexOf("sibnet") !== -1) pName = "Sibnet";
    else if (src.indexOf("filemoon") !== -1) pName = "FileMoon";
    var q = embedData.kalite || "1080p";
    if (src.indexOf("vidmoly") !== -1) {
      var s = yield fetchVidMolyStream(src);
      if (s) {
        var sHeaders = {
          "User-Agent": HEADERS["User-Agent"],
          "Referer": s.referer
        };
        return {
          name: movieTitle,
          title: "\u231C Webte\u0130zle \u231F | " + pName + " | " + flag + dilAd,
          url: s.url,
          quality: q,
          headers: sHeaders,
          behaviorHints: {
            notWebReady: true,
            proxyHeaders: { request: sHeaders }
          },
          provider: "webteizle"
        };
      }
    }
    return null;
  });
}
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      var isTV = mediaType === "tv" || mediaType === "series";
      if (isTV) return [];
      var info = yield fetchTmdbInfo(tmdbId, mediaType);
      var movieName = info.titleTr || info.titleEn;
      if (!movieName) return [];
      var pageResult = yield findFilmPage(info.titleTr, info.titleEn);
      if (!pageResult || !pageResult.html) return [];
      var filmId = parseFilmId(pageResult.html);
      if (!filmId) return [];
      var diller = parseDilList(pageResult.html, pageResult.url);
      var streams = [];
      for (var d of diller) {
        var embedList = yield fetchAlternatifler(filmId, d.dil, season, episode);
        for (var e of embedList) {
          var s = yield processEmbed(e, d.ad, movieName);
          if (s && !streams.some((x) => x.url === s.url)) {
            streams.push(s);
          }
        }
      }
      return streams;
    } catch (err) {
      console.error("[Webte\u0130zle] Hata:", err.message);
      return [];
    }
  });
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams };
} else {
  global.WebteIzleProvider = { getStreams };
}
