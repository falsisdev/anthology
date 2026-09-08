/**
 * CinemaCity - MoOnCrOwN Edition
 * Gelişmiş Arama (Fallback) + Dil & Bayrak Desteği
 */

var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => { try { step(generator.next(value)); } catch (e) { reject(e); } };
    var rejected = (value) => { try { step(generator.throw(value)); } catch (e) { reject(e); } };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

const MAIN_URL = "https://cinemacity.cc";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36",
  "Cookie": "dle_user_id=32729; dle_password=894171c6a8dab18ee594d5c652009a35;",
  "Referer": "https://cinemacity.cc/"
};
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";

const atobPolyfill = (str) => {
  try {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    let output = "";
    str = String(str).replace(/[=]+$/, "");
    if (str.length % 4 === 1) return "";
    for (let bc = 0, bs = 0, buffer, i = 0; buffer = str.charAt(i++); ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer, bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0) {
      buffer = chars.indexOf(buffer);
    }
    return output;
  } catch (e) { return ""; }
};

function extractQuality(url) {
  const low = (url || "").toLowerCase();
  if (low.includes("2160p") || low.includes("4k")) return "4K";
  if (low.includes("1080p")) return "1080p";
  if (low.includes("720p")) return "720p";
  if (low.includes("480p")) return "480p";
  return "HD";
}

async function getStreams(tmdbId, mediaType, season, episode) {
  try {
    const tmdbRes = await fetch(`https://api.themoviedb.org/3/${mediaType === "tv" ? "tv" : "movie"}/${tmdbId}?api_key=${TMDB_API_KEY}`);
    const mediaInfo = await tmdbRes.json();
    const animeTitle = mediaInfo.title || mediaInfo.name;
    if (!animeTitle) return [];

    // 1. Arama Fonksiyonu (Esnek ve Fallbackli)
    const findMediaInHtml = (html) => {
      const $ = cheerio.load(html);
      let found = null;
      $("div.dar-short_item").each((i, el) => {
        if (found) return;
        const anchor = $(el).find("a").filter((idx, a) => ($(a).attr("href") || "").includes(".html")).first();
        if (!anchor.length) return;
        const foundTitle = anchor.text().split("(")[0].trim().toLowerCase();
        const targetTitle = animeTitle.toLowerCase();
        if (foundTitle === targetTitle || foundTitle.includes(targetTitle) || targetTitle.includes(foundTitle)) {
          found = anchor.attr("href");
        }
      });
      return found;
    };

    const searchUrl = `${MAIN_URL}/index.php?do=search&subaction=search&story=${encodeURIComponent(animeTitle)}`;
    const searchRes = await fetch(searchUrl, { headers: HEADERS });
    let mediaUrl = findMediaInHtml(await searchRes.text());

    // Fallback: Aramada yoksa Ana Sayfaya bak
    if (!mediaUrl) {
      const homeRes = await fetch(MAIN_URL, { headers: HEADERS });
      mediaUrl = findMediaInHtml(await homeRes.text());
    }

    if (!mediaUrl) return [];

    // 2. Sayfa İçeriğini Çek ve Şifreyi Çöz
    const pageRes = await fetch(mediaUrl, { headers: HEADERS });
    const $page = cheerio.load(await pageRes.text());
    let fileData = null;

    $page("script").each((i, el) => {
      if (fileData) return;
      const html = $page(el).html();
      if (html && html.includes("atob")) {
        const regex = /atob\s*\(\s*(['"])(.*?)\1\s*\)/g;
        let match;
        while ((match = regex.exec(html)) !== null) {
          const decoded = atobPolyfill(match[2]);
          const fileMatch = decoded.match(/file\s*:\s*(['"])(.*?)\1/s) || decoded.match(/file\s*:\s*(\[.*?\])/s);
          if (fileMatch) {
            let rawFile = fileMatch[2] || fileMatch[1];
            try {
              fileData = JSON.parse(rawFile.replace(/\\(.)/g, "$1"));
            } catch (e) {
              try { fileData = JSON.parse(rawFile); } catch (e2) { fileData = rawFile; }
            }
            if (fileData) break;
          }
        }
      }
    });

    if (!fileData) return [];

    // 3. Link İşleme ve Dil Etiketleri
    const streams = [];
    const langMap = [
      { key: "turkish", flag: "🇹🇷" }, { key: "_tr", flag: "🇹🇷" },
      { key: "english", flag: "🇺🇸" }, { key: "_en", flag: "🇺🇸" },
      { key: "german", flag: "🇩🇪" }, { key: "french", flag: "🇫🇷" },
      { key: "russian", flag: "🇷🇺" }, { key: "italian", flag: "🇮🇹" },
      { key: "spanish", flag: "🇪🇸" }
    ];

    const addStream = (url, title, quality) => {
      if (!url || !url.startsWith("http")) return;
      const urlLower = url.toLowerCase();
      let flags = [];
      langMap.forEach(item => { if (urlLower.includes(item.key)) flags.push(item.flag); });

      const audioCount = (url.match(/\.m4a/g) || []).length;
      const finalQuality = quality || extractQuality(url);
      
      let infoLabel = "";
      if (audioCount > 1) infoLabel = `Multi: ${audioCount} ${flags.join("")}`;
      else if (flags.length > 0) infoLabel = flags.join("");
      else infoLabel = "Orijinal 📄";

      streams.push({
        name: `CinemaCity [${infoLabel}]`,
        title: `${title} - ${finalQuality}`,
        url: url,
        quality: finalQuality,
        headers: __spreadProps(__spreadValues({}, HEADERS), { Referer: MAIN_URL + "/" })
      });
    };

    const processStr = (str, label) => {
      if (!str) return;
      if (str.includes("[") && str.includes(",")) {
        str.split(",").forEach(p => {
          const m = p.match(/\[(.*?)\](.*)/);
          if (m) addStream(m[2], label, m[1]);
          else addStream(p, label, extractQuality(p));
        });
      } else {
        addStream(str, label, extractQuality(str));
      }
    };

    // Türüne göre dağıtım
    if (mediaType === "movie") {
      if (Array.isArray(fileData)) fileData.forEach(item => item.file && processStr(item.file, animeTitle));
      else if (typeof fileData === "string") processStr(fileData, animeTitle);
    } else {
      if (Array.isArray(fileData)) {
        const sObj = fileData.find(s => s.title?.includes(`Season ${season}`) || s.title?.includes(`S${season}`));
        if (sObj && sObj.folder) {
          const eObj = sObj.folder.find(e => e.title?.includes(`Episode ${episode}`) || e.title?.includes(`E${episode}`));
          if (eObj && eObj.file) processStr(eObj.file, `${animeTitle} S${season}E${episode}`);
        }
      }
    }

    return streams;
  } catch (error) { return []; }
}

module.exports = { getStreams };
