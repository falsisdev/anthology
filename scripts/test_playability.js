const manifest = require("../manifest.json");
const path = require("path");

async function checkHttp(url, headers = {}) {
  // Bazı CDN'ler (video.sibnet.ru, dv..sibnet.ru) HEAD/405/400 döner ama
  // GET+Range ile 206 verir. Bazıları (bcdn.hakunaymatata.com) browser UA
  // ile 428 "Precondition Required" döner; o yüzden stream'in kendi
  // header'ları önce, browser UA yedek olarak sonra denenir.

  const withRange = (h) => Object.assign({}, h, { "Range": "bytes=0-131072" });
  const mediaLike = (ct) => /video|mp4|mpegurl|matroska|octet-stream|m4v|dash|\/xml|audio/i.test(ct || "");

  async function tryOnce(h, withUa) {
    const hdrs = Object.assign({}, h);
    if (withUa && !(hdrs["User-Agent"] || hdrs["user-agent"])) {
      hdrs["User-Agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)";
    }
    // 1) HEAD
    try {
      const c = new AbortController();
      const t = setTimeout(() => c.abort(), 5000);
      const res = await fetch(url, { method: "HEAD", headers: hdrs, signal: c.signal });
      clearTimeout(t);
      if (res.ok || res.status === 206) {
        return { ok: true, status: res.status, type: res.headers.get("content-type") };
      }
    } catch (e) { /* fallback GET */ }
    // 2) GET + Range
    try {
      const c2 = new AbortController();
      const t2 = setTimeout(() => c2.abort(), 6000);
      const res2 = await fetch(url, { method: "GET", headers: withRange(hdrs), signal: c2.signal });
      clearTimeout(t2);
      const ok2 = res2.ok || res2.status === 206;
      const ct = res2.headers.get("content-type") || "";
      const hasContentRange = !!res2.headers.get("content-range");
      const lenHeader = res2.headers.get("content-length");
      let mediaOk = ok2 && (hasContentRange || mediaLike(ct) || !ct);
      if (mediaOk && lenHeader === "0") mediaOk = false;
      await res2.body?.cancel?.();
      return { ok: mediaOk, status: res2.status, type: ct, mediaOk };
    } catch (err) {
      return { ok: false, status: err.name === "AbortError" ? "TIMEOUT" : "ERR", error: err.message };
    }
  }

  const first = await tryOnce(headers || {}, false);
  if (first.ok) return first;
  // Yedek: browser UA ekle (bazı CDN'ler UA istiyor)
  const second = await tryOnce(headers || {}, true);
  return second;
}

(async () => {
  console.log("=== COMPREHENSIVE STREAM PLAYABILITY TEST ===");
  const testResults = [];

  for (const scraper of manifest.scrapers) {
    const fullPath = path.resolve(__dirname, "..", scraper.filename);
    try {
      const mod = require(fullPath);
      let streams = [];

      if (scraper.id === "sinewix") {
        streams = await mod.getStreams({ id: "603", type: "movie" });
      } else if (scraper.id === "animecix") {
        streams = await mod.getStreams("127532", "tv", 1, 1);
      } else if (scraper.id === "sonanime") {
        streams = await mod.getStreams("46260", "series", 1, 1);
      } else if (scraper.id === "diziboxizle") {
        streams = await mod.getStreams("246864", "tv", 1, 1);
      } else if (scraper.id === "anizium") {
        streams = await mod.getStreams("31910", "series", 1, 1);
      } else if (scraper.id === "asyaanimeleri") {
        streams = await mod.getStreams("127532", "tv", 1, 1);
      } else if (scraper.id === "anthology_m3u") {
        streams = await mod.getStreams("245914", "tv", 1, 1);
      } else if (scraper.id === "ddizi") {
        streams = await mod.getStreams("315179", "tv", 1, 1);
      } else if (scraper.id === "tvdiziler") {
        streams = await mod.getStreams("213194", "tv", 1, 1);
      } else if (scraper.id === "anthology_spor") {
        streams = await mod.getStreams({ id: "tv:beINSports1.tr", type: "tv" });
      } else if (scraper.id === "anthology_ulusal") {
        streams = await mod.getStreams({ id: "tv:TRT1.tr", type: "tv" });
      } else if (scraper.id === "anthology_haber") {
        streams = await mod.getStreams({ id: "tv:NTV.tr", type: "tv" });
      } else if (scraper.id === "m3u.anthology.addon") {
        streams = await mod.getStreams({ id: "tv:ATV.tr", type: "tv" });
      } else if (scraper.supportedTypes && scraper.supportedTypes.includes("movie")) {
        streams = await mod.getStreams("603", "movie");
      } else if (scraper.supportedTypes && scraper.supportedTypes.includes("tv")) {
        streams = await mod.getStreams("1396", "tv", 1, 1);
      }

      const streamList = Array.isArray(streams) ? streams : (streams && streams.streams ? streams.streams : []);
      if (streamList.length === 0) {
        testResults.push({ id: scraper.id, name: scraper.name, count: 0, playable: 0, status: "NO_STREAMS ❌" });
        console.log(`[${scraper.name}] ❌ NO STREAMS`);
        continue;
      }

      let playableCount = 0;
      let firstCheck = null;

      for (let i = 0; i < Math.min(streamList.length, 3); i++) {
        const s = streamList[i];
        if (s.ytId) {
          playableCount++;
          if (!firstCheck) firstCheck = `YouTube (${s.ytId})`;
          continue;
        }
        if (!s.url) continue;
        const check = await checkHttp(s.url, s.headers || {});
        if (check.ok || check.status === 200 || check.status === 206) {
          playableCount++;
          if (!firstCheck) firstCheck = `HTTP ${check.status} (${check.type || "ok"})`;
        } else {
          if (!firstCheck) firstCheck = `HTTP ${check.status} (${s.url.slice(0, 40)}...)`;
        }
      }

      const isPlayable = playableCount > 0;
      testResults.push({
        id: scraper.id,
        name: scraper.name,
        count: streamList.length,
        playable: playableCount,
        status: isPlayable ? "PLAYABLE ✅" : "BLOCKED / BROKEN ❌",
        details: firstCheck || "No check"
      });

      console.log(`[${scraper.name}] ${isPlayable ? "✅" : "❌"} (Playable: ${playableCount}/${streamList.length}) | ${firstCheck}`);
    } catch (e) {
      testResults.push({ id: scraper.id, name: scraper.name, count: 0, playable: 0, status: "ERROR ❌", details: e.message });
      console.log(`[${scraper.name}] ❌ ERROR: ${e.message}`);
    }
  }

  console.log("\n==========================================");
  console.table(testResults);
  console.log("==========================================");
})();
