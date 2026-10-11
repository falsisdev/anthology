#!/usr/bin/env node

/**
 * Taraftarium24 Canlı Domain & API Otomatik Güncelleme Betiği
 * 
 * Bu betik Taraftarium24 ön yüzünü ve teletv API sunucusunu test eder.
 * Adres veya API değişmişse config.json ve anthology_spor'u otomatik günceller.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const CONFIG_PATH = path.join(ROOT_DIR, 'config.json');

async function checkApi(apiUrl) {
    const ctrl = new AbortController();
    const tm = setTimeout(() => ctrl.abort(), 4000);
    try {
        const res = await fetch(apiUrl + '/load/channels.php', {
            signal: ctrl.signal,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        clearTimeout(tm);
        return res.status === 200;
    } catch (e) {
        clearTimeout(tm);
        return false;
    }
}

async function probeDomain(domainUrl) {
    const ctrl = new AbortController();
    const tm = setTimeout(() => ctrl.abort(), 4000);
    try {
        const res = await fetch(domainUrl, {
            signal: ctrl.signal,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        clearTimeout(tm);
        if (res.status === 200) {
            return await res.text();
        }
        return null;
    } catch (e) {
        clearTimeout(tm);
        return null;
    }
}

async function main() {
    if (!fs.existsSync(CONFIG_PATH)) {
        console.error('config.json not found!');
        process.exit(1);
    }

    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    const tCfg = (config.urls && config.urls.live && config.urls.live.taraftarium) || {
        base: 'https://taraftarium24-245.top/',
        api_base: 'https://teletv15.top',
        base_number: 245
    };

    console.log('Testing current Taraftarium API:', tCfg.api_base);
    const apiAlive = await checkApi(tCfg.api_base);

    if (apiAlive) {
        console.log('✅ Current API is active and healthy:', tCfg.api_base);
        return;
    }

    console.log('⚠️ Current API is unreachable. Probing candidate domains...');
    let baseNum = tCfg.base_number || 245;
    const candidates = [baseNum, baseNum + 1, baseNum - 1, baseNum + 2, baseNum + 3, baseNum + 4];

    let foundHtml = null;
    let foundDomain = null;
    let foundNum = baseNum;

    for (const num of candidates) {
        const url = `https://taraftarium24-${num}.top/`;
        console.log(`Checking ${url}...`);
        const html = await probeDomain(url);
        if (html && html.includes('matches.php')) {
            foundHtml = html;
            foundDomain = url;
            foundNum = num;
            console.log(`🎯 Found working domain: ${url}`);
            break;
        }
    }

    if (!foundHtml) {
        console.warn('❌ Could not auto-detect a new Taraftarium domain.');
        return;
    }

    const apiMatch = foundHtml.match(/https:\/\/teletv\d+\.top/i) || foundHtml.match(/fetch\(['"](https:\/\/[^'"]*teletv[^'"]*top)/i);
    const newApi = apiMatch ? (apiMatch[1] || apiMatch[0]).replace(/\/+$/, '') : tCfg.api_base;

    const numMatch = foundHtml.match(/taraftarium24-(\d+)\.top/i);
    const newNum = numMatch ? parseInt(numMatch[1], 10) : foundNum;

    const changed = (newApi !== tCfg.api_base) || (foundDomain !== tCfg.base) || (newNum !== tCfg.base_number);

    if (changed) {
        console.log(`Updating config.json:`);
        console.log(`  Base: ${tCfg.base} -> ${foundDomain}`);
        console.log(`  API:  ${tCfg.api_base} -> ${newApi}`);
        console.log(`  Num:  ${tCfg.base_number} -> ${newNum}`);

        config.urls.live.taraftarium = {
            base: foundDomain,
            api_base: newApi,
            base_number: newNum
        };

        fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n', 'utf8');

        console.log('Rebuilding anthology_spor provider...');
        try {
            execSync('node build.js anthology_spor', { cwd: ROOT_DIR, stdio: 'inherit' });
        } catch (e) {
            console.error('Failed to rebuild anthology_spor:', e.message);
        }
    } else {
        console.log('No configuration changes needed.');
    }
}

main().catch(err => {
    console.error('Error during auto-update:', err);
    process.exit(1);
});
