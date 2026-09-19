const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const STREMIO_DIR = path.join(ROOT_DIR, 'stremio');

const stremioManifest = {
  id: "community.anthology.canlitv",
  version: "2.0.5",
  name: "Anthology — Canlı TV",
  description: "Türkiye Ulusal, Spor, Haber, Belgesel, Çocuk ve Müzik Canlı Yayınları.",
  resources: ["catalog", "meta", "stream"],
  types: ["tv", "channel"],
  idPrefixes: [
    "tv:",
    "tv_",
    "iptv_"
  ],
  logo: "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png",
  background: "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png",
  catalogs: [
    {
      type: "tv",
      id: "anthology_canli_tv",
      name: "📺 Canlı TV — Tüm Kanallar",
      extra: [
        { name: "search", isRequired: false },
        { name: "genre", isRequired: false }
      ]
    },
    {
      type: "tv",
      id: "anthology_ulusal",
      name: "🇹🇷 Ulusal Kanallar — TRT / ATV / Kanal D / Show / Star / NOW / TV8",
      extra: [{ name: "search", isRequired: false }]
    },
    {
      type: "tv",
      id: "anthology_canli_spor",
      name: "⚽ Canlı Spor — TRT Spor / A Spor / HT Spor / FB TV",
      extra: [{ name: "search", isRequired: false }]
    },
    {
      type: "tv",
      id: "anthology_canli_haber",
      name: "📰 Canlı Haber — NTV / Habertürk / TRT Haber / CNN Türk",
      extra: [{ name: "search", isRequired: false }]
    },
    {
      type: "tv",
      id: "anthology_belgesel_cocuk",
      name: "🦁 Belgesel & Çocuk — TRT Belgesel / Minika / EBA",
      extra: [{ name: "search", isRequired: false }]
    },
    {
      type: "tv",
      id: "anthology_muzik",
      name: "🎵 Müzik & Eğlence — Kral Pop / Power / Number 1",
      extra: [{ name: "search", isRequired: false }]
    }
  ]
};

const catalogConfigs = [
  {
    catId: "anthology_canli_tv",
    type: "tv",
    file: "providers/M3U/ListM3u.js",
    args: { id: "anthology_m3u_list", type: "tv" }
  },
  {
    catId: "anthology_ulusal",
    type: "tv",
    file: "providers/anthology_ulusal.js",
    args: { id: "anthology_ulusal_list", type: "tv" }
  },
  {
    catId: "anthology_canli_spor",
    type: "tv",
    file: "providers/anthology_spor.js",
    args: { id: "anthology_spor_list", type: "tv" }
  },
  {
    catId: "anthology_canli_haber",
    type: "tv",
    file: "providers/anthology_haber.js",
    args: { id: "anthology_haber_list", type: "tv" }
  },
  {
    catId: "anthology_belgesel_cocuk",
    type: "tv",
    file: "providers/anthology_belgesel_cocuk.js",
    args: { id: "anthology_belgesel_cocuk_list", type: "tv" }
  },
  {
    catId: "anthology_muzik",
    type: "tv",
    file: "providers/anthology_muzik.js",
    args: { id: "anthology_muzik_list", type: "tv" }
  }
];

function ensureDirSync(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function writeJsonSync(filePath, data) {
  ensureDirSync(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function copyDirRecursive(src, dest) {
  ensureDirSync(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function withTimeout(promise, ms = 8000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout after ' + ms + 'ms')), ms))
  ]);
}

function generateSearchTerms(title) {
  const terms = new Set();
  if (!title) return [];
  const raw = title.trim();
  const lower = raw.toLowerCase();
  const trLower = raw.toLocaleLowerCase('tr-TR');
  
  terms.add(raw);
  terms.add(lower);
  terms.add(trLower);

  const clean = lower.replace(/[^\w\sğüşıöçĞÜŞİÖÇ]/gi, ' ').replace(/\s+/g, ' ').trim();
  if (clean) terms.add(clean);

  // Normalize Turkish characters to ASCII
  const normalized = lower
    .replace(/[ıİ]/g, 'i').replace(/[üÜ]/g, 'u').replace(/[öÖ]/g, 'o')
    .replace(/[şŞ]/g, 's').replace(/[ğĞ]/g, 'g').replace(/[çÇ]/g, 'c')
    .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (normalized) terms.add(normalized);

  // Individual words and numbers
  const words = clean.split(' ').filter(w => w.length >= 1);
  for (const w of words) {
    if (w.length >= 2 || /^\d+$/.test(w)) {
      terms.add(w);
      const normW = w
        .replace(/[ıİ]/g, 'i').replace(/[üÜ]/g, 'u').replace(/[öÖ]/g, 'o')
        .replace(/[şŞ]/g, 's').replace(/[ğĞ]/g, 'g').replace(/[çÇ]/g, 'c');
      terms.add(normW);
    }
  }

  // Word pairs (bigrams)
  for (let i = 0; i < words.length - 1; i++) {
    const pair = words[i] + ' ' + words[i + 1];
    terms.add(pair);
    const normPair = pair
      .replace(/[ıİ]/g, 'i').replace(/[üÜ]/g, 'u').replace(/[öÖ]/g, 'o')
      .replace(/[şŞ]/g, 's').replace(/[ğĞ]/g, 'g').replace(/[çÇ]/g, 'c');
    terms.add(normPair);
  }

  // Alphanumeric compact (e.g. "trt1", "tv85", "kizilcikserbeti")
  const compact = normalized.replace(/\s+/g, '');
  if (compact.length >= 2) {
    terms.add(compact);
  }

  return [...terms].filter(t => t.length >= 1);
}

(async () => {
  console.log("==================================================");
  console.log("Building Static Stremio Addon (Catalogs & Metas)");
  console.log("==================================================\n");

  ensureDirSync(STREMIO_DIR);
  if (fs.existsSync(path.join(STREMIO_DIR, 'catalog'))) {
    fs.rmSync(path.join(STREMIO_DIR, 'catalog'), { recursive: true, force: true });
  }
  if (fs.existsSync(path.join(STREMIO_DIR, 'meta'))) {
    fs.rmSync(path.join(STREMIO_DIR, 'meta'), { recursive: true, force: true });
  }
  if (fs.existsSync(path.join(STREMIO_DIR, 'stream'))) {
    fs.rmSync(path.join(STREMIO_DIR, 'stream'), { recursive: true, force: true });
  }

  // 1. Write manifest.json
  writeJsonSync(path.join(STREMIO_DIR, 'manifest.json'), stremioManifest);
  console.log("✅ Wrote stremio/manifest.json");

  let totalCatalogItems = 0;
  let totalMetasWritten = 0;

  for (const cfg of catalogConfigs) {
    console.log(`\nFetching catalog [${cfg.catId}] from ${cfg.file}...`);
    const mod = require(path.join(ROOT_DIR, cfg.file));

    let metas = [];
    try {
      const res = await withTimeout(mod.getCatalog(cfg.args), 15000);
      metas = (res && res.metas) || [];
    } catch (e) {
      console.error(`❌ Error fetching ${cfg.catId}:`, e.message);
    }

    console.log(`   Found ${metas.length} items.`);
    totalCatalogItems += metas.length;

    const normalizedMetas = metas.map(item => {
      const itemType = (cfg.type === "movie") ? "movie" : (cfg.type === "series" ? "series" : (item.type || cfg.type));
      return {
        id: item.id,
        type: itemType,
        name: item.name,
        poster: item.poster || "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png",
        background: item.background || item.poster || "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png",
        description: item.description || `${item.name} - Anthology`,
        genres: item.genres || [itemType]
      };
    });

    // Discover additional content via popular queries
    if (cfg.popularSearches && Array.isArray(cfg.popularSearches) && typeof mod.getCatalog === 'function') {
      process.stdout.write(`   Querying ${cfg.popularSearches.length} popular searches for [${cfg.catId}]... `);
      let discoveredCount = 0;
      for (const q of cfg.popularSearches) {
        try {
          const sRes = await withTimeout(mod.getCatalog({ search: q }), 4000);
          if (sRes && Array.isArray(sRes.metas) && sRes.metas.length > 0) {
            for (const sItem of sRes.metas) {
              if (!sItem || !sItem.id || !sItem.name) continue;
              if (!normalizedMetas.some(m => m.id === sItem.id)) {
                const sType = (cfg.type === "movie") ? "movie" : (cfg.type === "series" ? "series" : (sItem.type || cfg.type));
                normalizedMetas.push({
                  id: sItem.id,
                  type: sType,
                  name: sItem.name,
                  poster: sItem.poster || "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png",
                  background: sItem.background || sItem.poster || "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png",
                  description: sItem.description || `${sItem.name} - Anthology`,
                  genres: sItem.genres || [sType]
                });
                discoveredCount++;
              }
            }
          }
        } catch (e) {}
      }
      console.log(`+${discoveredCount} new items discovered.`);
      totalCatalogItems += discoveredCount;
    }

    // Write catalog files:
    const catPath = path.join(STREMIO_DIR, 'catalog', cfg.type, `${cfg.catId}.json`);
    writeJsonSync(catPath, { metas: normalizedMetas });

    const skipPath = path.join(STREMIO_DIR, 'catalog', cfg.type, cfg.catId, 'skip=0.json');
    writeJsonSync(skipPath, { metas: normalizedMetas });

    // Generate static search files for Nuvio/Stremio search endpoint:
    // GET /catalog/{type}/{catId}/search={query}.json
    const catalogDir = path.join(STREMIO_DIR, 'catalog', cfg.type, cfg.catId);
    ensureDirSync(catalogDir);

    const searchIndex = new Map();
    for (const item of normalizedMetas) {
      const terms = generateSearchTerms(item.name);
      for (const t of terms) {
        if (!searchIndex.has(t)) searchIndex.set(t, []);
        const list = searchIndex.get(t);
        if (!list.some(existing => existing.id === item.id)) {
          list.push(item);
        }
      }
    }

    // Empty search query fallback: search=.json
    writeJsonSync(path.join(catalogDir, 'search=.json'), { metas: normalizedMetas });

    let searchFilesCount = 0;
    for (const [term, matchingItems] of searchIndex.entries()) {
      const searchFileName = `search=${term}.json`;
      writeJsonSync(path.join(catalogDir, searchFileName), { metas: matchingItems });
      searchFilesCount++;

      const encodedTerm = encodeURIComponent(term);
      if (encodedTerm !== term) {
        const encodedFileName = `search=${encodedTerm}.json`;
        writeJsonSync(path.join(catalogDir, encodedFileName), { metas: matchingItems });
      }
    }
    console.log(`   Generated ${searchFilesCount} static search query files for [${cfg.catId}].`);

    // 2. Generate Meta for each item directly from normalized metadata
    for (const item of normalizedMetas) {
      const metaData = {
        id: item.id,
        type: item.type,
        name: item.name,
        poster: item.poster,
        background: item.background,
        description: item.description,
        genres: item.genres
      };

      // Fetch full episodes if the provider supports getMeta and item is a series/show
      if (typeof mod.getMeta === 'function' && (metaData.type === 'series' || metaData.type === 'tv') && !item.id.startsWith('tv:')) {
        try {
          const detail = await withTimeout(mod.getMeta({ id: item.id, type: item.type || cfg.type }), 8000);
          if (detail && detail.meta) {
            if (Array.isArray(detail.meta.videos) && detail.meta.videos.length > 0) {
              metaData.videos = detail.meta.videos;
            }
            if (detail.meta.description) metaData.description = detail.meta.description;
            if (detail.meta.poster) metaData.poster = detail.meta.poster;
            if (detail.meta.background) metaData.background = detail.meta.background;
          }
        } catch (e) {
          console.warn(`   ⚠️ Warning: failed to fetch deep meta for ${item.id}:`, e.message);
        }
      }

      if (!metaData.videos || metaData.videos.length === 0) {
        if (item.id.startsWith('tv:')) {
          // Canlı TV — season/episode YOK (S1B1 sorunu fix)
          metaData.videos = [{ id: item.id, title: metaData.name || item.name }];
        } else if (metaData.type === 'series') {
          metaData.videos = [
            {
              id: item.id,
              title: item.name,
              season: 1,
              episode: 1
            }
          ];
        }
      }

      const typesToWrite = [metaData.type];
      if (metaData.type === 'tv') {
        typesToWrite.push('series');
        typesToWrite.push('channel');
      }
      if (metaData.type === 'series') typesToWrite.push('tv');

      for (const t of typesToWrite) {
        // Direct unencoded path
        const metaFilePath = path.join(STREMIO_DIR, 'meta', t, `${item.id}.json`);
        writeJsonSync(metaFilePath, { meta: metaData });

        // URL encoded path (e.g. for colons and special chars)
        const encodedId = encodeURIComponent(item.id);
        if (encodedId !== item.id) {
          const encodedPath = path.join(STREMIO_DIR, 'meta', t, `${encodedId}.json`);
          writeJsonSync(encodedPath, { meta: metaData });
        }
      }

      function saveStaticStream(types, id, streams) {
        if (!Array.isArray(streams) || streams.length === 0) return;
        for (const st of types) {
          const streamPath = path.join(STREMIO_DIR, 'stream', st, `${id}.json`);
          writeJsonSync(streamPath, { streams });

          const encodedId = encodeURIComponent(id);
          if (encodedId !== id) {
            const encodedStreamPath = path.join(STREMIO_DIR, 'stream', st, `${encodedId}.json`);
            writeJsonSync(encodedStreamPath, { streams });
          }
        }
      }

      // 3. Generate static /stream endpoint for Live TV
      if (typeof mod.getStreams === 'function') {
        try {
          const streamRes = await withTimeout(mod.getStreams({ id: item.id, type: item.type || cfg.type }), 25000);
          const streamsArray = Array.isArray(streamRes) ? streamRes : (streamRes && streamRes.streams ? streamRes.streams : []);
          saveStaticStream(['tv', 'channel', 'series'], item.id, streamsArray);
        } catch (e) {
          console.warn(`   ⚠️ Warning: failed to fetch stream for ${item.id}:`, e.message);
        }
      }

      totalMetasWritten++;
    }
  }

  console.log("\n==================================================");
  console.log(`🎉 BUILD SUCCESSFUL!`);
  console.log(`- ${catalogConfigs.length} Catalogs Generated`);
  console.log(`- ${totalCatalogItems} Total Catalog Items`);
  console.log(`- ${totalMetasWritten} Meta Files Created`);
  console.log(`- Output written to stremio/`);
  console.log("==================================================");
})();
