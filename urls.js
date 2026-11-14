/**
 * Anthology Sağlayıcı URL Havuzu Giriş Noktası
 * Merkezi config.json üzerinden tüm aktif alan adlarını dışa aktarır.
 */
const config = require('./config.json');

module.exports = config.urls || {};
