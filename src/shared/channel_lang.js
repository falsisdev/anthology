/**
 * Anthology — Kanal Dil Etiketi Yardımcıları
 *
 * canli.m3u içindeki `tvg-lang="xx"` özniteliğini okur ve kanal açıklamalarına
 * "Canlı [Türkçe]" / "Canlı [İngilizce]" gibi yayın dili etiketi ekler.
 *
 * QuickJS/Nuvio ve tarayıcı ortamı ile %100 uyumludur (Node-only API yoktur).
 */

var CHANNEL_LANG_LABELS = {
    tr: 'Türkçe',
    en: 'İngilizce',
    az: 'Azerbaycan Türkçesi',
    ar: 'Arapça',
    ku: 'Kürtçe',
    de: 'Almanca',
    fr: 'Fransızca',
    ru: 'Rusça',
    es: 'İspanyolca',
    it: 'İtalyanca'
};

var DEFAULT_CHANNEL_LANG = 'tr';

/**
 * EXTINF satırından tvg-lang / tvg-language kodunu çıkarır (ör. "tr").
 * Öznitelik yoksa boş string döner.
 */
function parseTvgLang(extinfLine) {
    var line = extinfLine || '';
    var m = line.match(/tvg-lang="([^"]+)"/i);
    if (!m) m = line.match(/tvg-language="([^"]+)"/i);
    return m ? String(m[1]).trim().toLowerCase() : '';
}

/**
 * Dil kodunu görünen ada çevirir (ör. "az" -> "Azerbaycan Türkçesi").
 * Bilinmeyen/boş kodlarda varsayılan olarak Türkçe döner.
 */
function channelLangLabel(code) {
    var key = (code || '').toString().trim().toLowerCase();
    if (!key) key = DEFAULT_CHANNEL_LANG;
    return CHANNEL_LANG_LABELS[key] || CHANNEL_LANG_LABELS[DEFAULT_CHANNEL_LANG];
}

/**
 * Kanal açıklaması üretir: "<Kanal Adı> Canlı [<Dil>]".
 */
function channelDescription(channelName, langCode) {
    return (channelName || '') + ' Canlı [' + channelLangLabel(langCode) + ']';
}

module.exports = {
    CHANNEL_LANG_LABELS: CHANNEL_LANG_LABELS,
    parseTvgLang: parseTvgLang,
    channelLangLabel: channelLangLabel,
    channelDescription: channelDescription
};
