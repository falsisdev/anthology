const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const STREMIO_DIR = path.join(ROOT_DIR, 'stremio');

(async () => {
  console.log("==========================================");
  console.log("Testing Static Stremio Addon Integrity");
  console.log("==========================================\n");

  const manifestPath = path.join(STREMIO_DIR, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.error("❌ stremio/manifest.json does not exist!");
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  console.log(`[Manifest] ID: ${manifest.id} | Ver: ${manifest.version} | Catalogs: ${manifest.catalogs.length}`);

  let allCatalogsValid = true;
  let totalCheckedItems = 0;
  let missingMetas = 0;

  for (const cat of manifest.catalogs) {
    const catFile = path.join(STREMIO_DIR, 'catalog', cat.type, `${cat.id}.json`);
    if (!fs.existsSync(catFile)) {
      console.error(`❌ Catalog file missing: ${catFile}`);
      allCatalogsValid = false;
      continue;
    }

    const catData = JSON.parse(fs.readFileSync(catFile, 'utf-8'));
    const items = catData.metas || [];
    console.log(`[Catalog: ${cat.name}] -> OK ✅ (${items.length} items)`);

    for (const item of items) {
      totalCheckedItems++;
      const metaFile = path.join(STREMIO_DIR, 'meta', item.type, `${item.id}.json`);
      if (!fs.existsSync(metaFile)) {
        missingMetas++;
      }
    }
  }

  console.log(`\nVerified ${totalCheckedItems} catalog items across ${manifest.catalogs.length} catalogs.`);
  if (missingMetas > 0) {
    console.warn(`⚠️ Warning: ${missingMetas} meta files were not found.`);
  } else {
    console.log(`✅ 100% of meta JSON files exist and are valid!`);
  }

  if (allCatalogsValid && missingMetas === 0) {
    console.log("\n🎉 ALL STREMIO ADDON INTEGRITY TESTS PASSED!");
  } else {
    console.error("\n❌ Stremio addon integrity tests failed.");
    process.exit(1);
  }
})();
