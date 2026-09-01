package engine

import (
	"context"
	"sync"
	"time"

	"github.com/falsisdev/nuviotr/pkg/models"
	"github.com/falsisdev/nuviotr/pkg/provider"
	"github.com/falsisdev/nuviotr/pkg/tmdb"

	// Register all providers
	_ "github.com/falsisdev/nuviotr/pkg/providers/acheriya"
	_ "github.com/falsisdev/nuviotr/pkg/providers/animecix"
	_ "github.com/falsisdev/nuviotr/pkg/providers/animexe"
	_ "github.com/falsisdev/nuviotr/pkg/providers/animpow"
	_ "github.com/falsisdev/nuviotr/pkg/providers/asyaanimeleri"
	_ "github.com/falsisdev/nuviotr/pkg/providers/ddizi"
	_ "github.com/falsisdev/nuviotr/pkg/providers/dizibox"
	_ "github.com/falsisdev/nuviotr/pkg/providers/dizigom"
	_ "github.com/falsisdev/nuviotr/pkg/providers/dizimag"
	_ "github.com/falsisdev/nuviotr/pkg/providers/dizimom"
	_ "github.com/falsisdev/nuviotr/pkg/providers/diziwatch"
	_ "github.com/falsisdev/nuviotr/pkg/providers/diziyo"
	_ "github.com/falsisdev/nuviotr/pkg/providers/diziyou"
	_ "github.com/falsisdev/nuviotr/pkg/providers/filmekseni"
	_ "github.com/falsisdev/nuviotr/pkg/providers/filmhane"
	_ "github.com/falsisdev/nuviotr/pkg/providers/filmifullizle"
	_ "github.com/falsisdev/nuviotr/pkg/providers/filmmakinesi"
	_ "github.com/falsisdev/nuviotr/pkg/providers/filmzal"
	_ "github.com/falsisdev/nuviotr/pkg/providers/hdfilmdelisi"
	_ "github.com/falsisdev/nuviotr/pkg/providers/jetfilmizle"
	_ "github.com/falsisdev/nuviotr/pkg/providers/m3u"
	_ "github.com/falsisdev/nuviotr/pkg/providers/setfilmizle"
	_ "github.com/falsisdev/nuviotr/pkg/providers/sezonlukdizi"
	_ "github.com/falsisdev/nuviotr/pkg/providers/sinemacx"
	_ "github.com/falsisdev/nuviotr/pkg/providers/sinezy"
	_ "github.com/falsisdev/nuviotr/pkg/providers/sinewix"
	_ "github.com/falsisdev/nuviotr/pkg/providers/tekfullfilmizle"
	_ "github.com/falsisdev/nuviotr/pkg/providers/tranimeizle"
	_ "github.com/falsisdev/nuviotr/pkg/providers/vidlink"
	_ "github.com/falsisdev/nuviotr/pkg/providers/vidmody"
)

type ProviderStat struct {
	ProviderID string        `json:"provider_id"`
	Name       string        `json:"name"`
	Count      int           `json:"count"`
	Duration   time.Duration `json:"duration_ms"`
	Error      string        `json:"error,omitempty"`
}

type SearchResult struct {
	Media   *models.MediaInfo `json:"media"`
	Streams []models.Stream   `json:"streams"`
	Stats   []ProviderStat    `json:"stats"`
}

type Engine struct {
	tmdbClient      *tmdb.Client
	providerTimeout time.Duration
}

// New creates a new concurrent search engine.
func New(tmdbKey string, providerTimeout time.Duration) *Engine {
	if providerTimeout <= 0 {
		providerTimeout = 4 * time.Second
	}
	return &Engine{
		tmdbClient:      tmdb.NewClient(tmdbKey),
		providerTimeout: providerTimeout,
	}
}

// Search executes concurrent stream extraction across all relevant providers.
func (e *Engine) Search(ctx context.Context, tmdbID string, mediaType models.MediaType, season, episode int, providerFilter string) (*SearchResult, error) {
	var mediaInfo *models.MediaInfo
	var err error

	if mediaType == models.MediaTypeLive {
		mediaInfo = &models.MediaInfo{
			TMDBID: tmdbID,
			Title:  tmdbID,
			Type:   models.MediaTypeLive,
		}
	} else {
		mediaInfo, err = e.tmdbClient.GetMediaInfo(ctx, tmdbID, mediaType, season, episode)
		if err != nil {
			return nil, err
		}
	}

	var targetProviders []provider.Provider
	if providerFilter != "" {
		if p, ok := provider.Get(providerFilter); ok {
			targetProviders = append(targetProviders, p)
		}
	} else {
		targetProviders = provider.GetForType(mediaType)
	}

	var wg sync.WaitGroup
	var mu sync.Mutex

	var allStreams []models.Stream
	var stats []ProviderStat
	seenURLs := make(map[string]bool)

	for _, p := range targetProviders {
		wg.Add(1)
		go func(prov provider.Provider) {
			defer wg.Done()

			start := time.Now()
			provCtx, cancel := context.WithTimeout(ctx, e.providerTimeout)
			defer cancel()

			streams, pErr := prov.GetStreams(provCtx, *mediaInfo)
			duration := time.Since(start)

			mu.Lock()
			defer mu.Unlock()

			stat := ProviderStat{
				ProviderID: prov.ID(),
				Name:       prov.Name(),
				Duration:   duration / time.Millisecond,
			}

			if pErr != nil {
				stat.Error = pErr.Error()
			} else {
				for _, s := range streams {
					if s.URL != "" && !seenURLs[s.URL] {
						seenURLs[s.URL] = true
						allStreams = append(allStreams, s)
						stat.Count++
					}
				}
			}
			stats = append(stats, stat)
		}(p)
	}

	wg.Wait()

	return &SearchResult{
		Media:   mediaInfo,
		Streams: allStreams,
		Stats:   stats,
	}, nil
}
