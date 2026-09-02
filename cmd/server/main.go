package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"time"

	"github.com/falsisdev/anthology/pkg/engine"
	"github.com/falsisdev/anthology/pkg/models"
	"github.com/falsisdev/anthology/pkg/provider"
	"github.com/falsisdev/anthology/pkg/providers/m3u"
	"github.com/falsisdev/anthology/pkg/proxy"
)

type Server struct {
	engine     *engine.Engine
	m3uProv    *m3u.Provider
	port       int
	tmdbApiKey string
}

func enableCORS(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		next(w, r)
	}
}

func jsonResponse(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"status":  "ok",
		"version": "1.1.0",
		"engine":  "golang-high-performance",
		"time":    time.Now().Format(time.RFC3339),
	})
}

func (s *Server) handleProviders(w http.ResponseWriter, r *http.Request) {
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

func (s *Server) handleManifest(w http.ResponseWriter, r *http.Request) {
	manifest := map[string]interface{}{
		"id":          "anthology.falsisdev.addon",
		"name":        "Anthology",
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
		"repository": "https://github.com/falsisdev/anthology",
	}
	jsonResponse(w, http.StatusOK, manifest)
}

func (s *Server) handleCatalog(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	channels, err := s.m3uProv.GetLiveChannels(r.Context())
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
		if len(parts) >= 2 && parts[1] == "live" {
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

func (s *Server) handleMeta(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) < 3 {
		jsonResponse(w, http.StatusOK, map[string]interface{}{"meta": nil})
		return
	}

	rawID := strings.TrimSuffix(parts[2], ".json")
	cleanID := strings.TrimPrefix(rawID, "canli:")

	ch, err := s.m3uProv.GetChannelByID(r.Context(), cleanID)
	if err != nil {
		jsonResponse(w, http.StatusOK, map[string]interface{}{"meta": nil})
		return
	}

	meta := map[string]interface{}{
		"id":          "canli:" + ch.ID,
		"type":        parts[1],
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

func (s *Server) handleStream(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) < 3 {
		jsonResponse(w, http.StatusOK, map[string]interface{}{"streams": []interface{}{}})
		return
	}

	mediaTypeStr := parts[1]
	rawID := strings.TrimSuffix(parts[2], ".json")

	if strings.HasPrefix(rawID, "canli:") || mediaTypeStr == "live" || mediaTypeStr == "channel" {
		cleanID := strings.TrimPrefix(rawID, "canli:")
		ch, err := s.m3uProv.GetLiveStreamByID(r.Context(), cleanID)
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

	idParts := strings.Split(rawID, ":")
	tmdbID := idParts[0]
	if (strings.HasPrefix(rawID, "tmdb:") || strings.HasPrefix(rawID, "kitsu:") || strings.HasPrefix(rawID, "animecix:")) && len(idParts) > 1 {
		tmdbID = idParts[0] + ":" + idParts[1]
		if len(idParts) >= 4 {
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
		if sn, err := strconv.Atoi(idParts[len(idParts)-2]); err == nil {
			season = sn
		}
		if ep, err := strconv.Atoi(idParts[len(idParts)-1]); err == nil {
			episode = ep
		}
	}

	result, err := s.engine.Search(r.Context(), tmdbID, mediaType, season, episode, "")
	if err != nil || result == nil {
		jsonResponse(w, http.StatusOK, map[string]interface{}{"streams": []interface{}{}})
		return
	}

	scheme := "https"
	if r.TLS == nil && !strings.HasPrefix(r.Header.Get("X-Forwarded-Proto"), "https") && strings.HasPrefix(r.Host, "localhost") {
		scheme = "http"
	}
	proxyBase := fmt.Sprintf("%s://%s/proxy", scheme, r.Host)

	type stremioStream struct {
		Name          string                 `json:"name"`
		Title         string                 `json:"title"`
		URL           string                 `json:"url"`
		BehaviorHints map[string]interface{} `json:"behaviorHints,omitempty"`
	}

	var stremioStreams []stremioStream
	for _, st := range result.Streams {
		finalURL := st.URL
		if len(st.Headers) > 0 || strings.Contains(st.URL, "videoplay.vip") || strings.Contains(st.URL, "hdplayersystem") || strings.Contains(st.URL, "streambox") || strings.Contains(st.URL, "diziyou.one") || strings.Contains(st.URL, "sibnet.ru") {
			finalURL = proxy.FormatProxyURL(proxyBase, st.URL, st.Headers)
		}

		providerName := st.Provider
		if providerName == "" {
			providerName = "Anthology"
		}

		stremioStreams = append(stremioStreams, stremioStream{
			Name:  strings.ToUpper(providerName),
			Title: st.Title,
			URL:   finalURL,
			BehaviorHints: map[string]interface{}{
				"notWebReady": false,
			},
		})
	}

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"streams": stremioStreams,
	})
}

func main() {
	portFlag := flag.Int("port", 0, "HTTP server port")
	tmdbKey := flag.String("tmdb-key", "", "TMDB API key")
	flag.Parse()

	serverPort := *portFlag
	if serverPort == 0 {
		if envPort := os.Getenv("PORT"); envPort != "" {
			if p, err := strconv.Atoi(envPort); err == nil {
				serverPort = p
			}
		}
		if serverPort == 0 {
			serverPort = 8080
		}
	}

	m3uInstance := m3u.New()
	eng := engine.New(*tmdbKey, 4*time.Second)

	srv := &Server{
		engine:     eng,
		m3uProv:    m3uInstance,
		port:       serverPort,
		tmdbApiKey: *tmdbKey,
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/health", enableCORS(srv.handleHealth))
	mux.HandleFunc("/providers", enableCORS(srv.handleProviders))
	mux.HandleFunc("/manifest", enableCORS(srv.handleManifest))
	mux.HandleFunc("/manifest.json", enableCORS(srv.handleManifest))
	mux.HandleFunc("/catalog/", enableCORS(srv.handleCatalog))
	mux.HandleFunc("/meta/", enableCORS(srv.handleMeta))
	mux.HandleFunc("/stream/", enableCORS(srv.handleStream))
	mux.HandleFunc("/proxy", proxy.HandleProxy)
	mux.HandleFunc("/", enableCORS(srv.handleManifest))

	httpServer := &http.Server{
		Addr:         fmt.Sprintf(":%d", serverPort),
		Handler:      mux,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
	}

	go func() {
		log.Printf("🚀 Anthology Go Server started on http://localhost:%d\n", serverPort)
		log.Printf("📡 Stremio/Nuvio Protocol: /manifest.json, /catalog/..., /stream/..., /meta/...\n")
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("🛑 Shutting down server...")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := httpServer.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}
	log.Println("✅ Server cleanly stopped")
}
