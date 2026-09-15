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
const DIZI_BASE_URL = URLS.m3u && URLS.m3u.dizi_base || "https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/main/nuvio_dizi_parcalari/";
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
        const res = yield fetch(`https://api.themoviedb.org/3/tv/${cleanId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
        const data = yield res.json();
        return data && data.name ? data : null;
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
function getStreams(rawId, type, seasonInput, episodeInput) {
  return __async(this, null, function* () {
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
                title: `\u231C Anthology \u231F | ${sourceTag} [HD]`,
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
if (typeof module !== "undefined") module.exports = { getStreams };
if (typeof globalThis !== "undefined") globalThis.getStreams = getStreams;
