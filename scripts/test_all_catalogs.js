const manifest = require("../manifest.json");
const path = require("path");

(async () => {
  console.log(`========================================`);
  console.log(`Testing all catalogs from manifest.json`);
  console.log(`========================================\n`);

  const results = [];

  for (const scraper of manifest.scrapers) {
    if (!scraper.catalogs || scraper.catalogs.length === 0) continue;

    const fullPath = path.resolve(__dirname, "..", scraper.filename);
    try {
      const mod = require(fullPath);
      if (typeof mod.getCatalog !== "function") {
        results.push({
          scraper: scraper.name,
          catalog: "None",
          status: "MISSING FUNC ❌",
          count: 0
        });
        continue;
      }

      for (const catDef of scraper.catalogs) {
        const catRes = await mod.getCatalog({ id: catDef.id, type: catDef.type });
        const items = (catRes && catRes.metas) || [];
        const isOk = items.length > 0;
        const sample = items.length > 0 ? items[0].name : "None";

        results.push({
          scraper: scraper.name,
          catalog: catDef.name,
          status: isOk ? "PASS ✅" : "FAIL ❌",
          count: items.length,
          sample: sample.slice(0, 40)
        });

        console.log(`[${scraper.name}] [${catDef.name}] -> ${isOk ? "PASS ✅" : "FAIL ❌"} (${items.length} items)`);
        if (isOk) {
          console.log(`   Sample item: ${items[0].name} (ID: ${items[0].id})`);
        }
      }
    } catch (e) {
      console.log(`[${scraper.name}] -> ERROR ❌: ${e.message}`);
      results.push({
        scraper: scraper.name,
        catalog: "Error",
        status: "ERROR ❌",
        count: 0,
        sample: e.message
      });
    }
  }

  console.log("\n========================================");
  console.log("CATALOG TEST SUMMARY:");
  console.table(results);
  console.log("========================================");

  const failed = results.filter(r => !r.status.includes("PASS"));
  if (failed.length > 0) {
    console.error(`\n❌ ${failed.length} catalogs failed.`);
    process.exit(1);
  } else {
    console.log(`\n🎉 SUCCESS: All ${results.length} catalogs passed with 100% success rate!`);
  }
})();
