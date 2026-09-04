package mahsunsports

import (
	"context"
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/falsisdev/anthology/pkg/models"
	"github.com/falsisdev/anthology/pkg/provider"
	"github.com/falsisdev/anthology/pkg/utils"
)

const (
	ID      = "mahsunsports"
	Name    = "Mahsun Sports"
	BaseURL = "https://mahsunsports80.xyz"

	DefaultScriptURL = "https://chr0me.org/script4.js"
	DefaultStreamURL = "https://andro.evrenesoglu99.click/checklist/"
	DefaultLogoURL   = "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/canli/default_tv.png"

	CacheTTL = 5 * time.Minute
)

func init() {
	provider.Register(New())
}

// MatchItem represents a live match entry in script4.js.
type MatchItem struct {
	Tarih  string `json:"tarih"`
	Time   string `json:"time"`
	League string `json:"league"`
	Title  string `json:"title"`
	URL    string `json:"url"`
	Live   bool   `json:"live"`
}

type Provider struct {
	mu           sync.RWMutex
	cachedList   []models.Channel
	lastFetch    time.Time
	scriptURL    string
	streamBase   string
	lastMetaScan time.Time
}

func New() *Provider {
	return &Provider{
		scriptURL:  DefaultScriptURL,
		streamBase: DefaultStreamURL,
	}
}

func (p *Provider) ID() string {
	return ID
}

func (p *Provider) Name() string {
	return Name
}

func (p *Provider) SupportedTypes() []models.MediaType {
	return []models.MediaType{models.MediaTypeLive}
}

var (
	reScriptTag = regexp.MustCompile(`<script[^>]+src="([^"]*script\d*\.js)"`)
	reBaseURLs  = regexp.MustCompile(`baseurls\s*=\s*\[\s*"([^"]+)"`)
	reStreamID  = regexp.MustCompile(`id=([a-zA-Z0-9_-]+)`)
	reKars      = regexp.MustCompile(`(?s)const\s+karsilasmalar\s*=\s*(\[.*?\])\s*;`)
	reChan      = regexp.MustCompile(`\{\s*title:\s*"([^"]+)",\s*url:\s*"([^"]+)"\s*\}`)
)

// discoverEndpoints periodically inspects the home and player pages to detect rotated domains or scripts.
func (p *Provider) discoverEndpoints(ctx context.Context) {
	p.mu.RLock()
	expired := time.Since(p.lastMetaScan) > 30*time.Minute
	p.mu.RUnlock()
	if !expired {
		return
	}

	p.mu.Lock()
	p.lastMetaScan = time.Now()
	p.mu.Unlock()

	// 1. Check main page for script source
	homeData, err := utils.DefaultClient.Get(ctx, BaseURL+"/", map[string]string{
		"User-Agent": utils.DefaultUserAgent,
		"Referer":    BaseURL + "/",
	})
	if err == nil && len(homeData) > 0 {
		if m := reScriptTag.FindStringSubmatch(string(homeData)); len(m) > 1 {
			foundScript := m[1]
			if strings.HasPrefix(foundScript, "//") {
				foundScript = "https:" + foundScript
			} else if strings.HasPrefix(foundScript, "/") {
				foundScript = BaseURL + foundScript
			}
			p.mu.Lock()
			p.scriptURL = foundScript
			p.mu.Unlock()
		}
	}

	// 2. Check event.html for stream base URL
	eventData, err := utils.DefaultClient.Get(ctx, BaseURL+"/event.html?id=androstreamlivebs1", map[string]string{
		"User-Agent": utils.DefaultUserAgent,
		"Referer":    BaseURL + "/",
	})
	if err == nil && len(eventData) > 0 {
		if m := reBaseURLs.FindStringSubmatch(string(eventData)); len(m) > 1 {
			p.mu.Lock()
			p.streamBase = m[1]
			p.mu.Unlock()
		}
	}
}

// GetLiveChannels scrapes both the 24/7 sports channels and live matches from Mahsun Sports.
func (p *Provider) GetLiveChannels(ctx context.Context) ([]models.Channel, error) {
	p.mu.RLock()
	if len(p.cachedList) > 0 && time.Since(p.lastFetch) < CacheTTL {
		cached := p.cachedList
		p.mu.RUnlock()
		return cached, nil
	}
	p.mu.RUnlock()

	go p.discoverEndpoints(ctx)

	p.mu.RLock()
	scriptURL := p.scriptURL
	streamBase := p.streamBase
	p.mu.RUnlock()

	headers := map[string]string{
		"User-Agent": utils.DefaultUserAgent,
		"Referer":    BaseURL + "/",
	}

	data, err := utils.DefaultClient.Get(ctx, scriptURL, headers)
	if err != nil {
		p.mu.RLock()
		cached := p.cachedList
		p.mu.RUnlock()
		if len(cached) > 0 {
			return cached, nil
		}
		return nil, fmt.Errorf("failed to fetch mahsun sports script: %w", err)
	}

	content := string(data)
	var channels []models.Channel
	streamHeaders := map[string]string{
		"User-Agent": utils.DefaultUserAgent,
		"Referer":    BaseURL + "/",
	}

	// 1. Extract 24/7 TV Channels
	chanMatches := reChan.FindAllStringSubmatch(content, -1)
	seenIDs := make(map[string]bool)

	for _, c := range chanMatches {
		if len(c) < 3 {
			continue
		}
		rawTitle := strings.TrimSpace(c[1])
		rawURL := strings.TrimSpace(c[2])

		mID := reStreamID.FindStringSubmatch(rawURL)
		if len(mID) < 2 {
			continue
		}
		streamKey := mID[1]

		chanID := "mahsun_" + streamKey
		if seenIDs[chanID] {
			continue
		}
		seenIDs[chanID] = true

		streamURL := fmt.Sprintf("%s%s.m3u8", streamBase, streamKey)
		logo := getChannelLogo(rawTitle)

		channels = append(channels, models.Channel{
			ID:      chanID,
			Name:    rawTitle + " HD",
			Logo:    logo,
			Group:   "⚽ SPOR KANALLARI (Mahsun)",
			URL:     streamURL,
			Headers: streamHeaders,
		})
	}

	// 2. Extract Live & Today's Matches (karsilasmalar)
	mKars := reKars.FindStringSubmatch(content)
	if len(mKars) > 1 {
		var matches []MatchItem
		if err := json.Unmarshal([]byte(mKars[1]), &matches); err == nil {
			todayStr := time.Now().Format("2006-01-02")
			for _, m := range matches {
				mID := reStreamID.FindStringSubmatch(m.URL)
				if len(mID) < 2 {
					continue
				}
				streamKey := mID[1]

				// Only show today's matches or currently LIVE matches
				if m.Tarih != "" && m.Tarih != todayStr && !m.Live {
					continue
				}

				matchID := fmt.Sprintf("mahsun_mac_%s_%s", utils.ToSlug(m.Title), utils.ToSlug(m.Time))
				if seenIDs[matchID] {
					continue
				}
				seenIDs[matchID] = true

				var matchTitle string
				if m.Live {
					matchTitle = fmt.Sprintf("🔴 [CANLI] %s (%s)", m.Title, m.League)
				} else {
					matchTitle = fmt.Sprintf("🕒 [%s] %s (%s)", m.Time, m.Title, m.League)
				}

				matchLogo := getMatchLogo(m.League, streamKey)
				streamURL := fmt.Sprintf("%s%s.m3u8", streamBase, streamKey)
				channels = append(channels, models.Channel{
					ID:      matchID,
					Name:    matchTitle,
					Logo:    matchLogo,
					Group:   "🔴 CANLI MAÇLAR (Mahsun)",
					URL:     streamURL,
					Headers: streamHeaders,
				})
			}
		}
	}

	p.mu.Lock()
	p.cachedList = channels
	p.lastFetch = time.Now()
	p.mu.Unlock()

	return channels, nil
}

// GetStreams searches across Mahsun sports channels and live matches.
func (p *Provider) GetStreams(ctx context.Context, media models.MediaInfo) ([]models.Stream, error) {
	channels, err := p.GetLiveChannels(ctx)
	if err != nil {
		return nil, err
	}

	searchNorm := utils.NormalizeTurkish(media.Title)
	if searchNorm == "" {
		searchNorm = utils.NormalizeTurkish(media.OriginalTitle)
	}

	var streams []models.Stream
	for _, ch := range channels {
		idNorm := utils.NormalizeTurkish(ch.ID)
		nameNorm := utils.NormalizeTurkish(ch.Name)

		if searchNorm != "" && (idNorm == searchNorm || nameNorm == searchNorm || strings.Contains(nameNorm, searchNorm)) {
			streams = append(streams, models.Stream{
				Name:     ch.Name,
				Title:    fmt.Sprintf("⌜ Mahsun Sports ⌟ | %s", ch.Name),
				URL:      ch.URL,
				Quality:  "1080p",
				Provider: ID,
				IsLive:   true,
				Headers:  ch.Headers,
			})
		}
	}

	return streams, nil
}

// getChannelLogo maps known channel names to public CDN or repository logos.
func getChannelLogo(channelName string) string {
	lower := strings.ToLower(channelName)
	rawBase := "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/canli/"

	switch {
	// beIN Sports
	case strings.Contains(lower, "bein sports max 1") || strings.Contains(lower, "max 1"):
		return "https://i.imgur.com/FjWQjdy.png"
	case strings.Contains(lower, "bein sports max 2") || strings.Contains(lower, "max 2"):
		return "https://i.imgur.com/5dBc5rn.png"
	case strings.Contains(lower, "bein sports 1"):
		return "https://i.imgur.com/Vtk2cGI.png"
	case strings.Contains(lower, "bein sports 2"):
		return "https://i.imgur.com/vUJZSvs.png"
	case strings.Contains(lower, "bein sports 3"):
		return "https://i.imgur.com/UYSMao3.png"
	case strings.Contains(lower, "bein sports 4"):
		return "https://i.imgur.com/vwAgJNi.png"
	case strings.Contains(lower, "bein sports 5"):
		return "https://i.imgur.com/2Rha5aY.png"
	case strings.Contains(lower, "bein"):
		return "https://i.imgur.com/Vtk2cGI.png"

	// S Sport
	case strings.Contains(lower, "s sport 2"):
		return "https://i.imgur.com/2jIItAy.png"
	case strings.Contains(lower, "s sport plus") || strings.Contains(lower, "ssplus"):
		return "https://i.imgur.com/2jIItAy.png"
	case strings.Contains(lower, "s sport"):
		return "https://i.imgur.com/2jIItAy.png"

	// Tivibu Spor
	case strings.Contains(lower, "tivibu spor 2"):
		return "https://i.imgur.com/fZMSjNE.png"
	case strings.Contains(lower, "tivibu spor 3"):
		return "https://i.imgur.com/xLrgt2O.png"
	case strings.Contains(lower, "tivibu spor 4"):
		return "https://i.imgur.com/LgGxe7z.png"
	case strings.Contains(lower, "tivibu"):
		return "https://i.imgur.com/qvrKQY3.png"

	// Smart Spor
	case strings.Contains(lower, "smart spor 2") || strings.Contains(lower, "sm2"):
		return "https://i.imgur.com/qyUKCUa.png"
	case strings.Contains(lower, "smart spor") || strings.Contains(lower, "spor smart"):
		return "https://i.imgur.com/blu6v6P.png"

	// Eurosport
	case strings.Contains(lower, "euro sport 2") || strings.Contains(lower, "eurosport 2"):
		return "https://i.imgur.com/f56dHgR.png"
	case strings.Contains(lower, "euro sport") || strings.Contains(lower, "eurosport"):
		return "https://i.imgur.com/olQJgm7.png"

	// Exxen
	case strings.Contains(lower, "exxen"):
		return rawBase + "exxen.png"

	// Tabii Spor
	case strings.Contains(lower, "tabi") || strings.Contains(lower, "tabii"):
		return "https://cms-tabii-public-image.tabii.com/int/w300/43020.jpeg"

	// TRT
	case strings.Contains(lower, "trt spor yıldız") || strings.Contains(lower, "trt spor yildiz"):
		return "https://i.imgur.com/6tv0zxh.png"
	case strings.Contains(lower, "trt spor"):
		return "https://i.imgur.com/6tv0zxh.png"
	case strings.Contains(lower, "trt 1"):
		return rawBase + "trt1.png"

	// TV8 & TV8,5
	case strings.Contains(lower, "tv8,5") || strings.Contains(lower, "tv8.5"):
		return "https://i.imgur.com/QuelSsc.png"
	case strings.Contains(lower, "tv8"):
		return rawBase + "tv8.png"

	// Kulüp & Tematik Kanallar
	case strings.Contains(lower, "tjk"):
		return "https://i.imgur.com/3zHdkYG.png"
	case strings.Contains(lower, "nba"):
		return "https://i.imgur.com/QmSc6kh.png"
	case strings.Contains(lower, "fb tv") || strings.Contains(lower, "fenerbah"):
		return "https://i.imgur.com/qBVqtYd.png"
	case strings.Contains(lower, "gs tv") || strings.Contains(lower, "galatasaray"):
		return "https://i.postimg.cc/d3k5nDBJ/galatasaray-sk.png"
	case strings.Contains(lower, "sports tv") || strings.Contains(lower, "sptstv"):
		return "https://i.imgur.com/tGTVcVe.jpg"
	case strings.Contains(lower, "cbc"):
		return "https://i.imgur.com/3mEdjuq.png"
	case strings.Contains(lower, "idman"):
		return "https://i.imgur.com/fM9FOrZ.png"

	// Ulusal
	case strings.Contains(lower, "a spor"):
		return rawBase + "aspor.png"
	case strings.Contains(lower, "atv"):
		return rawBase + "atv.png"
	case strings.Contains(lower, "a2"):
		return rawBase + "a2.png"
	case strings.Contains(lower, "ht spor"):
		return rawBase + "htspor.png"

	default:
		return DefaultLogoURL
	}
}

// getMatchLogo returns a relevant channel logo based on the broadcast stream key or sport.
func getMatchLogo(league, streamKey string) string {
	rawBase := "https://raw.githubusercontent.com/falsisdev/anthology/main/assets/canli/"
	k := strings.ToLower(streamKey)

	switch {
	case strings.Contains(k, "bs"):
		return "https://i.imgur.com/Vtk2cGI.png" // BeIN Sports
	case strings.Contains(k, "ss"):
		return "https://i.imgur.com/2jIItAy.png" // S Sport
	case strings.Contains(k, "exn"):
		return rawBase + "exxen.png" // Exxen
	case strings.Contains(k, "ts"):
		return "https://i.imgur.com/qvrKQY3.png" // Tivibu Spor
	case strings.Contains(k, "tb"):
		return "https://cms-tabii-public-image.tabii.com/int/w300/43020.jpeg" // Tabii Spor
	case strings.Contains(k, "trts"):
		return "https://i.imgur.com/6tv0zxh.png" // TRT Spor
	case strings.Contains(k, "cbcs"):
		return "https://i.imgur.com/3mEdjuq.png" // CBC Sport
	case strings.Contains(k, "idm"):
		return "https://i.imgur.com/fM9FOrZ.png" // İdman TV
	case strings.Contains(k, "sm"):
		return "https://i.imgur.com/blu6v6P.png" // Smart Spor
	case strings.Contains(k, "es"):
		return "https://i.imgur.com/olQJgm7.png" // Eurosport
	case strings.Contains(k, "ch"):
		return "https://i.imgur.com/2jIItAy.png" // Canlı Spor Akışı
	default:
		return DefaultLogoURL
	}
}
