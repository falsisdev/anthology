/**
 * Common HTTP utilities for Nuvio Providers
 * Handles timeout signals, browser User-Agents, and safe fetches.
 */

var DEFAULT_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function timeoutSignal(ms) {
    if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
        return AbortSignal.timeout(ms);
    }
    var controller = new AbortController();
    setTimeout(function() {
        controller.abort();
    }, ms);
    return controller.signal;
}

function fetchWithTimeout(url, options, ms) {
    ms = ms || 10000;
    options = options || {};
    if (!options.signal) {
        options.signal = timeoutSignal(ms);
    }
    if (!options.headers) {
        options.headers = {};
    }
    if (!options.headers['User-Agent'] && !options.headers['user-agent']) {
        options.headers['User-Agent'] = DEFAULT_UA;
    }
    return fetch(url, options);
}

module.exports = {
    DEFAULT_UA,
    timeoutSignal,
    fetchWithTimeout
};
