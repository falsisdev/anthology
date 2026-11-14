/**
 * Anthology Merkezi Yapılandırma Giriş Noktası
 * package.json `main` alanı tarafından referans alınır.
 */
const config = require('./config.json');

module.exports = {
    version: config.version,
    tmdb_api_key: config.tmdb_api_key,
    urls: config.urls || {},
    defaults: config.defaults || {},
    getUrl: function (dotPath, fallback) {
        if (!dotPath) return fallback;
        var parts = String(dotPath).split('.');
        var cur = config.urls;
        for (var i = 0; i < parts.length; i++) {
            if (cur && Object.prototype.hasOwnProperty.call(cur, parts[i])) {
                cur = cur[parts[i]];
            } else {
                return fallback;
            }
        }
        return cur !== undefined ? cur : fallback;
    }
};
