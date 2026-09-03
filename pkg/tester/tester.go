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
	ProviderTestTimeout = 7 * time.Second

	// ChannelTestTimeout bounds a single channel connectivity check.
	ChannelTestTimeout = 4 * time.Second

	// WorkerCount limits how many live tests run at the same time.
	WorkerCount = 16
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

// Her sağlayıcı için spesifik test içerikleri. Sağlayıcının kendi kataloğunda
// bulunacağından emin olunan içerikler. candidateMediaFor, sağlayıcı ID'sine
// göre bu haritadan döner; eşleşme yoksa kategorik aday havuzundan seçim yapar.
var providerFixtures = map[string][]models.MediaInfo{
	// Anime
	"animexe":       {probeTV("Naruto"), probeTV("Death Note")},
	"animpow":       {probeTV("Bleach"), probeTV("Naruto")},
	"openani":       {probeTV("Naruto"), probeTV("Death Note")},
	"seicode":       {probeTV("Bleach")},
	"diziwatch":     {probeTV("Bleach"), probeTV("Naruto")},
	"asyaanimeleri": {probeTV("Naruto"), probeTV("Shingeki no Kyojin")},
	"tranimeizle":   {probeTV("Naruto"), probeTV("Death Note")},
	"animecix":      {probeTV("Bleach"), probeTV("Naruto")},
	"acheriya":      {probeTV("Re:Zero kara Hajimeru Isekai Seikatsu"), probeTV("Naruto")},

	// Türk / yabancı dizi
	"ddizi":        {probeTV("Kızılcık Şerbeti"), probeTV("Son Yaz"), probeTV("Bahar")},
	"dizimom":      {probeTV("Son Yaz"), probeTV("The Mentalist"), probeTV("Gibi")},
	"diziyou":      {probeTV("The Mentalist"), probeTV("Breaking Bad")},
	"yabancidizi":  {probeTV("The Mentalist"), probeMovie("Venom")},
	"sezonlukdizi": {probeTV("The Mentalist"), probeTV("Breaking Bad")},
	"dizigom":      {probeTV("Lovesick"), probeTV("The Mentalist")},
	"dizimag":      {probeTV("The Mentalist"), probeTV("Breaking Bad")},
	"diziyo":       {probeTV("The Mentalist"), probeTV("Game of Thrones")},
	"dizibox":      {probeTV("The Mentalist"), probeTV("Game of Thrones")},
	"dizilla":      {probeTV("The Mentalist"), probeTV("Breaking Bad")},

	// Film
	"sinewix":         {probeMovie("Inception"), probeMovie("Başlangıç")},
	"sinemacx":        {probeMovie("Saplantı"), probeMovie("Inception")},
	"sinezy":          {probeMovie("Saplantı"), probeMovie("Inception")},
	"filmifullizle":   {probeMovie("Godfather"), probeMovie("Inception")},
	"filmhane":        {probeTV("Reacher"), probeMovie("Inception")},
	"filmkovasi":      {probeMovie("Inception"), probeMovie("The Matrix")},
	"filmmodu":        {probeMovie("The Matrix"), probeMovie("Inception")},
	"webteizle":       {probeMovie("Inception"), probeMovie("The Matrix")},
	"filmzal":         {probeMovie("Inception"), probeMovie("The Matrix")},
	"hdfilmcehennemi": {probeMovie("The Gorge"), probeMovie("Başlangıç"), probeMovie("Fight Club")},
	"hdfilmdelisi":    {probeMovie("Saplantı"), probeMovie("Inception")},
	"jetfilmizle":     {probeMovie("Inception"), probeMovie("The Matrix")},
	"tekfullfilmizle": {probeMovie("Inception"), probeMovie("The Matrix")},
	"setfilmizle":     {probeMovie("Inception"), probeMovie("The Matrix")},
	"filmmakinesi":    {probeMovie("Inception"), probeMovie("The Matrix")},
	"filmekseni":      {probeMovie("Inception"), probeMovie("Saplantı")},
	"dizipal":         {probeMovie("Inception"), probeMovie("Başlangıç")},
	"m3u":             {probeMovie("Inception")},
}

// probeTV, sağlayıcının kendi arama motorunun başlığı çözmesi için dış ID'siz
// bir dizi probu oluşturur.
func probeTV(title string) models.MediaInfo {
	return models.MediaInfo{Title: title, Type: models.MediaTypeTV, Season: 1, Episode: 1}
}

// probeMovie, dış ID'siz bir film probu oluşturur.
func probeMovie(title string) models.MediaInfo {
	return models.MediaInfo{Title: title, Type: models.MediaTypeMovie}
}

// Sağlayıcının kategorik aday havuzundan seçim için kullanılacak başlıklar.
// Spesifik fixtür olmayan sağlayıcılar bunlardan test edilir.
var (
	movieCandidates = []string{
		"Inception", "The Matrix", "Interstellar", "The Dark Knight",
		"Forrest Gump", "Pulp Fiction", "Fight Club", "The Godfather",
	}
	tvCandidates = []string{
		"Breaking Bad", "Game of Thrones", "The Office", "Friends",
		"Stranger Things", "The Simpsons", "Peaky Blinders", "The Walking Dead",
	}
	animeCandidates = []string{
		"One Piece", "Naruto", "Attack on Titan", "Demon Slayer",
		"Dragon Ball", "Death Note", "My Hero Academia", "Jujutsu Kaisen",
	}
)

// providerCategory, sağlayıcıyı bir içerik kategorisine yerleştirir. Spesifik
// fixtür olmayan sağlayıcılar bu haritadan kategorik aday havuzu seçer.
var providerCategory = map[string]string{
	"ddizi":           "turkish",
	"dizibox":         "turkish",
	"diziyo":          "turkish",
	"dizimom":         "turkish",
	"animecix":        "anime",
	"tranimeizle":     "anime",
	"acheriya":        "anime",
	"filmekseni":      "movie",
	"hdfilmcehennemi": "movie",
	"sinemacx":        "movie",
	"sinezy":          "movie",
	"filmzal":         "movie",
	"tekfullfilmizle": "movie",
	"sinewix":         "multi",
	"vidlink":         "multi",
	"vidmody":         "multi",
	"m3u":             "multi",
}

const maxCandidatesPerProvider = 4

// titlesForCategory, kategoriye göre başlık dizesi döndürür.
func titlesForCategory(cat string) []string {
	switch cat {
	case "turkish":
		return []string{"Kızılcık Şerbeti", "Son Yaz", "Bahar", "Yalı Çapkını", "Ezel"}
	case "movie":
		return movieCandidates
	case "anime":
		return animeCandidates
	case "multi":
		return append(append([]string{}, movieCandidates...), tvCandidates...)
	default:
		return append(append([]string{}, movieCandidates...), tvCandidates...)
	}
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

// candidateMediaFor, sağlayıcıya uygun aday içerikleri döndürür. Önce
// providerFixtures'ta kayıtlı spesifik içerik yoksa, kategorik aday havuzundan
// seçim yapılır. Adaylar yaygınlığa göre sıralıdır; ilk başarılı adayda durulur.
func candidateMediaFor(p provider.Provider) []models.MediaInfo {
	// Spesifik fixtür varsa onu kullan.
	if fx, ok := providerFixtures[p.ID()]; ok && len(fx) > 0 {
		return fx
	}

	// Yoksa kategorik aday havuzundan seç.
	cat := providerCategory[p.ID()]
	if cat == "" {
		cat = "multi"
	}
	titles := titlesForCategory(cat)
	if len(titles) > maxCandidatesPerProvider {
		titles = titles[:maxCandidatesPerProvider]
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
	for _, title := range titles {
		if hasTV {
			out = append(out, models.MediaInfo{Title: title, Type: models.MediaTypeTV, Season: 1, Episode: 1})
		}
		if hasMovie {
			out = append(out, models.MediaInfo{Title: title, Type: models.MediaTypeMovie})
		}
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
