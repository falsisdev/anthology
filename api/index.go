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
	"github.com/falsisdev/anthology/pkg/web"
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

func handleStatusFragment(w http.ResponseWriter, r *http.Request) {
	web.ServeStatus(w, r)
}

func handleManifest(w http.ResponseWriter, r *http.Request) {
	// Root path always serves the HTML landing page; manifest endpoints always serve JSON.
	// (Vercel rewrites "/" to this serverless entry file, so we derive the original path.)
	originalPath := r.URL.Path
	if parsed, err := url.Parse(r.RequestURI); err == nil && parsed.Path != "" {
		originalPath = parsed.Path
	}
	isExplicitManifestJSON := strings.HasSuffix(originalPath, "manifest.json") || strings.HasSuffix(originalPath, "/manifest") ||
		strings.HasSuffix(r.URL.Path, "manifest.json") || strings.HasSuffix(r.URL.Path, "/manifest")
	if !isExplicitManifestJSON && web.IsHomePath(originalPath) {
		web.ServeLanding(w, r)
		return
	}

	manifest := map[string]interface{}{
		"id":          "anthology.falsisdev.addon",
		"name":        "Anthology",
		"version":     web.Version,
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
		"version": web.Version,
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
		"proxy_url":      proxyURL,
		"proxy_active":   proxyURL != "",
		"env_PROXY_URL":  os.Getenv("PROXY_URL"),
		"test_url":       testURL,
		"test_status":    testStatus,
		"test_headers":   headersMap,
		"test_body":      bodyPreview,
		"test_error":     testErr,
		"tmdb_media":     mediaInfo,
		"tmdb_error":     fmt.Sprintf("%v", tmdbErr),
		"engine_timeout": "8s",
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

	// Defensive: absolute-form request targets (http://host/path) should be normalized
	// into path-form before routing; Vercel usually sends origin-form, but be safe.
	if !strings.HasPrefix(reqPath, "/") {
		if parsed, err := url.Parse(reqPath); err == nil && parsed.Path != "" {
			reqPath = parsed.Path
		}
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
	case "fragments":
		if len(parts) > 1 && parts[1] == "status" {
			handleStatusFragment(w, r)
			return
		}
		handleManifest(w, r)
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
