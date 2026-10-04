const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");

const PORT = process.env.PORT || 3000;

function getLocalIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === "IPv4" && !iface.internal) {
                return iface.address;
            }
        }
    }
    return "localhost";
}

const mimeTypes = {
    ".json": "application/json; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".m3u": "audio/x-mpegurl",
    ".m3u8": "application/vnd.apple.mpegurl",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".txt": "text/plain; charset=utf-8"
};

const server = http.createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "*");

    if (req.method === "OPTIONS") {
        res.writeHead(200);
        res.end();
        return;
    }

    const parsedUrl = new URL(req.url, "http://localhost:" + PORT);
    let pathname = decodeURIComponent(parsedUrl.pathname);
    if (pathname === "/") pathname = "/index.html";

    const filePath = path.join(__dirname, pathname);

    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403, { "Content-Type": "text/plain" });
        res.end("Forbidden");
        return;
    }

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { "Content-Type": "text/plain" });
            res.end("File not found: " + pathname);
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = mimeTypes[ext] || "application/octet-stream";

        res.writeHead(200, {
            "Content-Type": contentType,
            "Content-Length": stats.size,
            "Cache-Control": "no-cache, no-store, must-revalidate"
        });

        if (req.method === "HEAD") {
            res.end();
            return;
        }

        const stream = fs.createReadStream(filePath);
        stream.pipe(res);
    });
});

server.listen(PORT, () => {
    const ip = getLocalIp();
    console.log("============================================================");
    console.log("🚀 Anthology Nuvio Yerel Gelistirici Sunucusu Aktif!");
    console.log("============================================================");
    console.log("📱 Nuvio Manifest URL (Cihaz/TV):  http://" + ip + ":" + PORT + "/manifest.json");
    console.log("💻 Yerel Manifest URL (Tarayici): http://localhost:" + PORT + "/manifest.json");
    console.log("🌐 Web Arayuzu (Landing):        http://localhost:" + PORT + "/");
    console.log("============================================================");
    console.log("💡 Nuvio TV / Mobil test etmek icin:");
    console.log("   Nuvio -> Ayarlar -> Developer -> Plugin Tester");
    console.log("   veya Ayarlar -> Pluginler -> Depo Ekle -> http://" + ip + ":" + PORT + "/manifest.json");
    console.log("============================================================");
    console.log("Durdurmak icin Ctrl+C tuslarina basin.");
});

module.exports = server;