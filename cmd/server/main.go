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
	"syscall"
	"time"

	"github.com/falsisdev/nuviotr/pkg/engine"
	"github.com/falsisdev/nuviotr/pkg/models"
	"github.com/falsisdev/nuviotr/pkg/provider"
	"github.com/falsisdev/nuviotr/pkg/providers/m3u"
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
		"version": "1.0.0",
		"engine":  "golang",
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

func (s *Server) handleStreams(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	tmdbID := q.Get("id")
	if tmdbID == "" {
		jsonResponse(w, http.StatusBadRequest, map[string]string{
			"error": "query parameter 'id' (TMDB ID) is required",
		})
		return
	}

	mediaTypeStr := q.Get("type")
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

	result, err := s.engine.Search(r.Context(), tmdbID, mediaType, season, episode, providerFilter)
	if err != nil {
		jsonResponse(w, http.StatusInternalServerError, map[string]string{
			"error": err.Error(),
		})
		return
	}

	jsonResponse(w, http.StatusOK, result)
}

func (s *Server) handleLive(w http.ResponseWriter, r *http.Request) {
	channelID := r.URL.Query().Get("channel")
	if channelID != "" {
		stream, err := s.m3uProv.GetLiveStreamByID(r.Context(), channelID)
		if err != nil {
			jsonResponse(w, http.StatusNotFound, map[string]string{
				"error": err.Error(),
			})
			return
		}
		jsonResponse(w, http.StatusOK, stream)
		return
	}

	channels, err := s.m3uProv.GetLiveChannels(r.Context())
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

func (s *Server) handleManifest(w http.ResponseWriter, r *http.Request) {
	manifest := map[string]interface{}{
		"id":          "nuviotr.falsisdev.addon",
		"name":        "FalsisAddons (Go Engine)",
		"version":     "1.0.0",
		"description": "Yüksek performanslı Go motoru ile Türkçe dizi, film ve Canlı IPTV yayınları.",
		"author":      "falsisdev",
		"types":       []string{"movie", "tv", "live"},
		"resources":   []string{"stream", "catalog", "meta"},
		"repository":  "https://github.com/falsisdev/nuviotr",
	}
	jsonResponse(w, http.StatusOK, manifest)
}

func main() {
	port := flag.Int("port", 8080, "HTTP server port")
	tmdbKey := flag.String("tmdb-key", "", "TMDB API key")
	flag.Parse()

	m3uInstance := m3u.New()
	eng := engine.New(*tmdbKey, 8*time.Second)

	srv := &Server{
		engine:     eng,
		m3uProv:    m3uInstance,
		port:       *port,
		tmdbApiKey: *tmdbKey,
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/health", enableCORS(srv.handleHealth))
	mux.HandleFunc("/providers", enableCORS(srv.handleProviders))
	mux.HandleFunc("/streams", enableCORS(srv.handleStreams))
	mux.HandleFunc("/live", enableCORS(srv.handleLive))
	mux.HandleFunc("/manifest", enableCORS(srv.handleManifest))

	httpServer := &http.Server{
		Addr:         fmt.Sprintf(":%d", *port),
		Handler:      mux,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
	}

	go func() {
		log.Printf("🚀 Nuviotr Go Server started on http://localhost:%d\n", *port)
		log.Printf("📡 API Endpoints: /streams, /live, /providers, /manifest, /health\n")
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop

	log.Println("Shutting down server gracefully...")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_ = httpServer.Shutdown(ctx)
	log.Println("Server stopped.")
}
