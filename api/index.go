package handler

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/falsisdev/nuviotr/pkg/engine"
	"github.com/falsisdev/nuviotr/pkg/models"
	"github.com/falsisdev/nuviotr/pkg/provider"
	"github.com/falsisdev/nuviotr/pkg/providers/m3u"
)

var (
	eng         *engine.Engine
	m3uInstance *m3u.Provider
)

func init() {
	m3uInstance = m3u.New()
	eng = engine.New("", 4*time.Second)
}

func jsonResponse(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"status":  "ok",
		"version": "1.1.0",
		"engine":  "golang-vercel-serverless",
		"time":    time.Now().Format(time.RFC3339),
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

func handleStreams(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	tmdbID := q.Get("id")
	if tmdbID == "" {
		jsonResponse(w, http.StatusBadRequest, map[string]string{
			"error": "query parameter 'id' (TMDB ID) is required",
		})
		return
	}

	mediaTypeStr := strings.ToLower(q.Get("type"))
	mediaType := models.MediaTypeMovie
	if mediaTypeStr == "tv" || mediaTypeStr == "series" {
		mediaType = models.MediaTypeTV
	} else if mediaTypeStr == "live" {
		mediaType = models.MediaTypeLive
	}

	season, _ := strconv.Atoi(q.Get("season"))
	if season <= 0 {
		season = 1
	}

	episode, _ := strconv.Atoi(q.Get("episode"))
	if episode <= 0 {
		episode = 1
	}

	providerFilter := q.Get("provider")

	result, err := eng.Search(r.Context(), tmdbID, mediaType, season, episode, providerFilter)
	if err != nil {
		jsonResponse(w, http.StatusInternalServerError, map[string]string{
			"error": err.Error(),
		})
		return
	}

	jsonResponse(w, http.StatusOK, result)
}

func handleLive(w http.ResponseWriter, r *http.Request) {
	channelID := r.URL.Query().Get("channel")
	if channelID != "" {
		stream, err := m3uInstance.GetLiveStreamByID(r.Context(), channelID)
		if err != nil {
			jsonResponse(w, http.StatusNotFound, map[string]string{
				"error": err.Error(),
			})
			return
		}
		jsonResponse(w, http.StatusOK, stream)
		return
	}

	channels, err := m3uInstance.GetLiveChannels(r.Context())
	if err != nil {
		jsonResponse(w, http.StatusInternalServerError, map[string]string{
			"error": err.Error(),
		})
		return
	}

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"count":    len(channels),
		"channels": channels,
	})
}

func handleManifest(w http.ResponseWriter, r *http.Request) {
	manifest := map[string]interface{}{
		"id":          "nuviotr.falsisdev.addon",
		"name":        "FalsisAddons",
		"version":     "1.1.0",
		"description": "Golang tabanlı yüksek performanslı Türkçe dizi, film, anime ve Canlı IPTV yayın motoru.",
		"author":      "falsisdev",
		"types":       []string{"movie", "tv", "live"},
		"resources":   []string{"stream", "catalog", "meta"},
		"catalogs": []map[string]interface{}{
			{
				"type": "live",
				"id":   "falsis_canli_tv",
				"name": "Canlı TV (Ulusal & Haber & Sinema)",
			},
		},
		"repository": "https://github.com/falsisdev/nuviotr",
	}
	jsonResponse(w, http.StatusOK, manifest)
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

	switch cleanPath {
	case "/manifest":
		handleManifest(w, r)
	case "/health":
		handleHealth(w, r)
	case "/providers":
		handleProviders(w, r)
	case "/streams":
		handleStreams(w, r)
	case "/live":
		handleLive(w, r)
	default:
		if strings.HasPrefix(cleanPath, "/streams") {
			handleStreams(w, r)
		} else if strings.HasPrefix(cleanPath, "/live") {
			handleLive(w, r)
		} else {
			handleManifest(w, r)
		}
	}
}
