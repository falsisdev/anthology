/**
 * String and text normalization utilities for Nuvio Providers
 */

function asciiFold(str) {
    if (!str || typeof str !== 'string') return '';
    return str
        .replace(/[çÇ]/g, 'c')
        .replace(/[ğĞ]/g, 'g')
        .replace(/[ıİ]/g, 'i')
        .replace(/[öÖ]/g, 'o')
        .replace(/[şŞ]/g, 's')
        .replace(/[üÜ]/g, 'u')
        .replace(/[âÂ]/g, 'a')
        .replace(/[îÎ]/g, 'i')
        .replace(/[ûÛ]/g, 'u');
}

function normalizeTurkish(str) {
    if (!str || typeof str !== 'string') return '';
    return asciiFold(str).toLowerCase().trim();
}

function cleanTitle(str) {
    if (!str || typeof str !== 'string') return '';
    return str
        .replace(/s*(d{4})s*$/, '')
        .replace(/s*(izle|hd izle|turkce dublaj|turkce altyazili)s*$/gi, '')
        .trim();
}

module.exports = {
    asciiFold,
    normalizeTurkish,
    cleanTitle
};
