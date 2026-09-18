#!/usr/bin/env node

/**
 * Build script for Anthology Nuvio Providers
 * 
 * Bundles each provider from src/<provider>/ into a single file at providers/<provider>.js
 * 
 * Usage:
 *   node build.js              # Build all providers
 *   node build.js sinewix      # Build only sinewix
 *   node build.js --minify     # Build all with minification
 *   node build.js --watch      # Watch mode
 */

const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const outDir = path.join(__dirname, 'providers');

// Modules provided by the Nuvio app runtime - do not bundle
const EXTERNAL_MODULES = [
    'cheerio-without-node-native',
    'react-native-cheerio',
    'cheerio',
    'crypto-js',
    'axios',
    'path',
    'fs'
];

// Special mapping for outputs that have subpaths
const OUTPUT_MAP = {
    'm3u_list': path.join(outDir, 'M3U', 'ListM3u.js')
};

function getProvidersToBuild() {
    const args = process.argv.slice(2).filter(arg => !arg.startsWith('-'));

    if (args.length > 0) {
        return args;
    }

    if (!fs.existsSync(srcDir)) {
        console.error('❌ src/ directory not found.');
        process.exit(1);
    }

    return fs.readdirSync(srcDir, { withFileTypes: true })
        .filter(d => d.isDirectory() && d.name !== 'shared')
        .map(d => d.name);
}

async function buildProvider(providerName, options = {}) {
    const providerDir = path.join(srcDir, providerName);
    const entryPoint = path.join(providerDir, 'index.js');
    const outFile = OUTPUT_MAP[providerName] || path.join(outDir, `${providerName}.js`);

    if (!fs.existsSync(entryPoint)) {
        console.warn(`⚠️  Skipping ${providerName}: no src/${providerName}/index.js found`);
        return false;
    }

    const outFolder = path.dirname(outFile);
    if (!fs.existsSync(outFolder)) {
        fs.mkdirSync(outFolder, { recursive: true });
    }

    try {
        await esbuild.build({
            entryPoints: [entryPoint],
            bundle: true,
            outfile: outFile,
            format: 'cjs',
            platform: 'neutral',
            target: 'es2016',
            minify: options.minify || false,
            sourcemap: false,
            external: EXTERNAL_MODULES,
            banner: {
                js: `/**\n * Anthology Provider: ${providerName}\n * Built from src/${providerName}/index.js\n * Build Date: ${new Date().toISOString()}\n */`
            },
            footer: {
                js: `\nif (typeof globalThis !== 'undefined' && typeof module !== 'undefined' && module.exports) {\n    if (module.exports.getStreams) globalThis.getStreams = module.exports.getStreams;\n    if (module.exports.getCatalog) globalThis.getCatalog = module.exports.getCatalog;\n    if (module.exports.getMeta) globalThis.getMeta = module.exports.getMeta;\n    if (module.exports.getSubtitles) globalThis.getSubtitles = module.exports.getSubtitles;\n}\n`
            },
            logLevel: 'warning'
        });

        const stats = fs.statSync(outFile);
        const sizeKB = (stats.size / 1024).toFixed(1);
        const minifyIndicator = options.minify ? ' (minified)' : '';
        console.log(`✅ ${providerName} -> ${path.relative(__dirname, outFile)} (${sizeKB} KB)${minifyIndicator}`);
        return true;
    } catch (err) {
        console.error(`❌ Failed to build ${providerName}:`, err.message);
        return false;
    }
}

async function main() {
    const args = process.argv.slice(2);
    const shouldMinify = args.includes('--minify');
    const isWatch = args.includes('--watch');

    const providers = getProvidersToBuild();

    if (providers.length === 0) {
        console.log('No providers found in src/ directory.');
        return;
    }

    const minifyLabel = shouldMinify ? ' (minified)' : '';
    console.log(`\n📦 Building ${providers.length} provider(s)${minifyLabel}...\n`);

    let success = 0;
    let failed = 0;

    for (const provider of providers) {
        const result = await buildProvider(provider, { minify: shouldMinify });
        if (result) success++;
        else failed++;
    }

    console.log(`\n✨ Done! ${success} built, ${failed} failed\n`);

    if (isWatch) {
        console.log('👀 Watching src/ for changes... (Press Ctrl+C to stop)');
        fs.watch(srcDir, { recursive: true }, (eventType, filename) => {
            if (filename && filename.endsWith('.js')) {
                console.log(`🔄 Change detected in ${filename}, rebuilding...`);
                const parts = filename.split(path.sep);
                if (parts[0] === 'shared') {
                    // Rebuild all
                    for (const p of providers) buildProvider(p, { minify: shouldMinify });
                } else if (parts[0]) {
                    buildProvider(parts[0], { minify: shouldMinify });
                }
            }
        });
    }
}

main().catch(err => {
    console.error('Build error:', err);
    process.exit(1);
});
