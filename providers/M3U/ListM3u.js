/**
 * Anthology Provider: m3u_list
 * Built from src/m3u_list/index.js
 * Build Date: 2026-09-18T21:28:18.435Z
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

// src/shared/epg.js
var require_epg = __commonJS({
  "src/shared/epg.js"(exports2, module2) {
    var SAMPLE_SCHEDULES = {
      "trt1": [
        { start: "06:00", end: "09:00", title: "Sabah Haberleri & G\xFCndem" },
        { start: "09:00", end: "10:30", title: "Ali\u015Fan ile Hayata G\xFCl\xFCmse" },
        { start: "10:30", end: "13:00", title: "Yerli Dizi / Sinema Ku\u015Fa\u011F\u0131" },
        { start: "13:00", end: "14:00", title: "TRT 1 G\xFCn Ortas\u0131 Haberleri" },
        { start: "14:00", end: "17:00", title: "G\xF6n\xFCl Da\u011F\u0131 / Nostalji Ku\u015Fa\u011F\u0131" },
        { start: "17:00", end: "19:00", title: "Ana Haber \xD6ncesi Akt\xFCalite" },
        { start: "19:00", end: "20:00", title: "TRT 1 Ana Haber" },
        { start: "20:00", end: "23:30", title: "Te\u015Fkilat / Kud\xFCs Fatihi Selahaddin Eyyubi" },
        { start: "23:30", end: "02:00", title: "Gece Ku\u015Fa\u011F\u0131 / Sinema" }
      ],
      "trtgenc": [
        { start: "08:00", end: "10:00", title: "Gen\xE7 Bak\u0131\u015F & Teknoloji Trendleri" },
        { start: "10:00", end: "12:00", title: "Oyun D\xFCnyas\u0131 & Espor G\xFCndemi" },
        { start: "12:00", end: "14:00", title: "Gen\xE7lik Dizileri Ku\u015Fa\u011F\u0131" },
        { start: "14:00", end: "16:00", title: "Bilim, Sanat ve Giri\u015Fimcilik" },
        { start: "16:00", end: "18:00", title: "Kamp\xFCs Hayat\u0131 & \xDCniversite Sohbetleri" },
        { start: "18:00", end: "20:00", title: "M\xFCzik & Gen\xE7 Ritimler" },
        { start: "20:00", end: "22:00", title: "Gelecek Sensin! \xD6zel Gen\xE7lik Program\u0131" },
        { start: "22:00", end: "00:00", title: "Espor Kar\u015F\u0131la\u015Fmalar\u0131 & Konserler" }
      ],
      "atv": [
        { start: "06:30", end: "10:00", title: "Kahvalt\u0131 Haberleri" },
        { start: "10:00", end: "13:00", title: "M\xFCge Anl\u0131 ile Tatl\u0131 Sert" },
        { start: "13:00", end: "14:00", title: "atv G\xFCn Ortas\u0131" },
        { start: "14:00", end: "16:00", title: "Mutfak Bahane" },
        { start: "16:00", end: "19:00", title: "Esra Erol'da" },
        { start: "19:00", end: "20:00", title: "atv Ana Haber" },
        { start: "20:00", end: "23:30", title: "Kurulu\u015F Osman / Aldatmak" },
        { start: "23:30", end: "02:00", title: "Gece Ku\u015Fa\u011F\u0131 Dizisi" }
      ],
      "kanald": [
        { start: "07:00", end: "09:00", title: "Kanal D Sabah Haberleri" },
        { start: "09:00", end: "11:00", title: "Neler Oluyor Hayatta?" },
        { start: "11:00", end: "13:00", title: "Gelinim Mutfakta" },
        { start: "13:00", end: "16:00", title: "Arka Sokaklar Ku\u015Fa\u011F\u0131" },
        { start: "16:00", end: "19:00", title: "Bizi Birle\u015Ftiren Hayat" },
        { start: "19:00", end: "20:00", title: "Kanal D Ana Haber" },
        { start: "20:00", end: "23:30", title: "\u0130nci Taneleri / Yarg\u0131" },
        { start: "23:30", end: "02:00", title: "Yabanc\u0131 Sinema Ku\u015Fa\u011F\u0131" }
      ],
      "trtspor": [
        { start: "07:00", end: "10:00", title: "\u0130lk Bask\u0131 & Sabah Sporu" },
        { start: "10:00", end: "12:00", title: "Spor B\xFClteni & S\xFCper Lig \xD6zetleri" },
        { start: "12:00", end: "14:00", title: "G\xFCn\xFCn \u0130\xE7inden & Transfer G\xFCndemi" },
        { start: "14:00", end: "17:00", title: "Canl\u0131 Ma\xE7 Ku\u015Fa\u011F\u0131 / 1. Lig & Voleybol" },
        { start: "17:00", end: "19:00", title: "Spor St\xFCdyosu" },
        { start: "19:00", end: "21:00", title: "Ma\xE7 \xD6n\xFC & \xD6zel R\xF6portajlar" },
        { start: "21:00", end: "23:30", title: "Futbol Akl\u0131 / Canl\u0131 Ma\xE7 Yay\u0131n\u0131" },
        { start: "23:30", end: "01:30", title: "Teknik Analiz & Gece Sporu" }
      ]
    };
    function parseTimeToMinutes(t) {
      if (!t) return 0;
      var parts = t.split(":");
      return parseInt(parts[0], 10) * 60 + parseInt(parts[1] || "0", 10);
    }
    function getNowPlayingInfo2(channelKey, channelName) {
      var key = (channelKey || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      var sched = SAMPLE_SCHEDULES[key];
      if (!sched) {
        for (var k in SAMPLE_SCHEDULES) {
          if (key.indexOf(k) !== -1 || k.indexOf(key) !== -1) {
            sched = SAMPLE_SCHEDULES[k];
            break;
          }
        }
      }
      if (!sched || !sched.length) {
        return {
          current: channelName + " 7/24 Kesintisiz Canl\u0131 Yay\u0131n",
          next: "Yay\u0131n Ak\u0131\u015F\u0131 Devam Ediyor",
          timeSlot: "CANLI",
          formattedText: channelName + " Canl\u0131 HD Yay\u0131n."
        };
      }
      var now = /* @__PURE__ */ new Date();
      var istanbulHour = (now.getUTCHours() + 3) % 24;
      var istanbulMin = now.getUTCMinutes();
      var currentMin = istanbulHour * 60 + istanbulMin;
      var cur = null;
      var nxt = null;
      for (var i = 0; i < sched.length; i++) {
        var sMin = parseTimeToMinutes(sched[i].start);
        var eMin = parseTimeToMinutes(sched[i].end);
        if (eMin < sMin) {
          if (currentMin >= sMin || currentMin < eMin) {
            cur = sched[i];
            nxt = sched[(i + 1) % sched.length];
            break;
          }
        } else if (currentMin >= sMin && currentMin < eMin) {
          cur = sched[i];
          nxt = sched[(i + 1) % sched.length];
          break;
        }
      }
      if (!cur) {
        cur = sched[sched.length - 1];
        nxt = sched[0];
      }
      var timeStr = cur.start + " - " + cur.end;
      var formatted = "\u{1F534} YAYINDA: " + cur.title + " (" + timeStr + ")\n\u25B6 SIRADAK\u0130: " + (nxt ? nxt.title + " [" + nxt.start + "]" : "Program Ak\u0131\u015F\u0131");
      return {
        current: cur.title,
        next: nxt ? nxt.title : "",
        timeSlot: timeStr,
        formattedText: formatted
      };
    }
    module2.exports = {
      getNowPlayingInfo: getNowPlayingInfo2
    };
  }
});

// src/m3u_list/index.js
var { sortStreamsByQuality } = require_quality();
var { loadConfig, val, wrapAll } = require_config();
var { getNowPlayingInfo } = require_epg();
var _cfgReady = null;
function cfgReady() {
  if (!_cfgReady) {
    _cfgReady = loadConfig().then(function() {
      var v;
      v = val("urls.live.m3u_remote");
      if (v) M3U_URL = String(v).replace(/\/+$/, "");
      v = val("urls.live.mahsunsports");
      if (v) MAHSUN_SITE = v;
      if (_MAHSUN_HEADERS) {
        _MAHSUN_HEADERS.Referer = MAHSUN_SITE;
        _MAHSUN_HEADERS.Origin = MAHSUN_SITE;
      }
    });
  }
  return _cfgReady;
}
var M3U_URL = "https://raw.githubusercontent.com/falsisdev/anthology/main/providers/M3U/Liste/canli.m3u";
var _HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "*/*"
};
var cachedText = null;
var cacheTime = 0;
function fetchChannels() {
  var now = Date.now();
  if (cachedText && now - cacheTime < 3e5) {
    return Promise.resolve(cachedText);
  }
  if (typeof require !== "undefined") {
    try {
      var path = require("path");
      var fs = require("fs");
      var localPath = path.resolve(__dirname, "Liste", "canli.m3u");
      if (fs.existsSync(localPath)) {
        cachedText = fs.readFileSync(localPath, "utf8");
        cacheTime = now;
        return Promise.resolve(cachedText);
      }
    } catch (e) {
    }
  }
  return fetch(M3U_URL, { headers: { "User-Agent": "Mozilla/5.0" } }).then(function(res) {
    return res.text();
  }).then(function(txt) {
    cachedText = txt;
    cacheTime = now;
    return txt;
  });
}
function getCatalog(args) {
  return fetchChannels().then(function(content) {
    var lines = content.split("\n");
    var metas = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (line.indexOf("#EXTINF") !== -1) {
        var tvgIdMatch = line.match(/tvg-id="([^"]+)"/i);
        var tvgNameMatch = line.match(/tvg-name="([^"]+)"/i);
        var logoMatch = line.match(/tvg-logo="([^"]+)"/i);
        var groupMatch = line.match(/group-title="([^"]+)"/i);
        var nameMatch = line.match(/"\s*,\s*(.+)$/);
        var channelName = nameMatch ? nameMatch[1].trim() : line.split(",").pop().trim();
        var rawId = tvgIdMatch && tvgIdMatch[1] ? tvgIdMatch[1].trim() : tvgNameMatch ? tvgNameMatch[1].trim() : channelName;
        var channelId = rawId.startsWith("tv:") ? rawId : "tv:" + rawId;
        var logo = logoMatch ? logoMatch[1] : "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/canli/default_tv.png";
        var genre = groupMatch ? groupMatch[1].replace(/[^\w\sğüşıöçĞÜŞİÖÇ]/gi, "").trim() : "Ulusal";
        metas.push({
          id: channelId,
          type: "tv",
          name: channelName,
          poster: logo,
          background: logo,
          genres: [genre],
          description: channelName + " Canl\u0131 Yay\u0131n"
        });
      }
    }
    return { metas };
  }).catch(function() {
    return { metas: [] };
  });
}
function cleanKey(s) {
  return (s || "").toString().toLowerCase().replace(/[^a-z0-9]/g, "");
}
function getMeta(args) {
  var targetId = typeof args === "string" ? args : args && args.id ? args.id : null;
  if (!targetId) return Promise.resolve({ meta: null });
  var cleanM = String(targetId).toLowerCase();
  if (cleanM.indexOf("tv:mahsunsports") === 0) {
    return fetchMahsunVerifiedMatches(null).then(function(matches) {
      var videos = [];
      var titleCount = {};
      for (var i = 0; i < matches.length; i++) {
        var m = matches[i];
        titleCount[m.title] = (titleCount[m.title] || 0) + 1;
        var st;
        if (m.isChannelFeed) st = "\u{1F534} " + m.title;
        else st = (SPORT_LABEL[m.sport] || "\u25B6") + " | " + m.title;
        if (titleCount[m.title] > 1) st += " (Ak\u0131\u015F " + titleCount[m.title] + ")";
        videos.push({ id: "tv:mahsunsports:" + i, title: st, released: (/* @__PURE__ */ new Date()).toISOString() });
      }
      return {
        meta: {
          id: "tv:mahsunsports",
          type: "tv",
          name: "Mahsun Sports",
          poster: "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/canli/mahsunsports.png",
          background: "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/canli/mahsunsports.png",
          description: "Mahsun Sports canl\u0131 ma\xE7 yay\u0131nlar\u0131 \u2014 Futbol, Basketbol, Voleybol ve Tenis",
          genres: ["Spor"],
          videos
        }
      };
    }).catch(function() {
      return { meta: null };
    });
  }
  return fetchChannels().then(function(content) {
    var lines = content.split("\n");
    var name = targetId.replace(/^tv:/, "");
    var logo = "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/canli/default_tv.png";
    var searchKey = cleanKey(targetId.replace(/^tv:/, ""));
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (line.indexOf("#EXTINF") !== -1) {
        var tvgIdMatch = line.match(/tvg-id="([^"]+)"/i);
        var tvgNameMatch = line.match(/tvg-name="([^"]+)"/i);
        var nameMatch = line.match(/"\s*,\s*(.+)$/);
        var aliasName = nameMatch ? nameMatch[1].trim() : line.split(",").pop().trim();
        var cId = cleanKey(tvgIdMatch ? tvgIdMatch[1] : "");
        var cName = cleanKey(tvgNameMatch ? tvgNameMatch[1] : "");
        var aName = cleanKey(aliasName);
        if (cId === searchKey || cName === searchKey || aName === searchKey || aName.includes(searchKey) || searchKey.includes(aName)) {
          name = aliasName;
          var logoMatch = line.match(/tvg-logo="([^"]+)"/i);
          if (logoMatch) logo = logoMatch[1];
          break;
        }
      }
    }
    var epg = getNowPlayingInfo(cleanTarget, name);
    return {
      meta: {
        id: targetId,
        type: "tv",
        name,
        poster: logo,
        background: logo,
        description: epg && epg.formattedText ? epg.formattedText : name + " Canl\u0131 Yay\u0131n",
        videos: [{
          id: targetId,
          title: epg && epg.current ? epg.current : name,
          released: (/* @__PURE__ */ new Date()).toISOString()
        }]
      }
    };
  }).catch(function() {
    return {
      meta: {
        id: targetId,
        type: "tv",
        name: "Canl\u0131 Yay\u0131n",
        poster: "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/canli/default_tv.png",
        videos: [{ id: targetId, title: "Yay\u0131n\u0131 Ba\u015Flat" }]
      }
    };
  });
}
var KNOWN_BACKUPS = {
  "trt1": "https://tv-trt1.medya.trt.com.tr/master.m3u8",
  "trtspor": "https://tv-trtspor1.medya.trt.com.tr/master.m3u8",
  "trtsporyildiz": "https://tv-trtspor2.medya.trt.com.tr/master.m3u8",
  "trthaber": "https://tv-trthaber.medya.trt.com.tr/master.m3u8",
  "trtbelgesel": "https://tv-trtbelgesel-dai.medya.trt.com.tr/master.m3u8",
  "trtcocuk": "https://tv-trtcocuk.medya.trt.com.tr/master.m3u8",
  "trtmuzik": "https://tv-trtmuzik.medya.trt.com.tr/master.m3u8",
  "tv85": "https://tv8.daioncdn.net/tv8bucuk/tv8bucuk.m3u8?app=tv8bucuk_web&ce=3"
};
function isEncryptedChannel(name, id) {
  var key = (name || "").toLowerCase() + " " + (id || "").toLowerCase();
  return /bein|ssport|sspor|tivibu|smartspor|smarts|exxen|tabii|eurosport|nba/.test(key);
}
var MAHSUN_SITE = "https://mahsunsports80.xyz/";
var ANDRO_URL_RE = /https:\/\/andro\.evrenesoglu\d+\.click\/checklist\//g;
var _MAHSUN_HEADERS = {
  "User-Agent": _HEADERS["User-Agent"],
  "Referer": MAHSUN_SITE,
  "Origin": MAHSUN_SITE
};
var mahsunBasesCache = null;
function baseProbe(url) {
  var ctrl = null;
  if (typeof AbortController !== "undefined") ctrl = new AbortController();
  var timer = setTimeout(function() {
    if (ctrl) ctrl.abort();
  }, 5e3);
  var opts = {
    method: "GET",
    headers: {
      "User-Agent": _HEADERS["User-Agent"],
      "Referer": MAHSUN_SITE,
      "Range": "bytes=0-2048"
    }
  };
  if (ctrl) opts.signal = ctrl.signal;
  return fetch(url, opts).then(function(res) {
    clearTimeout(timer);
    var code = res.status;
    return code === 200 || code === 206;
  }).catch(function() {
    clearTimeout(timer);
    return false;
  });
}
function findWorkingBase(prefer) {
  var seen = {};
  var cands = [];
  function add(b) {
    b = String(b || "");
    if (!b || seen[b]) return;
    seen[b] = true;
    cands.push(b);
  }
  (prefer || []).forEach(add);
  for (var n = 99; n <= 112; n++) add("https://andro.evrenesoglu" + n + ".click/checklist/");
  var i = 0;
  function next() {
    if (i >= cands.length) return Promise.resolve(prefer && prefer[0] ? prefer[0] : "");
    var b = cands[i++];
    return baseProbe(b + "androstreamlivebs3.m3u8").then(function(alive) {
      return alive ? b : next();
    });
  }
  return next();
}
function fetchMahsunBases() {
  var now = Date.now();
  if (mahsunBasesCache && now - mahsunBasesCache.time < 15 * 60 * 1e3) {
    return Promise.resolve(mahsunBasesCache.bases);
  }
  return fetch(MAHSUN_SITE + "event.html?id=androstreamlivebs1", { headers: _MAHSUN_HEADERS }).then(function(res) {
    return res.text();
  }).then(function(txt) {
    var bases = [];
    var m;
    ANDRO_URL_RE.lastIndex = 0;
    while ((m = ANDRO_URL_RE.exec(txt)) !== null) {
      if (bases.indexOf(m[0]) === -1) bases.push(m[0]);
    }
    mahsunBasesCache = { time: now, bases };
    return bases;
  }).catch(function() {
    mahsunBasesCache = { time: now, bases: [] };
    return [];
  });
}
function androIdFromUrl(url) {
  var m = String(url || "").match(/\/checklist\/([A-Za-z0-9]+)\.m3u8/);
  return m ? m[1] : null;
}
var MAHSUN_DATA_TTL = 15 * 60 * 1e3;
var mahsunCache = null;
function mahsunFetchText(url) {
  return fetch(url, { headers: _MAHSUN_HEADERS }).then(function(res) {
    return res.text();
  }).catch(function() {
    return "";
  });
}
function extractNamedArray(script, name) {
  var re = new RegExp("(?:const|var|let)\\s+" + name + "\\s*=\\s*\\[");
  var m = script.match(re);
  if (!m) return "";
  var start = m.index + m[0].length - 1;
  var depth = 0, inStr = false, quote = "";
  for (var i = start; i < script.length; i++) {
    var c = script[i];
    if (inStr) {
      if (c === "\\") {
        i++;
        continue;
      }
      if (c === quote) inStr = false;
      continue;
    }
    if (c === '"' || c === "'") {
      inStr = true;
      quote = c;
      continue;
    }
    if (c === "[") depth++;
    else if (c === "]") {
      depth--;
      if (depth === 0) return script.slice(start, i + 1);
    }
  }
  return "";
}
var SPORT_LABEL = { F: "\u26BD\uFE0F F", B: "\u{1F3C0} B", V: "\u{1F3D0} V", T: "\u{1F3BE} T" };
var SPORT_ORDER = { F: 0, B: 1, V: 2, T: 3, C: 4 };
function sportOfMatch(m, catSets) {
  var ct = cleanKey(m.title);
  if (catSets.F.has(ct)) return "F";
  if (catSets.B.has(ct)) return "B";
  if (catSets.V.has(ct)) return "V";
  if (catSets.T.has(ct)) return "T";
  var lg = String(m.league || "") + " " + String(m.title || "");
  lg = lg.toLowerCase();
  if (/(tenis|tennis|davis|atp|wta)/i.test(lg)) return "T";
  if (/(voley|volley|legends cup)/i.test(lg)) return "V";
  if (/(basket|basketbol|nba|wnba|euroliga|euro ?league|berna vindita|lacb)/i.test(lg)) return "B";
  return "F";
}
function parseTimeMs(o) {
  var d = o.tarih || "";
  var t = o.time || "";
  if (!d && o._sort_key) d = String(o._sort_key).slice(0, 10);
  var tm = String(t).match(/(\d{1,2}):(\d{2})/);
  if (!tm) return null;
  var ts = Date.parse((d || "1970-01-01") + "T" + tm[1] + ":" + tm[2] + ":00+03:00");
  return isNaN(ts) ? null : ts;
}
function parseScript4(script) {
  var idMap = {};
  var chanById = {};
  var pairsRe = /\{\s*title:\s*"([^"]+)",\s*url:\s*"\/event\.html\?id=([^"]+)"\s*\}/g;
  var p;
  while ((p = pairsRe.exec(script)) !== null) {
    var nk = cleanKey(p[1]);
    if (nk && !idMap[nk]) idMap[nk] = p[2];
    if (p[2] && !chanById[p[2]]) chanById[p[2]] = p[1];
  }
  var CAT_ARRAYS = [
    { sport: "F", array: "futbolMatches" },
    { sport: "B", array: "basketbolMatches" },
    { sport: "V", array: "voleybolMatches" },
    { sport: "T", array: "tenisMatches" }
  ];
  var catSets = {};
  var catEvents = [];
  for (var ci = 0; ci < CAT_ARRAYS.length; ci++) {
    var ca = CAT_ARRAYS[ci];
    var caSet = /* @__PURE__ */ new Set();
    var catBody = extractNamedArray(script, ca.array);
    if (catBody) {
      var catObjs = catBody.match(/\{[^{}]*\}/g) || [];
      for (var co = 0; co < catObjs.length; co++) {
        var ctM = catObjs[co].match(/"title"\s*:\s*"([^"]*)"/);
        var cu = catObjs[co].match(/"url"\s*:\s*"[^"]*id=([A-Za-z0-9]+)"/);
        var ct = ctM && ctM[1] ? ctM[1].trim() : "";
        var cid = cu ? cu[1] : "";
        if (ctM && ctM[1]) caSet.add(cleanKey(ctM[1].trim()));
        if (!ct || !cid || cid === "None" || cid.indexOf("chNone") !== -1) continue;
        var ctTimeM = catObjs[co].match(/"time"\s*:\s*"([^"]*)"/);
        var ctSortM = catObjs[co].match(/"_sort_key"\s*:\s*"([^"]*)"/);
        var ctObj = {
          title: ct,
          id: cid,
          league: "",
          live: true,
          time: ctTimeM ? ctTimeM[1] : "",
          _sort_key: ctSortM ? ctSortM[1] : "",
          sport: ca.sport,
          _ts: null
        };
        ctObj._ts = parseTimeMs(ctObj);
        catEvents.push(ctObj);
      }
    }
    catSets[ca.sport] = caSet;
  }
  var featBody = extractNamedArray(script, "karsilasmalar");
  var featured = [];
  var seenIdsArr = {};
  if (featBody) {
    var objs = featBody.match(/\{[^{}]*\}/g) || [];
    for (var oi = 0; oi < objs.length; oi++) {
      var o = objs[oi];
      var t = o.match(/"title"\s*:\s*"([^"]*)"/);
      var u = o.match(/"url"\s*:\s*"\/?event\.html\?id=([A-Za-z0-9]+)"/);
      var l = o.match(/"league"\s*:\s*"([^"]*)"/);
      var lv = o.match(/"live"\s*:\s*(true|false)/);
      var tm = o.match(/"time"\s*:\s*"([^"]*)"/);
      var dd = o.match(/"tarih"\s*:\s*"([^"]*)"/);
      if (!t || !u) continue;
      var title = t[1].trim();
      var id = u[1];
      if (!title || !id || id === "None" || id.indexOf("chNone") !== -1) continue;
      var key = id + "|" + title;
      if (seenIdsArr[key]) continue;
      seenIdsArr[key] = true;
      var fobj = {
        title,
        id,
        league: l ? l[1].trim() : "",
        live: lv ? lv[1] === "true" : false,
        time: tm ? tm[1].trim() : "",
        tarih: dd ? dd[1].trim() : "",
        sport: sportOfMatch({ title, league: l ? l[1].trim() : "" }, catSets),
        _ts: null
      };
      fobj._ts = parseTimeMs(fobj);
      featured.push(fobj);
    }
  }
  var activeFeedIds = {};
  featured.forEach(function(m) {
    activeFeedIds[m.id] = true;
  });
  var chanKeys = Object.keys(chanById);
  var channelFeedAdds = [];
  for (var ck = 0; ck < chanKeys.length; ck++) {
    var cid = chanKeys[ck];
    if (!activeFeedIds[cid]) continue;
    if (cid.indexOf("facebooklive") !== -1) continue;
    if (/ch\d+$/i.test(cid)) continue;
    channelFeedAdds.push({
      title: chanById[cid],
      id: cid,
      league: "",
      live: true,
      time: "",
      tarih: "",
      sport: "C",
      _ts: null,
      isChannelFeed: true
    });
  }
  var matches = catEvents.slice();
  for (var af = 0; af < channelFeedAdds.length; af++) matches.push(channelFeedAdds[af]);
  matches.sort(function(a, b) {
    var oa = SPORT_ORDER[a.sport] !== void 0 ? SPORT_ORDER[a.sport] : 9;
    var ob = SPORT_ORDER[b.sport] !== void 0 ? SPORT_ORDER[b.sport] : 9;
    if (oa !== ob) return oa - ob;
    if (a.live !== b.live) return a.live ? -1 : 1;
    return a.time < b.time ? -1 : a.time > b.time ? 1 : 0;
  });
  return { idMap, matches };
}
function fetchMahsunData() {
  var now = Date.now();
  if (mahsunCache && now - mahsunCache.time < MAHSUN_DATA_TTL) {
    return Promise.resolve(mahsunCache);
  }
  return fetchMahsunBases().then(function(bases) {
    return findWorkingBase(bases).then(function(wb) {
      if (wb) {
        var bs = bases.slice();
        var wbIdx = bs.indexOf(wb);
        if (wbIdx > 0) {
          bs.splice(wbIdx, 1);
          bs.unshift(wb);
        }
        bases = bs;
      }
      return mahsunFetchText(MAHSUN_SITE).then(function(pageHtml) {
        var scriptUrl = null;
        var sm = pageHtml.match(/src=["']([^"']*script4\.js[^"']*)["']/i);
        if (sm) {
          scriptUrl = sm[1].indexOf("http") === 0 ? sm[1] : MAHSUN_SITE.replace(/\/+$/, "") + "/" + sm[1].replace(/^\/+/, "");
        }
        if (!scriptUrl) {
          mahsunCache = { time: now, bases, idMap: {}, matches: [] };
          return mahsunCache;
        }
        return mahsunFetchText(scriptUrl).then(function(script) {
          var parsed = parseScript4(script);
          mahsunCache = { time: now, bases, idMap: parsed.idMap, matches: parsed.matches };
          return mahsunCache;
        });
      });
    });
  }).catch(function() {
    mahsunCache = { time: now, bases: [], idMap: {}, matches: [] };
    return mahsunCache;
  });
}
function fetchMahsunMatches() {
  return fetchMahsunData().then(function(data) {
    return data.matches || [];
  });
}
function mahsunMakeStream(name, title, url) {
  return {
    name,
    title,
    url,
    headers: _MAHSUN_HEADERS,
    behaviorHints: { isLive: true }
  };
}
function buildMahsunMatchStreams(matches, onlyIndex) {
  var streams = [];
  var bases = mahsunCache && mahsunCache.bases && mahsunCache.bases.length ? mahsunCache.bases : [];
  if (!bases.length) return streams;
  var base = bases[0];
  var titleCount = {};
  for (var i = 0; i < matches.length; i++) {
    if (onlyIndex !== null && onlyIndex !== void 0 && i !== onlyIndex) continue;
    var m = matches[i];
    if (!m.id || !m.title) continue;
    var label;
    if (m.isChannelFeed) label = "\u{1F534} " + m.title;
    else label = (SPORT_LABEL[m.sport] || "\u25B6") + " | " + m.title;
    titleCount[m.title] = (titleCount[m.title] || 0) + 1;
    var st = label;
    if (titleCount[m.title] > 1) st += " (Ak\u0131\u015F " + titleCount[m.title] + ")";
    streams.push(mahsunMakeStream(
      "\u231C Mahsun Sports \u231F",
      st,
      base + m.id + ".m3u8"
    ));
  }
  return streams;
}
function mahsunCheckUrl(url) {
  var ctrl = null;
  if (typeof AbortController !== "undefined") ctrl = new AbortController();
  var timer = setTimeout(function() {
    if (ctrl) ctrl.abort();
  }, 5e3);
  var opts = {
    method: "GET",
    headers: {
      "User-Agent": _HEADERS["User-Agent"],
      "Referer": MAHSUN_SITE,
      "Range": "bytes=0-1024"
    }
  };
  if (ctrl) opts.signal = ctrl.signal;
  return fetch(url, opts).then(function(res) {
    clearTimeout(timer);
    var code = res.status;
    return { url, ok: code === 200 || code === 206 };
  }).catch(function() {
    clearTimeout(timer);
    return { url, ok: true };
  });
}
function verifyMahsunStreams(streams) {
  if (!streams || !streams.length) return Promise.resolve(streams);
  var groupsArr = [];
  var seen = {};
  for (var i = 0; i < streams.length; i++) {
    var u = streams[i].url;
    if (!seen[u]) {
      seen[u] = true;
      groupsArr.push({ url: u, idxs: [i] });
    } else {
      groupsArr[groupsArr.length - 1].idxs.push(i);
    }
  }
  var results = {};
  function worker(queue) {
    if (!queue.length) return Promise.resolve();
    var cur = queue.shift();
    return mahsunCheckUrl(cur.url).then(function(r) {
      for (var j = 0; j < cur.idxs.length; j++) results[cur.idxs[j]] = r.ok;
      return worker(queue);
    });
  }
  var pool = Math.min(8, groupsArr.length);
  var jobs = [];
  var q = groupsArr.slice();
  for (var p = 0; p < pool; p++) jobs.push(worker(q));
  return Promise.all(jobs).then(function() {
    var kept = [];
    for (var k = 0; k < streams.length; k++) {
      if (results[k] !== false) kept.push(streams[k]);
    }
    return kept;
  });
}
function mahsunVerifiedMatches(matches, onlyIndex) {
  if (!matches || !Array.isArray(matches)) matches = [];
  var streams = buildMahsunMatchStreams(matches, onlyIndex);
  if (!streams.length) return Promise.resolve([]);
  return verifyMahsunStreams(streams).then(function(kept) {
    var keptUrls = {};
    kept.forEach(function(s) {
      keptUrls[s.url] = true;
    });
    var base = mahsunCache && mahsunCache.bases && mahsunCache.bases.length ? mahsunCache.bases[0] : "";
    var out = [];
    for (var i = 0; i < matches.length; i++) {
      if (onlyIndex !== null && onlyIndex !== void 0 && i !== onlyIndex) continue;
      var m = matches[i];
      if (!m.id || !m.title) continue;
      if (keptUrls[base + m.id + ".m3u8"]) out.push(m);
    }
    return out;
  });
}
function fetchMahsunVerifiedMatches(onlyIndex) {
  return fetchMahsunMatches().then(function(matches) {
    return mahsunVerifiedMatches(matches, onlyIndex);
  });
}
function getStreams(args) {
  return __async(this, null, function* () {
    var targetId = typeof args === "string" ? args : args ? args.id : "";
    if (!targetId) {
      var e = [];
      e.streams = [];
      return e;
    }
    var content;
    try {
      content = yield fetchChannels();
    } catch (err) {
      var ec = [];
      ec.streams = [];
      return ec;
    }
    var lines = content.split("\n");
    var streams = [];
    var seenUrls = {};
    var searchKey = cleanKey(targetId.replace(/^tv:/, ""));
    if (searchKey === "mahsunsports") {
      var subIdx = String(targetId.replace(/^tv:mahsunsports:?/i, ""));
      var only = subIdx && /^\d+$/.test(subIdx) ? parseInt(subIdx, 10) : null;
      return fetchMahsunVerifiedMatches(only).then(function(kept) {
        var mStreams = buildMahsunMatchStreams(kept, null);
        mStreams.streams = mStreams;
        return mStreams;
      });
    }
    var androPrimary = null;
    var matchedBackup = "";
    var matchedName = "";
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (line.indexOf("#EXTINF") !== -1) {
        var tvgIdMatch = line.match(/tvg-id="([^"]+)"/i);
        var tvgNameMatch = line.match(/tvg-name="([^"]+)"/i);
        var nameMatch = line.match(/"\s*,\s*(.+)$/);
        var backupMatch = line.match(/tvg-backup="([^"]+)"/i);
        var aliasName = nameMatch ? nameMatch[1].trim() : line.split(",").pop().trim();
        var cId = cleanKey(tvgIdMatch ? tvgIdMatch[1] : "");
        var cName = cleanKey(tvgNameMatch ? tvgNameMatch[1] : "");
        var aName = cleanKey(aliasName);
        if (cId === searchKey || cName === searchKey || aName === searchKey || aName.length > 2 && (aName.includes(searchKey) || searchKey.includes(aName))) {
          if (!matchedName) matchedName = aliasName;
          var encrypted = isEncryptedChannel(aliasName, cId);
          var backupAttr = backupMatch ? backupMatch[1] : "";
          if (backupAttr) matchedBackup = backupAttr;
          for (var j = i + 1; j < lines.length; j++) {
            var urlLine = lines[j].trim();
            if (urlLine && urlLine.indexOf("http") === 0) {
              if (!seenUrls[urlLine]) {
                seenUrls[urlLine] = true;
                var ytMatch = urlLine.match(/(?:watch\?v=|embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
                var sObj = {
                  name: encrypted ? "\u231C Anthology Spor \u231F" : "\u231C Anthology \u231F",
                  title: aliasName + (ytMatch ? " [Canl\u0131 HD \xB7 YouTube]" : " [Canl\u0131 HD]"),
                  url: urlLine,
                  behaviorHints: { isLive: true }
                };
                if (ytMatch) {
                  sObj.ytId = ytMatch[1];
                } else if (encrypted) {
                  sObj.headers = _MAHSUN_HEADERS;
                  if (androIdFromUrl(urlLine)) androPrimary = urlLine;
                } else {
                  sObj.headers = _HEADERS;
                }
                streams.push(sObj);
              }
              break;
            }
            if (urlLine.indexOf("#EXTINF") === 0) break;
          }
          var backups = [];
          var b1 = line.match(/tvg-backup="([^"]+)"/i);
          var b2 = line.match(/tvg-backup2="([^"]+)"/i);
          var b3 = line.match(/tvg-backup3="([^"]+)"/i);
          if (b1) b1[1].split("|").forEach(function(u) {
            if (u && u.trim()) backups.push(u.trim());
          });
          if (b2) b2[1].split("|").forEach(function(u) {
            if (u && u.trim()) backups.push(u.trim());
          });
          if (b3) b3[1].split("|").forEach(function(u) {
            if (u && u.trim()) backups.push(u.trim());
          });
          if (backups.length > 0) {
            for (var bkIdx = 0; bkIdx < backups.length; bkIdx++) {
              var bUrl = backups[bkIdx];
              if (!seenUrls[bUrl] && bUrl !== urlLine) {
                seenUrls[bUrl] = true;
                var bLabel = aliasName + (backups.length > 1 ? " [Yedek Ak\u0131\u015F " + (bkIdx + 1) + "]" : " [Yedek Ak\u0131\u015F]");
                streams.push({
                  name: encrypted ? "\u231C Anthology Spor \u231F" : "\u231C Anthology \u231F",
                  title: bLabel,
                  url: bUrl,
                  headers: encrypted ? _MAHSUN_HEADERS : _HEADERS,
                  behaviorHints: { isLive: true }
                });
              }
            }
          } else {
            for (var bk in KNOWN_BACKUPS) {
              if ((cId === bk || searchKey === bk) && !seenUrls[KNOWN_BACKUPS[bk]] && KNOWN_BACKUPS[bk] !== urlLine) {
                seenUrls[KNOWN_BACKUPS[bk]] = true;
                streams.push({
                  name: "\u231C Anthology \u231F",
                  title: aliasName + " [Yedek Ak\u0131\u015F]",
                  url: KNOWN_BACKUPS[bk],
                  headers: _HEADERS,
                  behaviorHints: { isLive: true }
                });
              }
            }
          }
        }
      }
      if (streams.length >= 4) break;
    }
    if (androPrimary && !matchedBackup) {
      var bases = yield fetchMahsunBases();
      var androId = androIdFromUrl(androPrimary);
      for (var bi = 0; bi < bases.length; bi++) {
        var bu = bases[bi] + androId + ".m3u8";
        if (bu !== androPrimary && !seenUrls[bu]) {
          seenUrls[bu] = true;
          streams.push({
            name: "\u231C Anthology Spor \xB7 Yedek \u231F",
            title: (matchedName || "Yedek") + " [Yedek Ak\u0131\u015F]",
            url: bu,
            headers: _MAHSUN_HEADERS,
            behaviorHints: { isLive: true }
          });
        }
      }
    }
    streams.streams = streams;
    return streams;
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
} else {
  g = typeof globalThis !== "undefined" ? globalThis : typeof global !== "undefined" ? global : window;
  g.getStreams = getStreams;
  g.getMeta = getMeta;
  g.getCatalog = getCatalog;
}
var g;

if (typeof globalThis !== 'undefined' && typeof module !== 'undefined' && module.exports) {
    if (module.exports.getStreams) globalThis.getStreams = module.exports.getStreams;
    if (module.exports.getCatalog) globalThis.getCatalog = module.exports.getCatalog;
    if (module.exports.getMeta) globalThis.getMeta = module.exports.getMeta;
    if (module.exports.getSubtitles) globalThis.getSubtitles = module.exports.getSubtitles;
}

