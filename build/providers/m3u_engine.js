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
const TMDB_API_KEY = "500330721680edb6d5f7f12ba7cd9023";
var CONFIG = (typeof require !== "undefined" ? (function() {
  try {
    return require("./config");
  } catch (e) {
    return require("./urls");
  }
})() : null) || (typeof globalThis !== "undefined" ? globalThis.CONFIG || globalThis.URLS : null) || {};
var URLS = CONFIG.urls || CONFIG;
const FILM_BASE_URL = URLS.m3u && URLS.m3u.film_base || "https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/main/nuvio_parcalari/";
const DIZI_BASE_URL = URLS.m3u && URLS.m3u.dizi_base || "https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/main/nuvio_dizi_parcalari/";
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
        return data && (data.title || data.original_title) ? data : null;
      }
    } catch (e) {
      return null;
    }
  });
}
function resolveTmdbShow(rawId) {
  return __async(this, null, function* () {
    let cleanId = String(rawId).replace(/^tmdb:/, "").split(":")[0].trim();
    const isImdb = cleanId.startsWith("tt");
    try {
      if (isImdb) {
        const res = yield fetch(`https://api.themoviedb.org/3/find/${cleanId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`);
        const data = yield res.json();
        return data.tv_results && data.tv_results[0] ? data.tv_results[0] : null;
      } else {
        const res = yield fetch(`https://api.themoviedb.org/3/tv/${cleanId}?api_key=${TMDB_API_KEY}&language=tr-TR&append_to_response=external_ids`);
        const data = yield res.json();
        return data && (data.name || data.original_name) ? data : null;
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
      const res = yield fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
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
const TMDB_GENRES = {
  28: "aksiyon",
  12: "macera",
  16: "animasyon",
  35: "komedi",
  80: "suc",
  99: "belgesel",
  18: "dram",
  10751: "aile",
  14: "fantastik",
  36: "tarih",
  27: "korku",
  10402: "muzik",
  9648: "gizem",
  10749: "romantik",
  878: "bilimkurgu",
  10770: "tvfilm",
  53: "gerilim",
  10752: "savas",
  37: "kovboy"
};
function searchFilmStreams(_0) {
  return __async(this, arguments, function* (tmdbId, options = {}) {
    const {
      sourceName = "Anthology Film",
      genreFilter = null,
      minScore = 70
    } = options;
    try {
      const d = yield resolveTmdbMovie(tmdbId);
      if (!d) return [];
      const targetImdb = d.imdb_id || (d.external_ids ? d.external_ids.imdb_id : null);
      const targetTr = ultraClean(d.title);
      const targetEn = ultraClean(d.original_title);
      const targetYear = (d.release_date || "").slice(0, 4);
      const movieGenres = [];
      if (Array.isArray(d.genres)) {
        d.genres.forEach((g) => {
          if (g && g.name) movieGenres.push(ultraClean(g.name));
        });
      }
      if (Array.isArray(d.genre_ids)) {
        d.genre_ids.forEach((gid) => {
          if (TMDB_GENRES[gid]) movieGenres.push(TMDB_GENRES[gid]);
        });
      }
      let genreMatch = true;
      if (genreFilter && genreFilter.length > 0) {
        const filterNorm = genreFilter.map(ultraClean);
        const tmdbHasGenre = movieGenres.some((mg) => filterNorm.some((f) => mg.includes(f) || f.includes(mg)));
        genreMatch = tmdbHasGenre || movieGenres.length === 0;
      }
      const targetGroups = /* @__PURE__ */ new Set([
        getLetterGroup(d.title),
        getLetterGroup(d.original_title),
        "0_9_rakam",
        "diger"
      ]);
      const results = [];
      const seenUrls = /* @__PURE__ */ new Set();
      for (const grp of targetGroups) {
        const m3uUrl = `${FILM_BASE_URL}nuvio_${grp}.m3u`;
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
            let groupMatch = line.match(/group-title="([^"]+)"/);
            let groupTitle = groupMatch ? ultraClean(groupMatch[1]) : "";
            let lineGenreOk = genreMatch;
            if (genreFilter && genreFilter.length > 0) {
              const filterNorm = genreFilter.map(ultraClean);
              const lineMatches = filterNorm.some((f) => groupTitle.includes(f) || f.includes(groupTitle));
              if (lineMatches) lineGenreOk = true;
            }
            if (!lineGenreOk && genreFilter) continue;
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
            if (isMatch && score >= minScore) {
              seenUrls.add(nextLine);
              results.push({
                name: `${d.title || d.original_title} (${m3uYear || targetYear})`,
                title: `\u231C ${sourceName} \u231F | ${sourceTag} [HD]`,
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
                    title: `\u231C ${sourceName} \u231F | SineWix [1080p DUAL]`,
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
                      title: `\u231C ${sourceName} \u231F | FilmModu [${s.quality || "HD"}]`,
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
function searchDiziStreams(_0, _1, _2, _3) {
  return __async(this, arguments, function* (rawId, type, seasonInput, episodeInput, options = {}) {
    const {
      sourceName = "Anthology Dizi",
      originFilter = null
      // 'tr' for Turkish, 'foreign' for non-Turkish
    } = options;
    let finalSeason = parseInt(seasonInput) || 1;
    let finalEpisode = parseInt(episodeInput) || 1;
    if (typeof rawId === "string" && rawId.includes(":")) {
      const parts = rawId.split(":");
      if (parts.length >= 3) {
        finalSeason = parseInt(parts[1]) || finalSeason;
        finalEpisode = parseInt(parts[2]) || finalEpisode;
      }
    }
    const finalType = type === "series" || type === "tv" ? "tv" : "movie";
    if (finalType !== "tv") return [];
    try {
      const d = yield resolveTmdbShow(rawId);
      if (!d) return [];
      const originCountry = d.origin_country && d.origin_country[0] || "";
      const isTurkish = originCountry === "TR";
      if (originFilter === "tr" && !isTurkish) return [];
      if (originFilter === "foreign" && isTurkish) return [];
      const targetTr = ultraClean(d.name);
      const targetEn = ultraClean(d.original_name);
      const sPad = finalSeason.toString().padStart(2, "0");
      const ePad = finalEpisode.toString().padStart(2, "0");
      const searchPatterns = [
        `s${sPad}e${ePad}`,
        `s${sPad} e${ePad}`,
        `s${finalSeason}e${finalEpisode}`,
        `s${finalSeason} e${finalEpisode}`,
        `${finalSeason}x${ePad}`,
        `${finalSeason}x${finalEpisode}`,
        `bolum${finalEpisode}`,
        `bolum ${finalEpisode}`
      ];
      const targetGroups = /* @__PURE__ */ new Set([
        getLetterGroup(d.name),
        getLetterGroup(d.original_name),
        "0_9_rakam",
        "diger"
      ]);
      const results = [];
      const seenUrls = /* @__PURE__ */ new Set();
      for (const grp of targetGroups) {
        const fileName = `dizi_${grp}_s${finalSeason}.m3u`;
        const m3uUrl = `${DIZI_BASE_URL}${fileName}`;
        const content = yield fetchM3U(m3uUrl);
        if (!content) continue;
        const lines = content.split("\n");
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.startsWith("#EXTINF")) {
            const nextLine = lines[i + 1] ? lines[i + 1].trim() : "";
            if (!nextLine.startsWith("http")) continue;
            if (seenUrls.has(nextLine)) continue;
            const cleanLine = ultraClean(line);
            const authorMatch = line.match(/group-author="([^"]+)"/);
            const sourceTag = authorMatch ? authorMatch[1].replace(/[\[\]]/g, "").trim() : "M3U";
            const nameMatch = cleanLine.includes(targetTr) || targetEn && cleanLine.includes(targetEn);
            if (!nameMatch) continue;
            let epMatch = false;
            for (const pat of searchPatterns) {
              if (cleanLine.includes(ultraClean(pat))) {
                epMatch = true;
                break;
              }
            }
            if (epMatch) {
              seenUrls.add(nextLine);
              results.push({
                name: `${d.name || d.original_name} S${sPad}E${ePad}`,
                title: `\u231C ${sourceName} \u231F | ${sourceTag} [HD]`,
                url: nextLine,
                quality: sourceTag || "HD"
              });
            }
          }
        }
      }
      return results;
    } catch (err) {
      return [];
    }
  });
}
module.exports = {
  ultraClean,
  getLetterGroup,
  resolveTmdbMovie,
  resolveTmdbShow,
  fetchM3U,
  searchFilmStreams,
  searchDiziStreams
};
