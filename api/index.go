package handler

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/falsisdev/anthology/pkg/catalog"
	"github.com/falsisdev/anthology/pkg/engine"
	"github.com/falsisdev/anthology/pkg/models"
	"github.com/falsisdev/anthology/pkg/provider"
	"github.com/falsisdev/anthology/pkg/providers/m3u"
	"github.com/falsisdev/anthology/pkg/proxy"
	"github.com/falsisdev/anthology/pkg/tmdb"
	"github.com/falsisdev/anthology/pkg/utils"
)

//go:embed favicon.ico
var faviconIco []byte

//go:embed favicon.png
var faviconPng []byte

var (
	eng         *engine.Engine
	m3uInstance *m3u.Provider
)

func init() {
	m3uInstance = m3u.New()
	eng = engine.New("", 8*time.Second) // increased for proxy latency
}

func jsonResponse(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func handleManifest(w http.ResponseWriter, r *http.Request) {
	// Only render HTML landing page if explicitly requested from root path and NOT asking for json
	isExplicitManifestJSON := strings.HasSuffix(r.URL.Path, "manifest.json") || strings.HasSuffix(r.URL.Path, "/manifest")
	if !isExplicitManifestJSON && strings.Contains(r.Header.Get("Accept"), "text/html") && (r.URL.Path == "/" || r.URL.Path == "" || r.URL.Path == "/api" || r.URL.Path == "/api/index.go") {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		scheme := "https"
		if r.TLS == nil && !strings.HasPrefix(r.Header.Get("X-Forwarded-Proto"), "https") {
			scheme = "http"
		}
		host := r.Host
		manifestURL := fmt.Sprintf("%s://%s/manifest.json", scheme, host)
		stremioURL := fmt.Sprintf("stremio://%s/manifest.json", host)

		html := fmt.Sprintf(`<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Anthology - Stremio & Nuvio Addon</title>
  <link rel="icon" type="image/png" href="/favicon.png">
  <link rel="shortcut icon" href="/favicon.ico">
  <style>
    :root {
      --bg: #090a0d;
      --card-bg: rgba(22, 26, 34, 0.85);
      --border: rgba(255, 255, 255, 0.08);
      --border-hover: rgba(255, 255, 255, 0.15);
      --accent: #00e676;
      --accent-glow: rgba(0, 230, 118, 0.25);
      --text: #f0f3f6;
      --text-muted: #8b949e;
      --logo-bg: rgba(255, 255, 255, 0.06);
      --logo-border: rgba(255, 255, 255, 0.12);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: radial-gradient(circle at 50%% 20%%, #171d29 0%%, #090a0d 80%%);
      color: var(--text);
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 32px 20px;
    }
    .card {
      background: var(--card-bg);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid var(--border);
      border-radius: 28px;
      max-width: 520px;
      width: 100%%;
      padding: 56px 44px;
      text-align: center;
      box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.03);
      position: relative;
      overflow: hidden;
    }
    .logo-container {
      position: relative;
      width: 136px;
      height: 136px;
      margin: 0 auto 28px auto;
      border-radius: 30px;
      background: var(--logo-bg);
      border: 1px solid var(--logo-border);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1);
    }
    .logo-glow {
      position: absolute;
      width: 100px;
      height: 100px;
      border-radius: 50%%;
      background: radial-gradient(circle, rgba(90, 120, 255, 0.35) 0%%, rgba(0, 230, 118, 0.15) 60%%, transparent 100%%);
      filter: blur(16px);
      z-index: 1;
    }
    .logo {
      width: 108px;
      height: 108px;
      object-fit: contain;
      position: relative;
      z-index: 2;
      filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.5)) drop-shadow(0 0 20px rgba(90, 140, 255, 0.4));
    }
    h1 {
      font-size: 30px;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin-bottom: 12px;
      background: linear-gradient(135deg, #ffffff 30%%, #a5b4fc 100%%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .tagline {
      color: var(--text-muted);
      font-size: 15px;
      line-height: 1.6;
      margin-bottom: 36px;
      padding: 0 8px;
    }
    .actions {
      display: flex;
      flex-direction: column;
      gap: 14px;
      margin-bottom: 36px;
    }
    .btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      font-weight: 600;
      font-size: 15px;
      padding: 16px 24px;
      border-radius: 14px;
      text-decoration: none;
      border: none;
      cursor: pointer;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      width: 100%%;
    }
    .btn-primary {
      background: var(--accent);
      color: #05140b;
      box-shadow: 0 4px 18px var(--accent-glow);
    }
    .btn-primary:hover {
      background: #00ff84;
      transform: translateY(-2px);
      box-shadow: 0 8px 26px var(--accent-glow);
    }
    .btn-primary:active {
      transform: translateY(0);
    }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border);
      color: var(--text);
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.09);
      border-color: var(--border-hover);
      transform: translateY(-2px);
    }
    .btn-secondary:active {
      transform: translateY(0);
    }
    .features {
      text-align: left;
      font-size: 13.5px;
      color: var(--text-muted);
      border-top: 1px solid var(--border);
      padding-top: 28px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .features li {
      list-style: none;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .toast {
      position: fixed;
      bottom: 24px;
      left: 50%%;
      transform: translateX(-50%%) translateY(100px);
      background: #1e293b;
      color: #f8fafc;
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 12px 24px;
      border-radius: 999px;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
      opacity: 0;
      pointer-events: none;
      z-index: 100;
    }
    .toast.show {
      transform: translateX(-50%%) translateY(0);
      opacity: 1;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo-container">
      <div class="logo-glow"></div>
      <img src="https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_2_transparent.png" alt="Anthology Logo" class="logo">
    </div>
    <h1>Anthology</h1>
    <p class="tagline">Golang tabanlı yüksek performanslı Türkçe dizi, film, anime ve Canlı IPTV yayın motoru.</p>
    
    <div class="actions">
      <button onclick="installStremio()" class="btn btn-primary">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3l14 9-14 9V3z"/></svg>
        Stremio'ya Yükle
      </button>
      <button onclick="copyManifest()" class="btn btn-secondary">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        Manifest Linkini Kopyala (Nuvio / Stremio)
      </button>
    </div>

    <div class="features">
      <li>⚡ 30+ Yerli & Yabancı Dizi/Film/Anime Kaynağı</li>
      <li>📺 35+ Canlı TV Kanalı (Ulusal, Haber, Spor)</li>
      <li>🛡️ Kesintisiz Dahili HLS Proxy ve CORS Çözücü</li>
    </div>
  </div>

  <div id="toast" class="toast">Link kopyalandı!</div>

  <script>
    const manifestURL = "%s";
    const stremioDeepLink = "%s";
    const webStremioURL = "https://web.stremio.com/#/addons?addon=" + encodeURIComponent(manifestURL);

    function showToast(msg) {
      const t = document.getElementById("toast");
      t.textContent = msg;
      t.classList.add("show");
      setTimeout(() => t.classList.remove("show"), 2800);
    }

    function installStremio() {
      // 1. Try protocol handler
      window.location.href = stremioDeepLink;
      
      // 2. If protocol handler fails / doesn't open Stremio after 1.2s, offer Stremio Web
      setTimeout(() => {
        if (!document.hidden) {
          const openWeb = confirm("Stremio uygulaması açılmadıysa, Stremio Web üzerinde açmak ister misiniz?\\n\\nTamam: Stremio Web'de Aç\\nİptal: Linki Panoya Kopyala");
          if (openWeb) {
            window.open(webStremioURL, "_blank");
          } else {
            copyManifest();
          }
        }
      }, 1200);
    }

    function copyManifest() {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(manifestURL).then(() => {
          showToast("📋 Manifest kopyalandı! Nuvio veya Stremio'ya yapıştırın.");
        }).catch(() => fallbackCopy());
      } else {
        fallbackCopy();
      }
    }

    function fallbackCopy() {
      const ta = document.createElement("textarea");
      ta.value = manifestURL;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      showToast("📋 Manifest kopyalandı! Nuvio veya Stremio'ya yapıştırın.");
    }
  </script>
</body>
</html>`, manifestURL, stremioURL)
		w.Write([]byte(html))
	}

	manifest := map[string]interface{}{
		"id":          "anthology.falsisdev.addon",
		"name":        "Anthology",
		"version":     "1.1.0",
		"description": "Golang tabanlı yüksek performanslı Türkçe dizi, film, anime ve Canlı IPTV yayın motoru.",
		"logo":        "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_2_transparent.png",
		"icon":        "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_2_transparent.png",
		"background":  "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_2_transparent.png",
		"author":      "falsisdev",
		"resources":   []string{"catalog", "stream", "meta"},
		"types":       []string{"movie", "series", "tv", "live", "channel", "anime"},
		"idPrefixes":  []string{"tt", "tmdb:", "kitsu:", "animecix:", "canli:", "ddizi:", "dizimom:", "diziyou:", "diziwatch:", "hdfc:", "sinewix:"},
		"catalogs": []map[string]interface{}{
			{
				"type": "series",
				"id":   "anthology_ddizi",
				"name": "Anthology - Ddizi",
				"extra": []map[string]interface{}{
					{"name": "search", "isRequired": false},
				},
			},
			{
				"type": "series",
				"id":   "anthology_dizimom",
				"name": "Anthology - Dizimom",
				"extra": []map[string]interface{}{
					{"name": "search", "isRequired": false},
				},
			},
			{
				"type": "series",
				"id":   "anthology_diziyou",
				"name": "Anthology - DiziYou",
				"extra": []map[string]interface{}{
					{"name": "search", "isRequired": false},
				},
			},
			{
				"type": "series",
				"id":   "anthology_diziwatch",
				"name": "Anthology - Diziwatch (Anime & Dizi)",
				"extra": []map[string]interface{}{
					{"name": "search", "isRequired": false},
				},
			},
			{
				"type": "series",
				"id":   "anthology_sinewix_series",
				"name": "Anthology - SineWix Dizi",
				"extra": []map[string]interface{}{
					{"name": "search", "isRequired": false},
				},
			},
			{
				"type": "movie",
				"id":   "anthology_sinewix_movies",
				"name": "Anthology - SineWix Film",
				"extra": []map[string]interface{}{
					{"name": "search", "isRequired": false},
				},
			},
			{
				"type": "movie",
				"id":   "anthology_hdfc",
				"name": "Anthology - HDFilmCehennemi",
				"extra": []map[string]interface{}{
					{"name": "search", "isRequired": false},
				},
			},
			{
				"type": "tv",
				"id":   "falsis_canli_tv",
				"name": "Canlı TV (Ulusal & Haber & Sinema)",
				"extra": []map[string]interface{}{
					{"name": "genre", "isRequired": false},
				},
			},
			{
				"type": "live",
				"id":   "falsis_canli_tv",
				"name": "Canlı TV (Ulusal & Haber & Sinema)",
				"extra": []map[string]interface{}{
					{"name": "genre", "isRequired": false},
				},
			},
		},
		"behaviorHints": map[string]interface{}{
			"configurable":          false,
			"configurationRequired": false,
		},
		"repository": "https://github.com/falsisdev/anthology",
	}
	jsonResponse(w, http.StatusOK, manifest)
}

// Stremio / Nuvio Catalog handler
func handleCatalog(w http.ResponseWriter, r *http.Request, pathParts []string) {
	// pathParts: ["catalog", type, id.json] or ["catalog", type, id, extra.json]
	if len(pathParts) < 3 {
		jsonResponse(w, http.StatusOK, map[string]interface{}{"metas": []interface{}{}})
		return
	}

	catalogType := pathParts[1]
	rawCatalogID := strings.TrimSuffix(pathParts[2], ".json")

	searchQuery := r.URL.Query().Get("search")
	if len(pathParts) >= 4 {
		extraPart := strings.TrimSuffix(pathParts[3], ".json")
		if strings.HasPrefix(extraPart, "search=") {
			searchQuery = strings.TrimPrefix(extraPart, "search=")
		}
	} else if strings.Contains(rawCatalogID, "search=") {
		subParts := strings.Split(rawCatalogID, "&")
		rawCatalogID = subParts[0]
		for _, sp := range subParts[1:] {
			if strings.HasPrefix(sp, "search=") {
				searchQuery = strings.TrimPrefix(sp, "search=")
			}
		}
	}

	if unescaped, err := url.QueryUnescape(searchQuery); err == nil {
		searchQuery = unescaped
	}

	if rawCatalogID == "falsis_canli_tv" || catalogType == "tv" || catalogType == "live" {
		channels, err := m3uInstance.GetLiveChannels(r.Context())
		if err != nil {
			jsonResponse(w, http.StatusOK, map[string]interface{}{"metas": []interface{}{}})
			return
		}

		type metaItem struct {
			ID          string   `json:"id"`
			Type        string   `json:"type"`
			Name        string   `json:"name"`
			Poster      string   `json:"poster,omitempty"`
			Background  string   `json:"background,omitempty"`
			Logo        string   `json:"logo,omitempty"`
			Description string   `json:"description,omitempty"`
			Genres      []string `json:"genres,omitempty"`
		}

		defaultLogo := "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_3_transparent.png"
		var metas []metaItem
		for _, ch := range channels {
			mediaType := "tv"
			if len(pathParts) >= 2 && pathParts[1] == "live" {
				mediaType = "live"
			}
			name := ch.Name
			if name == "" {
				name = ch.ID
			}
			logo := ch.Logo
			if logo == "" {
				logo = defaultLogo
			}
			metas = append(metas, metaItem{
				ID:          "canli:" + ch.ID,
				Type:        mediaType,
				Name:        name,
				Poster:      logo,
				Background:  logo,
				Logo:        logo,
				Description: name + " Canlı Yayın",
				Genres:      []string{ch.Group, "Canlı TV"},
			})
		}

		jsonResponse(w, http.StatusOK, map[string]interface{}{
			"metas": metas,
		})
		return
	}

	// Custom Provider Catalogs (Ddizi, Dizimom, DiziYou, HDFilmCehennemi)
	items, err := catalog.Search(r.Context(), rawCatalogID, searchQuery)
	if err != nil || items == nil {
		jsonResponse(w, http.StatusOK, map[string]interface{}{"metas": []interface{}{}})
		return
	}

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"metas": items,
	})
}

// Stremio / Nuvio Meta handler
func handleMeta(w http.ResponseWriter, r *http.Request, pathParts []string) {
	// pathParts: ["meta", type, id.json]
	if len(pathParts) < 3 {
		jsonResponse(w, http.StatusOK, map[string]interface{}{"meta": nil})
		return
	}

	mediaType := pathParts[1]
	rawID := strings.TrimSuffix(pathParts[2], ".json")

	// 1. Custom Catalogs (Ddizi, Dizimom, DiziYou, Diziwatch, HDFC, SineWix)
	if strings.HasPrefix(rawID, "ddizi:") || strings.HasPrefix(rawID, "dizimom:") || strings.HasPrefix(rawID, "diziyou:") || strings.HasPrefix(rawID, "diziwatch:") || strings.HasPrefix(rawID, "hdfc:") || strings.HasPrefix(rawID, "sinewix:") {
		meta, err := catalog.GetMeta(r.Context(), mediaType, rawID)
		if err != nil || meta == nil {
			jsonResponse(w, http.StatusOK, map[string]interface{}{"meta": nil})
			return
		}
		jsonResponse(w, http.StatusOK, map[string]interface{}{
			"meta": meta,
		})
		return
	}

	// 2. Live channel
	if strings.HasPrefix(rawID, "canli:") {
		cleanID := strings.TrimPrefix(rawID, "canli:")
		ch, err := m3uInstance.GetChannelByID(r.Context(), cleanID)
		if err != nil {
			jsonResponse(w, http.StatusOK, map[string]interface{}{"meta": nil})
			return
		}

		logo := ch.Logo
		if logo == "" {
			logo = "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/logo_3_transparent.png"
		}
		name := ch.Name
		if name == "" {
			name = ch.ID
		}

		meta := map[string]interface{}{
			"id":          "canli:" + ch.ID,
			"type":        pathParts[1],
			"name":        name,
			"poster":      logo,
			"background":  logo,
			"logo":        logo,
			"description": name + " Canlı HD Yayın",
		}

		jsonResponse(w, http.StatusOK, map[string]interface{}{
			"meta": meta,
		})
		return
	}

	jsonResponse(w, http.StatusOK, map[string]interface{}{"meta": nil})
}

// Stremio / Nuvio Stream handler
func handleStream(w http.ResponseWriter, r *http.Request, pathParts []string) {
	// pathParts: ["stream", type, id.json]
	if len(pathParts) < 3 {
		jsonResponse(w, http.StatusOK, map[string]interface{}{"streams": []interface{}{}})
		return
	}

	mediaTypeStr := pathParts[1]
	rawID := strings.TrimSuffix(pathParts[2], ".json")

	// Check if this is a live stream request
	if strings.HasPrefix(rawID, "canli:") || mediaTypeStr == "live" || mediaTypeStr == "channel" {
		cleanID := strings.TrimPrefix(rawID, "canli:")
		ch, err := m3uInstance.GetLiveStreamByID(r.Context(), cleanID)
		if err != nil {
			jsonResponse(w, http.StatusOK, map[string]interface{}{"streams": []interface{}{}})
			return
		}

		type stremioStream struct {
			Name  string `json:"name"`
			Title string `json:"title"`
			URL   string `json:"url"`
		}

		jsonResponse(w, http.StatusOK, map[string]interface{}{
			"streams": []stremioStream{
				{
					Name:  "Canlı TV",
					Title: "⌜ MoOnCrOwN Canlı ⌟ | " + ch.Name,
					URL:   ch.URL,
				},
			},
		})
		return
	}

	scheme := "https"
	if r.TLS == nil && !strings.HasPrefix(r.Header.Get("X-Forwarded-Proto"), "https") && (strings.HasPrefix(r.Host, "localhost") || strings.HasPrefix(r.Host, "127.0.0.1")) {
		scheme = "http"
	}
	proxyBase := fmt.Sprintf("%s://%s/api/proxy", scheme, r.Host)

	type stremioStream struct {
		Name          string                 `json:"name"`
		Title         string                 `json:"title"`
		URL           string                 `json:"url,omitempty"`
		YTID          string                 `json:"ytId,omitempty"`
		BehaviorHints map[string]interface{} `json:"behaviorHints,omitempty"`
	}

	// Custom Provider Stream (ddizi:, dizimom:, diziyou:, diziwatch:, hdfc:, sinewix:)
	if strings.HasPrefix(rawID, "ddizi:") || strings.HasPrefix(rawID, "dizimom:") || strings.HasPrefix(rawID, "diziyou:") || strings.HasPrefix(rawID, "diziwatch:") || strings.HasPrefix(rawID, "hdfc:") || strings.HasPrefix(rawID, "sinewix:") {
		customStreams, err := catalog.GetStream(r.Context(), rawID)
		if err != nil || len(customStreams) == 0 {
			jsonResponse(w, http.StatusOK, map[string]interface{}{"streams": []interface{}{}})
			return
		}

		var sStreams []stremioStream
		for _, s := range customStreams {
			finalURL := s.URL
			if s.YTID == "" && (len(s.Headers) > 0 || strings.Contains(s.URL, "videoplay.vip") || strings.Contains(s.URL, "hdplayersystem") || strings.Contains(s.URL, "streambox") || strings.Contains(s.URL, "diziyou.one") || strings.Contains(s.URL, "sibnet.ru")) {
				finalURL = proxy.FormatProxyURL(proxyBase, s.URL, s.Headers)
			}

			providerName := s.Provider
			if providerName == "" {
				providerName = "Anthology"
			}

			sStreams = append(sStreams, stremioStream{
				Name:  strings.ToUpper(providerName),
				Title: s.Title,
				URL:   finalURL,
				YTID:  s.YTID,
				BehaviorHints: map[string]interface{}{
					"notWebReady": false,
				},
			})
		}

		jsonResponse(w, http.StatusOK, map[string]interface{}{
			"streams": sStreams,
		})
		return
	}

	// Movie or TV Series stream parsing
	// Examples: tt0137523, 550, tmdb:550, tt0903747:1:1, 1396:1:1, tmdb:1396:1:1
	idParts := strings.Split(rawID, ":")
	tmdbID := idParts[0]
	if (strings.HasPrefix(rawID, "tmdb:") || strings.HasPrefix(rawID, "kitsu:") || strings.HasPrefix(rawID, "animecix:")) && len(idParts) > 1 {
		tmdbID = idParts[0] + ":" + idParts[1]
		if len(idParts) >= 4 {
			// tmdb:1396:1:1
			idParts = []string{tmdbID, idParts[2], idParts[3]}
		}
	}

	mediaType := models.MediaTypeMovie
	if mediaTypeStr == "series" || mediaTypeStr == "tv" || mediaTypeStr == "anime" || len(idParts) >= 3 {
		mediaType = models.MediaTypeTV
	}

	season := 1
	episode := 1
	if len(idParts) >= 3 {
		if s, err := strconv.Atoi(idParts[len(idParts)-2]); err == nil {
			season = s
		}
		if e, err := strconv.Atoi(idParts[len(idParts)-1]); err == nil {
			episode = e
		}
	}

	result, err := eng.Search(r.Context(), tmdbID, mediaType, season, episode, "")
	if err != nil || result == nil {
		jsonResponse(w, http.StatusOK, map[string]interface{}{"streams": []interface{}{}})
		return
	}

	var stremioStreams []stremioStream
	for _, s := range result.Streams {
		finalURL := s.URL
		if s.YTID == "" && (len(s.Headers) > 0 || strings.Contains(s.URL, "videoplay.vip") || strings.Contains(s.URL, "hdplayersystem") || strings.Contains(s.URL, "streambox") || strings.Contains(s.URL, "diziyou.one") || strings.Contains(s.URL, "sibnet.ru")) {
			finalURL = proxy.FormatProxyURL(proxyBase, s.URL, s.Headers)
		}

		providerName := s.Provider
		if providerName == "" {
			providerName = "Anthology"
		}

		stremioStreams = append(stremioStreams, stremioStream{
			Name:  strings.ToUpper(providerName),
			Title: s.Title,
			URL:   finalURL,
			YTID:  s.YTID,
			BehaviorHints: map[string]interface{}{
				"notWebReady": false,
			},
		})
	}

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"streams": stremioStreams,
	})
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"status":  "ok",
		"version": "1.1.1",
		"engine":  "golang-vercel-serverless",
		"time":    time.Now().Format(time.RFC3339),
	})
}

func handleDebug(w http.ResponseWriter, r *http.Request) {
	// Show proxy config and do a live test fetch through the proxy
	proxyURL := utils.ProxyBaseURL()
	testURL := "https://sezonlukdizi.cc/fatma/1-sezon-1-bolum.html"
	testStatus := 0
	testErr := ""
	
	var headersMap map[string][]string
	var bodyPreview string

	ctx := r.Context()
	
	// Check TMDB response
	tmdbClient := tmdb.NewClient("")
	mediaInfo, tmdbErr := tmdbClient.GetMediaInfo(ctx, "123138", models.MediaTypeTV, 1, 1)

	// DEBUG: Do the POST request via the PROXY
	testURL = "https://sezonlukdizi.cc/ajax/dataAlternatif22.asp"
	postData := "bid=44946&dil=1"
	
	altHeaders := map[string]string{
		"Content-Type":     "application/x-www-form-urlencoded",
		"Referer":          "https://sezonlukdizi.cc/fatma/1-sezon-1-bolum.html",
		"X-Requested-With": "XMLHttpRequest",
	}
	
	resp, err := utils.DefaultClient.Request(ctx, http.MethodPost, testURL, strings.NewReader(postData), altHeaders)
	if err != nil {
		testErr = err.Error()
	} else {
		testStatus = resp.StatusCode
		headersMap = resp.Header
		
		bodyBytes, _ := io.ReadAll(resp.Body)
		if len(bodyBytes) > 500 {
			bodyPreview = string(bodyBytes[:500])
		} else {
			bodyPreview = string(bodyBytes)
		}
		
		resp.Body.Close()
	}

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"proxy_url":         proxyURL,
		"proxy_active":      proxyURL != "",
		"env_PROXY_URL":     os.Getenv("PROXY_URL"),
		"test_url":          testURL,
		"test_status":       testStatus,
		"test_headers":      headersMap,
		"test_body":         bodyPreview,
		"test_error":        testErr,
		"tmdb_media":        mediaInfo,
		"tmdb_error":        fmt.Sprintf("%v", tmdbErr),
		"engine_timeout":    "8s",
	})
}

func handleProviders(w http.ResponseWriter, r *http.Request) {
	providers := provider.All()
	type pInfo struct {
		ID    string             `json:"id"`
		Name  string             `json:"name"`
		Types []models.MediaType `json:"types"`
	}
	var list []pInfo
	for _, p := range providers {
		list = append(list, pInfo{
			ID:    p.ID(),
			Name:  p.Name(),
			Types: p.SupportedTypes(),
		})
	}
	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"count":     len(list),
		"providers": list,
	})
}

// Handler is the universal entry point for Vercel Serverless Functions.
func Handler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	reqPath := r.URL.Path

	// If r.URL.Path was rewritten by Vercel to /api/index.go or /api, fallback to r.RequestURI
	if strings.Contains(reqPath, "index") || reqPath == "/api" || reqPath == "" || reqPath == "/" {
		if r.RequestURI != "" && !strings.Contains(r.RequestURI, "index") {
			uri := r.RequestURI
			if qIdx := strings.Index(uri, "?"); qIdx != -1 {
				uri = uri[:qIdx]
			}
			reqPath = uri
		}
	}

	if matchedPath := r.Header.Get("x-matched-path"); matchedPath != "" && !strings.Contains(matchedPath, "index") {
		reqPath = matchedPath
	}
	if pathQuery := r.URL.Query().Get("path"); pathQuery != "" {
		reqPath = "/" + strings.TrimPrefix(pathQuery, "/")
	}

	cleanPath := strings.TrimPrefix(reqPath, "/api")
	cleanPath = strings.TrimSuffix(cleanPath, ".go")
	cleanPath = strings.TrimSuffix(cleanPath, "/index")

	trimmed := strings.Trim(cleanPath, "/")
	parts := strings.Split(trimmed, "/")

	// Intercept any proxy request immediately (whether with ?url= or /proxy path)
	if r.URL.Query().Get("url") != "" || (len(parts) > 0 && parts[0] == "proxy") {
		proxy.HandleProxy(w, r)
		return
	}

	if len(parts) == 0 || parts[0] == "" || parts[0] == "manifest" || parts[0] == "manifest.json" {
		handleManifest(w, r)
		return
	}

	switch parts[0] {
	case "favicon.ico":
		w.Header().Set("Content-Type", "image/x-icon")
		w.Header().Set("Cache-Control", "public, max-age=86400")
		w.Write(faviconIco)
		return
	case "favicon.png", "logo.png":
		w.Header().Set("Content-Type", "image/png")
		w.Header().Set("Cache-Control", "public, max-age=86400")
		w.Write(faviconPng)
		return
	case "assets":
		if len(parts) > 1 {
			target := "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/" + strings.Join(parts[1:], "/")
			http.Redirect(w, r, target, http.StatusMovedPermanently)
			return
		}
	case "manifest", "manifest.json":
		handleManifest(w, r)
	case "catalog":
		handleCatalog(w, r, parts)
	case "meta":
		handleMeta(w, r, parts)
	case "stream":
		handleStream(w, r, parts)
	case "proxy":
		proxy.HandleProxy(w, r)
	case "health":
		handleHealth(w, r)
	case "debug":
		handleDebug(w, r)
	case "providers":
		handleProviders(w, r)
	default:
		// Fallback for custom /streams or /live endpoints
		if parts[0] == "streams" {
			q := r.URL.Query()
			tmdbID := q.Get("id")
			mType := models.MediaTypeMovie
			if q.Get("type") == "tv" {
				mType = models.MediaTypeTV
			}
			season, _ := strconv.Atoi(q.Get("season"))
			if season <= 0 {
				season = 1
			}
			episode, _ := strconv.Atoi(q.Get("episode"))
			if episode <= 0 {
				episode = 1
			}
			res, err := eng.Search(r.Context(), tmdbID, mType, season, episode, "")
			if err != nil {
				jsonResponse(w, http.StatusOK, map[string]interface{}{"streams": []interface{}{}})
				return
			}
			jsonResponse(w, http.StatusOK, res)
			return
		}
		handleManifest(w, r)
	}
}
