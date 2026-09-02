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

// Generic probe fixtures: fallback for providers that have no site-specific
// fixture in providerFixtures below.
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

// providerFixtures maps provider IDs to site-specific probe media. Each entry
// lists content that is near-certain to exist on that provider's own site, so
// a failed probe reflects the site's reachability — not an unlucky fixture.
// Candidates are tried in order until one yields streams.
var providerFixtures = map[string][]models.MediaInfo{
	// Türk dizi siteleri — arşivlerinin amiral gemisi içerikleri
	"ddizi":        {probeTV("Arka Sokaklar")},
	"dizibox":      {probeTV("Kuruluş Osman")},
	"dizigom":      {probeTV("Kuruluş Osman")},
	"dizimag":      {probeTV("Kuruluş Osman")},
	"diziyo":       {probeTV("Yalı Çapkını")},
	"sezonlukdizi": {probeTV("Yalı Çapkını")},
	"dizipal":      {probeTV("Yalı Çapkını"), probeTV("Kuruluş Osman")},
	"diziyou":      {probeTV("Kızılcık Şerbeti"), probeTV("Kuruluş Osman")},
	"dizimom": {
		withIDs(probeTV("Breaking Bad"), "1396", "tt0903747"), // yabancı dizi
		probeTV("Kuruluş Osman"),
	},
	"setfilmizle": {
		interstellar(),
		probeTV("Kuruluş Osman"),
	},

	// Anime siteleri
	"animecix":    {withIDs(probeTV("One Piece"), "37854", "tt0388629")},
	"tranimeizle": {probeTV("One Piece"), probeTV("Naruto")},
	"animexe":     {probeTV("Naruto")},
	"animpow":     {probeTV("Naruto")},
	"acheriya":    {probeTV("Naruto")},
	"seicode":     {probeTV("Naruto")},
	"diziwatch":   {probeTV("Naruto"), testSeries}, // GoT daha önce doğrulandı
	// Asya dizileri (Kore)
	"asyaanimeleri": {probeTV("Goblin")},

	// Film siteleri — Interstellar her birinin kataloğunda bulunur
	"filmekseni":      {interstellar()},
	"filmhane":        {interstellar()},
	"filmifullizle":   {interstellar()},
	"filmmakinesi":    {interstellar()},
	"jetfilmizle":     {interstellar()},
	"hdfilmcehennemi": {interstellar()},
	"hdfilmdelisi":    {interstellar()},
	"tekfullfilmizle": {interstellar()},
	"sinezy":          {interstellar()},
	"filmzal":         {interstellar(), withIDs(probeTV("Breaking Bad"), "1396", "tt0903747")},
	"sinemacx":        {interstellar(), testSeries},

	// ID tabanlı motorlar — daha önce canlı doğrulanmış popüler içerikler
	"sinewix": {testMovie, testSeries},
	"vidlink": {testMovie, testSeries},
	"vidmody": {testMovie, testSeries},
	"m3u":     {testMovie, testSeries},
}

// probeTV builds a TV probe without external IDs; the provider's own site
// search resolves the title.
func probeTV(title string) models.MediaInfo {
	return models.MediaInfo{Title: title, Type: models.MediaTypeTV, Season: 1, Episode: 1}
}

// probeMovie builds a movie probe without external IDs.
func probeMovie(title string) models.MediaInfo {
	return models.MediaInfo{Title: title, Type: models.MediaTypeMovie}
}

// interstellar is the shared movie probe for film sites (IDs verified).
func interstellar() models.MediaInfo {
	return withIDs(probeMovie("Interstellar"), "157336", "tt0816692")
}

// withIDs attaches TMDB/IMDb identifiers for ID-based engine providers.
func withIDs(m models.MediaInfo, tmdb, imdb string) models.MediaInfo {
	m.TMDBID, m.IMDbID = tmdb, imdb
	return m
}

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
		var lastErr error
		for _, media := range candidates {
			cctx, cancel := context.WithTimeout(ctx, ProviderTestTimeout)
			streams, err := p.GetStreams(cctx, media)
			cancel()

			if err != nil {
				// Bu fixtür başarısız oldu; sitede kesin olan diğer adayı dene.
				lastErr = err
				continue
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
					LatencyMS: time.Since(start).Milliseconds(),
					Message:   fmt.Sprintf("✓ %d akış bulundu", count),
					Detail:    media.Title + " · " + hostOf(sampleURL),
				}
			}
		}

		latency := time.Since(start).Milliseconds()
		if lastErr != nil {
			return TestResult{
				ID:        p.ID(),
				Name:      p.Name(),
				Kind:      "provider",
				LatencyMS: latency,
				Message:   "✗ Kaynak yanıt vermedi",
				Detail:    truncate(lastErr.Error(), 140),
			}
		}
		return TestResult{
			ID:        p.ID(),
			Name:      p.Name(),
			Kind:      "provider",
			LatencyMS: latency,
			Message:   "✗ Akış bulunamadı",
			Detail:    "Test içeriği: " + candidateList(candidates) + " · kaynak çevrimiçi ama bu içeriklerde akış yok",
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

// candidateMediaFor returns the probe media for p. Providers with a dedicated
// site-specific fixture are probed with content that is near-certain to exist
// on their own site; everything else falls back to generic popular titles.
func candidateMediaFor(p provider.Provider) []models.MediaInfo {
	if fx, ok := providerFixtures[p.ID()]; ok && len(fx) > 0 {
		return fx
	}
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
