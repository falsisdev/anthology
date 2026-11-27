/**
 * Anthology Provider: sinemacx
 * Built from src/sinemacx/index.js
 * Build: v1.8.44 (anthology build system)
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

// src/shared/http.js
var require_http = __commonJS({
  "src/shared/http.js"(exports2, module2) {
    var DEFAULT_UA2 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
    function timeoutSignal2(ms) {
      if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
        return AbortSignal.timeout(ms);
      }
      var controller = new AbortController();
      setTimeout(function() {
        controller.abort();
      }, ms);
      return controller.signal;
    }
    function fetchWithTimeout(url, options, ms) {
      ms = ms || 1e4;
      options = options || {};
      if (!options.signal) {
        options.signal = timeoutSignal2(ms);
      }
      if (!options.headers) {
        options.headers = {};
      }
      if (!options.headers["User-Agent"] && !options.headers["user-agent"]) {
        options.headers["User-Agent"] = DEFAULT_UA2;
      }
      return fetch(url, options);
    }
    module2.exports = {
      DEFAULT_UA: DEFAULT_UA2,
      timeoutSignal: timeoutSignal2,
      fetchWithTimeout
    };
  }
});

// src/shared/extractors.js
var require_extractors = __commonJS({
  "src/shared/extractors.js"(exports2, module2) {
    var { timeoutSignal: timeoutSignal2 } = require_http();
    var DEFAULT_UA2 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
    var EXOPLAYER_UA = "ExoPlayerLib/2.19.1";
    function decodeHtmlEntities(str) {
      if (!str) return "";
      return String(str).replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0*39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&#(\d+);/g, function(_, num) {
        var c = parseInt(num, 10);
        return isNaN(c) ? "" : String.fromCharCode(c);
      });
    }
    function normalizeUrl(rawUrl) {
      var t = String(rawUrl || "").trim();
      if (t.indexOf("//") === 0) return "https:" + t;
      return t;
    }
    function base64DecodeBytes(b64) {
      var std = String(b64 || "").trim().replace(/-/g, "+").replace(/_/g, "/");
      while (std.length % 4 !== 0) std += "=";
      var bin = "";
      if (typeof atob === "function") {
        try {
          bin = atob(std);
        } catch (e) {
          bin = "";
        }
      } else if (typeof Buffer !== "undefined") {
        try {
          bin = Buffer.from(std, "base64").toString("binary");
        } catch (e) {
          bin = "";
        }
      }
      var out = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i) & 255;
      return out;
    }
    function base64DecodeString(b64) {
      var norm = String(b64 || "").replace(/\\\//g, "/").trim();
      if (typeof atob === "function") {
        try {
          return atob(norm);
        } catch (e) {
        }
      }
      if (typeof Buffer !== "undefined") {
        try {
          return Buffer.from(norm, "base64").toString("binary");
        } catch (e) {
        }
      }
      return "";
    }
    function buildNuvioStream2(opts) {
      var url = opts.url;
      var isHls = opts.isHls !== void 0 ? Boolean(opts.isHls) : opts.format === "hls" || url.indexOf(".m3u8") !== -1;
      var format = opts.format || (isHls ? "hls" : "mp4");
      var hdrs = Object.assign({ "User-Agent": DEFAULT_UA2 }, opts.headers || {});
      var stream = {
        name: opts.name || opts.sourceLabel || "Anthology",
        title: opts.title,
        url,
        quality: opts.quality || "1080p",
        type: format,
        format,
        isHls,
        provider: opts.provider || void 0,
        headers: hdrs,
        behaviorHints: {
          notWebReady: true,
          proxyHeaders: {
            request: hdrs
          }
        }
      };
      if (opts.subtitles && opts.subtitles.length > 0) {
        stream.subtitles = opts.subtitles;
      }
      return stream;
    }
    function extractInlineVttSubtitles(htmlText, headers) {
      var subs = [];
      var seen = {};
      var re = /https?:\/\/[^\s"'\\]+\.vtt(?:\?[^\s"'\\]*)?/gi;
      var m;
      while ((m = re.exec(htmlText || "")) !== null) {
        var uri = m[0];
        if (!uri || seen[uri] || /thumb|sprite/i.test(uri)) continue;
        seen[uri] = true;
        var isEn = /eng|_en[_.]|english/i.test(uri);
        subs.push({
          id: isEn ? "eng" : "tur",
          lang: isEn ? "eng" : "tur",
          language: isEn ? "en" : "tr",
          label: isEn ? "English" : "T\xFCrk\xE7e",
          url: uri,
          format: "vtt",
          headers: headers || void 0
        });
      }
      return subs;
    }
    var AES_SBOX = new Uint8Array([
      99,
      124,
      119,
      123,
      242,
      107,
      111,
      197,
      48,
      1,
      103,
      43,
      254,
      215,
      171,
      118,
      202,
      130,
      201,
      125,
      250,
      89,
      71,
      240,
      173,
      212,
      162,
      175,
      156,
      164,
      114,
      192,
      183,
      253,
      147,
      38,
      54,
      63,
      247,
      204,
      52,
      165,
      229,
      241,
      113,
      216,
      49,
      21,
      4,
      199,
      35,
      195,
      24,
      150,
      5,
      154,
      7,
      18,
      128,
      226,
      235,
      39,
      178,
      117,
      9,
      131,
      44,
      26,
      27,
      110,
      90,
      160,
      82,
      59,
      214,
      179,
      41,
      227,
      47,
      132,
      83,
      209,
      0,
      237,
      32,
      252,
      177,
      91,
      106,
      203,
      190,
      57,
      74,
      76,
      88,
      207,
      208,
      239,
      170,
      251,
      67,
      77,
      51,
      133,
      69,
      249,
      2,
      127,
      80,
      60,
      159,
      168,
      81,
      163,
      64,
      143,
      146,
      157,
      56,
      245,
      188,
      182,
      218,
      33,
      16,
      255,
      243,
      210,
      205,
      12,
      19,
      236,
      95,
      151,
      68,
      23,
      196,
      167,
      126,
      61,
      100,
      93,
      25,
      115,
      96,
      129,
      79,
      220,
      34,
      42,
      144,
      136,
      70,
      238,
      184,
      20,
      222,
      94,
      11,
      219,
      224,
      50,
      58,
      10,
      73,
      6,
      36,
      92,
      194,
      211,
      172,
      98,
      145,
      149,
      228,
      121,
      231,
      200,
      55,
      109,
      141,
      213,
      78,
      169,
      108,
      86,
      244,
      234,
      101,
      122,
      174,
      8,
      186,
      120,
      37,
      46,
      28,
      166,
      180,
      198,
      232,
      221,
      116,
      31,
      75,
      189,
      139,
      138,
      112,
      62,
      181,
      102,
      72,
      3,
      246,
      14,
      97,
      53,
      87,
      185,
      134,
      193,
      29,
      158,
      225,
      248,
      152,
      17,
      105,
      217,
      142,
      148,
      155,
      30,
      135,
      233,
      206,
      85,
      40,
      223,
      140,
      161,
      137,
      13,
      191,
      230,
      66,
      104,
      65,
      153,
      45,
      15,
      176,
      84,
      187,
      22
    ]);
    var AES_RCON = [1, 2, 4, 8, 16, 32, 64, 128];
    function xtime(x) {
      return (x << 1 ^ (x & 128 ? 27 : 0)) & 255;
    }
    function expandAes256Key(key) {
      var rk = new Uint8Array(240);
      rk.set(key.subarray(0, 32));
      var bg = 32, rci = 0;
      while (bg < 240) {
        var t0 = rk[bg - 4], t1 = rk[bg - 3], t2 = rk[bg - 2], t3 = rk[bg - 1];
        if (bg % 32 === 0) {
          var nt0 = AES_SBOX[t1] ^ AES_RCON[rci++];
          t1 = AES_SBOX[t2];
          t2 = AES_SBOX[t3];
          t3 = AES_SBOX[t0];
          t0 = nt0;
        } else if (bg % 32 === 16) {
          t0 = AES_SBOX[t0];
          t1 = AES_SBOX[t1];
          t2 = AES_SBOX[t2];
          t3 = AES_SBOX[t3];
        }
        rk[bg] = rk[bg - 32] ^ t0;
        rk[bg + 1] = rk[bg - 31] ^ t1;
        rk[bg + 2] = rk[bg - 30] ^ t2;
        rk[bg + 3] = rk[bg - 29] ^ t3;
        bg += 4;
      }
      return rk;
    }
    function aes256EncryptBlock(block, rk) {
      var s = new Uint8Array(16);
      var i, round, col, tmp;
      for (i = 0; i < 16; i++) s[i] = block[i] ^ rk[i];
      for (round = 1; round <= 14; round++) {
        for (i = 0; i < 16; i++) s[i] = AES_SBOX[s[i]];
        tmp = s[1];
        s[1] = s[5];
        s[5] = s[9];
        s[9] = s[13];
        s[13] = tmp;
        tmp = s[2];
        s[2] = s[10];
        s[10] = tmp;
        tmp = s[6];
        s[6] = s[14];
        s[14] = tmp;
        tmp = s[15];
        s[15] = s[11];
        s[11] = s[7];
        s[7] = s[3];
        s[3] = tmp;
        if (round < 14) {
          for (col = 0; col < 16; col += 4) {
            var a0 = s[col], a1 = s[col + 1], a2 = s[col + 2], a3 = s[col + 3];
            var t = a0 ^ a1 ^ a2 ^ a3;
            s[col] = a0 ^ t ^ xtime(a0 ^ a1);
            s[col + 1] = a1 ^ t ^ xtime(a1 ^ a2);
            s[col + 2] = a2 ^ t ^ xtime(a2 ^ a3);
            s[col + 3] = a3 ^ t ^ xtime(a3 ^ a0);
          }
        }
        var rOff = round * 16;
        for (i = 0; i < 16; i++) s[i] = s[i] ^ rk[rOff + i];
      }
      return s;
    }
    function gfMul128(x, y) {
      var z = new Uint8Array(16), v = new Uint8Array(y);
      for (var i = 0; i < 128; i++) {
        if (x[i >>> 3] >>> 7 - (i & 7) & 1) {
          for (var j = 0; j < 16; j++) z[j] ^= v[j];
        }
        var lsb = v[15] & 1;
        for (var j2 = 15; j2 > 0; j2--) v[j2] = v[j2] >>> 1 | (v[j2 - 1] & 1) << 7;
        v[0] = v[0] >>> 1;
        if (lsb) v[0] ^= 225;
      }
      return z;
    }
    function ghash(h, ct) {
      var y = new Uint8Array(16);
      for (var off = 0; off < ct.length; off += 16) {
        var end = Math.min(off + 16, ct.length);
        for (var i = off; i < end; i++) y[i - off] ^= ct[i];
        y = gfMul128(y, h);
      }
      var bitLen = ct.length * 8;
      var lenBlock = new Uint8Array(16);
      lenBlock[12] = bitLen >>> 24 & 255;
      lenBlock[13] = bitLen >>> 16 & 255;
      lenBlock[14] = bitLen >>> 8 & 255;
      lenBlock[15] = bitLen & 255;
      for (var k = 0; k < 16; k++) y[k] ^= lenBlock[k];
      return gfMul128(y, h);
    }
    function decodeUtf8(bytes) {
      if (typeof TextDecoder === "function") return new TextDecoder("utf-8").decode(bytes);
      var out = "";
      for (var i = 0; i < bytes.length; ) {
        var b0 = bytes[i++];
        if (b0 < 128) out += String.fromCharCode(b0);
        else if ((b0 & 224) === 192 && i < bytes.length) out += String.fromCharCode((b0 & 31) << 6 | bytes[i++] & 63);
        else if ((b0 & 240) === 224 && i + 1 < bytes.length) out += String.fromCharCode((b0 & 15) << 12 | (bytes[i++] & 63) << 6 | bytes[i++] & 63);
        else if ((b0 & 248) === 240 && i + 2 < bytes.length) {
          var cp = (b0 & 7) << 18 | (bytes[i++] & 63) << 12 | (bytes[i++] & 63) << 6 | bytes[i++] & 63;
          out += String.fromCodePoint(cp);
        }
      }
      return out;
    }
    function decryptAes256Gcm(key, iv, payloadWithTag) {
      if (key.length !== 32 || iv.length !== 12 || payloadWithTag.length < 16) return null;
      var rk = expandAes256Key(key);
      var cipherLen = payloadWithTag.length - 16;
      var ct = payloadWithTag.subarray(0, cipherLen);
      var tag = payloadWithTag.subarray(cipherLen);
      var j0 = new Uint8Array(16);
      j0.set(iv, 0);
      j0[15] = 1;
      var h = aes256EncryptBlock(new Uint8Array(16), rk);
      var tagMask = aes256EncryptBlock(j0, rk);
      var s = ghash(h, ct);
      var diff = 0;
      for (var i = 0; i < 16; i++) diff |= tagMask[i] ^ s[i] ^ tag[i];
      if (diff !== 0) return null;
      var ctr = new Uint8Array(j0);
      var plain = new Uint8Array(cipherLen);
      for (var off = 0; off < cipherLen; off += 16) {
        for (var c = 15; c >= 12; c--) {
          ctr[c] = ctr[c] + 1 & 255;
          if (ctr[c] !== 0) break;
        }
        var ks = aes256EncryptBlock(ctr, rk);
        var end = Math.min(off + 16, cipherLen);
        for (var j = off; j < end; j++) plain[j] = ct[j] ^ ks[j - off];
      }
      return decodeUtf8(plain);
    }
    function extractBysezo(rawUrl, opts) {
      return __async(this, null, function* () {
        opts = opts || {};
        var normalized = normalizeUrl(rawUrl);
        var origin = "https://bysezoxexe.com";
        var code = "";
        try {
          var parsed = new URL(normalized);
          origin = parsed.origin;
          var segs = parsed.pathname.split("/").filter(Boolean);
          code = segs[segs.length - 1] || "";
        } catch (e) {
          var m = /\/([a-zA-Z0-9_-]{8,24})(?:[?#]|$)/.exec(normalized);
          code = m ? m[1] : "";
        }
        if (!code) return [];
        if (origin.indexOf("filemoon.") !== -1) origin = "https://bysezoxexe.com";
        var videoData = null;
        try {
          var r1 = yield fetch(origin + "/api/videos/" + encodeURIComponent(code), {
            headers: { "User-Agent": DEFAULT_UA2, "Referer": normalized, "Accept": "application/json, text/plain, */*" },
            signal: timeoutSignal2(9e3)
          });
          if (r1.ok) videoData = yield r1.json();
        } catch (e) {
        }
        if ((!videoData || (!videoData.sources || !videoData.sources.length) && !videoData.playback) && origin !== "https://bysezoxexe.com") {
          try {
            var dRes = yield fetch(origin + "/api/videos/" + encodeURIComponent(code) + "/details", {
              headers: { "User-Agent": DEFAULT_UA2, "Referer": normalized },
              signal: timeoutSignal2(8e3)
            });
            if (dRes.ok) {
              var det = yield dRes.json();
              if (det && det.embed_frame_url) {
                var tOrig = new URL(det.embed_frame_url).origin;
                var r2 = yield fetch(tOrig + "/api/videos/" + encodeURIComponent(code), {
                  headers: { "User-Agent": DEFAULT_UA2, "Referer": det.embed_frame_url },
                  signal: timeoutSignal2(9e3)
                });
                if (r2.ok) {
                  videoData = yield r2.json();
                  origin = tOrig;
                }
              }
            }
          } catch (e) {
          }
        }
        if (!videoData) return [];
        var sources = videoData.sources || [];
        var tracks = videoData.tracks || [];
        if (sources.length === 0 && videoData.playback) {
          try {
            var pb = videoData.playback;
            var parts = pb.key_parts || [];
            var vNum = Number(pb.version);
            var chosen = parts;
            if (!isNaN(vNum) && vNum >= 1 && vNum <= 20 && parts[vNum - 1] && parts[30 - vNum]) {
              chosen = [parts[vNum - 1], parts[30 - vNum]];
            }
            var decodedParts = chosen.map(base64DecodeBytes);
            var totalLen = decodedParts.reduce(function(a, b) {
              return a + b.length;
            }, 0);
            var key = new Uint8Array(totalLen);
            var off = 0;
            for (var pi = 0; pi < decodedParts.length; pi++) {
              key.set(decodedParts[pi], off);
              off += decodedParts[pi].length;
            }
            var plain = decryptAes256Gcm(key, base64DecodeBytes(pb.iv), base64DecodeBytes(pb.payload));
            if (plain) {
              var dec = JSON.parse(plain);
              if (dec && dec.sources) sources = dec.sources;
              if (dec && dec.tracks && tracks.length === 0) tracks = dec.tracks;
            }
          } catch (e) {
          }
        }
        if (!sources || sources.length === 0) return [];
        var sHdr = { "User-Agent": DEFAULT_UA2, "Referer": origin + "/" };
        var subs = [];
        for (var ti = 0; ti < tracks.length; ti++) {
          var t = tracks[ti];
          var subU = t.file || t.url;
          if (!subU) continue;
          var lc = String(t.lang || "tr").toLowerCase().slice(0, 2) || "tr";
          subs.push({ id: lc + "_" + subs.length, lang: lc === "en" ? "eng" : "tur", language: lc, label: t.label || (lc === "en" ? "English" : "T\xFCrk\xE7e"), url: subU, format: subU.indexOf(".srt") !== -1 ? "srt" : "vtt", headers: sHdr });
        }
        var prefix = opts.sourceLabel ? opts.sourceLabel + " \u2022 " : "";
        var audioTag = opts.audioType === "dub" ? "TR Dublaj" : opts.audioType === "sub" ? "TR Altyaz\u0131" : "FileMoon";
        var out = [];
        for (var si = 0; si < sources.length; si++) {
          var src = sources[si];
          if (!src.url || src.url.indexOf("http") !== 0) continue;
          var q = src.label || (src.height ? src.height + "p" : "1080p");
          var isHls = src.mime_type && src.mime_type.indexOf("mpegurl") !== -1 || src.url.indexOf(".m3u8") !== -1;
          out.push(buildNuvioStream2({
            name: opts.streamName || opts.sourceLabel || "Anthology",
            title: "\u231C " + (opts.sourceLabel || "Anthology") + " \u231F | " + audioTag + " \u2022 " + q + (isHls ? " HLS" : " MP4"),
            url: src.url,
            quality: q,
            format: isHls ? "hls" : "mp4",
            isHls,
            provider: opts.provider,
            headers: sHdr,
            subtitles: subs
          }));
        }
        return out;
      });
    }
    function extractVidmoly(rawUrl, opts) {
      return __async(this, null, function* () {
        opts = opts || {};
        var url = normalizeUrl(rawUrl);
        var idM = /(?:embed-|\/dl\/|\/)([a-zA-Z0-9]{8,20})(?:\.html)?/i.exec(url);
        var vidId = idM ? idM[1] : null;
        var candidates = [];
        if (url.indexOf("vidmoly") !== -1 && vidId && url.indexOf("embed-") === -1) {
          candidates.push("https://vidmoly.biz/embed-" + vidId + ".html");
        } else {
          candidates.push(url);
        }
        if (vidId) {
          ["vidmoly.biz", "vidmoly.net", "vidmoly.to"].forEach(function(h) {
            var u = "https://" + h + "/embed-" + vidId + ".html";
            if (candidates.indexOf(u) === -1) candidates.push(u);
          });
        }
        for (var i = 0; i < candidates.length; i++) {
          var cand = candidates[i];
          var origin = "https://vidmoly.biz";
          try {
            origin = new URL(cand).origin;
          } catch (e) {
          }
          try {
            var r = yield fetch(cand, {
              headers: { "User-Agent": DEFAULT_UA2, "Referer": opts.referer || origin + "/" },
              signal: timeoutSignal2(1e4)
            });
            if (!r.ok) continue;
            var html = yield r.text();
            var fm = /file\s*:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i.exec(html) || /sources\s*:\s*\[\s*\{\s*file\s*:\s*["'](https?:\/\/[^"']+)["']/i.exec(html);
            if (!fm || !fm[1]) continue;
            var tag = opts.audioType === "dub" ? "\u{1F1F9}\u{1F1F7} TR Dublaj" : opts.audioType === "sub" ? "\u{1F310} TR Altyaz\u0131" : "VidMoly";
            return [buildNuvioStream2({
              name: opts.streamName || opts.sourceLabel || "Anthology",
              title: "\u231C " + (opts.sourceLabel || "Anthology") + " \u231F | VidMoly | " + tag,
              url: fm[1],
              quality: "1080p",
              format: "hls",
              isHls: true,
              provider: opts.provider,
              headers: { "User-Agent": DEFAULT_UA2, "Referer": origin + "/" },
              subtitles: extractInlineVttSubtitles(html, { "User-Agent": DEFAULT_UA2, "Referer": origin + "/" })
            })];
          } catch (e) {
          }
        }
        return [];
      });
    }
    function extractOkRu(rawUrl, opts) {
      return __async(this, null, function* () {
        opts = opts || {};
        var url = normalizeUrl(rawUrl).replace("odnoklassniki.ru/", "ok.ru/");
        try {
          var r = yield fetch(url, {
            headers: { "User-Agent": DEFAULT_UA2, "Referer": opts.referer || "https://ok.ru/" },
            signal: timeoutSignal2(1e4)
          });
          if (!r.ok) return [];
          var html = yield r.text();
          var m = /data-options=["']([^"']+)["']/i.exec(html);
          if (!m) return [];
          var outer = JSON.parse(decodeHtmlEntities(m[1]));
          var rawMeta = outer && outer.flashvars && outer.flashvars.metadata;
          var meta = typeof rawMeta === "string" ? JSON.parse(rawMeta) : rawMeta;
          if (!meta) return [];
          var qMap = { ultra: "2160p", quad: "1440p", full: "1080p", hd: "720p", sd: "480p", low: "360p", lowest: "240p" };
          var hdrs = { "User-Agent": DEFAULT_UA2, "Referer": "https://ok.ru/" };
          var out = [];
          var tag = opts.audioType === "dub" ? "\u{1F1F9}\u{1F1F7} TR Dublaj" : opts.audioType === "sub" ? "\u{1F310} TR Altyaz\u0131" : "OK.ru";
          (meta.videos || []).forEach(function(v) {
            if (!v.url) return;
            var q = qMap[String(v.name || "").toLowerCase()] || "720p";
            out.push(buildNuvioStream2({
              name: opts.streamName || opts.sourceLabel || "Anthology",
              title: "\u231C " + (opts.sourceLabel || "Anthology") + " \u231F | OK.ru " + q + " | " + tag,
              url: v.url,
              quality: q,
              format: "mp4",
              isHls: false,
              provider: opts.provider,
              headers: hdrs
            }));
          });
          var hlsUrl = meta.hlsMasterPlaylistUrl || meta.hlsManifestUrl;
          if (hlsUrl) {
            out.push(buildNuvioStream2({
              name: opts.streamName || opts.sourceLabel || "Anthology",
              title: "\u231C " + (opts.sourceLabel || "Anthology") + " \u231F | OK.ru HLS | " + tag,
              url: hlsUrl,
              quality: "1080p",
              format: "hls",
              isHls: true,
              provider: opts.provider,
              headers: hdrs
            }));
          }
          return out;
        } catch (e) {
          return [];
        }
      });
    }
    function extractSibnet(rawUrl, opts) {
      return __async(this, null, function* () {
        opts = opts || {};
        var url = normalizeUrl(rawUrl);
        var vm = /videoid=(\d+)/i.exec(url);
        if (vm) url = "https://video.sibnet.ru/shell.php?videoid=" + vm[1];
        try {
          var r = yield fetch(url, {
            headers: { "User-Agent": DEFAULT_UA2, "Referer": opts.referer || "https://video.sibnet.ru/" },
            signal: timeoutSignal2(1e4)
          });
          if (!r.ok) return [];
          var html = yield r.text();
          var m = /player\.src\(\[\s*\{\s*src\s*:\s*["']([^"']+)["']/i.exec(html);
          if (!m || !m[1]) return [];
          var src = m[1].indexOf("http") === 0 ? m[1] : "https://video.sibnet.ru" + (m[1].charAt(0) === "/" ? "" : "/") + m[1];
          var tag = opts.audioType === "dub" ? "\u{1F1F9}\u{1F1F7} TR Dublaj" : opts.audioType === "sub" ? "\u{1F310} TR Altyaz\u0131" : "Sibnet";
          return [buildNuvioStream2({
            name: opts.streamName || opts.sourceLabel || "Anthology",
            title: "\u231C " + (opts.sourceLabel || "Anthology") + " \u231F | Sibnet MP4 | " + tag,
            url: src,
            quality: "720p",
            format: "mp4",
            isHls: false,
            provider: opts.provider,
            headers: { "User-Agent": DEFAULT_UA2, "Referer": "https://video.sibnet.ru/" }
          })];
        } catch (e) {
          return [];
        }
      });
    }
    function extractVixolity2(opts) {
      return __async(this, null, function* () {
        opts = opts || {};
        var imdbId = opts.imdbId;
        if (!imdbId || imdbId.indexOf("tt") !== 0) return [];
        var base = (opts.baseUrl || "https://ha.vixolity.com").replace(/\/+$/, "");
        var targetUrl = opts.season !== void 0 && opts.episode !== void 0 ? base + "/vs/" + imdbId + "/s" + opts.season + "/e" + (opts.episode < 10 ? "0" + opts.episode : opts.episode) : base + "/vs/" + imdbId;
        var vixHeaders = {
          "User-Agent": DEFAULT_UA2,
          "Referer": "https://pl.vixolity.com/",
          "Origin": "https://pl.vixolity.com",
          "Accept": "*/*"
        };
        try {
          var r = yield fetch(targetUrl, { headers: vixHeaders, signal: timeoutSignal2(7e3) });
          if (!r.ok) return [];
          var text = yield r.text();
          if (!text || text.indexOf("#EXTM3U") === -1) return [];
          var subs = [];
          var subRe = /#EXT-X-MEDIA:TYPE=SUBTITLES.*?NAME="([^"]+)".*?LANGUAGE="([^"]+)".*?URI="([^"]+)"/gi;
          var sm, seenSub = {};
          while ((sm = subRe.exec(text)) !== null) {
            if (seenSub[sm[3]]) continue;
            seenSub[sm[3]] = true;
            var lc = String(sm[2] || "tr").toLowerCase();
            subs.push({ id: lc, lang: lc === "tr" ? "tur" : lc === "en" ? "eng" : lc, language: lc, label: sm[1], url: sm[3], format: "vtt", headers: vixHeaders });
          }
          var hasTr = /LANGUAGE="tr"|NAME="[^"]*Türk/i.test(text);
          var tag = hasTr ? "\xC7ift Ses (TR & Orijinal)" : "1080p HLS";
          return [buildNuvioStream2({
            name: opts.streamName || opts.sourceLabel || "Anthology",
            title: "\u231C " + (opts.sourceLabel || "Anthology") + " \u231F | Vixolity \u2022 " + tag + " (1080p HLS)",
            url: targetUrl,
            quality: "1080p",
            format: "hls",
            isHls: true,
            provider: opts.provider,
            headers: vixHeaders,
            subtitles: subs
          })];
        } catch (e) {
          return [];
        }
      });
    }
    function extractPilavyer(opts) {
      return __async(this, null, function* () {
        opts = opts || {};
        var host = (opts.playerHost || "https://play2.pilavyerplay.top").replace(/\/+$/, "");
        var scriptUrl = "";
        if (opts.pvId) {
          scriptUrl = host + "/assets/js/s.php?s=" + encodeURIComponent(opts.pvId);
        } else if (opts.playerUrl) {
          var pu = normalizeUrl(opts.playerUrl);
          try {
            var er = yield fetch(pu, { headers: { "User-Agent": DEFAULT_UA2, "Referer": opts.referer || pu }, signal: timeoutSignal2(1e4) });
            if (er.ok) {
              var eh = yield er.text();
              var sm = /src=["']([^"']*assets\/js\/s\.php\?[^"']+)["']/i.exec(eh) || /\?s=([a-zA-Z0-9_-]+)/.exec(pu);
              if (sm && sm[1]) {
                var orig = new URL(pu).origin;
                scriptUrl = sm[1].indexOf("http") === 0 ? sm[1] : sm[1].indexOf("s.php") !== -1 ? orig + (sm[1].charAt(0) === "/" ? "" : "/") + sm[1] : orig + "/assets/js/s.php?s=" + encodeURIComponent(sm[1]);
              }
            }
          } catch (e) {
          }
        }
        if (!scriptUrl) return [];
        try {
          var scriptOrig = new URL(scriptUrl).origin;
          var jsRes = yield fetch(scriptUrl, { headers: { "User-Agent": DEFAULT_UA2, "Referer": opts.referer || scriptOrig + "/" }, signal: timeoutSignal2(1e4) });
          if (!jsRes.ok) return [];
          var jsText = yield jsRes.text();
          var jm = /window\.__PLAYER__\s*=\s*(\{[\s\S]*?\});/.exec(jsText);
          if (!jm) return [];
          var payload = JSON.parse(jm[1]);
          if (!payload || !payload.stream) return [];
          var sHdr = { "User-Agent": DEFAULT_UA2, "Referer": scriptOrig + "/", "Origin": scriptOrig };
          var cleanUrl = String(payload.stream).replace(/[?&]cdn=\d+/i, "").replace(/#.*$/, "");
          var finalUrl = cleanUrl + (cleanUrl.indexOf("?") !== -1 ? "&" : "?") + "ext=.m3u8";
          var subs = [];
          (payload.subs || []).forEach(function(sub) {
            if (!sub || !sub.src) return;
            var su = sub.src.indexOf("http") === 0 ? sub.src : scriptOrig + (sub.src.charAt(0) === "/" ? "" : "/") + sub.src;
            var isTr = String(sub.lang || "").toLowerCase() === "tr" || /türkçe|tur/i.test(sub.label || "");
            subs.push({ id: sub.sid || (isTr ? "tur" : "eng"), lang: isTr ? "tur" : "eng", language: isTr ? "tr" : "en", label: sub.label || (isTr ? "T\xFCrk\xE7e" : "English"), url: su, format: "vtt", headers: sHdr });
          });
          var audios = Array.isArray(payload.audios) && payload.audios.length > 0 ? payload.audios : [{ label: "Orijinal" }];
          var audioTag = "Orijinal (TR Altyaz\u0131l\u0131)";
          if (audios.length > 1) {
            var hasTr = audios.some(function(a) {
              return /t[üu]rk[çc]e|\btr\b/i.test(a.label || a.name || "");
            });
            audioTag = hasTr ? "\xC7ift Ses (TR Dublaj & Orijinal)" : "\xC7oklu Ses";
          } else if (/t[üu]rk[çc]e|\btr\b/i.test(audios[0].label || audios[0].name || "")) {
            audioTag = "T\xFCrk\xE7e Dublaj";
          }
          return [buildNuvioStream2({
            name: opts.streamName || opts.sourceLabel || "Anthology",
            title: "\u231C " + (opts.sourceLabel || "Anthology") + " \u231F | " + audioTag + " \u2022 1080p FHD",
            url: finalUrl,
            quality: "1080p",
            format: "hls",
            isHls: true,
            provider: opts.provider,
            headers: sHdr,
            subtitles: subs
          })];
        } catch (e) {
          return [];
        }
      });
    }
    function extractMailRu(rawUrl, opts) {
      return __async(this, null, function* () {
        opts = opts || {};
        var url = normalizeUrl(rawUrl);
        var vm = /\/embed\/(\d+)/.exec(url) || /meta\/(\d+)/.exec(url);
        var metaUrl = vm ? "https://my.mail.ru/+/video/meta/" + vm[1] : "";
        var ref = url.indexOf("http") === 0 ? url : "https://my.mail.ru/";
        try {
          if (!metaUrl) {
            var r = yield fetch(url, { headers: { "User-Agent": DEFAULT_UA2, "Referer": opts.referer || "https://my.mail.ru/" }, signal: timeoutSignal2(8e3) });
            if (r.ok) {
              var h = yield r.text();
              var mm = /metadataUrl["']?\s*:\s*["']([^"']+)["']/.exec(h) || /(\/+\/my\.mail\.ru\/\+\/video\/meta\/[^"'\s]+)/.exec(h);
              if (mm) metaUrl = normalizeUrl(mm[1]);
            }
          }
          if (!metaUrl) return [];
          var mr = yield fetch(metaUrl, { headers: { "User-Agent": DEFAULT_UA2, "Referer": ref }, signal: timeoutSignal2(8e3) });
          if (!mr.ok) return [];
          var data = yield mr.json();
          var out = [];
          (data.videos || []).forEach(function(v) {
            if (!v.url) return;
            var q = v.key || "720p";
            out.push(buildNuvioStream2({
              name: opts.streamName || opts.sourceLabel || "Anthology",
              title: "\u231C " + (opts.sourceLabel || "Anthology") + " \u231F | Mail.ru " + q.toUpperCase(),
              url: normalizeUrl(v.url),
              quality: q,
              format: "mp4",
              isHls: false,
              provider: opts.provider,
              headers: { "User-Agent": DEFAULT_UA2, "Referer": ref }
            }));
          });
          return out;
        } catch (e) {
          return [];
        }
      });
    }
    function spgDecode(encodedB64, keyB64) {
      try {
        var a = base64DecodeString(encodedB64);
        var b = base64DecodeString(keyB64);
        if (!a || !b) return null;
        var s = "";
        for (var i = 0; i < a.length; i++) {
          s += String.fromCharCode(a.charCodeAt(i) ^ b.charCodeAt(i % b.length));
        }
        return s.split("|")[0];
      } catch (e) {
        return null;
      }
    }
    function extractFastplay(rawUrl, opts) {
      return __async(this, null, function* () {
        opts = opts || {};
        var url = normalizeUrl(rawUrl);
        try {
          var fpOrig = new URL(url).origin;
          var res = yield fetch(url, {
            headers: { "User-Agent": DEFAULT_UA2, "Referer": opts.referer || fpOrig + "/" },
            signal: timeoutSignal2(12e3)
          });
          if (!res.ok) return [];
          var fpHtml = yield res.text();
          var manMatch = /(?:src|stream)\s*:\s*["'](\/manifests\/[^"']+)["']/.exec(fpHtml);
          if (!manMatch) return [];
          var manPath = manMatch[1].replace(/&amp;/g, "&");
          var manifestUrl = manPath.indexOf("http") === 0 ? manPath : fpOrig + manPath;
          var subs = extractInlineVttSubtitles(fpHtml, { "User-Agent": DEFAULT_UA2, "Referer": fpOrig + "/" });
          var fpHdrs = { "User-Agent": EXOPLAYER_UA, "Referer": fpOrig + "/", "Origin": fpOrig };
          return [buildNuvioStream2({
            name: opts.streamName || opts.sourceLabel || "Anthology",
            title: "\u231C " + (opts.sourceLabel || "Anthology") + " \u231F | FastPlay (1080p HLS)",
            url: manifestUrl,
            quality: "1080p",
            format: "hls",
            isHls: true,
            provider: opts.provider,
            headers: fpHdrs,
            subtitles: subs
          })];
        } catch (e) {
          return [];
        }
      });
    }
    function extractSetplay(rawUrl, opts) {
      return __async(this, null, function* () {
        opts = opts || {};
        var url = normalizeUrl(rawUrl);
        try {
          var spOrig = new URL(url).origin;
          var res = yield fetch(url, {
            headers: { "User-Agent": DEFAULT_UA2, "Referer": opts.referer || spOrig + "/" },
            signal: timeoutSignal2(12e3)
          });
          if (!res.ok) return [];
          var spHtml = yield res.text();
          var cerMatch = /SPG\.cerceve\(\s*["'][^"']*["']\s*,\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*\)/.exec(spHtml) || /SPG\.cerceve\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*\)/.exec(spHtml);
          var fastplayUrl = cerMatch ? spgDecode(cerMatch[1], cerMatch[2]) : null;
          if (!fastplayUrl) {
            var fMatch = /https?:\/\/fastplay\.[a-z]+\/stfplay\.php\?[^"'<>\s\\]+/i.exec(spHtml);
            if (fMatch) fastplayUrl = fMatch[0].replace(/\\+/g, "");
          }
          if (!fastplayUrl || fastplayUrl.indexOf("http") !== 0) return [];
          return yield extractFastplay(fastplayUrl, Object.assign({}, opts, { referer: res.url || url }));
        } catch (e) {
          return [];
        }
      });
    }
    function extractByEmbedUrl(rawUrl, opts) {
      return __async(this, null, function* () {
        opts = opts || {};
        var url = normalizeUrl(rawUrl);
        var lower = url.toLowerCase();
        if (lower.indexOf("setplay.") !== -1) return extractSetplay(url, opts);
        if (lower.indexOf("fastplay.") !== -1) return extractFastplay(url, opts);
        if (lower.indexOf("vidmoly.") !== -1) return extractVidmoly(url, opts);
        if (lower.indexOf("ok.ru") !== -1 || lower.indexOf("odnoklassniki.ru") !== -1) return extractOkRu(url, opts);
        if (lower.indexOf("sibnet.ru") !== -1) return extractSibnet(url, opts);
        if (lower.indexOf("bysezo") !== -1 || lower.indexOf("filemoon.") !== -1 || lower.indexOf("n1mwq.org") !== -1) return extractBysezo(url, opts);
        if (lower.indexOf("pilavyer") !== -1) return extractPilavyer(Object.assign({}, opts, { playerUrl: url }));
        if (lower.indexOf("mail.ru") !== -1) return extractMailRu(url, opts);
        return [];
      });
    }
    module2.exports = {
      DEFAULT_UA: DEFAULT_UA2,
      EXOPLAYER_UA,
      decodeHtmlEntities,
      base64DecodeString,
      buildNuvioStream: buildNuvioStream2,
      extractInlineVttSubtitles,
      extractBysezo,
      extractVidmoly,
      extractOkRu,
      extractSibnet,
      extractVixolity: extractVixolity2,
      extractPilavyer,
      extractMailRu,
      extractFastplay,
      extractSetplay,
      extractByEmbedUrl
    };
  }
});

// src/sinemacx/index.js
var { sortStreamsByQuality } = require_quality();
var { loadConfig, val, wrapAll } = require_config();
var _cfgReady = null;
function cfgReady() {
  if (!_cfgReady) {
    _cfgReady = loadConfig().then(function() {
      var v;
      v = val("urls.movies.sinemacx.base");
      if (v && String(v).indexOf("sinema.gg") === -1) BASE_URL = String(v).replace(/\/+$/, "");
      if (WORKING_HEADERS) WORKING_HEADERS.Referer = BASE_URL + "/";
    });
  }
  return _cfgReady;
}
var cheerio = require("cheerio-without-node-native");
var { timeoutSignal } = require_http();
var { extractVixolity, buildNuvioStream, DEFAULT_UA } = require_extractors();
var BASE_URL = "https://sinemacc.com";
var TMDB_API_KEY = "500330721680edb6d5f7f12ba7cd9023";
var WORKING_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Referer": BASE_URL + "/"
};
function decodeBase64Safe(str) {
  try {
    if (typeof atob === "function") return atob(str);
    if (typeof Buffer !== "undefined") return Buffer.from(str, "base64").toString("utf8");
  } catch (e) {
  }
  return str;
}
function resolveTmdbInfo(id, mediaType) {
  return __async(this, null, function* () {
    try {
      let cleanId = String(id || "").trim();
      if (cleanId.includes(":")) cleanId = cleanId.split(":")[0];
      let numericId = null;
      let imdbId = cleanId.startsWith("tt") ? cleanId : "";
      let title = "";
      let origTitle = "";
      let year = "";
      if (cleanId.startsWith("tt")) {
        const findRes = yield fetch(`https://api.themoviedb.org/3/find/${cleanId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`);
        if (findRes.ok) {
          const fData = yield findRes.json();
          const item = mediaType === "tv" || mediaType === "series" ? fData.tv_results && fData.tv_results[0] : fData.movie_results && fData.movie_results[0];
          if (item) {
            numericId = item.id;
            title = item.name || item.title || "";
            origTitle = item.original_name || item.original_title || "";
            year = (item.first_air_date || item.release_date || "").slice(0, 4);
          }
        }
      } else {
        numericId = cleanId;
      }
      if (numericId && (!title || !origTitle || !imdbId)) {
        const type = mediaType === "tv" || mediaType === "series" ? "tv" : "movie";
        const tRes = yield fetch(`https://api.themoviedb.org/3/${type}/${numericId}?api_key=${TMDB_API_KEY}&language=tr-TR&append_to_response=external_ids`);
        if (tRes.ok) {
          const tData = yield tRes.json();
          title = tData.name || tData.title || title;
          origTitle = tData.original_name || tData.original_title || origTitle;
          year = (tData.first_air_date || tData.release_date || "").slice(0, 4);
          imdbId = imdbId || tData.imdb_id || tData.external_ids && tData.external_ids.imdb_id || "";
        }
      }
      return { title, origTitle, year, numericId, imdbId };
    } catch (e) {
      return { title: "", origTitle: "", year: "", numericId: id, imdbId: "" };
    }
  });
}
function searchOnSite(query, year) {
  return __async(this, null, function* () {
    if (!query || query.length < 2) return null;
    const cleanQuery = query.toLowerCase().trim();
    const searchUrl = `${BASE_URL}/?s=` + encodeURIComponent(cleanQuery);
    try {
      const res = yield fetch(searchUrl, { headers: WORKING_HEADERS });
      if (!res.ok) return null;
      const html = yield res.text();
      const $ = cheerio.load(html);
      const results = [];
      const stopWords = /* @__PURE__ */ new Set(["the", "a", "an", "ve", "ile", "der", "die", "das", "le", "la"]);
      const significantWords = cleanQuery.split(/\s+/).filter((w) => w.length > 1 && !stopWords.has(w));
      $("a.baslik, a.resim").each(function() {
        const url = $(this).attr("href") || "";
        const rawTitle = $(this).attr("title") || $(this).find("span").first().text().trim() || $(this).text().trim();
        const titleLower = rawTitle.toLowerCase();
        if (!url.includes("/film/") || url.includes("/category/") || url.includes("/search/") || url.includes("/tag/") || rawTitle.length < 2) return;
        let score = 0;
        let matchedWordCount = 0;
        significantWords.forEach((w) => {
          if (titleLower.includes(w) || url.includes(w)) {
            score += 10;
            matchedWordCount++;
          }
        });
        if (matchedWordCount === significantWords.length && significantWords.length > 0) {
          score += 15;
        }
        if (year && (titleLower.includes(year) || url.includes(year))) score += 10;
        if (url.includes(cleanQuery.replace(/\s+/g, "-"))) score += 8;
        const extraWords = titleLower.split(/\s+/).filter((w) => !stopWords.has(w) && !significantWords.includes(w));
        const hasSequel = /[\s\-_]([2-9]|ii|iii|iv|v)($|[\s\-_])/i.test(titleLower) || /[\s\-_]([2-9]|ii|iii|iv|v)($|[\s\-_])/i.test(url);
        if (hasSequel && !/[\s\-_]([2-9]|ii|iii|iv|v)/i.test(cleanQuery)) {
          score -= 25;
        }
        score -= extraWords.length * 2;
        if (score > 5) {
          results.push({ url, siteTitle: rawTitle, score });
        }
      });
      if (results.length > 0) {
        results.sort((a, b) => b.score - a.score);
        return results[0];
      }
      return null;
    } catch (err) {
      return null;
    }
  });
}
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
  return __async(this, null, function* () {
    try {
      const info = yield resolveTmdbInfo(tmdbId, mediaType);
      const trTitle = (info.title || "").trim();
      const orgTitle = (info.origTitle || "").trim();
      const displayTitle = trTitle || orgTitle || "Film";
      const releaseYear = info.year;
      let result = null;
      const searchCandidates = [];
      if (orgTitle) {
        searchCandidates.push(orgTitle);
        const withoutThe = orgTitle.replace(/^the\s+/i, "").trim();
        if (withoutThe && withoutThe !== orgTitle) searchCandidates.push(withoutThe);
      }
      if (trTitle && trTitle !== orgTitle) {
        searchCandidates.push(trTitle);
        const withoutTheTr = trTitle.replace(/^the\s+/i, "").trim();
        if (withoutTheTr && withoutTheTr !== trTitle) searchCandidates.push(withoutTheTr);
      }
      for (const cand of searchCandidates) {
        result = yield searchOnSite(cand, releaseYear);
        if (result && result.score >= 10) break;
      }
      let langInfo = "\u{1F1F9}\u{1F1F7} TR Dublaj & \u{1F310} Altyaz\u0131";
      if (!result || !result.url) {
        const slugCand = (orgTitle || trTitle || "").toLowerCase().replace(/^the\s+/i, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
        if (slugCand) {
          result = { url: `${BASE_URL}/film/${slugCand}/`, siteTitle: displayTitle, score: 10 };
        }
      }
      if (result && result.url) {
        try {
          const pageRes = yield fetch(result.url, { headers: WORKING_HEADERS, signal: timeoutSignal(5e3) });
          if (pageRes.ok) {
            const html = yield pageRes.text();
            const $page = cheerio.load(html);
            const pageText = $page("body").text().toLowerCase();
            if (pageText.includes("dublaj")) {
              langInfo = "\u{1F1F9}\u{1F1F7} TR Dublaj";
            } else if (pageText.includes("altyaz\u0131")) {
              langInfo = "\u{1F310} TR Altyaz\u0131";
            }
            let iframeUrl = "";
            $page("iframe").each(function() {
              let src = $page(this).attr("data-vsrc") || $page(this).attr("src") || "";
              if (src && !/^https?:\/\//i.test(src) && !src.startsWith("//")) {
                src = decodeBase64Safe(src);
              }
              if (src.toLowerCase().includes("filmizle.in")) {
                iframeUrl = src.split("?")[0];
                return false;
              }
            });
            if (iframeUrl) {
              const videoId = iframeUrl.split("/").pop().split("?")[0];
              const apiURL = "https://player.filmizle.in/player/index.php?data=" + videoId + "&do=getVideo";
              const params = new URLSearchParams();
              params.append("hash", videoId);
              params.append("r", result.url);
              const r = yield fetch(apiURL, {
                method: "POST",
                headers: {
                  "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                  "X-Requested-With": "XMLHttpRequest",
                  "Referer": iframeUrl.toLowerCase(),
                  "User-Agent": WORKING_HEADERS["User-Agent"]
                },
                body: params.toString(),
                signal: timeoutSignal(4e3)
              });
              if (r.ok) {
                const json = yield r.json();
                if (json && json.securedLink) {
                  const fpHeaders = {
                    "Referer": "https://player.filmizle.in/",
                    "Origin": "https://player.filmizle.in",
                    "User-Agent": DEFAULT_UA
                  };
                  let fpPlayable = false;
                  try {
                    const mRes = yield fetch(json.securedLink, { headers: fpHeaders, signal: timeoutSignal(4e3) });
                    if (mRes.ok) {
                      const mTxt = yield mRes.text();
                      const sub = mTxt.split(/\r?\n/).map((l) => l.trim()).find((l) => l && !l.startsWith("#"));
                      if (sub) {
                        const subUrl = new URL(sub, mRes.url || json.securedLink).toString();
                        const vRes = yield fetch(subUrl, { headers: fpHeaders, signal: timeoutSignal(4e3) });
                        fpPlayable = vRes.ok;
                      }
                    }
                  } catch (e) {
                  }
                  if (fpPlayable) {
                    return [buildNuvioStream({
                      name: displayTitle,
                      title: `\u231C SinemaCX \u231F | ${langInfo}`,
                      url: json.securedLink,
                      quality: "1080p",
                      format: "hls",
                      isHls: true,
                      provider: "sinemacx",
                      headers: fpHeaders
                    })];
                  }
                }
              }
            }
          }
        } catch (e) {
        }
      }
      if (info.imdbId) {
        const vixStreams = yield extractVixolity({
          imdbId: info.imdbId,
          sourceLabel: "SinemaCX",
          streamName: displayTitle,
          provider: "sinemacx"
        });
        if (vixStreams.length > 0) return vixStreams;
      }
      return [];
    } catch (err) {
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
  module.exports = wrapAll({ getStreams }, cfgReady);
}
if (typeof globalThis !== "undefined") {
  globalThis.getStreams = getStreams;
}

if (typeof globalThis !== 'undefined' && typeof module !== 'undefined' && module.exports) {
    if (module.exports.getStreams) globalThis.getStreams = module.exports.getStreams;
    if (module.exports.getCatalog) globalThis.getCatalog = module.exports.getCatalog;
    if (module.exports.getMeta) globalThis.getMeta = module.exports.getMeta;
    if (module.exports.getSubtitles) globalThis.getSubtitles = module.exports.getSubtitles;
}

