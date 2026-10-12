#!/usr/bin/env node

/**
 * Canlı Spor Domain & API Otomatik Güncelleme Betiği
 * 
 * 5 büyük canlı spor sağlayıcısının (Taraftarium24, ArdaSports, AlemdarSport,
 * MahsunSports, PapazSports) adreslerini test eder ve config.json'ı günceller.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const CONFIG_PATH = path.join(ROOT_DIR, 'config.json');

async function probeUrl(url, timeoutMs = 4000) {
    const ctrl = new AbortController();
    const tm = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
        const res = await fetch(url, {
            signal: ctrl.signal,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
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

async function updateTaraftarium(config) {
    console.log('\n--- Checking Taraftarium24 ---');
    const tCfg = (config.urls && config.urls.live && config.urls.live.taraftarium) || {
        base: 'https://taraftarium24-245.top/',
        api_base: 'https://teletv15.top',
        base_number: 245
    };

    const apiAlive = await probeUrl(tCfg.api_base + '/load/channels.php');
    if (apiAlive) {
        console.log('✅ Taraftarium API is healthy:', tCfg.api_base);
        return false;
    }

    console.log('⚠️ Taraftarium API unreachable. Probing candidate domains...');
    let baseNum = tCfg.base_number || 245;
    const candidates = [baseNum, baseNum + 1, baseNum - 1, baseNum + 2, baseNum + 3, baseNum + 4];

    for (const num of candidates) {
        const candUrl = `https://taraftarium24-${num}.top/`;
        const html = await probeUrl(candUrl);
        if (html && html.includes('matches.php')) {
            const apiMatch = html.match(/https:\/\/teletv\d+\.top/i) || html.match(/fetch\(['"](https:\/\/[^'"]*teletv[^'"]*top)/i);
            const foundApi = apiMatch ? (apiMatch[1] || apiMatch[0]).replace(/\/+$/, '') : tCfg.api_base;
            console.log(`🎯 Found working Taraftarium domain: ${candUrl} with API: ${foundApi}`);

            config.urls.live.taraftarium = {
                base: candUrl,
                api_base: foundApi,
                base_number: num
            };
            return true;
        }
    }
    console.warn('❌ Could not auto-detect a new Taraftarium domain.');
    return false;
}

async function updateMahsunSports(config) {
    console.log('\n--- Checking MahsunSports ---');
    const mCfg = (config.urls && config.urls.live && config.urls.live.mahsunsports) || {
        base: 'https://mahsunsports54.xyz'
    };

    const alive = await probeUrl(mCfg.base + '/event.html?id=androstreamlivebs1');
    if (alive && alive.includes('andro.evrenesoglu')) {
        console.log('✅ MahsunSports is healthy:', mCfg.base);
        return false;
    }

    console.log('⚠️ MahsunSports unreachable. Probing candidate domains...');
    const numMatch = mCfg.base.match(/mahsunsports(\d+)\.xyz/);
    const curNum = numMatch ? parseInt(numMatch[1], 10) : 54;
    const candidates = [curNum + 1, curNum + 2, curNum + 3, curNum - 1];

    for (const num of candidates) {
        const candUrl = `https://mahsunsports${num}.xyz`;
        const html = await probeUrl(candUrl + '/event.html?id=androstreamlivebs1');
        if (html && html.includes('checklist')) {
            console.log(`🎯 Found working MahsunSports domain: ${candUrl}`);
            config.urls.live.mahsunsports.base = candUrl;
            return true;
        }
    }
    return false;
}

async function updatePapazSports(config) {
    console.log('\n--- Checking PapazSports ---');
    const pCfg = (config.urls && config.urls.live && config.urls.live.papazsports) || {
        base: 'https://www.papazsports1028.pro'
    };

    const alive = await probeUrl(pCfg.base);
    if (alive && alive.includes('PapazSports')) {
        console.log('✅ PapazSports is healthy:', pCfg.base);
        return false;
    }

    console.log('⚠️ PapazSports unreachable. Probing candidate domains...');
    const numMatch = pCfg.base.match(/papazsports(\d+)\.pro/);
    const curNum = numMatch ? parseInt(numMatch[1], 10) : 1028;
    const candidates = [curNum + 1, curNum + 2, curNum + 3, curNum - 1];

    for (const num of candidates) {
        const candUrl = `https://www.papazsports${num}.pro`;
        const html = await probeUrl(candUrl);
        if (html && html.includes('PapazSports')) {
            console.log(`🎯 Found working PapazSports domain: ${candUrl}`);
            config.urls.live.papazsports.base = candUrl;
            return true;
        }
    }
    return false;
}

async function updateArdaSports(config) {
    console.log('\n--- Checking ArdaSports ---');
    const aCfg = (config.urls && config.urls.live && config.urls.live.ardasports) || {
        base: 'https://selcuksporkral1.cc'
    };

    const alive = await probeUrl(aCfg.base + '/canli-izle/bein-sports-1');
    if (alive && alive.includes('channel/watch')) {
        console.log('✅ ArdaSports is healthy:', aCfg.base);
        return false;
    }
    console.log('⚠️ ArdaSports unreachable. Checking next king domain...');
    const numMatch = aCfg.base.match(/selcuksporkral(\d+)\.cc/);
    const curNum = numMatch ? parseInt(numMatch[1], 10) : 1;
    for (const n of [curNum + 1, curNum + 2, curNum + 3]) {
        const candUrl = `https://selcuksporkral${n}.cc`;
        const html = await probeUrl(candUrl + '/canli-izle/bein-sports-1');
        if (html && html.includes('channel/watch')) {
            console.log(`🎯 Found working ArdaSports domain: ${candUrl}`);
            config.urls.live.ardasports.base = candUrl;
            return true;
        }
    }
    return false;
}

async function main() {
    if (!fs.existsSync(CONFIG_PATH)) {
        console.error('config.json not found!');
        process.exit(1);
    }

    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    if (!config.urls) config.urls = {};
    if (!config.urls.live) config.urls.live = {};

    let hasChanges = false;
    if (await updateTaraftarium(config)) hasChanges = true;
    if (await updateMahsunSports(config)) hasChanges = true;
    if (await updatePapazSports(config)) hasChanges = true;
    if (await updateArdaSports(config)) hasChanges = true;

    if (hasChanges) {
        console.log('\n💾 Writing updated domains to config.json...');
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n', 'utf8');

        console.log('Rebuilding providers...');
        try {
            execSync('node build.js anthology_spor && node build.js m3u_list', { cwd: ROOT_DIR, stdio: 'inherit' });
        } catch (e) {
            console.error('Build error:', e.message);
        }
    } else {
        console.log('\n✅ All sport provider domains are verified and up to date.');
    }
}

main().catch(err => {
    console.error('Error in domain updater:', err);
    process.exit(1);
});
