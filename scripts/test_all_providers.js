const manifest = require("../manifest.json");
const path = require("path");

(async () => {
  console.log(`========================================`);
  console.log(`Testing all ${manifest.scrapers.length} providers from manifest.json`);
  console.log(`========================================\n`);

  const results = [];

  for (const scraper of manifest.scrapers) {
    const fullPath = path.resolve(__dirname, "..", scraper.filename);
    try {
      const mod = require(fullPath);
      let streams = [];
      let testTarget = "";

      if (scraper.id === "m3u.anthology.addon" || scraper.id.startsWith("anthology_spor") || scraper.id.startsWith("anthology_haber") || scraper.id.startsWith("anthology_ulusal")) {
        testTarget = "Catalog / Live Channels";
        if (typeof mod.getCatalog === "function") {
          const cat = await mod.getCatalog({});
          streams = (cat && cat.metas) || [];
        }
      } else if (scraper.id === "animecix" || scraper.id === "turkanime") {
        testTarget = "Death Note (13916 S01E01)";
        streams = await mod.getStreams("13916", "tv", 1, 1);
      } else if (scraper.id === "cizgimax") {
        testTarget = "Avatar (246 S01E01)";
        streams = await mod.getStreams("246", "tv", 1, 1);
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
      } else if (scraper.id === "anthology_korku") {
        testTarget = "Saw (176)";
        streams = await mod.getStreams("176", "movie");
      } else if (scraper.id === "anthology_komedi") {
        testTarget = "The Mask (854)";
        streams = await mod.getStreams("854", "movie");
      } else if (scraper.id === "anthology_animasyon" || scraper.id === "anthology_cocuk") {
        testTarget = "Shrek 2 (809)";
        streams = await mod.getStreams("809", "movie");
      } else if (scraper.id === "anthology_belgesel") {
        testTarget = "The Matrix Revisited (14543)";
        streams = await mod.getStreams("14543", "movie");
      } else if (scraper.supportedTypes && scraper.supportedTypes.includes("movie")) {
        testTarget = "The Matrix (603)";
        streams = await mod.getStreams("603", "movie");
      } else if (scraper.supportedTypes && scraper.supportedTypes.includes("tv")) {
        testTarget = "Breaking Bad (1396 S01E01)";
        streams = await mod.getStreams("1396", "tv", 1, 1);
      }

      const count = Array.isArray(streams) ? streams.length : (streams ? 1 : 0);
      const isWorking = count > 0;
      const sample = count > 0 ? (streams[0].url || streams[0].name || "") : "None";

      results.push({
        id: scraper.id,
        name: scraper.name,
        target: testTarget,
        status: isWorking ? "PASS ✅" : "FAIL ❌",
        count: count,
        sample: sample.slice(0, 60) + (sample.length > 60 ? "..." : "")
      });

      console.log(`[${scraper.name}] -> ${isWorking ? "PASS ✅" : "FAIL ❌"} (${count} items found) | Target: ${testTarget}`);
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
  console.table(results);
  console.log("========================================");

  const failed = results.filter(r => !r.status.includes("PASS"));
  if (failed.length > 0) {
    console.error(`\n❌ TEST SUITE FAILED: ${failed.length} providers failed.`);
    process.exit(1);
  } else {
    console.log(`\n🎉 SUCCESS: All ${results.length} providers passed with 100% success rate!`);
  }
})();
