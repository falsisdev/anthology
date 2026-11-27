/**
 * Anthology Provider: hdfilmcehennemi
 * Built from src/hdfilmcehennemi/index.js
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
    var DEFAULT_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
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
    function fetchWithTimeout2(url, options, ms) {
      ms = ms || 1e4;
      options = options || {};
      if (!options.signal) {
        options.signal = timeoutSignal2(ms);
      }
      if (!options.headers) {
        options.headers = {};
      }
      if (!options.headers["User-Agent"] && !options.headers["user-agent"]) {
        options.headers["User-Agent"] = DEFAULT_UA;
      }
      return fetch(url, options);
    }
    module2.exports = {
      DEFAULT_UA,
      timeoutSignal: timeoutSignal2,
      fetchWithTimeout: fetchWithTimeout2
    };
  }
});

// src/shared/extractors.js
var require_extractors = __commonJS({
  "src/shared/extractors.js"(exports2, module2) {
    var { timeoutSignal: timeoutSignal2 } = require_http();
    var DEFAULT_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
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
    function buildNuvioStream(opts) {
      var url = opts.url;
      var isHls = opts.isHls !== void 0 ? Boolean(opts.isHls) : opts.format === "hls" || url.indexOf(".m3u8") !== -1;
      var format = opts.format || (isHls ? "hls" : "mp4");
      var hdrs = Object.assign({ "User-Agent": DEFAULT_UA }, opts.headers || {});
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
            headers: { "User-Agent": DEFAULT_UA, "Referer": normalized, "Accept": "application/json, text/plain, */*" },
            signal: timeoutSignal2(9e3)
          });
          if (r1.ok) videoData = yield r1.json();
        } catch (e) {
        }
        if ((!videoData || (!videoData.sources || !videoData.sources.length) && !videoData.playback) && origin !== "https://bysezoxexe.com") {
          try {
            var dRes = yield fetch(origin + "/api/videos/" + encodeURIComponent(code) + "/details", {
              headers: { "User-Agent": DEFAULT_UA, "Referer": normalized },
              signal: timeoutSignal2(8e3)
            });
            if (dRes.ok) {
              var det = yield dRes.json();
              if (det && det.embed_frame_url) {
                var tOrig = new URL(det.embed_frame_url).origin;
                var r2 = yield fetch(tOrig + "/api/videos/" + encodeURIComponent(code), {
                  headers: { "User-Agent": DEFAULT_UA, "Referer": det.embed_frame_url },
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
        var sHdr = { "User-Agent": DEFAULT_UA, "Referer": origin + "/" };
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
          out.push(buildNuvioStream({
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
              headers: { "User-Agent": DEFAULT_UA, "Referer": opts.referer || origin + "/" },
              signal: timeoutSignal2(1e4)
            });
            if (!r.ok) continue;
            var html = yield r.text();
            var fm = /file\s*:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i.exec(html) || /sources\s*:\s*\[\s*\{\s*file\s*:\s*["'](https?:\/\/[^"']+)["']/i.exec(html);
            if (!fm || !fm[1]) continue;
            var tag = opts.audioType === "dub" ? "\u{1F1F9}\u{1F1F7} TR Dublaj" : opts.audioType === "sub" ? "\u{1F310} TR Altyaz\u0131" : "VidMoly";
            return [buildNuvioStream({
              name: opts.streamName || opts.sourceLabel || "Anthology",
              title: "\u231C " + (opts.sourceLabel || "Anthology") + " \u231F | VidMoly | " + tag,
              url: fm[1],
              quality: "1080p",
              format: "hls",
              isHls: true,
              provider: opts.provider,
              headers: { "User-Agent": DEFAULT_UA, "Referer": origin + "/" },
              subtitles: extractInlineVttSubtitles(html, { "User-Agent": DEFAULT_UA, "Referer": origin + "/" })
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
            headers: { "User-Agent": DEFAULT_UA, "Referer": opts.referer || "https://ok.ru/" },
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
          var hdrs = { "User-Agent": DEFAULT_UA, "Referer": "https://ok.ru/" };
          var out = [];
          var tag = opts.audioType === "dub" ? "\u{1F1F9}\u{1F1F7} TR Dublaj" : opts.audioType === "sub" ? "\u{1F310} TR Altyaz\u0131" : "OK.ru";
          (meta.videos || []).forEach(function(v) {
            if (!v.url) return;
            var q = qMap[String(v.name || "").toLowerCase()] || "720p";
            out.push(buildNuvioStream({
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
            out.push(buildNuvioStream({
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
            headers: { "User-Agent": DEFAULT_UA, "Referer": opts.referer || "https://video.sibnet.ru/" },
            signal: timeoutSignal2(1e4)
          });
          if (!r.ok) return [];
          var html = yield r.text();
          var m = /player\.src\(\[\s*\{\s*src\s*:\s*["']([^"']+)["']/i.exec(html);
          if (!m || !m[1]) return [];
          var src = m[1].indexOf("http") === 0 ? m[1] : "https://video.sibnet.ru" + (m[1].charAt(0) === "/" ? "" : "/") + m[1];
          var tag = opts.audioType === "dub" ? "\u{1F1F9}\u{1F1F7} TR Dublaj" : opts.audioType === "sub" ? "\u{1F310} TR Altyaz\u0131" : "Sibnet";
          return [buildNuvioStream({
            name: opts.streamName || opts.sourceLabel || "Anthology",
            title: "\u231C " + (opts.sourceLabel || "Anthology") + " \u231F | Sibnet MP4 | " + tag,
            url: src,
            quality: "720p",
            format: "mp4",
            isHls: false,
            provider: opts.provider,
            headers: { "User-Agent": DEFAULT_UA, "Referer": "https://video.sibnet.ru/" }
          })];
        } catch (e) {
          return [];
        }
      });
    }
    function extractVixolity(opts) {
      return __async(this, null, function* () {
        opts = opts || {};
        var imdbId = opts.imdbId;
        if (!imdbId || imdbId.indexOf("tt") !== 0) return [];
        var base = (opts.baseUrl || "https://ha.vixolity.com").replace(/\/+$/, "");
        var targetUrl = opts.season !== void 0 && opts.episode !== void 0 ? base + "/vs/" + imdbId + "/s" + opts.season + "/e" + (opts.episode < 10 ? "0" + opts.episode : opts.episode) : base + "/vs/" + imdbId;
        var vixHeaders = {
          "User-Agent": DEFAULT_UA,
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
          return [buildNuvioStream({
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
            var er = yield fetch(pu, { headers: { "User-Agent": DEFAULT_UA, "Referer": opts.referer || pu }, signal: timeoutSignal2(1e4) });
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
          var jsRes = yield fetch(scriptUrl, { headers: { "User-Agent": DEFAULT_UA, "Referer": opts.referer || scriptOrig + "/" }, signal: timeoutSignal2(1e4) });
          if (!jsRes.ok) return [];
          var jsText = yield jsRes.text();
          var jm = /window\.__PLAYER__\s*=\s*(\{[\s\S]*?\});/.exec(jsText);
          if (!jm) return [];
          var payload = JSON.parse(jm[1]);
          if (!payload || !payload.stream) return [];
          var sHdr = { "User-Agent": DEFAULT_UA, "Referer": scriptOrig + "/", "Origin": scriptOrig };
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
          return [buildNuvioStream({
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
            var r = yield fetch(url, { headers: { "User-Agent": DEFAULT_UA, "Referer": opts.referer || "https://my.mail.ru/" }, signal: timeoutSignal2(8e3) });
            if (r.ok) {
              var h = yield r.text();
              var mm = /metadataUrl["']?\s*:\s*["']([^"']+)["']/.exec(h) || /(\/+\/my\.mail\.ru\/\+\/video\/meta\/[^"'\s]+)/.exec(h);
              if (mm) metaUrl = normalizeUrl(mm[1]);
            }
          }
          if (!metaUrl) return [];
          var mr = yield fetch(metaUrl, { headers: { "User-Agent": DEFAULT_UA, "Referer": ref }, signal: timeoutSignal2(8e3) });
          if (!mr.ok) return [];
          var data = yield mr.json();
          var out = [];
          (data.videos || []).forEach(function(v) {
            if (!v.url) return;
            var q = v.key || "720p";
            out.push(buildNuvioStream({
              name: opts.streamName || opts.sourceLabel || "Anthology",
              title: "\u231C " + (opts.sourceLabel || "Anthology") + " \u231F | Mail.ru " + q.toUpperCase(),
              url: normalizeUrl(v.url),
              quality: q,
              format: "mp4",
              isHls: false,
              provider: opts.provider,
              headers: { "User-Agent": DEFAULT_UA, "Referer": ref }
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
            headers: { "User-Agent": DEFAULT_UA, "Referer": opts.referer || fpOrig + "/" },
            signal: timeoutSignal2(12e3)
          });
          if (!res.ok) return [];
          var fpHtml = yield res.text();
          var manMatch = /(?:src|stream)\s*:\s*["'](\/manifests\/[^"']+)["']/.exec(fpHtml);
          if (!manMatch) return [];
          var manPath = manMatch[1].replace(/&amp;/g, "&");
          var manifestUrl = manPath.indexOf("http") === 0 ? manPath : fpOrig + manPath;
          var subs = extractInlineVttSubtitles(fpHtml, { "User-Agent": DEFAULT_UA, "Referer": fpOrig + "/" });
          var fpHdrs = { "User-Agent": EXOPLAYER_UA, "Referer": fpOrig + "/", "Origin": fpOrig };
          return [buildNuvioStream({
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
            headers: { "User-Agent": DEFAULT_UA, "Referer": opts.referer || spOrig + "/" },
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
    function extractByEmbedUrl2(rawUrl, opts) {
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
      DEFAULT_UA,
      EXOPLAYER_UA,
      decodeHtmlEntities,
      base64DecodeString,
      buildNuvioStream,
      extractInlineVttSubtitles,
      extractBysezo,
      extractVidmoly,
      extractOkRu,
      extractSibnet,
      extractVixolity,
      extractPilavyer,
      extractMailRu,
      extractFastplay,
      extractSetplay,
      extractByEmbedUrl: extractByEmbedUrl2
    };
  }
});

// src/hdfilmcehennemi/index.js
var { loadConfig, val, wrapAll } = require_config();
var { timeoutSignal } = require_http();
var { extractByEmbedUrl } = require_extractors();
var cheerio = require("cheerio-without-node-native");
var _cfgReady = null;
function cfgReady() {
  if (!_cfgReady) {
    _cfgReady = loadConfig().then(function() {
      var v;
      v = val("urls.movies.hdfilmcehennemi.base");
      if (v && String(v).indexOf(".nl") === -1) BASE_URL = String(v).replace(/\/+$/, "");
      if (HEADERS) HEADERS.Referer = BASE_URL + "/";
    });
  }
  return _cfgReady;
}
var BASE_URL = "https://www.hdfilmcehennemi.land";
var TMDB_API_KEY = "500330721680edb6d5f7f12ba7cd9023";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
  "Referer": BASE_URL + "/"
};
var CLOSELOAD_HEADERS = {
  "User-Agent": HEADERS["User-Agent"],
  "Referer": "https://hdfilmcehennemi.mobi/"
};
var FILM_MAP = {
  // Top / Popüler Filmler
  "tt0133093": "matrix-hd-film-izle",
  "603": "matrix-hd-film-izle",
  "tt0111161": "1-esaretin-bedeli-film-izle-hdf-hdf-6",
  "278": "1-esaretin-bedeli-film-izle-hdf-hdf-6",
  "tt0068646": "hd-the-godfather-izle-10",
  "238": "hd-the-godfather-izle-10",
  "tt0071562": "hd-the-godfather-2-izle-7",
  "240": "hd-the-godfather-2-izle-7",
  "tt0468569": "batman-kara-sovalye-hd-film-izle-hdf-hdf-7",
  "155": "batman-kara-sovalye-hd-film-izle-hdf-hdf-7",
  "tt0137523": "1-dovus-kulubu-izle-6",
  "550": "1-dovus-kulubu-izle-6",
  "tt0110912": "ucuz-roman-izle-hdf-7",
  "680": "ucuz-roman-izle-hdf-7",
  "tt0108052": "hd-schindlerin-listesi-film-izle-7",
  "424": "hd-schindlerin-listesi-film-izle-7",
  "tt0050083": "12-angry-men-6",
  "389": "12-angry-men-6",
  "tt0060196": "1-iyi-kotu-ve-cirkin-izle-hdf-7",
  "429": "1-iyi-kotu-ve-cirkin-izle-hdf-7",
  "tt0120737": "1-yuzuklerin-efendisi-yuzuk-kardesligi-izle-hdf-8",
  "120": "1-yuzuklerin-efendisi-yuzuk-kardesligi-izle-hdf-8",
  "tt0167261": "yuzuklerin-efendisi-iki-kule-film-izle-hdf-7",
  "121": "yuzuklerin-efendisi-iki-kule-film-izle-hdf-7",
  "tt0167260": "1-yuzuklerin-efendisi-kralin-donusu-izle-hdf-7",
  "122": "1-yuzuklerin-efendisi-kralin-donusu-izle-hdf-7",
  "tt0075143": "the-message",
  "tt0252487": "the-chaos-class",
  "tt0253828": "tosun-pasha",
  "tt0253779": "the-foster-brothers",
  "tt2592910": "cm101mmxi-fundamentals-1",
  "tt15398776": "1-oppenheimer-izle-hdf-1",
  "872585": "1-oppenheimer-izle-hdf-1",
  "tt10366206": "john-wick-chapter-4",
  "603692": "john-wick-chapter-4",
  "tt10838180": "the-matrix-resurrections-hdf-16",
  "624860": "the-matrix-resurrections-hdf-16",
  "tt1877830": "the-batman-izle-hdf1-19",
  "414906": "the-batman-izle-hdf1-19",
  "tt4154796": "5-yenilmezler-son-oyun-full-hd-film-izle-hdf-18",
  "299534": "5-yenilmezler-son-oyun-full-hd-film-izle-hdf-18",
  "tt10872600": "spider-man-no-way-home-hdf13-10",
  "634649": "spider-man-no-way-home-hdf13-10",
  "tt1630029": "avatar-2-izle-hdf-549",
  "76600": "avatar-2-izle-hdf-549",
  "tt18412256": "alien-romulus-70",
  "945961": "alien-romulus-70",
  "tt6723592": "tenet-hd-film-izle-hdf-hdf1-19",
  "577922": "tenet-hd-film-izle-hdf-hdf1-19",
  "tt5433138": "hizli-ve-ofkeli-9-hd-film-izle-hdf-hdf6-8",
  "385128": "hizli-ve-ofkeli-9-hd-film-izle-hdf-hdf6-8",
  "tt5433140": "fast-x-2",
  "385687": "fast-x-2",
  "tt9114286": "black-panther-wakanda-forever-144",
  "505642": "black-panther-wakanda-forever-144",
  "tt9032400": "eternals-izle-hdf7-88",
  "524434": "eternals-izle-hdf7-88",
  "tt6443346": "black-adam-1711122",
  "436270": "black-adam-1711122",
  "tt9419884": "doctor-strange-in-the-multiverse-of-madness-hdf4-75222111",
  "453395": "doctor-strange-in-the-multiverse-of-madness-hdf4-75222111",
  "tt10648342": "thor-love-and-thunder-hdf2-60222135",
  "616037": "thor-love-and-thunder-hdf2-60222135",
  "tt5034838": "godzilla-ve-kong-hd-film-izle-hdf2-hdf1-30",
  "399566": "godzilla-ve-kong-hd-film-izle-hdf2-hdf1-30",
  "tt7097896": "venom-let-there-be-carnage-hdf-hdf6-19",
  "580489": "venom-let-there-be-carnage-hdf-hdf6-19",
  "tt12361974": "zack-snyders-justice-league-hd-film-izle-hdf6-14",
  "791373": "zack-snyders-justice-league-hd-film-izle-hdf6-14",
  "tt2543164": "1-gelis-film-izle-hdf-hdf-10",
  "329865": "1-gelis-film-izle-hdf-hdf-10",
  "tt9777666": "the-tomorrow-war-hdf13-8",
  "588228": "the-tomorrow-war-hdf13-8",
  "tt9376612": "shang-chi-and-the-legend-of-the-ten-rings-hdf-hdf18-8539",
  "566525": "shang-chi-and-the-legend-of-the-ten-rings-hdf-hdf18-8539",
  "tt5700672": "ssddtraintobusonfilmini-1080p-hd-izle-hdf-hdf-7",
  "396535": "ssddtraintobusonfilmini-1080p-hd-izle-hdf-hdf-7",
  "tt22084616": "spider-man-brand-new-day",
  "tt8814476": "supergirl-2026-hdfc-7",
  "tt31170389": "evil-dead-burn-13",
  "tt0427340": "masters-of-the-universe-36",
  "tt37287335": "obsession-2026-hdfc-46",
  "tt30825738": "the-mandalorian-and-grogu-34",
  "tt15047880": "disclosure-day",
  "tt17490712": "mortal-kombat-ii-2026-8",
  "tt32273171": "the-death-of-robin-hood-32",
  "tt28014327": "mayday-hdf-2026",
  "tt27165187": "the-end-of-oak-street-2",
  "tt32093575": "scary-movie-2026-18",
  "tt12042730": "project-hail-mary-54",
  "tt32558705": "the-hunger-games-sunrise-on-the-reaping-4",
  "tt27419420": "street-fighter-hdfc",
  "tt32432428": "violent-night-2-2026-hdfc",
  "tt27041231": "musk-2026",
  "tt32329539": "crawlers-2026",
  "tt34384661": "godzilla-minus-zero-2026",
  "tt31378509": "dune-part-three",
  "tt32038799": "vittoria-2024",
  "tt27369017": "hope-2026-hdfc-2",
  "tt38359047": "catane-2025",
  "tt38630008": "gator-face-2026",
  "tt27804164": "julie-keeps-quiet",
  "tt32635378": "checkered-ninja-3-2026",
  "tt32296243": "hell-in-paradise-2025",
  "tt15475528": "cuerpo-celeste-2025",
  "tt33510831": "band-of-brothers-legacy",
  "tt14119302": "hot-spot-2026",
  "tt38616652": "go-team-2026",
  "tt43751675": "the-idaho-college-murders-catching-kohberger",
  "tt4357198": "how-to-make-a-killing--2026-hdfc-15",
  "tt37673293": "tarung-unforgiven",
  "tt28375311": "the-balconettes-15",
  "tt36073210": "drawn-together",
  "tt38061210": "why-did-i-get-married-again",
  "tt38267923": "call-my-agent-the-movie",
  "tt39315536": "twenty-one-pilots-more-than-we-ever-imagined-2026",
  "tt33175825": "attack-on-titan-the-last-attack",
  "tt32034305": "never-escape",
  "tt38353956": "de-un-rancho-a-otro",
  "tt31975872": "maantrika",
  "tt1756855": "coyote-vs-acme-2026-2",
  "tt32333324": "batman-knightfall-part-1-knightfall",
  "tt15245268": "young-hearts-2024",
  "tt10612922": "miamide-bir-gece-one-night-in-miami-izle-hdf-hdf1-5",
  "tt43749709": "grand-theft-auto-vi-an-extended-look",
  "tt35340614": "the-blue-trail-52",
  "tt43465871": "sia-nostalgic-for-the-present",
  "tt18550220": "junkyard-dog",
  "tt29355505": "toy-story-5-2026-35",
  "tt33296751": "tuner-2026-6",
  "tt32889884": "freefall-a-reckoning-for-boeing-2026",
  "tt35521200": "two-prosecutors",
  "tt38984207": "sunshine-women-s-choir-2025",
  "tt38264211": "kenny-dalglish-2025",
  "tt39260895": "pyaar-prema-kalyanam-2026",
  "tt13654226": "the-gorge-2",
  "tt31227572": "predator-badlands-22",
  "tt15486810": "teen-wolf-the-movie-79",
  "tt0427944": "thank-you-for-smoking-2005",
  "tt0347304": "kal-ho-naa-ho-2003",
  "tt0455961": "hoboken-hollow",
  "tt7960918": "cin-cesmesi-1",
  "tt5042436": "barbie-spy-squad-2016",
  "tt38359641": "frankie-maniac-woman-2025",
  "tt5211694": "flower-shop-mystery-mum-s-the-word-2016",
  "tt0082924": "super-fuzz-1980",
  "tt2172935": "metallica-through-the-never-2013",
  "tt0065112": "topaz",
  "tt38689148": "tormento-2025",
  "tt0071532": "the-gambler",
  "tt34379051": "by-any-means-2026",
  "tt0051036": "sweet-smell-of-success",
  "tt0058329": "marnie",
  "tt0039694": "the-paradine-case",
  "tt0070334": "the-long-goodbye-1973",
  "tt36372021": "guardiansofthe-galapagos-2025",
  "tt0097815": "major-league",
  "tt37547195": "in-a-cold-vein-2025",
  "tt0064952": "the-secret-of-santa-vittoria-1969-1970",
  "tt1490785": "i-saw-the-light",
  "tt3801934": "1-wild-city-izle-4",
  "tt1572168": "black-ransom-2010"
};
var SLUG_CACHE = /* @__PURE__ */ new Map();
function fetchWithTimeout(url, options, ms) {
  var opts = Object.assign({}, options || {});
  try {
    if (!opts.signal) opts.signal = timeoutSignal(ms || 1e4);
  } catch (e) {
  }
  return fetch(url, opts);
}
function slugify(text) {
  if (!text) return "";
  return text.toString().toLowerCase().replace(/[ıİ]/g, "i").replace(/[üÜ]/g, "u").replace(/[öÖ]/g, "o").replace(/[şŞ]/g, "s").replace(/[ğĞ]/g, "g").replace(/[çÇ]/g, "c").replace(/[âÂ]/g, "a").replace(/[îÎ]/g, "i").replace(/[ûÛ]/g, "u").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function ultraClean(str) {
  if (!str) return "";
  return str.toString().toLowerCase().replace(/[ıİ]/g, "i").replace(/[üÜ]/g, "u").replace(/[öÖ]/g, "o").replace(/[şŞ]/g, "s").replace(/[ğĞ]/g, "g").replace(/[çÇ]/g, "c").replace(/[âÂ]/g, "a").replace(/[îÎ]/g, "i").replace(/[ûÛ]/g, "u").replace(/[^a-z0-9]/g, "").trim();
}
function resolveTmdbInfo(id) {
  return __async(this, null, function* () {
    try {
      var cleanId = String(id || "").trim();
      if (cleanId.includes(":")) cleanId = cleanId.split(":")[0];
      var titleTr = "";
      var titleEn = "";
      var year = "";
      var imdbId = "";
      var tmdbId = "";
      if (cleanId.startsWith("tt")) {
        imdbId = cleanId;
        var findUrl = "https://api.themoviedb.org/3/find/" + cleanId + "?api_key=" + TMDB_API_KEY + "&external_source=imdb_id&language=tr-TR";
        var findRes = yield fetchWithTimeout(findUrl, {}, 8e3);
        if (findRes.ok) {
          var fd = yield findRes.json();
          var match = fd.movie_results && fd.movie_results[0];
          if (match) {
            titleTr = match.title || "";
            titleEn = match.original_title || "";
            year = (match.release_date || "").split("-")[0];
            tmdbId = String(match.id || "");
          }
        }
      } else if (/^\d+$/.test(cleanId)) {
        tmdbId = cleanId;
        var movieUrl = "https://api.themoviedb.org/3/movie/" + cleanId + "?api_key=" + TMDB_API_KEY + "&language=tr-TR";
        var mRes = yield fetchWithTimeout(movieUrl, {}, 8e3);
        if (mRes.ok) {
          var md = yield mRes.json();
          titleTr = md.title || "";
          titleEn = md.original_title || "";
          year = (md.release_date || "").split("-")[0];
          imdbId = md.imdb_id || "";
        }
      }
      return {
        titleTr,
        titleEn,
        year,
        imdbId,
        tmdbId
      };
    } catch (e) {
      return { titleTr: "", titleEn: "", year: "", imdbId: "", tmdbId: "" };
    }
  });
}
function findMovieSlug(tmdbIdOrSlug) {
  return __async(this, null, function* () {
    var cleanId = String(tmdbIdOrSlug || "").trim();
    if (cleanId.startsWith("hdfilmcehennemi:movie:")) {
      return cleanId.replace("hdfilmcehennemi:movie:", "").trim();
    }
    if (FILM_MAP[cleanId]) return FILM_MAP[cleanId];
    if (cleanId.includes(":")) {
      var rawId = cleanId.split(":")[0];
      if (FILM_MAP[rawId]) return FILM_MAP[rawId];
    }
    if (SLUG_CACHE.has(cleanId)) return SLUG_CACHE.get(cleanId);
    var info = yield resolveTmdbInfo(cleanId);
    if (info.imdbId && FILM_MAP[info.imdbId]) {
      SLUG_CACHE.set(cleanId, FILM_MAP[info.imdbId]);
      return FILM_MAP[info.imdbId];
    }
    if (info.tmdbId && FILM_MAP[info.tmdbId]) {
      SLUG_CACHE.set(cleanId, FILM_MAP[info.tmdbId]);
      return FILM_MAP[info.tmdbId];
    }
    var candidates = [];
    var enSlug = slugify(info.titleEn);
    var trSlug = slugify(info.titleTr);
    var year = info.year;
    if (enSlug) {
      candidates.push(enSlug);
      if (year) candidates.push(enSlug + "-" + year);
      candidates.push("hd-" + enSlug + "-izle");
      candidates.push("1-" + enSlug + "-izle-6");
      candidates.push("1-" + enSlug + "-izle-7");
      candidates.push("1-" + enSlug + "-izle-8");
      candidates.push("1-" + enSlug + "-izle-10");
      candidates.push(enSlug + "-izle");
      candidates.push(enSlug + "-hdf");
    }
    if (trSlug && trSlug !== enSlug) {
      candidates.push(trSlug);
      if (year) candidates.push(trSlug + "-" + year);
      candidates.push("hd-" + trSlug + "-izle");
      candidates.push("1-" + trSlug + "-izle-6");
      candidates.push("1-" + trSlug + "-izle-7");
      candidates.push("1-" + trSlug + "-izle-8");
      candidates.push("1-" + trSlug + "-izle-10");
      candidates.push("1-" + trSlug + "-film-izle-hdf-hdf-6");
      candidates.push("1-" + trSlug + "-film-izle-hdf-hdf-7");
      candidates.push("1-" + trSlug + "-film-izle-hdf-hdf-8");
      candidates.push("1-" + trSlug + "-film-izle-hdf-hdf-10");
      candidates.push(trSlug + "-izle");
      candidates.push(trSlug + "-hdf");
    }
    var cleanTargetEn = ultraClean(info.titleEn);
    var cleanTargetTr = ultraClean(info.titleTr);
    for (var i = 0; i < candidates.length; i++) {
      var cand = candidates[i];
      if (!cand) continue;
      try {
        var res = yield fetchWithTimeout(BASE_URL + "/" + cand + "/", { headers: HEADERS }, 5e3);
        if (res.status === 200) {
          var html = yield res.text();
          var imdbMatch = html.match(/https:\/\/(?:www\.)?imdb\.com\/title\/(tt\d+)/i);
          var pageImdb = imdbMatch ? imdbMatch[1] : null;
          if (pageImdb && info.imdbId && pageImdb === info.imdbId) {
            SLUG_CACHE.set(cleanId, cand);
            if (info.imdbId) FILM_MAP[info.imdbId] = cand;
            return cand;
          }
          var titleMatch = html.match(/<title>([^<]+)<\/title>/i);
          if (titleMatch) {
            var pTitle = ultraClean(titleMatch[1]);
            if (cleanTargetEn && pTitle.includes(cleanTargetEn) || cleanTargetTr && pTitle.includes(cleanTargetTr)) {
              SLUG_CACHE.set(cleanId, cand);
              return cand;
            }
          }
        }
      } catch (e) {
      }
    }
    return null;
  });
}
function decryptCloseLoadScript(scriptContent, embedHost, targetVar) {
  try {
    var host = embedHost || "hdfilmcehennemi.mobi";
    var varName = targetVar;
    if (!varName) {
      var m = scriptContent.match(/var\s+([a-zA-Z0-9_$]+)\s*=\s*[a-zA-Z0-9_$]+\(\[[^\]]+\]\);/);
      if (m && m[1]) varName = m[1];
    }
    if (!varName) return null;
    var hostLiteral = JSON.stringify(host);
    var originLiteral = JSON.stringify("https://" + host);
    var hrefLiteral = JSON.stringify("https://" + host + "/");
    var code = [
      "var _loc = { hostname: " + hostLiteral + ", host: " + hostLiteral + ", origin: " + originLiteral + ", href: " + hrefLiteral + ', protocol: "https:", pathname: "/video/embed/" };',
      "var window = { location: _loc };",
      "var self = window, top = window, parent = window;",
      "var location = _loc;",
      "var document = { location: _loc, referrer: " + hrefLiteral + " };",
      'var navigator = (typeof globalThis.navigator !== "undefined") ? globalThis.navigator : { userAgent: "Mozilla/5.0" };',
      'var atob = (typeof globalThis.atob !== "undefined") ? globalThis.atob : function(s) {',
      '  return (typeof Buffer !== "undefined") ? Buffer.from(s, "base64").toString("binary") : s;',
      "};",
      'var btoa = (typeof globalThis.btoa !== "undefined") ? globalThis.btoa : function(s) {',
      '  return (typeof Buffer !== "undefined") ? Buffer.from(s, "binary").toString("base64") : s;',
      "};",
      scriptContent,
      "return (typeof " + varName + ' !== "undefined") ? ' + varName + " : null;"
    ].join("\n");
    return new Function(code)();
  } catch (e) {
    return null;
  }
}
function resolveCloseLoadStreams(pageUrl) {
  return __async(this, null, function* () {
    try {
      var res = yield fetchWithTimeout(pageUrl, { headers: HEADERS }, 1e4);
      if (!res.ok) return null;
      var html = yield res.text();
      var ifrMatch = html.match(/data-src="([^"]*video\/embed[^"]*)"/i) || html.match(/<iframe[^>]+src="([^"]*video\/embed[^"]*)"/i);
      if (!ifrMatch) return null;
      var embedUrl = ifrMatch[1];
      if (embedUrl.startsWith("//")) embedUrl = "https:" + embedUrl;
      var embedHost = "hdfilmcehennemi.mobi";
      try {
        embedHost = new URL(embedUrl).hostname;
      } catch (e) {
      }
      var streamUrl = null;
      var eHtml = "";
      for (var attempt = 0; attempt < 3 && !streamUrl; attempt++) {
        var embedUa = attempt === 0 || attempt === 2 ? "Mozilla/5.0" : HEADERS["User-Agent"];
        var eRes = yield fetchWithTimeout(embedUrl, {
          headers: {
            "User-Agent": embedUa,
            "Referer": BASE_URL + "/"
          }
        }, 1e4);
        if (!eRes.ok) continue;
        eHtml = yield eRes.text();
        var fileVarMatch = eHtml.match(/sources:\s*\[\{\s*file:\s*([a-zA-Z0-9_$]+)/i);
        var targetVar = fileVarMatch ? fileVarMatch[1] : null;
        var scripts = Array.from(eHtml.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi));
        var inlineBodies = [];
        for (var i = 0; i < scripts.length; i++) {
          var attrs = scripts[i][1] || "";
          var cleanScript = (scripts[i][2] || "").trim();
          if (!cleanScript || /\bsrc\s*=/i.test(attrs)) continue;
          if (/application\/ld\+json/i.test(attrs) || cleanScript.includes("__CF$cv$params") || cleanScript.includes("jwplayer(")) continue;
          inlineBodies.push(cleanScript);
          if (cleanScript.includes("var ") && (cleanScript.includes("([") || targetVar && cleanScript.includes(targetVar))) {
            var dec = decryptCloseLoadScript(cleanScript, embedHost, targetVar);
            if (dec && typeof dec === "string" && dec.startsWith("http")) {
              streamUrl = dec;
              break;
            }
          }
        }
        if (!streamUrl && targetVar && inlineBodies.length > 0) {
          var combinedDec = decryptCloseLoadScript(inlineBodies.join("\n;\n"), embedHost, targetVar);
          if (combinedDec && typeof combinedDec === "string" && combinedDec.startsWith("http")) {
            streamUrl = combinedDec;
          }
        }
        if (!streamUrl) {
          var ldMatch = eHtml.match(/"contentUrl"\s*:\s*"(https?:\/\/[^"]+)"/i);
          if (ldMatch && ldMatch[1]) {
            streamUrl = ldMatch[1];
          }
        }
      }
      if (!streamUrl) return null;
      var subtitles = [];
      var tracksMatch = eHtml.match(/tracks:\s*(\[[^\]]+\])/i);
      if (tracksMatch) {
        try {
          var rawTracks = JSON.parse(tracksMatch[1]);
          for (var tIdx = 0; tIdx < rawTracks.length; tIdx++) {
            var t = rawTracks[tIdx];
            if (t.file && t.kind === "captions") {
              var label = t.label || "Subtitle";
              var lowerLabel = label.toLowerCase();
              var langCode = "tr";
              var isoLang = "tur";
              if (lowerLabel.includes("eng") || lowerLabel.includes("ing")) {
                langCode = "en";
                isoLang = "eng";
              } else if (lowerLabel.includes("tur") || lowerLabel.includes("t\xFCrk")) {
                langCode = "tr";
                isoLang = "tur";
              } else if (lowerLabel.includes("ger") || lowerLabel.includes("alm")) {
                langCode = "de";
                isoLang = "ger";
              } else if (lowerLabel.includes("fre") || lowerLabel.includes("fra")) {
                langCode = "fr";
                isoLang = "fre";
              } else if (lowerLabel.includes("spa") || lowerLabel.includes("isp")) {
                langCode = "es";
                isoLang = "spa";
              }
              subtitles.push({
                id: "hdfc_sub_" + tIdx,
                url: t.file,
                file: t.file,
                link: t.file,
                lang: isoLang,
                language: langCode,
                label,
                name: label,
                title: label,
                format: "vtt",
                type: "text/vtt",
                mimeType: "text/vtt",
                headers: {
                  "User-Agent": HEADERS["User-Agent"],
                  "Referer": "https://hdfilmcehennemi.mobi/"
                }
              });
            }
          }
        } catch (e) {
        }
      }
      return {
        streamUrl,
        subtitles
      };
    } catch (e) {
      return null;
    }
  });
}
function getStreams(tmdbIdOrArgs, mediaType, seasonNum, episodeNum) {
  return __async(this, null, function* () {
    try {
      var rawId = tmdbIdOrArgs;
      if (typeof tmdbIdOrArgs === "object" && tmdbIdOrArgs !== null) {
        rawId = tmdbIdOrArgs.id || "";
        mediaType = mediaType || tmdbIdOrArgs.type || tmdbIdOrArgs.mediaType;
      }
      if (!rawId) return [];
      var pageUrl = "";
      var rawStr = String(rawId || "").trim();
      if (rawStr.startsWith("hdfilmcehennemi:movie:")) {
        var directSlug = rawStr.replace("hdfilmcehennemi:movie:", "").replace(/^\/+|\/+$/g, "");
        pageUrl = directSlug.startsWith("http") ? directSlug : BASE_URL + (directSlug.startsWith("film/") ? "/" : "/film/") + directSlug + "/";
      } else {
        var infoSearch = yield resolveTmdbInfo(rawId);
        var targetEn = ultraClean(infoSearch.titleEn);
        var targetTr = ultraClean(infoSearch.titleTr);
        for (var sq of [infoSearch.titleTr, infoSearch.titleEn].filter(Boolean)) {
          try {
            var sRes = yield fetchWithTimeout(BASE_URL + "/?s=" + encodeURIComponent(sq), { headers: HEADERS }, 8e3);
            if (!sRes.ok) continue;
            var sHtml = yield sRes.text();
            var $s = cheerio.load(sHtml);
            var bestUrl = "";
            var bestScore = -1;
            $s("article").each(function(_, el) {
              var $a = $s(el).find('a[href*="/film/"], a[href]').first();
              var href = $a.attr("href") || "";
              if (!href || /\/(?:category|tur|yil|dizi|dil|imdb|yorum|film\/?$)/.test(href)) return;
              var full = href.startsWith("http") ? href : BASE_URL + (href.startsWith("/") ? "" : "/") + href;
              var cTitle = ultraClean($s(el).find("h2, h3, .title").first().text() || $a.attr("title") || $s(el).find("img").attr("alt") || "");
              if (!cTitle) return;
              var score = 0;
              if (cTitle === targetEn || cTitle === targetTr) score = 100;
              else if (targetEn && cTitle.indexOf(targetEn) !== -1 || targetTr && cTitle.indexOf(targetTr) !== -1) score = 60;
              if (score > 0 && infoSearch.year && (full.indexOf(infoSearch.year) !== -1 || $s(el).text().indexOf(infoSearch.year) !== -1)) score += 30;
              if (score > bestScore) {
                bestScore = score;
                bestUrl = full;
              }
            });
            if (bestUrl) {
              pageUrl = bestUrl;
              break;
            }
          } catch (e) {
          }
        }
        if (!pageUrl) {
          var slug = yield findMovieSlug(rawId);
          if (slug) pageUrl = BASE_URL + "/" + slug + "/";
        }
      }
      if (!pageUrl) return [];
      var pageRes = yield fetchWithTimeout(pageUrl, { headers: HEADERS }, 1e4);
      if (!pageRes.ok && pageUrl.indexOf("/film/") === -1) {
        pageUrl = pageUrl.replace(BASE_URL + "/", BASE_URL + "/film/");
        pageRes = yield fetchWithTimeout(pageUrl, { headers: HEADERS }, 1e4);
      }
      if (!pageRes.ok) return [];
      var pageHtml = yield pageRes.text();
      var streams = [];
      try {
        var ajaxM = pageHtml.match(/ajaxurl\s*:\s*["']([^"']+)["']/);
        var ajaxUrl = ajaxM ? ajaxM[1].replace(/\\\//g, "/") : BASE_URL + "/wp-admin/admin-ajax.php";
        var $p = cheerio.load(pageHtml);
        var nonceM = pageHtml.match(/nonce\s*:\s*["']([a-z0-9]+)["']/i);
        var nonce = nonceM && nonceM[1] || $p("[data-nonce]").attr("data-nonce") || "";
        var btns = [];
        $p("[data-post-id][data-player-name]").each(function(_, el) {
          var pid = $p(el).attr("data-post-id") || "";
          var pname = $p(el).attr("data-player-name") || "";
          var pkey = $p(el).attr("data-part-key") || "";
          if (pid && pname && pname.indexOf("$") === -1) {
            btns.push({ postId: pid, name: pname, key: pkey });
          }
        });
        if (nonce && btns.length > 0) {
          for (var bi = 0; bi < Math.min(btns.length, 4); bi++) {
            var btn = btns[bi];
            try {
              var form = new URLSearchParams();
              form.append("action", "get_video_url");
              form.append("nonce", nonce);
              form.append("post_id", btn.postId);
              form.append("player_name", btn.name);
              form.append("part_key", btn.key);
              var aRes = yield fetchWithTimeout(ajaxUrl, {
                method: "POST",
                headers: {
                  "User-Agent": HEADERS["User-Agent"],
                  "Referer": pageUrl,
                  "Origin": BASE_URL,
                  "X-Requested-With": "XMLHttpRequest",
                  "Content-Type": "application/x-www-form-urlencoded"
                },
                body: form.toString()
              }, 1e4);
              if (!aRes.ok) continue;
              var aj = yield aRes.json();
              var targetUrl = aj && aj.data && aj.data.url ? String(aj.data.url).replace(/\\\//g, "/") : "";
              if (targetUrl) {
                var extStreams = yield extractByEmbedUrl(targetUrl, { sourceLabel: "HDFilmCehennemi", provider: "hdfilmcehennemi", referer: pageUrl });
                if (extStreams && extStreams.length > 0) {
                  extStreams.forEach(function(s) {
                    streams.push(s);
                  });
                }
              }
            } catch (e) {
            }
          }
        }
      } catch (e) {
      }
      if (streams.length === 0) {
        var resolved = yield resolveCloseLoadStreams(pageUrl);
        if (resolved && resolved.streamUrl) {
          var masterUrl = resolved.streamUrl;
          var playUrl = masterUrl.includes("#") ? masterUrl : masterUrl + "#.m3u8";
          streams.push({
            name: "HDFilmCehennemi [CloseLoad]",
            title: "HDFilmCehennemi - 1080p [Dual: TR Dublaj / Orijinal]",
            url: playUrl,
            quality: "1080p",
            format: "hls",
            isHls: true,
            contentLanguage: ["tr", "en"],
            behaviorHints: {
              notWebReady: true,
              proxyHeaders: { request: CLOSELOAD_HEADERS }
            },
            headers: CLOSELOAD_HEADERS,
            subtitles: resolved.subtitles
          });
        }
      }
      return sortStreamsByQuality(streams);
    } catch (e) {
      return [];
    }
  });
}
function getCatalog(args) {
  return __async(this, null, function* () {
    try {
      var pages = [
        BASE_URL + "/",
        BASE_URL + "/imdb-7-puan-uzeri-filmler-2/",
        BASE_URL + "/en-cok-yorumlananlar-2/",
        BASE_URL + "/feed/"
      ];
      var metas = [];
      var seenSlugs = /* @__PURE__ */ new Set();
      for (var i = 0; i < pages.length; i++) {
        try {
          var res = yield fetchWithTimeout(pages[i], { headers: HEADERS }, 8e3);
          if (!res.ok) continue;
          var html = yield res.text();
          var $c = cheerio.load(html);
          $c("article").each(function(_, el) {
            var $a = $c(el).find('a[href*="/film/"], a[href]').first();
            var href = $a.attr("href") || "";
            if (!href || /\/(?:category|tur|yil|dizi|dil|imdb|yorum|apk|iletisim|film\/?$)/.test(href)) return;
            var slug = href.replace(BASE_URL, "").replace(/^\/film\//, "").replace(/^\/+|\/+$/g, "");
            if (!slug || seenSlugs.has(slug) || metas.length >= 50) return;
            var rawTitle = $c(el).find(".title, h2, h3").first().text() || $a.attr("title") || $c(el).find("img").attr("alt") || "";
            var title = rawTitle.replace(/\s*(?:-|izle\s*\|).*$/i, "").replace(/\s+izle$/i, "").trim();
            if (!title || title.length < 2) return;
            seenSlugs.add(slug);
            var img = $c(el).find("img").attr("data-src") || $c(el).find("img").attr("src") || "";
            var poster = img && !img.startsWith("data:") ? img.startsWith("http") ? img : BASE_URL + img : "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png";
            metas.push({
              id: "hdfilmcehennemi:movie:" + slug,
              type: "movie",
              name: title,
              poster,
              background: poster,
              genres: ["Film", "HDFilmCehennemi"],
              description: title + " - HDFilmCehennemi 1080p Ak\u0131\u015F"
            });
          });
        } catch (e) {
        }
        if (metas.length >= 50) break;
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
      var rawId = typeof args === "string" ? args : args && args.id ? args.id : "";
      if (!rawId) return { meta: null };
      var slug = rawId.startsWith("hdfilmcehennemi:movie:") ? rawId.replace("hdfilmcehennemi:movie:", "") : rawId;
      var pageUrl = BASE_URL + "/" + slug + "/";
      var res = yield fetchWithTimeout(pageUrl, { headers: HEADERS }, 1e4);
      if (!res.ok) return { meta: null };
      var html = yield res.text();
      var titleMatch = html.match(/<title>([^<]+)<\/title>/i);
      var title = titleMatch ? titleMatch[1].split("|")[0].split("-")[0].trim() : slug;
      var ogImg = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
      var poster = ogImg ? ogImg[1] : "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png";
      return {
        meta: {
          id: "hdfilmcehennemi:movie:" + slug,
          type: "movie",
          name: title,
          poster,
          background: poster,
          description: title + " - HDFilmCehennemi",
          genres: ["Film", "HDFilmCehennemi"],
          videos: [
            {
              id: "hdfilmcehennemi:movie:" + slug,
              title,
              released: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
            }
          ]
        }
      };
    } catch (e) {
      return { meta: null };
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

