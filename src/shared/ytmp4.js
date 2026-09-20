const { timeoutSignal } = require('./http.js');

/**
 * YouTube Innertube (ANDROID 20.10.38) — doğrudan MP4/HLS çözücü
 * Harici sunucu/proxy gerektirmez; QuickJS/tarayıcı %100 uyumlu.
 */
async function resolveYouTubeMp4(ytId) {
    try {
        var key = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';
        var res = await fetch('https://www.youtube.com/youtubei/v1/player?key=' + key, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'com.google.android.youtube/20.10.38 (Linux; U; Android 11) gzip'
            },
            body: JSON.stringify({
                context: { client: { clientName: 'ANDROID', clientVersion: '20.10.38' } },
                videoId: ytId
            }),
            signal: timeoutSignal(3500)
        });
        if (!res.ok) return null;
        var data = await res.json();
        if (!data.streamingData) return null;
        if (data.streamingData.hlsManifestUrl) {
            return {
                url: data.streamingData.hlsManifestUrl,
                quality: '1080p',
                isHls: true,
                format: 'hls',
                headers: { 'User-Agent': 'com.google.android.youtube/20.10.38 (Linux; U; Android 11) gzip' }
            };
        }
        if (data.streamingData.formats) {
            var formats = data.streamingData.formats.filter(function (f) { return f.url && (f.mimeType || '').indexOf('mp4') !== -1; });
            if (formats.length > 0) {
                return {
                    url: formats[0].url,
                    quality: formats[0].qualityLabel || '360p',
                    isHls: false,
                    format: 'mp4',
                    headers: { 'User-Agent': 'com.google.android.youtube/20.10.38 (Linux; U; Android 11) gzip' }
                };
            }
        }
    } catch (e) {}
    return null;
}

module.exports = { resolveYouTubeMp4 };
if (typeof globalThis !== 'undefined') globalThis.resolveYouTubeMp4 = resolveYouTubeMp4;