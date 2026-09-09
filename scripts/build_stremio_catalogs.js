const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const STREMIO_DIR = path.join(ROOT_DIR, 'stremio');
const PUBLIC_STREMIO_DIR = path.join(ROOT_DIR, 'public', 'stremio');

const stremioManifest = {
  id: "community.anthology.catalogs",
  version: "1.7.0",
  name: "Anthology — Türkçe Kataloglar",
  description: "DDizi, DiziBox, SineWix, FilmModu, AnimeciX, TurkAnime, ÇizgiMax ve Canlı TV ana sayfa keşif katalogları.",
  resources: ["catalog", "meta"],
  types: ["movie", "series", "tv"],
  idPrefixes: [
    "tv:",
    "dizimom:",
    "ddizi:",
    "dizibox:",
    "sinewix:",
    "filmmodu:",
    "animecix:",
    "turkanime:",
    "cizgimax:",
    "tv_",
    "iptv_",
    "tmdb:"
  ],
  logo: "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png",
  background: "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_1_transparent.png",
  catalogs: [
    {
      type: "series",
      id: "anthology_ddizi",
      name: "DDizi — Popüler Yerli Diziler"
    },
    {
      type: "series",
      id: "anthology_dizibox",
      name: "DiziBox — Popüler Yabancı Diziler"
    },
    {
      type: "series",
      id: "anthology_dizimom",
      name: "DiziMom — Popüler Diziler"
    },
    {
      type: "movie",
      id: "anthology_sinewix_movies",
      name: "SineWix — Popüler Filmler"
    },
    {
      type: "series",
      id: "anthology_sinewix_series",
      name: "SineWix — Popüler Diziler"
    },
    {
      type: "movie",
      id: "anthology_filmmodu",
      name: "FilmModu — Son Eklenen Filmler"
    },
    {
      type: "series",
      id: "anthology_animecix",
      name: "AnimeciX — Popüler Animeler"
    },
    {
      type: "series",
      id: "anthology_turkanime",
      name: "TurkAnime — Popüler Animeler"
    },
    {
      type: "series",
      id: "anthology_cizgimax",
      name: "ÇizgiMax — Çizgi Diziler"
    },
    {
      type: "tv",
      id: "anthology_canli_tv",
      name: "Anthology — Canlı TV"
    },
    {
      type: "tv",
      id: "anthology_canli_spor",
      name: "Anthology — Canlı Spor"
    },
    {
      type: "tv",
      id: "anthology_canli_haber",
      name: "Anthology — Canlı Haber"
    },
    {
      type: "tv",
      id: "anthology_ulusal",
      name: "Anthology — Ulusal Kanallar"
    }
  ]
};

const catalogConfigs = [
  {
    catId: "anthology_ddizi",
    type: "series",
    file: "providers/ddizi.js",
    args: { id: "ddizi_popular", type: "series" }
  },
  {
    catId: "anthology_dizibox",
    type: "series",
    file: "providers/dizibox.js",
    args: { id: "dizibox_popular", type: "series" }
  },
  {
    catId: "anthology_dizimom",
    type: "series",
    file: "providers/dizimom.js",
    args: { id: "dizimom_popular", type: "series" }
  },
  {
    catId: "anthology_sinewix_movies",
    type: "movie",
    file: "providers/sinewix.js",
    args: { id: "sinewix_movies", type: "movie" }
  },
  {
    catId: "anthology_sinewix_series",
    type: "series",
    file: "providers/sinewix.js",
    args: { id: "sinewix_series", type: "series" }
  },
  {
    catId: "anthology_filmmodu",
    type: "movie",
    file: "providers/filmmodu.js",
    args: { id: "filmmodu_movies", type: "movie" }
  },
  {
    catId: "anthology_animecix",
    type: "series",
    file: "providers/animecix.js",
    args: { id: "animecix_popular", type: "series" }
  },
  {
    catId: "anthology_turkanime",
    type: "series",
    file: "providers/turkanime.js",
    args: { id: "turkanime_popular", type: "series" }
  },
  {
    catId: "anthology_cizgimax",
    type: "series",
    file: "providers/cizgimax.js",
    args: { id: "cizgimax_popular", type: "series" }
  },
  {
    catId: "anthology_canli_tv",
    type: "tv",
    file: "providers/M3U/ListM3u.js",
    args: { id: "anthology_m3u_list", type: "tv" }
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
    catId: "anthology_ulusal",
    type: "tv",
    file: "providers/anthology_ulusal.js",
    args: { id: "anthology_ulusal_list", type: "tv" }
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
  if (fs.existsSync(path.join(PUBLIC_STREMIO_DIR, 'catalog'))) {
    fs.rmSync(path.join(PUBLIC_STREMIO_DIR, 'catalog'), { recursive: true, force: true });
  }
  if (fs.existsSync(path.join(PUBLIC_STREMIO_DIR, 'meta'))) {
    fs.rmSync(path.join(PUBLIC_STREMIO_DIR, 'meta'), { recursive: true, force: true });
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
      const res = await mod.getCatalog(cfg.args);
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

    // Write catalog files:
    const catPath = path.join(STREMIO_DIR, 'catalog', cfg.type, `${cfg.catId}.json`);
    writeJsonSync(catPath, { metas: normalizedMetas });

    const skipPath = path.join(STREMIO_DIR, 'catalog', cfg.type, cfg.catId, 'skip=0.json');
    writeJsonSync(skipPath, { metas: normalizedMetas });

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
          const detail = await mod.getMeta({ id: item.id, type: item.type || cfg.type });
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
        if (metaData.type === 'series' || metaData.type === 'tv') {
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
      if (metaData.type === 'tv') typesToWrite.push('series');
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

      totalMetasWritten++;
    }
  }

  console.log("\nMirroring to public/stremio...");
  copyDirRecursive(STREMIO_DIR, PUBLIC_STREMIO_DIR);

  console.log("\n==================================================");
  console.log(`🎉 BUILD SUCCESSFUL!`);
  console.log(`- 12 Catalogs Generated`);
  console.log(`- ${totalCatalogItems} Total Catalog Items`);
  console.log(`- ${totalMetasWritten} Meta Files Created`);
  console.log(`- Output written to stremio/ and public/stremio/`);
  console.log("==================================================");
})();
