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
const BASE_DIR = URLS.m3u && URLS.m3u.film_base || "https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/main/nuvio_parcalari/";
const TMDB_API_KEY = "500330721680edb6d5f7f12ba7cd9023";
const cache = {};
const cacheTime = {};
function ultraClean(s) {
  if (!s) return "";
  return s.toString().toLowerCase().replace(/[ıİ]/g, "i").replace(/[üÜ]/g, "u").replace(/[öÖ]/g, "o").replace(/[şŞ]/g, "s").replace(/[ğĞ]/g, "g").replace(/[çÇ]/g, "c").replace(/[^a-z0-9]/g, "").trim();
}
function getLetterGroup(title) {
  const clean = ultraClean(title);
  if (!clean) return "diger";
  const c = clean.charAt(0);
  if (/[0-9]/.test(c)) return "0_9_rakam";
  if (/[a-z]/.test(c)) return c;
  return "diger";
}
function resolveTmdbMovie(rawId) {
  return __async(this, null, function* () {
    let cleanId = String(rawId).replace(/^tmdb:/, "").split(":")[0].trim();
    const isImdb = cleanId.startsWith("tt");
    try {
      if (isImdb) {
        const res = yield fetch(`https://api.themoviedb.org/3/find/${cleanId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`);
        const data = yield res.json();
        return data.movie_results && data.movie_results[0] ? data.movie_results[0] : null;
      } else {
        const res = yield fetch(`https://api.themoviedb.org/3/movie/${cleanId}?api_key=${TMDB_API_KEY}&language=tr-TR&append_to_response=external_ids`);
        const data = yield res.json();
        return data && data.title ? data : null;
      }
    } catch (e) {
      return null;
    }
  });
}
function fetchM3U(url) {
  return __async(this, null, function* () {
    const now = Date.now();
    if (cache[url] && now - (cacheTime[url] || 0) < 3e5) {
      return cache[url];
    }
    try {
      const res = yield fetch(url);
      if (!res.ok) return null;
      const text = yield res.text();
      cache[url] = text;
      cacheTime[url] = now;
      return text;
    } catch (e) {
      return null;
    }
  });
}
const BLOCKED_DOMAINS = [
  "imagebin.pics",
  "imagehub.pics",
  "imagesbox.cloud",
  "photogrids.site",
  "picturebox.cloud",
  "pixtureup.org",
  "pixypost.art",
  "pixtures.art",
  "imglink.info",
  "imglink.pro"
];
function isBlockedStream(url) {
  if (!url) return true;
  for (var i = 0; i < BLOCKED_DOMAINS.length; i++) {
    if (url.includes(BLOCKED_DOMAINS[i])) return true;
  }
  return false;
}
function getStreams(tmdbId, mediaType) {
  return __async(this, null, function* () {
    if (mediaType === "tv" || mediaType === "series") return [];
    try {
      const d = yield resolveTmdbMovie(tmdbId);
      if (!d) return [];
      const targetImdb = d.imdb_id || (d.external_ids ? d.external_ids.imdb_id : null);
      const targetTr = ultraClean(d.title);
      const targetEn = ultraClean(d.original_title);
      const targetYear = (d.release_date || "").slice(0, 4);
      const targetGroups = /* @__PURE__ */ new Set([
        getLetterGroup(d.title),
        getLetterGroup(d.original_title),
        "0_9_rakam",
        "diger"
      ]);
      const results = [];
      const seenUrls = /* @__PURE__ */ new Set();
      for (const grp of targetGroups) {
        const m3uUrl = `${BASE_DIR}nuvio_${grp}.m3u`;
        const content = yield fetchM3U(m3uUrl);
        if (!content) continue;
        const lines = content.split("\n");
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.startsWith("#EXTINF")) {
            const nextLine = lines[i + 1] ? lines[i + 1].trim() : "";
            if (!nextLine.startsWith("http")) continue;
            if (isBlockedStream(nextLine)) continue;
            if (seenUrls.has(nextLine)) continue;
            let authorMatch = line.match(/group-author="([^"]+)"/);
            let sourceTag = authorMatch ? authorMatch[1].replace(/[\[\]]/g, "").trim() : "M3U";
            let parts = line.split(",");
            let rawName = parts[parts.length - 1].trim();
            let cleanM3U = ultraClean(rawName.split("(")[0].split("-")[0]);
            let yearMatch = line.match(/year="(\d{4})"/);
            let m3uYear = yearMatch ? yearMatch[1] : rawName.match(/\d{4}/) ? rawName.match(/\d{4}/)[0] : "";
            let isMatch = false;
            let score = 0;
            if (targetImdb && nextLine.includes(targetImdb)) {
              isMatch = true;
              score = 120;
            } else if (cleanM3U === targetTr || cleanM3U === targetEn) {
              if (!m3uYear || m3uYear === targetYear) {
                isMatch = true;
                score = m3uYear === targetYear ? 100 : 90;
              }
            } else if (cleanM3U.length > 3 && (cleanM3U.includes(targetTr) || targetEn && cleanM3U.includes(targetEn))) {
              if (!m3uYear || m3uYear === targetYear) {
                isMatch = true;
                score = 80;
              }
            }
            if (isMatch) {
              seenUrls.add(nextLine);
              results.push({
                name: `${d.title || d.original_title} (${m3uYear || targetYear})`,
                title: `\u231C Anthology \u231F | ${sourceTag} [HD]`,
                url: nextLine,
                quality: sourceTag || "HD",
                score
              });
            }
          }
        }
      }
      if (results.length === 0 && d && d.id) {
        try {
          const path = require("path");
          const sinewixMod = require(path.join(__dirname, "sinewix"));
          if (typeof sinewixMod.getStreams === "function") {
            const sStreams = yield sinewixMod.getStreams({ id: String(d.id), type: "movie" });
            if (Array.isArray(sStreams) && sStreams.length > 0) {
              for (const s of sStreams) {
                if (s && s.url && !seenUrls.has(s.url)) {
                  seenUrls.add(s.url);
                  results.push({
                    name: `${d.title || d.original_title} (${targetYear})`,
                    title: `\u231C Anthology \u231F | SineWix [1080p DUAL]`,
                    url: s.url,
                    quality: "1080p",
                    score: 95
                  });
                }
              }
            }
          }
        } catch (err) {
        }
        if (results.length === 0) {
          try {
            const path = require("path");
            const fmMod = require(path.join(__dirname, "filmmodu"));
            if (typeof fmMod.getStreams === "function") {
              const fmStreams = yield fmMod.getStreams(String(d.id), "movie");
              if (Array.isArray(fmStreams) && fmStreams.length > 0) {
                for (const s of fmStreams) {
                  if (s && s.url && !seenUrls.has(s.url)) {
                    seenUrls.add(s.url);
                    results.push({
                      name: `${d.title || d.original_title} (${targetYear})`,
                      title: `\u231C Anthology \u231F | FilmModu [${s.quality || "HD"}]`,
                      url: s.url,
                      quality: s.quality || "1080p",
                      score: 90,
                      headers: s.headers,
                      subtitles: s.subtitles
                    });
                  }
                }
              }
            }
          } catch (err) {
          }
        }
      }
      return results.sort((a, b) => b.score - a.score);
    } catch (e) {
      return [];
    }
  });
}
if (typeof module !== "undefined") module.exports = { getStreams };
if (typeof globalThis !== "undefined") globalThis.getStreams = getStreams;
