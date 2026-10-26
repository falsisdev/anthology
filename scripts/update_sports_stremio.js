#!/usr/bin/env node

/**
 * Canlı Spor Kanalları İçin Stremio Statik Akış Güncelleyici
 * 
 * Tüm beIN Sports ve diğer canlı spor kanallarının akışlarını
 * dinamik olarak çözer, anlık canlılık kontrolü (probe) yapar
 * ve stremio/stream/ altındaki tv, channel, series dizinlerini günceller.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const STREMIO_DIR = path.join(ROOT_DIR, 'stremio');
const sporMod = require(path.join(ROOT_DIR, 'providers', 'anthology_spor.js'));

function ensureDirSync(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

function writeJsonSync(filePath, data) {
    ensureDirSync(path.dirname(filePath));
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

async function probeStream(stream, timeoutMs = 3000) {
    try {
        const ctrl = new AbortController();
        const tm = setTimeout(() => ctrl.abort(), timeoutMs);
        const res = await fetch(stream.url, {
            method: 'GET',
            headers: stream.headers || { 'User-Agent': 'Mozilla/5.0' },
            signal: ctrl.signal
        });
        clearTimeout(tm);
        if (res.status === 200 || res.status === 206) {
            return true;
        }
        return false;
    } catch (e) {
        return false;
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

async function main() {
    console.log("⚡ Canlı Spor Stremio Akışları Güncelleniyor...\n");

    const cat = await sporMod.getCatalog();
    const channels = (cat && cat.metas) || [];
    console.log(`Toplam ${channels.length} spor kanalı işlenecek.`);

    for (let i = 0; i < channels.length; i++) {
        const ch = channels[i];
        process.stdout.write(`[${i + 1}/${channels.length}] ${ch.name} (${ch.id})... `);

        try {
            const rawStreams = await sporMod.getStreams({ id: ch.id, type: 'tv' });
            const list = Array.isArray(rawStreams) ? rawStreams : (rawStreams && rawStreams.streams ? rawStreams.streams : []);

            if (list.length === 0) {
                console.log("⚠️ Akış bulunamadı.");
                continue;
            }

            // Anlık canlılık testi
            const aliveStreams = [];
            const otherStreams = [];

            for (const s of list) {
                const isAlive = await probeStream(s, 2500);
                if (isAlive) {
                    aliveStreams.push(s);
                } else {
                    otherStreams.push(s);
                }
            }

            // Canlı akışlar önce, diğerleri arkada
            const finalStreams = aliveStreams.length > 0 
                ? [...aliveStreams, ...otherStreams] 
                : list;

            saveStaticStream(['tv', 'channel', 'series'], ch.id, finalStreams);
            console.log(`✅ ${aliveStreams.length} aktif / ${list.length} toplam akış kaydedildi.`);
        } catch (err) {
            console.log(`❌ Hata: ${err.message}`);
        }
    }

    console.log("\n🎉 Spor kanalları Stremio dosyaları başarıyla güncellendi!");
}

main().catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
});
