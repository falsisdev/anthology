package handler

import (
	"encoding/json"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/falsisdev/nuviotr/pkg/engine"
	"github.com/falsisdev/nuviotr/pkg/models"
	"github.com/falsisdev/nuviotr/pkg/provider"
	"github.com/falsisdev/nuviotr/pkg/providers/m3u"
	"github.com/falsisdev/nuviotr/pkg/utils"
)

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
	manifest := map[string]interface{}{
		"id":          "nuviotr.falsisdev.addon",
		"name":        "FalsisAddons",
		"version":     "1.1.0",
		"description": "Golang tabanlı yüksek performanslı Türkçe dizi, film, anime ve Canlı IPTV yayın motoru.",
		"author":      "falsisdev",
		"resources":   []string{"catalog", "stream", "meta"},
		"types":       []string{"movie", "series", "tv", "live", "channel", "anime"},
		"idPrefixes":  []string{"tt", "tmdb:", "kitsu:", "animecix:", "canli:"},
		"catalogs": []map[string]interface{}{
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
		"repository": "https://github.com/falsisdev/nuviotr",
	}
	jsonResponse(w, http.StatusOK, manifest)
}

// Stremio / Nuvio Catalog handler
func handleCatalog(w http.ResponseWriter, r *http.Request, pathParts []string) {
	// pathParts: ["catalog", type, id.json] or ["catalog", type, id, extra.json]
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

	var metas []metaItem
	for _, ch := range channels {
		mediaType := "tv"
		if len(pathParts) >= 2 && pathParts[1] == "live" {
			mediaType = "live"
		}
		metas = append(metas, metaItem{
			ID:          "canli:" + ch.ID,
			Type:        mediaType,
			Name:        ch.Name,
			Poster:      ch.Logo,
			Background:  ch.Logo,
			Logo:        ch.Logo,
			Description: ch.Name + " Canlı Yayın",
			Genres:      []string{ch.Group, "Canlı TV"},
		})
	}

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"metas": metas,
	})
}

// Stremio / Nuvio Meta handler
func handleMeta(w http.ResponseWriter, r *http.Request, pathParts []string) {
	// pathParts: ["meta", type, id.json]
	if len(pathParts) < 3 {
		jsonResponse(w, http.StatusOK, map[string]interface{}{"meta": nil})
		return
	}

	rawID := strings.TrimSuffix(pathParts[2], ".json")
	cleanID := strings.TrimPrefix(rawID, "canli:")

	ch, err := m3uInstance.GetChannelByID(r.Context(), cleanID)
	if err != nil {
		jsonResponse(w, http.StatusOK, map[string]interface{}{"meta": nil})
		return
	}

	meta := map[string]interface{}{
		"id":          "canli:" + ch.ID,
		"type":        pathParts[1],
		"name":        ch.Name,
		"poster":      ch.Logo,
		"background":  ch.Logo,
		"logo":        ch.Logo,
		"description": ch.Name + " Canlı HD Yayın",
	}

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"meta": meta,
	})
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

	type stremioStream struct {
		Name          string                 `json:"name"`
		Title         string                 `json:"title"`
		URL           string                 `json:"url"`
		BehaviorHints map[string]interface{} `json:"behaviorHints,omitempty"`
	}

	var stremioStreams []stremioStream
	for _, s := range result.Streams {
		hints := map[string]interface{}{}
		if len(s.Headers) > 0 {
			hints["notWebReady"] = false
			hints["proxyHeaders"] = map[string]interface{}{
				"request": s.Headers,
			}
		}

		providerName := s.Provider
		if providerName == "" {
			providerName = "Falsis"
		}

		stremioStreams = append(stremioStreams, stremioStream{
			Name:          strings.ToUpper(providerName),
			Title:         s.Title,
			URL:           s.URL,
			BehaviorHints: hints,
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
	testURL := "https://sezonlukdizi.cc/"
	testStatus := 0
	testErr := ""
	
	var headersMap map[string][]string

	ctx := r.Context()
	resp, err := utils.DefaultClient.Request(ctx, http.MethodGet, testURL, nil, map[string]string{
		"Accept": "text/html",
	})
	if err != nil {
		testErr = err.Error()
	} else {
		testStatus = resp.StatusCode
		headersMap = resp.Header
		resp.Body.Close()
	}

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"proxy_url":         proxyURL,
		"proxy_active":      proxyURL != "",
		"env_PROXY_URL":     os.Getenv("PROXY_URL"),
		"test_url":          testURL,
		"test_status":       testStatus,
		"test_headers":      headersMap,
		"test_error":        testErr,
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
	if matchedPath := r.Header.Get("x-matched-path"); matchedPath != "" {
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

	if len(parts) == 0 || parts[0] == "" || parts[0] == "manifest" || parts[0] == "manifest.json" {
		handleManifest(w, r)
		return
	}

	switch parts[0] {
	case "manifest", "manifest.json":
		handleManifest(w, r)
	case "catalog":
		handleCatalog(w, r, parts)
	case "meta":
		handleMeta(w, r, parts)
	case "stream":
		handleStream(w, r, parts)
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
