/**
 * Anthology Provider: anthology_spor
 * Built from src/anthology_spor/index.js
 * Build: v1.8.26 (anthology build system)
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

// src/shared/channel_lang.js
var require_channel_lang = __commonJS({
  "src/shared/channel_lang.js"(exports2, module2) {
    var CHANNEL_LANG_LABELS = {
      tr: "T\xFCrk\xE7e",
      en: "\u0130ngilizce",
      az: "Azerbaycan T\xFCrk\xE7esi",
      ar: "Arap\xE7a",
      ku: "K\xFCrt\xE7e",
      de: "Almanca",
      fr: "Frans\u0131zca",
      ru: "Rus\xE7a",
      es: "\u0130spanyolca",
      it: "\u0130talyanca"
    };
    var DEFAULT_CHANNEL_LANG = "tr";
    function parseTvgLang2(extinfLine) {
      var line = extinfLine || "";
      var m = line.match(/tvg-lang="([^"]+)"/i);
      if (!m) m = line.match(/tvg-language="([^"]+)"/i);
      return m ? String(m[1]).trim().toLowerCase() : "";
    }
    function channelLangLabel(code) {
      var key = (code || "").toString().trim().toLowerCase();
      if (!key) key = DEFAULT_CHANNEL_LANG;
      return CHANNEL_LANG_LABELS[key] || CHANNEL_LANG_LABELS[DEFAULT_CHANNEL_LANG];
    }
    function channelDescription2(channelName, langCode) {
      return (channelName || "") + " Canl\u0131 [" + channelLangLabel(langCode) + "]";
    }
    module2.exports = {
      CHANNEL_LANG_LABELS,
      parseTvgLang: parseTvgLang2,
      channelLangLabel,
      channelDescription: channelDescription2
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
        var fs2 = require("fs");
        var path2 = require("path");
        if (!fs2 || !path2 || typeof fs2.existsSync !== "function") return null;
        var dir = typeof __dirname !== "undefined" ? __dirname : "";
        var candidates = [
          path2.resolve(dir, "..", "config.json"),
          // providers/<name>.js
          path2.resolve(dir, "..", "..", "config.json"),
          // src/<name>/index.js
          path2.resolve(dir, "config.json")
        ];
        for (var i = 0; i < candidates.length; i++) {
          if (fs2.existsSync(candidates[i])) {
            return JSON.parse(fs2.readFileSync(candidates[i], "utf8"));
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

// src/anthology_spor/index.js
var { sortStreamsByQuality } = require_quality();
var { parseTvgLang, channelDescription } = require_channel_lang();
var { loadConfig, val, wrapAll } = require_config();
var _cfgReady = null;
function cfgReady() {
  if (!_cfgReady) {
    _cfgReady = loadConfig().then(function() {
      var v;
      v = val("urls.live.m3u_remote");
      if (v) M3U_REMOTE = String(v).replace(/\/+$/, "");
      v = val("urls.live.taraftarium.base");
      if (v) TARAFTARIUM_SITE = String(v);
      v = val("urls.live.taraftarium.api_base");
      if (v) TARAFTARIUM_API = String(v).replace(/\/+$/, "");
      v = val("urls.live.taraftarium.base_number");
      if (v && !isNaN(Number(v))) TARAFTARIUM_BASE_NUM = Number(v);
      if (_TARAFTARIUM_HEADERS) {
        _TARAFTARIUM_HEADERS.Referer = TARAFTARIUM_SITE;
        _TARAFTARIUM_HEADERS.Origin = TARAFTARIUM_SITE;
      }
    });
  }
  return _cfgReady;
}
var path = typeof require !== "undefined" ? require("path") : null;
var fs = typeof require !== "undefined" ? require("fs") : null;
var M3U_REMOTE = "https://raw.githubusercontent.com/falsisdev/anthology/main/providers/M3U/Liste/canli.m3u";
var TARAFTARIUM_SITE = "https://taraftarium24-245.top/";
var TARAFTARIUM_API = "https://teletv15.top";
var TARAFTARIUM_BASE_NUM = 245;
var TARAFTARIUM_LOGO = "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/canli/taraftarium24.png";
var _HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "*/*"
};
var _TARAFTARIUM_HEADERS = {
  "User-Agent": _HEADERS["User-Agent"],
  "Referer": TARAFTARIUM_SITE,
  "Origin": TARAFTARIUM_SITE
};
var cachedText = null;
var cacheTime = 0;
function fetchChannels() {
  var now = Date.now();
  if (cachedText && now - cacheTime < 3e5) {
    return Promise.resolve(cachedText);
  }
  if (fs && path) {
    try {
      var localPath = path.resolve(__dirname, "M3U", "Liste", "canli.m3u");
      if (fs.existsSync(localPath)) {
        cachedText = fs.readFileSync(localPath, "utf8");
        cacheTime = now;
        return Promise.resolve(cachedText);
      }
    } catch (e) {
    }
  }
  return fetch(M3U_REMOTE, { headers: { "User-Agent": "Mozilla/5.0" } }).then(function(res) {
    return res.text();
  }).then(function(txt) {
    cachedText = txt;
    cacheTime = now;
    return txt;
  });
}
function cleanKey(s) {
  return (s || "").toString().toLowerCase().replace(/[^a-z0-9]/g, "");
}
function parseSportChannels(content) {
  var lines = content.split("\n");
  var channels = [];
  var isTargetGroup = false;
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (line.indexOf("#EXTINF") !== -1) {
      var groupMatch = line.match(/group-title="([^"]+)"/i);
      var group = groupMatch ? groupMatch[1] : "";
      isTargetGroup = group.indexOf("SPOR") !== -1;
      if (isTargetGroup) {
        var tvgIdMatch = line.match(/tvg-id="([^"]+)"/i);
        var tvgNameMatch = line.match(/tvg-name="([^"]+)"/i);
        var logoMatch = line.match(/tvg-logo="([^"]+)"/i);
        var backupMatch = line.match(/tvg-backup="([^"]+)"/i);
        var srcAttrMatch = line.match(/tvg-src="([^"]+)"/i);
        var nameMatch = line.match(/"\s*,\s*(.+)$/);
        var channelName = nameMatch ? nameMatch[1].trim() : line.split(",").pop().trim();
        var rawId = tvgIdMatch && tvgIdMatch[1] ? tvgIdMatch[1].trim() : tvgNameMatch ? tvgNameMatch[1].trim() : channelName;
        var channelId = rawId.startsWith("tv:") ? rawId : "tv:" + rawId;
        var logo = logoMatch ? logoMatch[1] : "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/canli/default_tv.png";
        var namedSrcs = [];
        if (srcAttrMatch && srcAttrMatch[1]) {
          var srcParts = srcAttrMatch[1].split("|");
          for (var psi = 0; psi + 1 < srcParts.length; psi += 2) {
            var srcName = (srcParts[psi] || "").trim();
            var srcUrl = (srcParts[psi + 1] || "").trim();
            if (srcName && srcUrl) namedSrcs.push({ name: srcName, url: srcUrl });
          }
        }
        var streamUrl = "";
        for (var j = i + 1; j < lines.length; j++) {
          var u = lines[j].trim();
          if (u.indexOf("http") === 0) {
            streamUrl = u;
            break;
          }
          if (u.indexOf("#EXTINF") === 0) break;
        }
        channels.push({
          id: channelId,
          name: channelName,
          logo,
          url: streamUrl,
          backup: backupMatch ? backupMatch[1] : "",
          srcs: namedSrcs,
          lang: parseTvgLang(line)
        });
      }
    }
  }
  return channels;
}
var TARAFTARIUM_CHANNELS = [
  { id: "bein-sports-1", name: "BEIN SPORTS 1", clean: "beinsports1" },
  { id: "bein-sports-2", name: "BEIN SPORTS 2", clean: "beinsports2" },
  { id: "bein-sports-3", name: "BEIN SPORTS 3", clean: "beinsports3" },
  { id: "bein-sports-4", name: "BEIN SPORTS 4", clean: "beinsports4" },
  { id: "bein-sports-5", name: "BEIN SPORTS 5", clean: "beinsports5" },
  { id: "bein-sports-max-1", name: "BEIN SPORTS MAX 1", clean: "beinsportsmax1" },
  { id: "bein-sports-max-2", name: "BEIN SPORTS MAX 2", clean: "beinsportsmax2" },
  { id: "s-sport", name: "S SPORT", clean: "ssport" },
  { id: "s-sport-2", name: "S SPORT 2", clean: "ssport2" },
  { id: "trt-spor", name: "TRT SPOR", clean: "trtspor" },
  { id: "trt-1", name: "TRT 1", clean: "trt1" },
  { id: "a-spor", name: "A SPOR", clean: "aspor" }
];
var TARAFTARIUM_ALIASES = {
  "beinsports1": "bein-sports-1",
  "beinsports1tr": "bein-sports-1",
  "beinsports2": "bein-sports-2",
  "beinsports2tr": "bein-sports-2",
  "beinsports3": "bein-sports-3",
  "beinsports3tr": "bein-sports-3",
  "beinsports4": "bein-sports-4",
  "beinsports4tr": "bein-sports-4",
  "beinsports5": "bein-sports-5",
  "beinsports5tr": "bein-sports-5",
  "beinsportsmax1": "bein-sports-max-1",
  "beinsportsmax1tr": "bein-sports-max-1",
  "beinsportsmax2": "bein-sports-max-2",
  "beinsportsmax2tr": "bein-sports-max-2",
  "ssport": "s-sport",
  "ssport1": "s-sport",
  "ssporttr": "s-sport",
  "ssport2": "s-sport-2",
  "ssport2tr": "s-sport-2",
  "trtspor": "trt-spor",
  "trtsportr": "trt-spor",
  "trt1": "trt-1",
  "trt1tr": "trt-1",
  "aspor": "a-spor",
  "asportr": "a-spor"
};
function matchTaraftariumChannelId(rawStr) {
  if (!rawStr) return null;
  var k = cleanKey(rawStr).replace(/^tv/, "");
  if (TARAFTARIUM_ALIASES[k]) return TARAFTARIUM_ALIASES[k];
  for (var ak in TARAFTARIUM_ALIASES) {
    if (k.indexOf(ak) === 0 || ak.indexOf(k) === 0) return TARAFTARIUM_ALIASES[ak];
  }
  return null;
}
var _resolvedApi = null;
var _resolvedSite = null;
var _resolvedTime = 0;
var RESOLVER_TTL = 15 * 60 * 1e3;
function resolveActiveBase() {
  var now = Date.now();
  if (_resolvedApi && now - _resolvedTime < RESOLVER_TTL) {
    return Promise.resolve({ api: _resolvedApi, site: _resolvedSite });
  }
  var baseApi = _resolvedApi || TARAFTARIUM_API;
  var baseSite = _resolvedSite || TARAFTARIUM_SITE;
  var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  var tm = setTimeout(function() {
    if (ctrl) ctrl.abort();
  }, 3500);
  var opts = { headers: _HEADERS };
  if (ctrl) opts.signal = ctrl.signal;
  return fetch(baseApi + "/load/channels.php", opts).then(function(res) {
    clearTimeout(tm);
    if (res && res.status === 200) {
      _resolvedApi = baseApi;
      _resolvedSite = baseSite;
      _resolvedTime = now;
      return { api: _resolvedApi, site: _resolvedSite };
    }
    throw new Error("API status not 200");
  }).catch(function() {
    clearTimeout(tm);
    var num = TARAFTARIUM_BASE_NUM;
    var cands = [num, num + 1, num - 1, num + 2, num + 3, num + 4];
    var i = 0;
    function tryNextCandidate() {
      if (i >= cands.length) {
        _resolvedApi = baseApi;
        _resolvedSite = baseSite;
        _resolvedTime = now;
        return Promise.resolve({ api: _resolvedApi, site: _resolvedSite });
      }
      var curN = cands[i++];
      var candUrl = "https://taraftarium24-" + curN + ".top/";
      var cctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
      var ctm = setTimeout(function() {
        if (cctrl) cctrl.abort();
      }, 3e3);
      var copts = { headers: _HEADERS };
      if (cctrl) copts.signal = cctrl.signal;
      return fetch(candUrl, copts).then(function(r) {
        return r.text();
      }).then(function(html) {
        clearTimeout(ctm);
        if (!html) return tryNextCandidate();
        var apiM = html.match(/https:\/\/teletv\d+\.top/i) || html.match(/fetch\(['"](https:\/\/[^'"]*teletv[^'"]*top)/i);
        var foundApi = apiM ? apiM[1] || apiM[0] : baseApi;
        var activeSite = candUrl;
        var numM = html.match(/taraftarium24-(\d+)\.top/i);
        if (numM && numM[1]) {
          TARAFTARIUM_BASE_NUM = parseInt(numM[1], 10);
        }
        _resolvedApi = foundApi.replace(/\/+$/, "");
        _resolvedSite = activeSite;
        _resolvedTime = now;
        return { api: _resolvedApi, site: _resolvedSite };
      }).catch(function() {
        clearTimeout(ctm);
        return tryNextCandidate();
      });
    }
    return tryNextCandidate();
  });
}
function fetchTaraftariumStream(streamOrChannelId) {
  if (!streamOrChannelId) return Promise.resolve(null);
  return resolveActiveBase().then(function(base) {
    var apiUrl = base.api + "/load/yayinlink.php?id=" + encodeURIComponent(streamOrChannelId);
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var tm = setTimeout(function() {
      if (ctrl) ctrl.abort();
    }, 4500);
    var opts = { headers: _HEADERS };
    if (ctrl) opts.signal = ctrl.signal;
    return fetch(apiUrl, opts).then(function(res) {
      clearTimeout(tm);
      return res.json();
    }).then(function(data) {
      if (data && data.deismackanal && typeof data.deismackanal === "string" && data.deismackanal.indexOf("m3u8") !== -1) {
        var finalUrl = data.deismackanal.replace(/edge4\./g, "edge3.");
        return {
          url: finalUrl,
          headers: {
            "User-Agent": _HEADERS["User-Agent"],
            "Referer": base.site,
            "Origin": base.site
          }
        };
      }
      return null;
    }).catch(function() {
      clearTimeout(tm);
      return null;
    });
  });
}
var _cachedMatches = null;
var _cachedMatchesTime = 0;
var MATCHES_TTL = 3 * 60 * 1e3;
function fetchTaraftariumMatches() {
  var now = Date.now();
  if (_cachedMatches && now - _cachedMatchesTime < MATCHES_TTL) {
    return Promise.resolve(_cachedMatches);
  }
  return resolveActiveBase().then(function(base) {
    var matchesUrl = base.api + "/load/matches.php";
    return fetch(matchesUrl, { headers: _HEADERS }).then(function(res) {
      return res.text();
    }).then(function(html) {
      var regex = /<a[^>]*href="matches\?id=([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
      var m;
      var list = [];
      while ((m = regex.exec(html)) !== null) {
        var id = m[1];
        var body = m[2];
        var timeM = body.match(/class="event"[^>]*>\s*([^<]+)/);
        var homeM = body.match(/class="home"[^>]*>\s*([^<]+)/);
        var awayM = body.match(/class="away"[^>]*>\s*([^<]+)/);
        var typeM = m[0].match(/data-matchtype="([^"]+)"/);
        var sportType = typeM ? typeM[1].trim() : "Futbol";
        var timeStr = timeM ? timeM[1].trim() : "";
        var home = homeM ? homeM[1].trim() : "";
        var away = awayM ? awayM[1].trim() : "";
        var emoji = "\u26BD\uFE0F";
        if (/basket/i.test(sportType)) emoji = "\u{1F3C0}";
        else if (/voley/i.test(sportType)) emoji = "\u{1F3D0}";
        else if (/tenis/i.test(sportType)) emoji = "\u{1F3BE}";
        var formattedTitle = emoji + " " + sportType + " | " + (timeStr ? timeStr + " " : "") + home + (away ? " - " + away : "");
        list.push({
          id,
          title: formattedTitle,
          sport: sportType,
          time: timeStr,
          home,
          away
        });
      }
      _cachedMatches = list;
      _cachedMatchesTime = now;
      return list;
    }).catch(function() {
      return _cachedMatches || [];
    });
  });
}
function makeStream(name, title, url, headers) {
  return {
    name,
    title,
    url,
    headers,
    behaviorHints: { isLive: true }
  };
}
function getCatalog(args) {
  return fetchChannels().then(function(content) {
    var channels = parseSportChannels(content);
    var metas = channels.map(function(ch) {
      return {
        id: ch.id,
        type: "tv",
        name: ch.name,
        poster: ch.logo,
        background: ch.logo,
        genres: ["Spor"],
        description: channelDescription(ch.name, ch.lang)
      };
    });
    var hasTaraftarium = metas.some(function(m) {
      return m.id === "tv:taraftarium24" || m.id === "tv:mahsunsports";
    });
    if (!hasTaraftarium) {
      metas.unshift({
        id: "tv:taraftarium24",
        type: "tv",
        name: "Taraftarium24",
        poster: TARAFTARIUM_LOGO,
        background: TARAFTARIUM_LOGO,
        genres: ["Spor"],
        description: "Taraftarium24 Canl\u0131 Ma\xE7lar ve 7/24 Spor Kanallar\u0131 \u2014 Futbol, Basketbol, Voleybol, Tenis ve Canl\u0131 TV"
      });
    }
    return { metas };
  }).catch(function() {
    return { metas: [] };
  });
}
var VERIFIED_BACKUPS = {
  "trtspor": "https://tv-trtspor1.medya.trt.com.tr/master.m3u8",
  "trtsporyildiz": "https://tv-trtspor2.medya.trt.com.tr/master.m3u8",
  "aspor": "https://trkvz-live.ercdn.net/asportv/asportv.m3u8",
  "fbtv": "http://1hskrdto.rocketcdn.com/fenerbahcetv.smil/playlist.m3u8",
  "tv85": "https://tv8.daioncdn.net/tv8bucuk/tv8bucuk.m3u8?app=tv8bucuk_web&ce=3"
};
function getMeta(args) {
  var targetId = typeof args === "string" ? args : args && args.id ? args.id : null;
  if (!targetId) return Promise.resolve({ meta: null });
  var cleanT = String(targetId).toLowerCase();
  if (cleanT.indexOf("tv:taraftarium24") === 0 || cleanT.indexOf("tv:mahsunsports") === 0) {
    return fetchTaraftariumMatches().then(function(matches) {
      var videos = [];
      TARAFTARIUM_CHANNELS.forEach(function(ch) {
        videos.push({
          id: "tv:taraftarium24:ch:" + ch.id,
          title: "\u{1F534} " + ch.name + " [7/24 Canl\u0131]",
          released: (/* @__PURE__ */ new Date()).toISOString()
        });
      });
      matches.forEach(function(m) {
        videos.push({
          id: "tv:taraftarium24:match:" + m.id,
          title: m.title,
          released: (/* @__PURE__ */ new Date()).toISOString()
        });
      });
      return {
        meta: {
          id: "tv:taraftarium24",
          type: "tv",
          name: "Taraftarium24",
          poster: TARAFTARIUM_LOGO,
          background: TARAFTARIUM_LOGO,
          description: "Taraftarium24 Canl\u0131 Ma\xE7lar ve 7/24 Spor Kanallar\u0131 \u2014 Futbol, Basketbol, Voleybol, Tenis ve Canl\u0131 TV",
          genres: ["Spor"],
          videos
        }
      };
    }).catch(function() {
      return { meta: null };
    });
  }
  return fetchChannels().then(function(content) {
    var channels = parseSportChannels(content);
    var cleanTarget = cleanKey(targetId.replace(/^tv:/, ""));
    var ch = channels.find(function(c) {
      return c.id === targetId || cleanKey(c.id.replace(/^tv:/, "")) === cleanTarget || cleanKey(c.name) === cleanTarget;
    });
    if (!ch) ch = channels[0];
    if (!ch) return { meta: null };
    return {
      meta: {
        id: targetId,
        type: "tv",
        name: ch.name,
        poster: ch.logo,
        background: ch.logo,
        description: channelDescription(ch.name, ch.lang),
        genres: ["Spor"],
        videos: [{ id: targetId, title: ch.name, released: (/* @__PURE__ */ new Date()).toISOString() }]
      }
    };
  }).catch(function() {
    return { meta: null };
  });
}
function getStreams(args) {
  var targetId = typeof args === "string" ? args : args ? args.id || args.name : "";
  var mediaType = args && args.type || args && args.mediaType || "";
  var isLiveRequest = /^tv:/i.test(targetId) || mediaType === "channel" || mediaType === "tv" && /^tv:/i.test(args && args.id || "");
  if (!isLiveRequest && targetId && !/^tv:/i.test(targetId)) {
    var looksLikeTmdb = /^(tt\d+|\d+)$/.test(String(targetId).split(":")[0]);
    if (looksLikeTmdb || mediaType === "movie") {
      var emptyNoLive = [];
      emptyNoLive.streams = [];
      return Promise.resolve(emptyNoLive);
    }
  }
  var cleanT = String(targetId || "").toLowerCase();
  if (cleanT.indexOf("tv:taraftarium24:match:") === 0) {
    var matchId = targetId.split(":").pop();
    return fetchTaraftariumStream(matchId).then(function(streamObj) {
      var streams = [];
      if (streamObj && streamObj.url) {
        streams.push(makeStream("\u231C Taraftarium24 \u231F", "Canl\u0131 Ma\xE7 Ak\u0131\u015F\u0131 [HD]", streamObj.url, streamObj.headers));
      }
      streams.streams = streams;
      return streams;
    });
  }
  if (cleanT.indexOf("tv:taraftarium24:ch:") === 0) {
    var chId = targetId.split(":").pop();
    var chDef = TARAFTARIUM_CHANNELS.find(function(c) {
      return c.id === chId;
    });
    var chLabel = chDef ? chDef.name : chId;
    return fetchTaraftariumStream(chId).then(function(streamObj) {
      var streams = [];
      if (streamObj && streamObj.url) {
        streams.push(makeStream("\u231C Taraftarium24 \u231F", chLabel + " [Canl\u0131 HD]", streamObj.url, streamObj.headers));
      }
      streams.streams = streams;
      return streams;
    });
  }
  if (cleanT === "tv:taraftarium24" || cleanT === "tv:mahsunsports") {
    return fetchTaraftariumStream("bein-sports-1").then(function(s) {
      var streams = [];
      if (s && s.url) {
        streams.push(makeStream("\u231C Taraftarium24 \u231F", "BEIN SPORTS 1 [Canl\u0131 HD]", s.url, s.headers));
      }
      streams.streams = streams;
      return streams;
    });
  }
  return fetchChannels().then(function(content) {
    var channels = parseSportChannels(content);
    if (!targetId && channels.length > 0) {
      return channels.slice(0, 5).map(function(ch2) {
        return makeStream(
          "\u231C Anthology Spor \u231F",
          ch2.name + " [Canl\u0131 HD]",
          ch2.url,
          _HEADERS
        );
      });
    }
    var searchKey = cleanKey(targetId.replace(/^tv:/, ""));
    var matched = null;
    for (var i = 0; i < channels.length; i++) {
      var ch = channels[i];
      var cId = cleanKey(ch.id.replace(/^tv:/, ""));
      var cName = cleanKey(ch.name);
      if (cId === searchKey || cName === searchKey || searchKey && (cName.includes(searchKey) || searchKey.includes(cName))) {
        matched = ch;
        break;
      }
    }
    if (!matched) {
      var empty2 = [];
      empty2.streams = [];
      return empty2;
    }
    var streams = [];
    var tChannelId = matchTaraftariumChannelId(matched.id || matched.name);
    var taraftariumJob = tChannelId ? fetchTaraftariumStream(tChannelId) : Promise.resolve(null);
    return taraftariumJob.then(function(tStream) {
      if (tStream && tStream.url) {
        streams.push(makeStream("\u231C Taraftarium24 \u231F", matched.name + " [Canl\u0131 HD]", tStream.url, tStream.headers));
      }
      if (matched.url && (!tStream || matched.url !== tStream.url)) {
        streams.push(makeStream("\u231C Anthology Spor \u231F", matched.name + " [Canl\u0131]", matched.url, _HEADERS));
      }
      if (matched.srcs) {
        for (var nsi = 0; nsi < matched.srcs.length; nsi++) {
          var ns = matched.srcs[nsi];
          if (ns.url && ns.url !== matched.url && (!tStream || ns.url !== tStream.url)) {
            streams.push(makeStream("\u231C Anthology Spor \xB7 " + ns.name + " \u231F", matched.name + " [" + ns.name + "]", ns.url, _HEADERS));
          }
        }
      }
      if (matched.backup && matched.backup !== matched.url) {
        streams.push(makeStream("\u231C Anthology Spor \xB7 Yedek \u231F", matched.name + " [Yedek Ak\u0131\u015F]", matched.backup, _HEADERS));
      } else {
        for (var bk in VERIFIED_BACKUPS) {
          if (cleanKey(matched.id).includes(bk)) {
            var extra = VERIFIED_BACKUPS[bk];
            if (extra && extra !== matched.url) {
              streams.push(makeStream("\u231C Anthology Spor \xB7 Yedek \u231F", matched.name + " [Yedek Ak\u0131\u015F]", extra, _HEADERS));
            }
            break;
          }
        }
      }
      streams.streams = streams;
      return streams;
    });
  }).catch(function() {
    var empty = [];
    empty.streams = [];
    return empty;
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
  module.exports = wrapAll({ getStreams, getCatalog, getMeta }, cfgReady);
} else {
  g = typeof globalThis !== "undefined" ? globalThis : typeof global !== "undefined" ? global : window;
  g.getStreams = getStreams;
  g.getCatalog = getCatalog;
  g.getMeta = getMeta;
}
var g;

if (typeof globalThis !== 'undefined' && typeof module !== 'undefined' && module.exports) {
    if (module.exports.getStreams) globalThis.getStreams = module.exports.getStreams;
    if (module.exports.getCatalog) globalThis.getCatalog = module.exports.getCatalog;
    if (module.exports.getMeta) globalThis.getMeta = module.exports.getMeta;
    if (module.exports.getSubtitles) globalThis.getSubtitles = module.exports.getSubtitles;
}

