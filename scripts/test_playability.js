const manifest = require("../manifest.json");
const path = require("path");

async function checkHttp(url, headers = {}) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, {
      method: "HEAD",
      headers: Object.assign({ "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }, headers),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return { ok: res.ok, status: res.status, type: res.headers.get("content-type") };
  } catch (e) {
    // If HEAD fails, try GET with Range
    try {
      const controller2 = new AbortController();
      const timeoutId2 = setTimeout(() => controller2.abort(), 4000);
      const res2 = await fetch(url, {
        method: "GET",
        headers: Object.assign({ "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "Range": "bytes=0-100" }, headers),
        signal: controller2.signal
      });
      clearTimeout(timeoutId2);
      return { ok: res2.ok, status: res2.status, type: res2.headers.get("content-type") };
    } catch (err) {
      return { ok: false, status: err.name === "AbortError" ? "TIMEOUT" : "ERR", error: err.message };
    }
  }
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
      } else if (scraper.id === "cizgimax") {
        streams = await mod.getStreams("246", "tv", 1, 1);
      } else if (scraper.id === "turkanime") {
        streams = await mod.getStreams("13916", "tv", 1, 1);
      } else if (scraper.id === "AnthologyDiziM3U" || scraper.id === "anthology_yerlidizi") {
        streams = await mod.getStreams("245914", "tv", 1, 1);
      } else if (scraper.id === "ddizi") {
        streams = await mod.getStreams("315179", "tv", 1, 1);
      } else if (scraper.id === "anthology_spor") {
        streams = await mod.getStreams({ id: "tv:beINSports1.tr", type: "tv" });
      } else if (scraper.id === "anthology_ulusal") {
        streams = await mod.getStreams({ id: "tv:TRT1.tr", type: "tv" });
      } else if (scraper.id === "anthology_haber") {
        streams = await mod.getStreams({ id: "tv:NTV.tr", type: "tv" });
      } else if (scraper.id === "m3u.anthology.addon") {
        streams = await mod.getStreams({ id: "tv:ATV.tr", type: "tv" });
      } else if (scraper.id === "anthology_yabancidizi") {
        streams = await mod.getStreams("60059", "tv", 1, 1);
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
