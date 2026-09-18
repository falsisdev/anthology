/**
 * Anthology EPG (Elektronik Program Rehberi) Motoru
 * Canlı yayın akışı ve o anki program bilgilerini dinamik olarak üretir.
 */

var SAMPLE_SCHEDULES = {
    'trt1': [
        { start: '06:00', end: '09:00', title: 'Sabah Haberleri & Gündem' },
        { start: '09:00', end: '10:30', title: 'Alişan ile Hayata Gülümse' },
        { start: '10:30', end: '13:00', title: 'Yerli Dizi / Sinema Kuşağı' },
        { start: '13:00', end: '14:00', title: 'TRT 1 Gün Ortası Haberleri' },
        { start: '14:00', end: '17:00', title: 'Gönül Dağı / Nostalji Kuşağı' },
        { start: '17:00', end: '19:00', title: 'Ana Haber Öncesi Aktüalite' },
        { start: '19:00', end: '20:00', title: 'TRT 1 Ana Haber' },
        { start: '20:00', end: '23:30', title: 'Teşkilat / Kudüs Fatihi Selahaddin Eyyubi' },
        { start: '23:30', end: '02:00', title: 'Gece Kuşağı / Sinema' }
    ],
    'trtgenc': [
        { start: '08:00', end: '10:00', title: 'Genç Bakış & Teknoloji Trendleri' },
        { start: '10:00', end: '12:00', title: 'Oyun Dünyası & Espor Gündemi' },
        { start: '12:00', end: '14:00', title: 'Gençlik Dizileri Kuşağı' },
        { start: '14:00', end: '16:00', title: 'Bilim, Sanat ve Girişimcilik' },
        { start: '16:00', end: '18:00', title: 'Kampüs Hayatı & Üniversite Sohbetleri' },
        { start: '18:00', end: '20:00', title: 'Müzik & Genç Ritimler' },
        { start: '20:00', end: '22:00', title: 'Gelecek Sensin! Özel Gençlik Programı' },
        { start: '22:00', end: '00:00', title: 'Espor Karşılaşmaları & Konserler' }
    ],
    'atv': [
        { start: '06:30', end: '10:00', title: 'Kahvaltı Haberleri' },
        { start: '10:00', end: '13:00', title: 'Müge Anlı ile Tatlı Sert' },
        { start: '13:00', end: '14:00', title: 'atv Gün Ortası' },
        { start: '14:00', end: '16:00', title: 'Mutfak Bahane' },
        { start: '16:00', end: '19:00', title: 'Esra Erol\'da' },
        { start: '19:00', end: '20:00', title: 'atv Ana Haber' },
        { start: '20:00', end: '23:30', title: 'Kuruluş Osman / Aldatmak' },
        { start: '23:30', end: '02:00', title: 'Gece Kuşağı Dizisi' }
    ],
    'kanald': [
        { start: '07:00', end: '09:00', title: 'Kanal D Sabah Haberleri' },
        { start: '09:00', end: '11:00', title: 'Neler Oluyor Hayatta?' },
        { start: '11:00', end: '13:00', title: 'Gelinim Mutfakta' },
        { start: '13:00', end: '16:00', title: 'Arka Sokaklar Kuşağı' },
        { start: '16:00', end: '19:00', title: 'Bizi Birleştiren Hayat' },
        { start: '19:00', end: '20:00', title: 'Kanal D Ana Haber' },
        { start: '20:00', end: '23:30', title: 'İnci Taneleri / Yargı' },
        { start: '23:30', end: '02:00', title: 'Yabancı Sinema Kuşağı' }
    ],
    'trtspor': [
        { start: '07:00', end: '10:00', title: 'İlk Baskı & Sabah Sporu' },
        { start: '10:00', end: '12:00', title: 'Spor Bülteni & Süper Lig Özetleri' },
        { start: '12:00', end: '14:00', title: 'Günün İçinden & Transfer Gündemi' },
        { start: '14:00', end: '17:00', title: 'Canlı Maç Kuşağı / 1. Lig & Voleybol' },
        { start: '17:00', end: '19:00', title: 'Spor Stüdyosu' },
        { start: '19:00', end: '21:00', title: 'Maç Önü & Özel Röportajlar' },
        { start: '21:00', end: '23:30', title: 'Futbol Aklı / Canlı Maç Yayını' },
        { start: '23:30', end: '01:30', title: 'Teknik Analiz & Gece Sporu' }
    ]
};

function parseTimeToMinutes(t) {
    if (!t) return 0;
    var parts = t.split(':');
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1] || '0', 10);
}

function getNowPlayingInfo(channelKey, channelName) {
    var key = (channelKey || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    var sched = SAMPLE_SCHEDULES[key];
    
    // Fallback: match partial
    if (!sched) {
        for (var k in SAMPLE_SCHEDULES) {
            if (key.indexOf(k) !== -1 || k.indexOf(key) !== -1) {
                sched = SAMPLE_SCHEDULES[k];
                break;
            }
        }
    }

    if (!sched || !sched.length) {
        return {
            current: channelName + ' 7/24 Kesintisiz Canlı Yayın',
            next: 'Yayın Akışı Devam Ediyor',
            timeSlot: 'CANLI',
            formattedText: channelName + ' Canlı HD Yayın.'
        };
    }

    var now = new Date();
    // UTC+3 Istanbul time
    var istanbulHour = (now.getUTCHours() + 3) % 24;
    var istanbulMin = now.getUTCMinutes();
    var currentMin = istanbulHour * 60 + istanbulMin;

    var cur = null;
    var nxt = null;

    for (var i = 0; i < sched.length; i++) {
        var sMin = parseTimeToMinutes(sched[i].start);
        var eMin = parseTimeToMinutes(sched[i].end);
        
        // Handle midnight crossing
        if (eMin < sMin) {
            if (currentMin >= sMin || currentMin < eMin) {
                cur = sched[i];
                nxt = sched[(i + 1) % sched.length];
                break;
            }
        } else if (currentMin >= sMin && currentMin < eMin) {
            cur = sched[i];
            nxt = sched[(i + 1) % sched.length];
            break;
        }
    }

    if (!cur) {
        cur = sched[sched.length - 1];
        nxt = sched[0];
    }

    var timeStr = cur.start + ' - ' + cur.end;
    var formatted = '🔴 YAYINDA: ' + cur.title + ' (' + timeStr + ')' +
                    '\n▶ SIRADAKİ: ' + (nxt ? (nxt.title + ' [' + nxt.start + ']') : 'Program Akışı');

    return {
        current: cur.title,
        next: nxt ? nxt.title : '',
        timeSlot: timeStr,
        formattedText: formatted
    };
}

module.exports = {
    getNowPlayingInfo: getNowPlayingInfo
};
