// Package tester performs live reachability/availability tests for every
// stream provider and live TV channel. It is used by the web dashboard so
// visitors can verify which sources and broadcasts are currently online.
package tester

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/falsisdev/anthology/pkg/models"
	"github.com/falsisdev/anthology/pkg/provider"
	"github.com/falsisdev/anthology/pkg/providers/m3u"
	"github.com/falsisdev/anthology/pkg/utils"
)

const (
	// ProviderTestTimeout bounds a single provider's stream search.
	ProviderTestTimeout = 4 * time.Second
	// ChannelTestTimeout bounds a single channel connectivity check.
	ChannelTestTimeout = 3 * time.Second
	// WorkerCount limits how many live tests run at the same time.
	WorkerCount = 8
)

// TestResult describes the outcome of a single live test.
type TestResult struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Kind      string `json:"kind"` // "provider" or "channel"
	OK        bool   `json:"ok"`
	LatencyMS int64  `json:"latency_ms"`
	Message   string `json:"message"`
	Detail    string `json:"detail,omitempty"`
}

// Media fixtures used to probe providers. A popular movie for movie-enabled
// providers and a widely mirrored series for TV providers.
var (
	testMovie = models.MediaInfo{
		TMDBID: "27205",
		IMDbID: "tt1375666",
		Title:  "Inception",
		Year:   "2010",
		Type:   models.MediaTypeMovie,
	}
	testSeries = models.MediaInfo{
		TMDBID:  "1399",
		IMDbID:  "tt0944947",
		Title:   "Game of Thrones",
		Year:    "2011",
		Type:    models.MediaTypeTV,
		Season:  1,
		Episode: 1,
	}
)

// TestProviders live-tests every registered provider by running a real stream
// search against a representative title. Results are sorted by provider name.
func TestProviders(ctx context.Context) []TestResult {
	providers := provider.All()
	sort.Slice(providers, func(i, j int) bool {
		return strings.ToLower(providers[i].Name()) < strings.ToLower(providers[j].Name())
	})

	run := func(ctx context.Context, idx int) TestResult {
		p := providers[idx]
		candidates := candidateMediaFor(p)
		if len(candidates) == 0 {
			return TestResult{
				ID:      p.ID(),
				Name:    p.Name(),
				Kind:    "provider",
				Message: "Test edilebilir medya türü yok",
			}
		}

		start := time.Now()
		for ci, media := range candidates {
			cctx, cancel := context.WithTimeout(ctx, ProviderTestTimeout)
			streams, err := p.GetStreams(cctx, media)
			cancel()
			latency := time.Since(start).Milliseconds()

			if err != nil {
				return TestResult{
					ID:        p.ID(),
					Name:      p.Name(),
					Kind:      "provider",
					LatencyMS: latency,
					Message:   "✗ Kaynak yanıt vermedi",
					Detail:    truncate(err.Error(), 140),
				}
			}

			count := 0
			var sampleURL string
			for _, s := range streams {
				if s.URL != "" {
					count++
					if sampleURL == "" {
						sampleURL = s.URL
					}
				}
			}
			if count > 0 {
				return TestResult{
					ID:        p.ID(),
					Name:      p.Name(),
					Kind:      "provider",
					OK:        true,
					LatencyMS: latency,
					Message:   fmt.Sprintf("✓ %d akış bulundu", count),
					Detail:    media.Title + " · " + hostOf(sampleURL),
				}
			}

			// No streams for this fixture; try the next candidate (if any).
			if ci == len(candidates)-1 {
				return TestResult{
					ID:        p.ID(),
					Name:      p.Name(),
					Kind:      "provider",
					LatencyMS: latency,
					Message:   "✗ Akış bulunamadı",
					Detail:    "Test içeriği: " + candidateList(candidates) + " · kaynak çevrimiçi ama bu içeriklerde akış yok",
				}
			}
		}
		return TestResult{
			ID:        p.ID(),
			Name:      p.Name(),
			Kind:      "provider",
			LatencyMS: time.Since(start).Milliseconds(),
			Message:   "✗ Akış bulunamadı",
		}
	}

	return runConcurrent(ctx, run, len(providers))
}

// TestChannels live-tests every channel in the live playlist by performing an
// HTTP range request against its stream URL. Results are sorted by name.
func TestChannels(ctx context.Context) []TestResult {
	m3uProv := m3u.New()
	channels, err := m3uProv.GetLiveChannels(ctx)
	if err != nil {
		return []TestResult{{
			ID:      "m3u",
			Name:    "Canlı TV Listesi",
			Kind:    "channel",
			Message: "✗ Yayın listesi yüklenemedi",
			Detail:  truncate(err.Error(), 140),
		}}
	}

	sort.Slice(channels, func(i, j int) bool {
		return strings.ToLower(channels[i].Name) < strings.ToLower(channels[j].Name)
	})

	run := func(ctx context.Context, idx int) TestResult {
		ch := channels[idx]
		headers := map[string]string{}
		for k, v := range ch.Headers {
			headers[k] = v
		}
		headers["Range"] = "bytes=0-4096"

		start := time.Now()
		cctx, cancel := context.WithTimeout(ctx, ChannelTestTimeout)
		defer cancel()

		resp, err := utils.DefaultClient.Request(cctx, http.MethodGet, ch.URL, nil, headers)
		latency := time.Since(start).Milliseconds()
		if err != nil {
			return TestResult{
				ID:        ch.ID,
				Name:      ch.Name,
				Kind:      "channel",
				LatencyMS: latency,
				Message:   "✗ Yayın erişilemiyor",
				Detail:    truncate(err.Error(), 140),
			}
		}
		defer resp.Body.Close()

		if resp.StatusCode < 200 || resp.StatusCode >= 400 {
			return TestResult{
				ID:        ch.ID,
				Name:      ch.Name,
				Kind:      "channel",
				LatencyMS: latency,
				Message:   fmt.Sprintf("✗ HTTP %d", resp.StatusCode),
				Detail:    hostOf(ch.URL),
			}
		}
		return TestResult{
			ID:        ch.ID,
			Name:      ch.Name,
			Kind:      "channel",
			OK:        true,
			LatencyMS: latency,
			Message:   fmt.Sprintf("✓ HTTP %d · yayın açık", resp.StatusCode),
			Detail:    hostOf(ch.URL),
		}
	}

	return runConcurrent(ctx, run, len(channels))
}

// runConcurrent executes fn over [0,total) with a bounded worker pool.
// If ctx is canceled early, results gathered so far are still returned.
func runConcurrent(ctx context.Context, fn func(context.Context, int) TestResult, total int) []TestResult {
	jobs := make(chan int)
	results := make(chan TestResult, total)
	var wg sync.WaitGroup

	workers := WorkerCount
	if total < workers {
		workers = total
	}

	for i := 0; i < workers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for idx := range jobs {
				select {
				case <-ctx.Done():
					return
				default:
				}
				results <- fn(ctx, idx)
			}
		}()
	}

launchLoop:
	for i := 0; i < total; i++ {
		select {
		case jobs <- i:
		case <-ctx.Done():
			break launchLoop
		}
	}
	close(jobs)

	done := make(chan struct{})
	go func() {
		wg.Wait()
		close(done)
	}()
	<-done
	close(results)

	out := make([]TestResult, 0, total)
	for r := range results {
		out = append(out, r)
	}
	sort.SliceStable(out, func(i, j int) bool {
		return out[i].Name < out[j].Name
	})
	return out
}

func candidateMediaFor(p provider.Provider) []models.MediaInfo {
	var hasMovie, hasTV bool
	for _, t := range p.SupportedTypes() {
		if t == models.MediaTypeMovie {
			hasMovie = true
		}
		if t == models.MediaTypeTV {
			hasTV = true
		}
	}
	var out []models.MediaInfo
	if hasMovie {
		out = append(out, testMovie)
	}
	if hasTV {
		out = append(out, testSeries)
	}
	return out
}

func candidateList(candidates []models.MediaInfo) string {
	names := make([]string, 0, len(candidates))
	for _, c := range candidates {
		names = append(names, c.Title)
	}
	return strings.Join(names, ", ")
}

func hostOf(raw string) string {
	u, err := url.Parse(raw)
	if err != nil {
		return raw
	}
	return u.Host
}

func truncate(s string, n int) string {
	s = strings.TrimSpace(s)
	if len(s) <= n {
		return s
	}
	return s[:n] + "…"
}
