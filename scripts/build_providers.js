#!/usr/bin/env node
/**
 * Anthology - Nuvio/Hermes uyumlu provider build'i.
 *
 * Nuvio provider'lari Hermes (React Native) motorunda dinamik olarak
 * calistirir; Hermes dinamik degerlendirilen kodda async/await desteklemez.
 * Bu script her provider'i es2016 HEDEFLERIYLE transpile eder (async/await ->
 * generator tabanli, ?./?? -> acilim) ve providers/ agacini build/providers/
 * altina yansitir (bagil require'lar ve veri dosyalari korunur).
 *
 * Kullanim: node scripts/build_providers.js
 * Manifest filename'leri build/providers/... adresini gosterir.
 */

const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const SRC = path.resolve(__dirname, '..', 'providers');
const OUT = path.resolve(__dirname, '..', 'build', 'providers');

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

async function main() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  const files = walk(SRC);
  let js = 0, copied = 0;

  for (const file of files) {
    const rel = path.relative(SRC, file);
    const dest = path.join(OUT, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });

    if (file.endsWith('.js')) {
      try {
        await esbuild.build({
          entryPoints: [file],
          outfile: dest,
          bundle: false,
          format: 'cjs',
          platform: 'neutral',
          target: 'es2016',
          sourcemap: false,
          minify: false,
          logLevel: 'error',
        });
        js++;
      } catch (e) {
        console.error('  ✗ build FAIL', rel, '->', (e.errors || e.message || '').toString().slice(0, 120));
        process.exitCode = 1;
      }
    } else {
      fs.copyFileSync(file, dest);
      copied++;
    }
  }
  console.log(`build/providers: ${js} js transpiled, ${copied} files copied`);
}

main();