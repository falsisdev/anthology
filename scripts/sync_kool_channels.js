#!/usr/bin/env node

/**
 * Kool.ws Türkiye Canlı TV Senkronizasyon ve Doğrulama Boru Hattı
 *
 * 1. https://kool.ws/live/catalog/live/channels.json?filter[group]=Turkey üzerinden tüm kanalları çeker.
 * 2. Her varyantı canlı /live/resolve -> .m3u8 -> ilk MPEG-TS/fMP4 chunk ile test eder (--use-cache ile önbellekten okur).
 * 3. Bozuk Türkçe karakterleri ve 4K TR: / (1) / (6) / (7) / FHD / HEVC gürültüsünü temizler.
 * 4. Kanonik anahtar bazında tekilleştirir ve mevcut providers/M3U/Liste/canli.m3u ile birleştirir.
 * 5. Kapak görsellerini (assets/canli/ -> iptv-org Türkçe logoları -> özel üretilmiş PNG kapak) bağlar.
 * 6. Hem anthology/providers/M3U/Liste/canli.m3u hem de anthology-live/engine/{canli.m3u,kool_catalog.json} dosyalarını üretir.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const LIVE_DIR = path.resolve(ROOT_DIR, '..', 'anthology-live');
const CANLI_M3U_PATH = path.join(ROOT_DIR, 'providers', 'M3U', 'Liste', 'canli.m3u');
const LIVE_CANLI_M3U_PATH = path.join(LIVE_DIR, 'engine', 'canli.m3u');
const LIVE_KOOL_CATALOG_PATH = path.join(LIVE_DIR, 'engine', 'kool_catalog.json');
const ASSETS_CANLI_DIR = path.join(ROOT_DIR, 'assets', 'canli');
const ASSETS_RAW_BASE = 'https://raw.githubusercontent.com/falsisdev/anthology/main/assets/canli/';
const ANTHOLOGY_LIVE_BASE = 'https://anthology-live.duckdns.org';
const ANTHOLOGY_LIVE_AUTH = 'username=anthology&password=falsisdevwashere';

const GROUPS = {
    ULUSAL: '🇹🇷 ULUSAL KANALLAR',
    SPOR: '🇹🇷 SPOR KANALLARI',
    HABER: '🇹🇷 HABER KANALLARI',
    SINEMA: '🇹🇷 SİNEMA KANALLARI',
    BELGESEL: '🇹🇷 BELGESEL & ÇOCUK',
    MUZIK: '🇹🇷 MÜZİK & EĞLENCE',
    YEREL: '🇹🇷 YEREL KANALLAR',
    DIGER: '🇹🇷 DİĞER KANALLAR'
};

const GROUP_ORDER = [
    GROUPS.ULUSAL,
    GROUPS.SPOR,
    GROUPS.HABER,
    GROUPS.SINEMA,
    GROUPS.BELGESEL,
    GROUPS.MUZIK,
    GROUPS.YEREL,
    GROUPS.DIGER
];

function cleanAsciiKey(s) {
    return (s || '')
        .toString()
        .replace(/İ/g, 'I').replace(/ı/g, 'i')
        .replace(/Ü/g, 'U').replace(/ü/g, 'u')
        .replace(/Ö/g, 'O').replace(/ö/g, 'o')
        .replace(/Ş/g, 'S').replace(/ş/g, 's')
        .replace(/Ç/g, 'C').replace(/ç/g, 'c')
        .replace(/Ğ/g, 'G').replace(/ğ/g, 'g')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
}

function parseServerPool(rawName) {
    const m = String(rawName || '').match(/\((\d+)\)\s*$/);
    if (m) {
        if (m[1] === '1' || m[1] === '6' || m[1] === '7') return 'kool' + m[1];
    }
    return 'kool1';
}

function scoreQuality(rawName) {
    const q = String(rawName || '').toUpperCase();
    if (/\b8K\b/.test(q)) return 4320;
    if (/\b(4K|UHD|2160P?)\b/.test(q)) return 2160;
    if (/\b(FHD|1080P?)\b/.test(q)) return 1080;
    if (/\b(HD\+|HD|720P?)\b/.test(q)) return 720;
    if (/\bRAW\b/.test(q)) return 900;
    if (/\b(HEVC|H265)\b/.test(q)) return 850;
    if (/\b(SD|480P?|360P?)\b/.test(q)) return 480;
    return 600;
}

function isJunkEntry(item) {
    const n = String(item.name || '').toUpperCase();
    const t = String(item.ids && item.ids.tvg || '').toUpperCase();
    return n.includes('TELEGRAM') || t.includes('TELEGRAM') || n.trim() === '';
}

function normalizeTurkishText(rawName) {
    let s = String(rawName || '').trim();
    // Normalize small caps unicode
    s = s.replace(/ʜᴅ/g, 'HD').replace(/ꜰʜᴅ/g, 'FHD').replace(/ᴜʜᴅ/g, 'UHD');
    // Remove leading 4K TR:, TR:, etc.
    s = s.replace(/^(?:4K\s*TR|UHD\s*TR|FHD\s*TR|HD\s*TR|TR)\s*:\s*/i, '');
    // Remove trailing server pool (1)/(6)/(7) and noise tags
    s = s.replace(/\(\s*(?:1|6|7|TURKEY)\s*\)/gi, ' ');
    s = s.replace(/\[\s*LIVE\s+DURING\s+EVENTS\s+ONLY\s*\]/gi, ' ');
    s = s.replace(/\(\s*(?:MATCH\s*TIME|H265|HEVC|720P|360P|1080P|KUTU|UYDU|ESKISEHIR)\s*\)/gi, m => {
        return /ESKISEHIR/i.test(m) ? ' Eskişehir ' : ' ';
    });
    // Keep "4K" when the channel is specifically TRT 4K
    const isTrt4k = /\bTRT\s*4K\b/i.test(s);
    s = s.replace(/\b(?:4K|UHD|FHD|HD\+|HD|SD|RAW|HEVC|H265|50\s*FPS|FEED|MAC\s*SAATI|MACZAMANI)\b/gi, ' ');
    if (isTrt4k && !/\b4K\b/i.test(s)) s = s + ' 4K';
    s = s.replace(/\s*\+\s*/g, ' Plus ');
    s = s.replace(/\s+/g, ' ').trim();

    // Fix Kool's stripped-Turkish-letter artifacts
    const fixes = [
        [/\bCNN\s*T\s*RK\b/gi, 'CNN Türk'],
        [/\bHABER\s*T\s*RK\b|\bHABERT\s*RK\b/gi, 'Habertürk'],
        [/\bBENG\s*T\s*RK\b/gi, 'Bengü Türk'],
        [/\bDREAM\s*T\s*RK\b/gi, 'Dream Türk'],
        [/\bAFYON\s*T\s*RK\b/gi, 'Afyon Türk'],
        [/\bTRT\s*T\s*RK\b/gi, 'TRT Türk'],
        [/\bTRT\s*M\s*Z\s*K\b/gi, 'TRT Müzik'],
        [/\bTRT\s*OCUK\b/gi, 'TRT Çocuk'],
        [/\bM\s*N\s*KA\s*GO\b|\bMINICA\s*GO\b/gi, 'MinikaGO'],
        [/\bM\s*N\s*KA\s*OCUK\b/gi, 'Minika Çocuk'],
        [/\bS\s*ZC\s*(?:SZC\s*)?TV\b|\bSOZCU\s*SZC\s*TV\b|\bSZC\b/gi, 'Sözcü TV'],
        [/\bSOZCU\s*TV\b/gi, 'Sözcü TV'],
        [/\bLKE\s*TV\b|\bULKE\s*TV\b|\bULKETV\b/gi, 'Ülke TV'],
        [/\bS\s*NEMA\s*TV\s*AKS\s*YON\b/gi, 'Sinema TV Aksiyon'],
        [/\bS\s*NEMA\s*AKS\s*YON\b/gi, 'Sinema Aksiyon'],
        [/\bS\s*NEMA\s*TV\b/gi, 'Sinema TV'],
        [/\bS\s*NEMA\s*A\s*LE\b/gi, 'Sinema Aile'],
        [/\bS\s*NEMA\s*KOMED\b/gi, 'Sinema Komedi'],
        [/\bS\s*NEMA\s*YERL\b/gi, 'Sinema Yerli'],
        [/\bS\s*NEMA\b/gi, 'Sinema'],
        [/\bAKS\s*YON\b/gi, 'Aksiyon'],
        [/\bYE\s*IL\s*AM\b|\bYESILCAM\b/gi, 'Yeşilçam'],
        [/\bT\s*RK\s*E\b/gi, 'Türkçe'],
        [/\bM\s*Z\s*K\b|\bM\s*ZIK\b/gi, 'Müzik'],
        [/\bT\s*RK\b/gi, 'Türk'],
        [/\bANLIURFA\b/gi, 'Şanlıurfa'],
        [/\bKAHRAMANMARA\b/gi, 'Kahramanmaraş'],
        [/\bK\s*MARAS\b/gi, 'Kahramanmaraş'],
        [/\bELAZIG\b/gi, 'Elazığ'],
        [/\bADIYAMAN\b/gi, 'Adıyaman'],
        [/\bDIYARBAKIR\b/gi, 'Diyarbakır'],
        [/\bESKISEHIR\b/gi, 'Eskişehir'],
        [/\bGAZIANTEP\b/gi, 'Gaziantep'],
        [/\bKAYSERI\b/gi, 'Kayseri'],
        [/\bMERSIN\b/gi, 'Mersin'],
        [/\bTUNCELI\b/gi, 'Tunceli'],
        [/\bKOCAELI\b/gi, 'Kocaeli'],
        [/\bZONGULDAK\b/gi, 'Zonguldak'],
        [/\bKIBRIS\b/gi, 'Kıbrıs'],
        [/\bKARADENIZ\b/gi, 'Karadeniz'],
        [/\bMAVI\b/gi, 'Mavi'],
        [/\bKUDUS\b/gi, 'Kudüs'],
        [/\bLALEGUL\b/gi, 'Lalegül'],
        [/\bCOCUK\b/gi, 'Çocuk'],
        [/\bMUZIK\b/gi, 'Müzik'],
        [/\bEGLENCE\b/gi, 'Eğlence'],
        [/\bCIFTCI\b/gi, 'Çiftçi'],
        [/\bSATRANC?\b/gi, 'Satranç'],
        [/\bSATRAN\s*TV\b/gi, 'Satranç TV'],
        [/\bKOY\b/gi, 'Köy'],
        [/\bILKOKUL\b/gi, 'İlkokul'],
        [/\bILKE\b/gi, 'İlke'],
        [/\bUCANKUS\b/gi, 'Uçankuş'],
        [/\bTATLISES\b/gi, 'Tatlıses'],
        [/\bKADIRGA\b/gi, 'Kadırga'],
        [/\bKURDI\b/gi, 'Kurdî'],
        [/\bOZBEGEN\b/gi, 'Özbeğen'],
        [/\bKADIR\s*INANIR\b/gi, 'Kadir İnanır'],
        [/\bYILDIZ\s*TILBE\b/gi, 'Yıldız Tilbe'],
        [/\bZERRIN\s*OZER\b/gi, 'Zerrin Özer'],
        [/\bSELDA\s*BAGCAN\b/gi, 'Selda Bağcan'],
        [/\bTURKCE\b/gi, 'Türkçe'],
        [/\bASK\b/gi, 'Aşk'],
        [/\bAKSIYON\b/gi, 'Aksiyon'],
        [/\bKOMEDI\b|\bCOMEDI\b/gi, 'Komedi'],
        [/\bYERLI\b/gi, 'Yerli'],
        [/\bAILE\b/gi, 'Aile'],
        [/\bBILIMKURGU\b|\bBILM\s*KURGU\b/gi, 'Bilimkurgu'],
        [/\bSINEMAX\b/gi, 'Sinemax'],
        [/\bSINEVIZYON\b/gi, 'Sinevizyon'],
        [/\bSIRINLER\b/gi, 'Şirinler'],
        [/\bKELOGLAN\b/gi, 'Keloğlan'],
        [/\bSEVIMLI\b/gi, 'Sevimli'],
        [/\bSUNGER\b/gi, 'Sünger'],
        [/\bBEIN\s*SPOTS\s*1\b/gi, 'beIN Sports 1'],
        [/\bBEIN\s*1\b/gi, 'beIN Sports 1'],
        [/\bBEIN\s*SPORTS\b/gi, 'beIN Sports'],
        [/\bBEIN\s*MOVIES\b/gi, 'beIN Movies'],
        [/\bBEIN\s*BOX\s*OFFICE\b/gi, 'beIN Box Office'],
        [/\bBEIN\s*SERIES\b/gi, 'beIN Series'],
        [/\bBEIN\s*GURME\b/gi, 'beIN Gurme'],
        [/\bBEIN\s*IZ\b/gi, 'beIN İZ'],
        [/\bS-?SPORTS?\s*(\d+)\b/gi, 'S Sport $1'],
        [/\bS-?SPORT\s*Plus\s*(\d+)\b/gi, 'S Sport Plus $1'],
        [/\bS-?SPORT\s*Plus\b/gi, 'S Sport Plus'],
        [/\bS-?SPORT\b/gi, 'S Sport'],
        [/\bTV\s*8[.,\s]*5\b/gi, 'TV8.5'],
        [/\bTEVE\s*2\b/gi, 'Teve2'],
        [/\bNR\s*1\b|\bNUMBER\s*1\b/gi, 'Number 1'],
        [/\bGLOBAL\s*HABER\b/gi, 'Haber Global'],
        [/\bEKO\s*TURK\b|\bEKOTURK\b/gi, 'Ekotürk'],
        [/\bTURK\s*HABER\b|\bTURKHABER\b/gi, 'Türk Haber'],
        [/\bARTI\s*TV\b/gi, 'Artı TV'],
        [/\bTURK\s*ROCK\b/gi, 'Türk Rock'],
        [/\bORJINAL\b/gi, 'Orijinal'],
        [/\bSL\s*NILOYA\b/gi, 'Niloya TV']
    ];
    for (const [re, rep] of fixes) {
        s = s.replace(re, rep);
    }

    s = s.replace(/\s+/g, ' ').replace(/\s+Plus$/i, '').trim();

    // Title case tokens cleanly using ASCII lowercase (never turning English I into dotless ı)
    const keepUpper = new Set(['TRT', 'ATV', 'TV', 'NTV', 'CNN', 'BBC', 'CBS', 'FX', 'TLC', 'DMAX', 'TGRT', 'KRT', 'DHA', 'HT', 'TBMM', 'EBA', 'FB', 'TJK', 'NBA', 'NHL', 'UFC', 'VIP', 'TVNET', 'TYT', 'A2', 'BRTV', 'ESTV', 'ETV', 'HRT', 'MGC', 'MTV', 'TMB', 'WM', 'GO', 'ID', 'IDX', 'EU', 'FR', '4K']);
    const keepExact = {
        'bein': 'beIN', 'teve2': 'Teve2', 'tv8': 'TV8', 'tv8.5': 'TV8.5', 'tv100': 'TV100',
        'tv4': 'TV4', 'tv5': 'TV5', 'tv1': 'TV1', '360': '360 TV', 'now': 'NOW',
        'fox': 'FOX', 'minikago': 'MinikaGO', 'nick': 'Nick', 'jr': 'Jr.', 'jr.': 'Jr.',
        'cnbc-e': 'CNBC-e', 'dizi': 'Dizi', 'cine': 'Cine', 'plus': 'Plus',
        'turk': 'Türk', 'türk': 'Türk', 'turkiye': 'Türkiye', 'türkiye': 'Türkiye',
        'iz': 'İZ', 'İZ': 'İZ', 'ilk': 'İlk', 'ilke': 'İlke', 'istanbul': 'İstanbul',
        'izmir': 'İzmir', 'inanir': 'İnanır', 'inanır': 'İnanır', 'ile': 'İle',
        'yeni': 'Yeni', 'ferdi': 'Ferdi', 'bilim': 'Bilim', 'bilimkurgu': 'Bilimkurgu',
        'klasik': 'Klasik', 'tarih': 'Tarih', 'diyanet': 'Diyanet', 'rumeli': 'Rumeli',
        'vizyon': 'Vizyon', 'dersim': 'Dersim', 'pisi': 'Pisi', 'niloya': 'Niloya',
        'sirinler': 'Şirinler', 'şirinler': 'Şirinler', 'sifir': 'Sıfır', 'sıfır': 'Sıfır',
        'arti': 'Artı', 'artı': 'Artı', 'turkce': 'Türkçe', 'türkçe': 'Türkçe',
        'ozel': 'Özel', 'özel': 'Özel', 'orjinal': 'Orijinal', 'orijinal': 'Orijinal',
        'muzik': 'Müzik', 'müzik': 'Müzik', 'yildiz': 'Yıldız', 'yıldız': 'Yıldız',
        'satrançç': 'Satranç', 'satranç': 'Satranç'
    };

    const words = s.split(' ').filter(Boolean);
    const formatted = words.map(w => {
        const wl = w.toLowerCase();
        if (keepExact[wl]) return keepExact[wl];
        if (keepUpper.has(w.toUpperCase())) return w.toUpperCase();
        if (/^\d+$/.test(w)) return w;
        const first = w.charAt(0);
        const capFirst = (first === 'i' || first === 'İ') ? 'İ' : first.toUpperCase();
        return capFirst + w.slice(1).toLowerCase();
    });
    let out = formatted.join(' ').trim();
    if (out === '24' || out === '24 TV' || out === '24 TV TV' || out === '24 Haber' || out === '24 TV Haber') out = '24 TV';
    if (out === 'Satrançç TV' || out === 'Satrantv' || out === 'Satran TV') out = 'Satranç TV';
    if (out === '360 TV Plus') out = '360 TV';
    if (out === 'Now TV' || out === 'NOW TV') out = 'NOW';
    if (out === 'Beyaz') out = 'Beyaz TV';
    if (out === 'Star') out = 'Star TV';
    if (out === 'Eurostar') out = 'Euro Star';
    if (out === 'Rehber') out = 'Rehber TV';
    if (out === 'Semerkand') out = 'Semerkand TV';
    if (out === 'Meltem') out = 'Meltem TV';
    if (out === 'Tempo') out = 'Tempo TV';
    if (out === 'Tay') out = 'Tay TV';
    if (out === 'Tmb') out = 'TMB TV';
    if (out === 'Pisi') out = 'Pisi TV';
    if (out === 'Vizyon 58' || out === 'Vizyon 58 TV Sivas') out = 'Vizyon 58 (Sivas)';
    if (out === 'X Nostalji Türkçe Klasik') out = 'Nostalji Türkçe Klasik';
    if (out === 'Da Vinc Kids') out = 'Da Vinci Kids';
    if (out === 'S Sport') out = 'S Sport 1';
    if (out === 'Tivibuspor 1') out = 'Tivibu Spor 1';
    if (out === 'Tivibuspor 2') out = 'Tivibu Spor 2';
    if (out === 'Tivibuspor 3') out = 'Tivibu Spor 3';
    if (out === 'Tivibuspor 4') out = 'Tivibu Spor 4';
    if (out === 'Spor Smart') out = 'Spor Smart 1';
    if (out === 'Smart Spor 1') out = 'Spor Smart 1';
    if (out === 'Spor Smart 2') out = 'Spor Smart 2';
    if (out === 'Idman TV' || out === 'İdman TV') out = 'İdman TV';
    if (out === 'Sifir TV') out = 'Sıfır TV';
    if (out === 'Urfa Natik TV' || out === 'Urfanatik TV') out = 'Urfanatik TV';
    if (out === 'Olay Turk') out = 'Olay Türk';
    if (out === 'Afyon Turk') out = 'Afyon Türk';
    if (out === 'Sat7 Turk') out = 'Sat7 Türk';
    if (out === 'Show Turk') out = 'Show Türk';
    if (out === 'Max Turk') out = 'Max Türk';
    if (out === 'Movie Smart Turk') out = 'Movie Smart Türk';
    if (out === 'Sinevizyon Turk 5') out = 'Sinevizyon Türk 5';
    if (out === 'Sinevizyon Turk 7') out = 'Sinevizyon Türk 7';
    if (out === 'Filmbox') out = 'FilmBox';
    if (out === 'Filmbox Aksiyon') out = 'FilmBox Aksiyon';
    if (out === 'Filmbox Kadir İnanır') out = 'FilmBox Kadir İnanır';
    if (out === 'Moviesmart Fest') out = 'MovieSmart Fest';
    return out;
}

const KEY_ALIASES = {
    '24': 'kanal24',
    '24haber': 'kanal24',
    '24raw': 'kanal24',
    '24tv': 'kanal24',
    'kanal24': 'kanal24',
    '360': 'tv360',
    '360plus': 'tv360',
    'kanal360': 'tv360',
    'kanal360hevc': 'tv360',
    'a2hevc': 'a2',
    'a2tv': 'a2',
    'beyaz': 'beyaztv',
    'bloomberg': 'bloomberght',
    'cnntrk': 'cnnturk',
    'cnntrkhevc': 'cnnturk',
    'cnntrkraw': 'cnnturk',
    'haberturkhevc': 'haberturk',
    'haberturkraw': 'haberturk',
    'habert_rk': 'haberturk',
    'habertrk': 'haberturk',
    'habertrktr': 'haberturk',
    'haberglobal': 'haberglobal',
    'globalhaber': 'haberglobal',
    'ntvhaber': 'ntv',
    'ntvhaberhevc': 'ntv',
    'sozcu': 'sozcutv',
    'sozcuszctv': 'sozcutv',
    'szcszctv': 'sozcutv',
    'szc': 'sozcutv',
    'nowtv': 'now',
    'nowtvraw': 'now',
    'fox': 'now',
    'show': 'showtv',
    'star': 'startv',
    'tv2': 'teve2',
    'teve2': 'teve2',
    'lketv': 'ulketv',
    'ulketv': 'ulketv',
    'htsportv': 'htspor',
    'krttv': 'krt',
    'bein1': 'beinsports1',
    'beinspots1': 'beinsports1',
    'beinsports1feed': 'beinsports1',
    'beinsports1liveduringeventsonly': 'beinsports1',
    'beinsports8kfeed': 'beinsports1',
    'beinsports5matchtime': 'beinsports5',
    'ssport': 'ssport',
    'ssport1': 'ssport',
    'ssports1': 'ssport',
    'ssports2': 'ssport2',
    'ssport1macsaati': 'ssportplus1',
    'ssport2macsaati': 'ssportplus2',
    'ssport3macsaati': 'ssportplus3',
    'ssport4macsaati': 'ssportplus4',
    'ssport5macsaati': 'ssportplus5',
    'ssport9macsaati': 'ssportplus9',
    'ssportplus1maczamani': 'ssportplus1',
    'ssportplus2maczamani': 'ssportplus2',
    'exxenspor1': 'exxensports1',
    'exxensports2liveduringeventsonly': 'exxensports2',
    'exxensports3liveduringeventsonly': 'exxensports3',
    'exxentvspor2': 'exxensports2',
    'exxentvspor3': 'exxensports3',
    'exxentvspor8': 'exxensports8',
    'trtspor2': 'trtsporyildiz',
    'smartspor1': 'smartspor1',
    'sporsmart': 'smartspor1',
    'sporsmart1': 'smartspor1',
    'sporsmart2': 'smartspor2',
    'dmanazerbaycantr': 'idmantv',
    'beiniztv': 'beiniz',
    'minicago': 'minikago',
    'mnkago': 'minikago',
    'mnkaocuk': 'minikacocuk',
    'trtocuk': 'trtcocuk',
    'trtmzk': 'trtmuzik',
    'trttrk': 'trtturk',
    'bengtrk': 'benguturk',
    'dreamtrk': 'dreamturk',
    'natgeo': 'nationalgeographic',
    'natgeowild': 'natgeowild',
    'nationalgeographicwild': 'natgeowild',
    'nickjunior': 'nickjr',
    'disneyjunior': 'disneyjr',
    'nr1': 'number1tv',
    'number1': 'number1tv',
    'nr1turk': 'number1turk',
    'nr1damar': 'number1damar',
    'powerturk': 'powerturktv',
    'power': 'powertv',
    'pepeetv': 'pepetv',
    'pisitv': 'pisitv',
    'pisi': 'pisitv',
    'niloya': 'niloyatv',
    'slniloya': 'niloyatv',
    'meltem': 'meltemtv',
    'on4': 'on4tv',
    'semerkand': 'semerkandtv',
    'semerkandraw': 'semerkandtv',
    'tempo': 'tempotv',
    'tay': 'taytv',
    'tmb': 'tmbtv',
    'rehber': 'rehbertv',
    'trtdiyanet': 'diyanettv',
    'vizyon58tvsivas': 'vizyon58',
    'nbatvid': 'nbatv',
    'ebatvlise': 'trtebalise',
    'ebatvortaokul': 'trtebaortaokul',
    'trtebailkokul': 'trtebailkokul',
    'trtebaortaokul': 'trtebaortaokul',
    'trteba': 'trteba',
    'flashhabertv': 'flashhaber',
    'turkhabertv': 'turkhaber',
    'ekoltv': 'ekoltv',
    'kralpop': 'kralpoptv',
    'sat7trk': 'sat7turk',
    'discoveryidx': 'discoveryid',
    'davincilearning': 'davinci',
    'davinckids': 'davincikids',
    'kibrisgentv': 'kibrisgenctv',
    'anliurfakanalurfa': 'kanalurfa',
    'sanliurfakanalurfa': 'kanalurfa',
    'kahramanmaraksutv': 'aksutvkmaras',
    'kahramanmaraaksutv': 'aksutvkmaras',
    'suntv': 'sunrtv',
    'snema1002': 'sinema1002',
    'snemaale': 'sinemaaile',
    'snemaale2': 'sinemaaile2',
    'snemaaksyon2': 'sinemaaksiyon2',
    'snemakomed': 'sinemakomedi',
    'snematv': 'sinematv',
    'snematv1001': 'sinema1001',
    'snematv2': 'sinematv2',
    'snematvaksyon': 'sinematvaksiyon',
    'snemayerl': 'sinemayerli1',
    'snemayerl2': 'sinemayerli2',
    'globalboxyeilam': 'globalboxyesilcam'
};

function canonicalize(item) {
    const cleanDisplay = normalizeTurkishText(item.name);
    let rawTvg = String(item.ids && item.ids.tvg || '').replace(/\.tr$/i, '');

    // Detect mislabeled beinsportshaber feed
    if (/4K FEED|8K FEED/i.test(item.name || '')) {
        return { key: 'beinsports1', displayName: 'beIN Sports 1' };
    }

    // Strip Kool's leading "Tr" prefix safely before lowercasing (so TrTrtBelgesel -> TrtBelgesel)
    rawTvg = rawTvg.replace(/^Tr(?=[A-Z0-9])/, '');
    let candidate = cleanAsciiKey(rawTvg);
    if (candidate.startsWith('trtrt')) candidate = candidate.slice(2);
    if (candidate === 'trtv4' || candidate === 'trtv85' || candidate === 'trtvnet' || candidate === 'trtv100') {
        candidate = candidate.slice(2);
    }
    candidate = candidate.replace(/(?:hevc|raw|fhd|uhd)$/, '');

    // Also compute from cleanDisplay to catch misnamed ids
    const fromName = cleanAsciiKey(cleanDisplay);
    let key = KEY_ALIASES[candidate] || KEY_ALIASES[fromName] || candidate || fromName;

    // Unify exxensports / tabiispor / smartspor / tivibuspor
    key = key
        .replace(/^tivibuspor(\d)?$/, (_, d) => 'tivibuspor' + (d || ''))
        .replace(/^sporsmart(\d)?$/, (_, d) => 'smartspor' + (d || '1'))
        .replace(/^kralpop(?:tv)?$/, 'kralpoptv');

    if (KEY_ALIASES[key]) key = KEY_ALIASES[key];
    return { key, displayName: cleanDisplay };
}

function classifyGroup(key, name, existingGroup) {
    if (existingGroup) return existingGroup;
    const s = (key + ' ' + name).toLowerCase();

    if (/bein\s*sports|s\s*sport|tivibu\s*spor|smart\s*spor|spor\s*smart|eurosport|exxen.*spor|tabii.*spor|trt\s*spor|a\s*spor|ht\s*spor|fb\s*tv|gs\s*tv|galatasaray|nba\s*tv|tjk\s*tv|tay\s*tv|cbc\s*sport|idman|sifir|sıfır|saran\s*sport|tv8\.?5|automoto/.test(s)) {
        return GROUPS.SPOR;
    }
    if (/24\s*kitchen/.test(s)) {
        return GROUPS.BELGESEL;
    }
    if (/haber|\bcnn\b|\bntv\b|habertürk|haberturk|a\s*haber|halk\s*tv|sözcü|sozcu|tgrt\s*haber|tele\s*1|\bkrt\b|ekotürk|ekoturk|bloomberg|cnbc|flash\s*haber|lider\s*haber|türk\s*haber|turkhaber|tbmm|\bdha\b|a\s*para|ekol\s*tv|\btv\s*100\b|tvnet|ülke|ulke|bengü|bengu|medya\s*haber|trt\s*world|a\s*news|trt\s*haber|\b24\s*tv\b|\b24tv\b|artı\s*tv|arti\s*tv|ulusal\s*kanal/.test(s)) {
        return GROUPS.HABER;
    }
    if (/sinema|sinemax|sinevizyon|cinemaximum|bein\s*movies|bein\s*box|bein\s*series|dizi\s*smart|moviesmart|filmbox|fix\s*cinema|global\s*box|proturk|arena\s*box|dream\s*box|kingbox|real\s*box|\bmax\b|max\s*(?:007|animasyon|orjinal|orijinal|premier|star|turk|türk|vizyon)|yeşilçam|yesilcam|kemal\s*sunal|kadir\s*inan|horror|salon\s*\d|\bfx\b|fox\s*crime|epic\s*drama|eno\s*(?:vizyon|aksiyon|western)|digi\s*max|cine\s*1|nostalji\s*türkçe|animation\s*1/.test(s)) {
        return GROUPS.SINEMA;
    }
    if (/belgesel|national\s*geo|nat\s*geo|discovery|history|viasat|bbc\s*earth|love\s*nature|animal\s*planet|iz\s*tv|\byaban\b|yabantv|çiftçi|ciftci|tarih|animaux|da\s*vinci|çocuk|cocuk|cartoon|nick|disney|minika|boomerang|niloya|pepee|pepe|pisi|şirinler|sirinler|keloğlan|keloglan|sünger\s*bob|sunger|pijama|patron\s*bebek|sevimli\s*dostlar|barbie|tom\s*&?\s*jerry|ege\s*ile\s*gaga|cbeebies|baby\s*tv|english\s*club|eba|satranç|satranc|bein\s*iz|bein\s*gurme|24\s*kitchen|tlc|dmax/.test(s)) {
        return GROUPS.BELGESEL;
    }
    if (/müzik|muzik|kral|power|number\s*1|dream\s*türk|dreamturk|tmb|mtv|show\s*max|redbox|pal\s*station|nostalji\s*türkçe\s*klasik|arabesk|rock|pop|ferdi|sezen|selda|yıldız\s*tilbe|zerrin|tatlıses|tatlises|damar|slow\s*karadeniz/.test(s)) {
        return GROUPS.MUZIK;
    }
    if (/trt\s*1|trt\s*2|trt\s*3|trt\s*4k|trt\s*avaz|trt\s*türk|trt\s*kurd|atv|kanal\s*d|show\s*tv|show\s*türk|show\s*turk|star\s*tv|now|fox|tv8|kanal\s*7|beyaz\s*tv|teve2|a2|360|tv4|euro\s*d|euro\s*star|kanal\s*avrupa|flash\s*tv|tgrt\s*eu/.test(s)) {
        return GROUPS.ULUSAL;
    }
    if (/adıyaman|adiyaman|afyon|aksaray|kahramanmaraş|aksu|altaş|altas|urfa|antalya|bursa|elazığ|elazig|erzurum|eskişehir|eskisehir|kayseri|gaziantep|hatay|hrt|kadırga|kadirga|kanal\s*12|kanal\s*26|kanal\s*3|kanal\s*58|kıbrıs|kibris|kon\s*tv|konya|koza|karadeniz|mersin|olay|pamukkale|rumeli|sivas|vizyon\s*58|ordu|tv\s*52|tunceli|dersim|kocaeli|zonguldak|anadolu|tv\s*den|ton\s*tv|edessa|hunat|bir\s*tv|brtv|vatan\s*tv|vuslat|gurbet|viyana|ada\s*tv|mercan/.test(s)) {
        return GROUPS.YEREL;
    }
    if (/diyanet|dost|kudüs|kudus|lalegül|lalegul|meltem|on\s*4|rehber|sat\s*7|semerkand|ilke|tv\s*1|tv\s*5|tv\s*em|uçankuş|ucankus|wm\s*tv/.test(s)) {
        return GROUPS.DIGER;
    }
    return GROUPS.YEREL;
}

function parseExistingM3U(content) {
    const lines = content.split(/\r?\n/);
    const channels = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line.startsWith('#EXTINF')) continue;
        const attrs = {};
        for (const m of line.matchAll(/([a-z0-9_-]+)="([^"]*)"/gi)) {
            attrs[m[1].toLowerCase()] = m[2];
        }
        const nameMatch = line.match(/",\s*(.+)$/);
        const name = nameMatch ? nameMatch[1].trim() : line.split(',').pop().trim();
        let streamUrl = '';
        for (let j = i + 1; j < lines.length; j++) {
            const u = lines[j].trim();
            if (u.startsWith('http')) { streamUrl = u; break; }
            if (u.startsWith('#EXTINF')) break;
        }
        const rawTvg = (attrs['tvg-id'] || attrs['tvg-name'] || name).replace(/\.tr$/i, '');
        const key = KEY_ALIASES[cleanAsciiKey(rawTvg)] || cleanAsciiKey(rawTvg);
        channels.push({
            key,
            tvgId: attrs['tvg-id'] || (key + '.tr'),
            tvgName: attrs['tvg-name'] || name,
            logo: attrs['tvg-logo'] || '',
            lang: attrs['tvg-lang'] || 'tr',
            group: attrs['group-title'] || GROUPS.ULUSAL,
            backup: attrs['tvg-backup'] || '',
            backup2: attrs['tvg-backup2'] || '',
            src: attrs['tvg-src'] || '',
            displayName: name,
            url: streamUrl
        });
    }
    return channels;
}

async function fetchIptvOrgLogos() {
    try {
        const [chans, logos] = await Promise.all([
            fetch('https://iptv-org.github.io/api/channels.json', { signal: AbortSignal.timeout(15000) }).then(r => r.json()),
            fetch('https://iptv-org.github.io/api/logos.json', { signal: AbortSignal.timeout(15000) }).then(r => r.json())
        ]);
        const byKey = new Map();
        const logoByChanId = new Map();
        for (const l of logos) {
            if (!l.channel || !l.url) continue;
            if (!l.channel.endsWith('.tr')) continue;
            if (!logoByChanId.has(l.channel)) logoByChanId.set(l.channel, l.url);
        }
        for (const [cid, url] of logoByChanId.entries()) {
            const k = cleanAsciiKey(cid.replace(/\.tr$/i, ''));
            if (k) byKey.set(k, url);
        }
        for (const c of chans) {
            if (c.country !== 'TR') continue;
            const url = logoByChanId.get(c.id);
            if (!url) continue;
            const kName = cleanAsciiKey(c.name);
            if (kName && !byKey.has(kName)) byKey.set(kName, url);
            for (const alt of (c.alt_names || [])) {
                const ka = cleanAsciiKey(alt);
                if (ka && !byKey.has(ka)) byKey.set(ka, url);
            }
        }
        return byKey;
    } catch (e) {
        console.warn('iptv-org logo fetch failed:', e.message);
        return new Map();
    }
}

function buildLocalAssetMap() {
    const files = fs.readdirSync(ASSETS_CANLI_DIR);
    const byKey = new Map();
    for (const f of files) {
        if (!/\.(png|jpg|jpeg|webp)$/i.test(f)) continue;
        if (f.startsWith('gen_') || f === 'default_tv.png') continue;
        const base = f.replace(/\.[^.]+$/, '');
        const k = cleanAsciiKey(base);
        // Prefer png over jpg if both exist
        if (!byKey.has(k) || f.endsWith('.png')) {
            byKey.set(k, ASSETS_RAW_BASE + f);
        }
    }
    return byKey;
}

const GROUP_COLORS = {
    [GROUPS.ULUSAL]: ['#1e3a8a', '#2563eb'],
    [GROUPS.SPOR]: ['#065f46', '#10b981'],
    [GROUPS.HABER]: ['#7f1d1d', '#dc2626'],
    [GROUPS.SINEMA]: ['#581c87', '#9333ea'],
    [GROUPS.BELGESEL]: ['#78350f', '#d97706'],
    [GROUPS.MUZIK]: ['#831843', '#db2777'],
    [GROUPS.YEREL]: ['#134e4a', '#0d9488'],
    [GROUPS.DIGER]: ['#1e293b', '#475569']
};

function generateCoverPngs(missingList) {
    if (missingList.length === 0) return;
    const pyScript = `
import sys, json, os
from PIL import Image, ImageDraw, ImageFont

items = json.load(sys.stdin)
W, H = 400, 400
font_paths = [
    "/System/Library/Fonts/Helvetica.ttc",
    "/System/Library/Fonts/SFNSDisplay.ttf",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/Library/Fonts/Arial.ttf"
]
font_path = next((p for p in font_paths if os.path.exists(p)), None)

def load_font(size):
    if font_path:
        try: return ImageFont.truetype(font_path, size)
        except: pass
    return ImageFont.load_default()

f_big = load_font(120)
f_sub = load_font(30)
f_tag = load_font(22)

for item in items:
    out_path = item["path"]
    name = item["name"]
    c1 = item["c1"]
    c2 = item["c2"]
    cat = item["cat"]

    img = Image.new("RGB", (W, H), c1)
    draw = ImageDraw.Draw(img)
    # Vertical subtle gradient
    r1, g1, b1 = int(c1[1:3],16), int(c1[3:5],16), int(c1[5:7],16)
    r2, g2, b2 = int(c2[1:3],16), int(c2[3:5],16), int(c2[5:7],16)
    for y in range(H):
        t = y / (H - 1)
        r = int(r1 + (r2 - r1) * t)
        g = int(g1 + (g2 - g1) * t)
        b = int(b1 + (b2 - b1) * t)
        draw.line([(0, y), (W, y)], fill=(r, g, b))

    # Inner rounded card border
    draw.rounded_rectangle([18, 18, W-18, H-18], radius=32, outline=(255, 255, 255, 90), width=3)

    # Monogram initials
    words = [w for w in name.replace("TV", "").split() if w]
    if not words:
        words = name.split()
    if len(words) >= 2:
        initials = (words[0][0] + words[1][0]).upper()
    elif words:
        initials = words[0][:2].upper()
    else:
        initials = "TV"

    bbox = draw.textbbox((0, 0), initials, font=f_big)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(((W - tw) / 2, 105 - th / 4), initials, fill=(255, 255, 255), font=f_big)

    # Channel title (up to 2 lines)
    title = name[:26]
    tb = draw.textbbox((0, 0), title, font=f_sub)
    if tb[2] - tb[0] > W - 56:
        title = name[:18] + "…"
        tb = draw.textbbox((0, 0), title, font=f_sub)
    draw.text(((W - (tb[2] - tb[0])) / 2, 275), title, fill=(248, 250, 252), font=f_sub)

    # Category pill
    cb = draw.textbbox((0, 0), cat, font=f_tag)
    cw = cb[2] - cb[0]
    px = (W - cw) / 2 - 14
    draw.rounded_rectangle([px, 326, px + cw + 28, 362], radius=14, fill=(15, 23, 42))
    draw.text(((W - cw) / 2, 331), cat, fill=(226, 232, 240), font=f_tag)

    img.save(out_path, "PNG", optimize=True)
print(f"Generated {len(items)} PNG covers")
`;
    execFileSync('python3', ['-c', pyScript], {
        input: JSON.stringify(missingList),
        stdio: ['pipe', 'inherit', 'inherit']
    });
}

async function main() {
    const args = process.argv.slice(2);
    const cacheArgIdx = args.indexOf('--use-cache');
    let probedItems = null;

    if (cacheArgIdx !== -1 && args[cacheArgIdx + 1]) {
        const cachePath = path.resolve(args[cacheArgIdx + 1]);
        probedItems = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
        console.log(`📂 Loaded ${probedItems.length} probed items from ${cachePath}`);
    } else {
        console.log('🌐 Fetching Turkey catalog from kool.ws...');
        let all = [], cursor = null;
        for (let p = 0; p < 15; p++) {
            let u = 'https://kool.ws/live/catalog/live/channels.json?region=TR&language=tr&sort=trending&filter%5Bgroup%5D=Turkey';
            if (cursor != null) u += '&cursor=' + encodeURIComponent(cursor);
            const d = await fetch(u, { signal: AbortSignal.timeout(10000) }).then(r => r.json());
            all.push(...(d.items || []));
            if (!d.nextCursor || !d.items || d.items.length === 0) break;
            cursor = d.nextCursor;
        }
        console.log(`Fetched ${all.length} items. Probing playability...`);
        // Live probe with concurrency 6
        probedItems = new Array(all.length);
        let ptr = 0;
        async function worker() {
            while (true) {
                const i = ptr++;
                if (i >= all.length) break;
                const item = all[i];
                try {
                    const r1 = await fetch('https://kool.ws/live/resolve?region=TR&language=tr&url=' + encodeURIComponent(item.url), { signal: AbortSignal.timeout(8000) });
                    const j1 = r1.ok ? await r1.json() : null;
                    const sUrl = j1 && j1.url;
                    if (!sUrl) { probedItems[i] = { ...item, alive: false }; continue; }
                    const r2 = await fetch(sUrl, { headers: j1.headers || {}, signal: AbortSignal.timeout(8000) });
                    const mtxt = r2.ok ? await r2.text() : '';
                    if (!mtxt.includes('#EXTM3U')) { probedItems[i] = { ...item, alive: false }; continue; }
                    const lines = mtxt.split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#'));
                    let segUrl = lines[0] ? new URL(lines[0], sUrl).toString() : '';
                    if (segUrl.includes('.m3u8')) {
                        const r3 = await fetch(segUrl, { headers: j1.headers || {}, signal: AbortSignal.timeout(8000) });
                        const stxt = r3.ok ? await r3.text() : '';
                        const sl = stxt.split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#'));
                        segUrl = sl[0] ? new URL(sl[0], segUrl).toString() : '';
                    }
                    const ctrl = new AbortController();
                    const tm = setTimeout(() => ctrl.abort(), 8000);
                    const r4 = await fetch(segUrl, { headers: { ...(j1.headers || {}), Range: 'bytes=0-2047' }, signal: ctrl.signal });
                    const reader = r4.body && r4.body.getReader ? r4.body.getReader() : null;
                    let okChunk = false;
                    if (r4.ok || r4.status === 206) {
                        if (reader) {
                            const { value } = await reader.read();
                            if (value && value.length > 0 && (value[0] === 0x47 || Buffer.from(value).slice(4, 8).toString('ascii') === 'ftyp')) okChunk = true;
                            try { await reader.cancel(); } catch {}
                        }
                    }
                    clearTimeout(tm);
                    probedItems[i] = { ...item, alive: okChunk };
                } catch {
                    probedItems[i] = { ...item, alive: false };
                }
            }
        }
        await Promise.all(Array.from({ length: 6 }, worker));
    }

    const aliveKool = probedItems.filter(x => x.alive && !isJunkEntry(x));
    console.log(`✅ Alive non-junk Kool entries: ${aliveKool.length}`);

    // Group alive Kool items by canonical key
    const koolMap = new Map();
    for (const item of aliveKool) {
        const { key, displayName } = canonicalize(item);
        if (!key) continue;
        const pool = parseServerPool(item.name);
        const quality = scoreQuality(item.name);
        if (!koolMap.has(key)) {
            koolMap.set(key, {
                key,
                displayName,
                tvgId: key + '.tr',
                variants: []
            });
        }
        const entry = koolMap.get(key);
        // Prefer cleaner shorter non-typo displayName
        if (displayName.length > 1 && displayName.length < entry.displayName.length + 6 && !/^[A-Z0-9\s]+$/.test(displayName)) {
            entry.displayName = displayName;
        }
        entry.variants.push({
            koolId: String(item.id),
            rawName: item.name,
            playUrl: item.url,
            pool,
            quality
        });
    }

    // Sort variants per channel by quality desc
    for (const entry of koolMap.values()) {
        entry.variants.sort((a, b) => b.quality - a.quality);
    }
    console.log(`🧩 Unique canonical Kool channels: ${koolMap.size}`);

    // Load existing canli.m3u
    const existingChannels = parseExistingM3U(fs.readFileSync(CANLI_M3U_PATH, 'utf8'));
    const existingByKey = new Map();
    for (const ch of existingChannels) {
        existingByKey.set(ch.key, ch);
    }

    // Load asset & iptv-org logo maps
    const localAssets = buildLocalAssetMap();
    const iptvLogos = await fetchIptvOrgLogos();
    console.log(`🖼️ Local assets: ${localAssets.size} | iptv-org TR logos: ${iptvLogos.size}`);

    // Verify iptv-org logo URLs we plan to use (only for new channels missing local asset)
    async function resolveLogo(key, displayName, group) {
        const kClean = cleanAsciiKey(key);
        const nClean = cleanAsciiKey(displayName);
        if (localAssets.has(kClean)) return localAssets.get(kClean);
        if (localAssets.has(nClean)) return localAssets.get(nClean);
        // Try prefix match for numbered channels (e.g. beinsports1 -> beinsports, sinemaaksiyon2 -> sinemaaksiyon)
        const baseNoNum = kClean.replace(/\d+$/, '');
        if (baseNoNum.length >= 4 && localAssets.has(baseNoNum)) return localAssets.get(baseNoNum);

        const candUrl = iptvLogos.get(kClean) || iptvLogos.get(nClean);
        if (candUrl) {
            try {
                const r = await fetch(candUrl, { method: 'HEAD', signal: AbortSignal.timeout(4000) });
                if (r.ok) return candUrl;
            } catch {}
        }
        return null;
    }

    // Merge existing non-proxy channels + new Kool channels (idempotent across re-runs)
    const mergedByKey = new Map();
    for (const ch of existingChannels) {
        const isKoolManaged = ch.url && ch.url.startsWith(ANTHOLOGY_LIVE_BASE + '/live/') && !ch.backup && !ch.src;
        if (isKoolManaged && !koolMap.has(ch.key)) continue;
        if (!isKoolManaged) {
            mergedByKey.set(ch.key, {
                ...ch,
                isExisting: true
            });
        }
    }

    const candidatesToResolve = [];
    for (const [key, kEntry] of koolMap.entries()) {
        if (mergedByKey.has(key)) continue;
        const group = classifyGroup(key, kEntry.displayName, null);
        candidatesToResolve.push({ key, kEntry, group });
    }

    const newChannels = new Array(candidatesToResolve.length);
    let rPtr = 0;
    async function logoWorker() {
        while (true) {
            const idx = rPtr++;
            if (idx >= candidatesToResolve.length) break;
            const { key, kEntry, group } = candidatesToResolve[idx];
            const existingLogo = await resolveLogo(key, kEntry.displayName, group);
            newChannels[idx] = {
                key,
                tvgId: key + '.tr',
                tvgName: kEntry.displayName,
                displayName: kEntry.displayName,
                group,
                lang: 'tr',
                logo: existingLogo || '',
                url: `${ANTHOLOGY_LIVE_BASE}/live/${key}.m3u8?${ANTHOLOGY_LIVE_AUTH}`,
                backup: '',
                backup2: '',
                src: '',
                isExisting: false
            };
        }
    }
    await Promise.all(Array.from({ length: 12 }, logoWorker));

    // Generate PNG covers for any channel with missing logo
    const missingCovers = [];
    for (const ch of newChannels) {
        if (!ch.logo) {
            const fname = `gen_${ch.key}.png`;
            const outPath = path.join(ASSETS_CANLI_DIR, fname);
            const [c1, c2] = GROUP_COLORS[ch.group] || ['#1e293b', '#475569'];
            const shortCat = ch.group.replace(/^🇹🇷\s*/, '').replace(' KANALLARI', '').replace(' & ÇOCUK', '').replace(' & EĞLENCE', '');
            missingCovers.push({
                path: outPath,
                name: ch.displayName,
                c1,
                c2,
                cat: shortCat
            });
            ch.logo = ASSETS_RAW_BASE + fname;
        }
    }
    if (missingCovers.length > 0) {
        console.log(`🎨 Generating ${missingCovers.length} PNG covers in assets/canli/...`);
        generateCoverPngs(missingCovers);
    }

    for (const ch of newChannels) {
        mergedByKey.set(ch.key, ch);
    }

    // Organize channels cleanly by GROUP_ORDER (preserving existing order inside each group, then alphabetical for new ones)
    const grouped = new Map(GROUP_ORDER.map(g => [g, []]));
    for (const ch of mergedByKey.values()) {
        const g = grouped.has(ch.group) ? ch.group : GROUPS.DIGER;
        grouped.get(g).push(ch);
    }
    for (const [g, list] of grouped.entries()) {
        const existing = list.filter(x => x.isExisting);
        const added = list.filter(x => !x.isExisting).sort((a, b) => a.displayName.localeCompare(b.displayName, 'tr'));
        grouped.set(g, [...existing, ...added]);
    }

    // Write clean formatted M3U
    const m3uLines = ['#EXTM3U', ''];
    for (const g of GROUP_ORDER) {
        const list = grouped.get(g);
        if (!list || list.length === 0) continue;
        const headerTitle = g.replace(/^🇹🇷\s*/, '');
        m3uLines.push('# ==============================================================================');
        m3uLines.push(`# ${headerTitle} (${list.length})`);
        m3uLines.push('# ==============================================================================');
        for (const ch of list) {
            let ext = `#EXTINF:-1 tvg-id="${ch.tvgId}" tvg-name="${ch.tvgName.replace(/"/g, '')}" tvg-logo="${ch.logo}" tvg-lang="${ch.lang || 'tr'}"`;
            if (ch.backup) ext += ` tvg-backup="${ch.backup}"`;
            if (ch.backup2) ext += ` tvg-backup2="${ch.backup2}"`;
            if (ch.src) ext += ` tvg-src="${ch.src}"`;
            ext += ` group-title="${g}",${ch.displayName}`;
            m3uLines.push(ext);
            m3uLines.push(ch.url);
            m3uLines.push('');
        }
    }
    const finalM3U = m3uLines.join('\n');
    fs.writeFileSync(CANLI_M3U_PATH, finalM3U, 'utf8');
    fs.writeFileSync(LIVE_CANLI_M3U_PATH, finalM3U, 'utf8');

    // Write kool_catalog.json for anthology-live Go embedded/runtime lookup
    const koolCatalogOut = {
        generated_at: new Date().toISOString(),
        total_variants: aliveKool.length,
        channels: Array.from(koolMap.values()).map(e => ({
            key: e.key,
            name: e.displayName,
            tvg_id: e.tvgId,
            variants: e.variants
        }))
    };
    fs.writeFileSync(LIVE_KOOL_CATALOG_PATH, JSON.stringify(koolCatalogOut, null, 2), 'utf8');

    console.log('\n📊 SUMMARY:');
    console.log(`- Existing channels preserved: ${existingChannels.length}`);
    console.log(`- New verified Turkish channels added: ${newChannels.length}`);
    console.log(`- Total channels in canli.m3u: ${mergedByKey.size}`);
    for (const g of GROUP_ORDER) {
        console.log(`  • ${g}: ${grouped.get(g).length}`);
    }
    console.log(`- Kool catalog variants saved to: ${LIVE_KOOL_CATALOG_PATH}`);
}

main().catch(err => {
    console.error('FATAL:', err);
    process.exit(1);
});
