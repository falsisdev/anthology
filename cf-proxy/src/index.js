/**
 * Anthology Cloudflare Workers HTTP Proxy
 *
 * Vercel'deki Go backend streaming sitelerine istek yaparken
 * Cloudflare'in IP'sini kullanarak 403 engelini aşar.
 *
 * Kullanım:
 *   GET /?url=<encoded-target-url>
 *   POST /?url=<encoded-target-url>
 *
 * İsteğe özel header'lar x-ph- prefix'i ile iletilir:
 *   x-ph-referer: https://example.com/
 *   x-ph-user-agent: Mozilla/5.0 ...
 */

const ALLOWED_DOMAINS = [
  "sezonlukdizi.cc",
  "dizimom.diy",
  "dizimom.surf",
  "dizibox.live",
  "hdfilmcehennemi.nl",
  "hdfilmcehennemi.com",
  "hdplayersystem.com",
  "filmmakinesi.to",
  "ddizi.im",
  "dizimag.eu",
  "diziyou.one",
  "diziyou.com",
  "diziyo.so",
  "dizigom.biz",
  "dizigom.love",
  "dizi73.life",
  "setfilmizle.ltd",
  "filmhane.shop",
  "filmzal.me",
  "jetfilmizle.now",
  "filmifullizle.mx",
  "filmekseni.vip",
  "tekfullfilmizle6.com",
  "hdfilmdelisi.one",
  "sinezy.info",
  "tranimeizle.io",
  "animexe.com",
  "animpow.com",
  "asyaanimeleri.top",
  "acheriya.com",
  "diziwatch8.com",
  "sinewix.com",
  "ydfvfdizipanel.ru",
  "sinema.gg",
  "animecix.net",
  "dizilla.one",
  "filmmodu.live",
  "yabancidizi.news",
  "yabancidizi.pro",
  "dizifilmizle.to",
  "dizifilmizle.org",
  "dizilife.so",
  "filmizlesene.org",
  "raw.githubusercontent.com",
];

export default {
  async fetch(request, env, ctx) {
    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "*",
        },
      });
    }

    const url = new URL(request.url);

    // Health check
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ status: "ok", proxy: "cloudflare-workers" }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // Get target URL
    const targetUrl = url.searchParams.get("url");
    if (!targetUrl) {
      return new Response(JSON.stringify({ error: "Missing ?url= parameter" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate target domain
    let targetHostname;
    try {
      targetHostname = new URL(targetUrl).hostname;
    } catch {
      return new Response(JSON.stringify({ error: "Invalid target URL" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const isAllowed = ALLOWED_DOMAINS.some(
      (d) => targetHostname === d || targetHostname.endsWith("." + d)
    );

    if (!isAllowed) {
      return new Response(JSON.stringify({ error: "Domain not in allowlist: " + targetHostname }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Build proxy headers from x-ph-* prefixed headers
    const proxyHeaders = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    };

    for (const [k, v] of request.headers.entries()) {
      if (k.startsWith("x-ph-")) {
        const realKey = k.slice(5); // strip "x-ph-" prefix
        proxyHeaders[realKey] = v;
      }
    }

    // Forward Content-Type for POST
    const ct = request.headers.get("content-type");
    if (ct) proxyHeaders["Content-Type"] = ct;

    let reqBody = undefined;
    if (request.method !== "GET" && request.method !== "HEAD") {
      reqBody = await request.arrayBuffer(); // Buffer body to ensure Content-Length is sent instead of chunked encoding
    }

    try {
      const proxyResp = await fetch(targetUrl, {
        method: request.method,
        headers: proxyHeaders,
        body: reqBody,
        redirect: "follow", // Crucial: must handle redirects internally so client doesn't get relative Location headers
      });

      const body = await proxyResp.arrayBuffer();
      
      const responseHeaders = new Headers();
      // Forward all target response headers back to the client
      for (const [k, v] of proxyResp.headers.entries()) {
        responseHeaders.append(k, v);
      }
      // Ensure CORS is open
      responseHeaders.set("Access-Control-Allow-Origin", "*");
      responseHeaders.set("X-Proxy-Status", String(proxyResp.status));

      return new Response(body, {
        status: proxyResp.status,
        headers: responseHeaders,
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: String(err) }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};
