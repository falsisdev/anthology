process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const manifest = require("../manifest.json");
const path = require("path");

// Playability check: HEAD first stream's master URL + first segment with provider headers
async function checkPlayability(streams) {
  if (!streams || !streams.length) return { playable: false, reason: "no streams" };
  const s = streams[0];
  const headers = { ...(s.headers || {}), ...(s.behaviorHints?.proxyHeaders?.request || {}) };
  const url = s.url;
  try {
    // HEAD master
    let mr = await fetch(url, { method: "HEAD", headers, signal: AbortSignal.timeout(12000) }).catch(() => null);
    // Fallback: If HEAD fails (e.g. 400/405 from Sibnet or other CDNs that only allow GET), try GET Range
    if (!mr || !mr.ok) {
      const getHeaders = { ...headers, Range: "bytes=0-100" };
      const gr = await fetch(url, { method: "GET", headers: getHeaders, signal: AbortSignal.timeout(12000) }).catch(() => null);
      if (gr && (gr.ok || gr.status === 206)) {
        mr = gr;
      }
    }
    if (!mr || (!mr.ok && mr.status !== 206)) return { playable: false, reason: `master ${mr ? mr.status : 'ERR'}` };
    
    // If direct mp4 (not m3u8), consider playable if master 200 or 206
    const ct = mr.headers.get("content-type") || "";
    if (ct.includes("video/") || url.endsWith(".mp4") || url.includes(".mp4?")) {
      return { playable: true, reason: `direct ${mr.status} ${ct}` };
    }
    
    // m3u8: get first segment
    const txt = await fetch(url, { headers, signal: AbortSignal.timeout(12000) }).then(r => r.text());
    const lines = txt.split("\n").filter(l => l && !l.startsWith("#"));
    if (!lines.length) return { playable: true, reason: "master ok, no segments (direct?)" };
    const segUrl = lines[0].startsWith("http") ? lines[0] : new URL(lines[0], url).href;
    const sr = await fetch(segUrl, { method: "HEAD", headers, signal: AbortSignal.timeout(8000) });
    if (sr.ok) return { playable: true, reason: `segment ${sr.status}` };
    return { playable: false, reason: `segment ${sr.status}` };
  } catch (e) {
    return { playable: false, reason: `error: ${e.message}` };
  }
}

(async () => {
  console.log(`========================================`);
  console.log(`Testing all ${manifest.scrapers.length} providers from manifest.json`);
  console.log(`========================================\n`);

  const results = [];

  for (const scraper of manifest.scrapers) {
    if (scraper.enabled === false) {
      console.log(`[${scraper.name}] -> SKIP ⏭️ (disabled in manifest)`);
      continue;
    }
    const fullPath = path.resolve(__dirname, "..", scraper.filename);
    try {
      const mod = require(fullPath);
      let streams = [];
      let testTarget = "";

      if (scraper.id === "m3u.anthology.addon" || scraper.id.startsWith("anthology_spor") || scraper.id.startsWith("anthology_haber") || scraper.id.startsWith("anthology_ulusal") || scraper.id.startsWith("anthology_belgesel_cocuk") || scraper.id.startsWith("anthology_muzik")) {
        testTarget = "Catalog / Live Channels";
        if (typeof mod.getCatalog === "function") {
          const cat = await mod.getCatalog({});
          streams = (cat && cat.metas) || [];
        }
      } else if (scraper.id === "sinewix") {
        testTarget = "The Matrix (obj {id: 603, type: movie})";
        streams = await mod.getStreams({ id: "603", type: "movie" });
      } else if (scraper.id === "animecix") {
        testTarget = "Solo Leveling (127532 S01E01)";
        streams = await mod.getStreams("127532", "tv", 1, 1);
      } else if (scraper.id === "anizium") {
        testTarget = "Naruto Shippuden (31910 S01E01)";
        streams = await mod.getStreams("31910", "series", 1, 1);
      } else if (scraper.id === "asyaanimeleri") {
        testTarget = "Solo Leveling (127532 S01E01)";
        streams = await mod.getStreams("127532", "tv", 1, 1);
      } else if (scraper.id === "diziboxizle") {
        testTarget = "Amadeus (246864 S01E01)";
        streams = await mod.getStreams("246864", "tv", 1, 1);
      } else if (scraper.id === "dizibak") {
        testTarget = "Breaking Bad (1396 S01E01)";
        streams = await mod.getStreams("1396", "tv", 1, 1);
      } else if (scraper.id === "dizipod") {
        testTarget = "Breaking Bad (1396 S01E01)";
        streams = await mod.getStreams("1396", "tv", 1, 1);
      } else if (scraper.id === "turkanime") {
        testTarget = "Death Note (13916 S01E01)";
        streams = await mod.getStreams("13916", "tv", 1, 1);
      } else if (scraper.id === "AnthologyDiziM3U" || scraper.id === "anthology_yerlidizi") {
        testTarget = "Bahar (245914 S01E01)";
        streams = await mod.getStreams("245914", "tv", 1, 1);
      } else if (scraper.id === "ddizi") {
        testTarget = "Çirkin (315179 S01E01)";
        streams = await mod.getStreams("315179", "tv", 1, 1);
      } else if (scraper.id === "anthology_yabancidizi") {
        testTarget = "Better Call Saul (60059 S01E01)";
        streams = await mod.getStreams("60059", "tv", 1, 1);
      } else if (scraper.id === "anthology_yerlifilm") {
        testTarget = "G.O.R.A. (27275)";
        streams = await mod.getStreams("27275", "movie");
      } else if (scraper.id === "anthology_aksiyon") {
        testTarget = "John Wick (245891)";
        streams = await mod.getStreams("245891", "movie");
      } else if (scraper.id === "anthology_bilimkurgu") {
        testTarget = "Inception (27205)";
        streams = await mod.getStreams("27205", "movie");
      } else if (scraper.id === "anthology_korku") {
        testTarget = "Scream (4232)";
        streams = await mod.getStreams("4232", "movie");
      } else if (scraper.id === "anthology_komedi") {
        testTarget = "G.O.R.A. (27275)";
        streams = await mod.getStreams("27275", "movie");
      } else if (scraper.id === "anthology_animasyon" || scraper.id === "anthology_cocuk") {
        testTarget = "Shrek 2 (809)";
        streams = await mod.getStreams("809", "movie");
      } else if (scraper.id === "anthology_belgesel") {
        testTarget = "Mantarların Gizemli Dünyası (612654)";
        streams = await mod.getStreams("612654", "movie");
      } else if (scraper.id === "anthology_toprated" || scraper.id === "AnthologyFilmM3U") {
        testTarget = "The Godfather (238)";
        streams = await mod.getStreams("238", "movie");
      } else if (scraper.supportedTypes && scraper.supportedTypes.includes("movie")) {
        testTarget = "The Matrix (603)";
        streams = await mod.getStreams("603", "movie");
      } else if (scraper.id === "yabancidizi") {
        testTarget = "Dexter (1405 S01E01)";
        streams = await mod.getStreams("1405", "tv", 1, 1);
      } else if (scraper.supportedTypes && scraper.supportedTypes.includes("tv")) {
        testTarget = "Breaking Bad (1396 S01E01)";
        streams = await mod.getStreams("1396", "tv", 1, 1);
      }

      const count = Array.isArray(streams) ? streams.length : (streams ? 1 : 0);
      const isWorking = count > 0;
      const sample = count > 0 ? (streams[0].url || streams[0].name || "") : "None";

      let playability = { playable: false, reason: "not tested" };
      // Test playability for stream providers (not catalog/live)
      const isStreamProvider = count > 0 && (s = streams[0]) && s.url && !scraper.id.startsWith("anthology_") || scraper.id === "AnthologyFilmM3U" || scraper.id === "AnthologyDiziM3U";
      // Actually, let's test all providers that return streams with URLs
      if (isWorking && streams[0]?.url) {
        playability = await checkPlayability(streams);
      }

      const statusIcon = isWorking ? (playability.playable ? "PASS ✅" : "PASS ⚠️") : "FAIL ❌";
      const playNote = isWorking ? (playability.playable ? " 🎬" : ` ⚠️ ${playability.reason}`) : "";

      results.push({
        id: scraper.id,
        name: scraper.name,
        target: testTarget,
        status: statusIcon,
        count: count,
        sample: sample.slice(0, 60) + (sample.length > 60 ? "..." : ""),
        playable: playability.playable,
        playReason: playability.reason
      });

      console.log(`[${scraper.name}] -> ${statusIcon} (${count} items found)${playNote} | Target: ${testTarget}`);
      if (isWorking) {
        console.log(`   Sample: ${sample.slice(0, 80)}`);
      }
    } catch (e) {
      console.log(`[${scraper.name}] -> ERROR ❌: ${e.message}`);
      results.push({
        id: scraper.id,
        name: scraper.name,
        target: "Error",
        status: "ERROR ❌",
        count: 0,
        sample: e.message
      });
    }
  }

  console.log("\n========================================");
  console.log("FINAL TEST SUMMARY:");
  const displayResults = results.map(r => ({
    id: r.id,
    name: r.name,
    target: r.target,
    status: r.status,
    count: r.count,
    sample: r.sample,
    playable: r.playable ? "✅" : (r.playable === false ? "❌" : "—")
  }));
  console.table(displayResults);
  console.log("========================================");

  const failed = results.filter(r => r.status.startsWith("FAIL"));
  const unplayable = results.filter(r => r.playable === false);
  if (failed.length > 0 || unplayable.length > 0) {
    console.error(`\n❌ TEST SUITE: ${failed.length} failed, ${unplayable.length} unplayable.`);
    if (unplayable.length) {
      console.log("Unplayable:", unplayable.map(u => `${u.name} (${u.playReason})`).join(", "));
    }
    process.exit(1);
  } else {
    console.log(`\n🎉 SUCCESS: All ${results.length} providers passed with 100% playability!`);
  }
})();
