package m3u

import (
	"bufio"
	"bytes"
	"context"
	"fmt"
	"os"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/falsisdev/nuviotr/pkg/models"
	"github.com/falsisdev/nuviotr/pkg/provider"
	"github.com/falsisdev/nuviotr/pkg/utils"
)

const (
	ID   = "m3u"
	Name = "M3U Provider"

	RemoteMovieM3U = "https://raw.githubusercontent.com/falsisdev/nuviotr/main/lists/film.m3u"
	RemoteTVM3U    = "https://raw.githubusercontent.com/falsisdev/nuviotr/main/lists/dizi.m3u"
	RemoteLiveM3U  = "https://raw.githubusercontent.com/falsisdev/nuviotr/main/lists/canli.m3u"

	LocalMovieM3U = "lists/film.m3u"
	LocalTVM3U    = "lists/dizi.m3u"
	LocalLiveM3U  = "lists/canli.m3u"
)

func init() {
	provider.Register(New())
}

type Provider struct {
	cache   map[string]string
	lastGet map[string]time.Time
	mu      sync.RWMutex
}

func New() *Provider {
	return &Provider{
		cache:   make(map[string]string),
		lastGet: make(map[string]time.Time),
	}
}

func (p *Provider) ID() string {
	return ID
}

func (p *Provider) Name() string {
	return Name
}

func (p *Provider) SupportedTypes() []models.MediaType {
	return []models.MediaType{models.MediaTypeMovie, models.MediaTypeTV, models.MediaTypeLive}
}

func (p *Provider) loadM3U(ctx context.Context, remoteURL, localPath string) (string, error) {
	p.mu.RLock()
	content, ok := p.cache[remoteURL]
	lastTime := p.lastGet[remoteURL]
	p.mu.RUnlock()

	if ok && time.Since(lastTime) < 10*time.Minute {
		return content, nil
	}

	// Try local file first (supporting various cwd depths)
	possiblePaths := []string{
		localPath,
		"../" + localPath,
		"../../" + localPath,
		"../../../" + localPath,
	}
	for _, pth := range possiblePaths {
		if _, err := os.Stat(pth); err == nil {
			data, err := os.ReadFile(pth)
			if err == nil && len(data) > 0 {
				p.mu.Lock()
				p.cache[remoteURL] = string(data)
				p.lastGet[remoteURL] = time.Now()
				p.mu.Unlock()
				return string(data), nil
			}
		}
	}

	// Fallback to remote fetch
	data, err := utils.DefaultClient.Get(ctx, remoteURL, nil)
	if err != nil {
		// If remote fails but we have stale cache, use it
		if ok {
			return content, nil
		}
		return "", err
	}

	text := string(data)
	p.mu.Lock()
	p.cache[remoteURL] = text
	p.lastGet[remoteURL] = time.Now()
	p.mu.Unlock()

	return text, nil
}

// GetLiveChannels parses all channels from the live M3U playlist.
func (p *Provider) GetLiveChannels(ctx context.Context) ([]models.Channel, error) {
	content, err := p.loadM3U(ctx, RemoteLiveM3U, LocalLiveM3U)
	if err != nil {
		return nil, err
	}

	var channels []models.Channel
	scanner := bufio.NewScanner(strings.NewReader(content))

	var currentChannel models.Channel

	tvgIDRe := regexp.MustCompile(`tvg-id="([^"]*)"`)
	tvgNameRe := regexp.MustCompile(`tvg-name="([^"]*)"`)
	tvgLogoRe := regexp.MustCompile(`tvg-logo="([^"]*)"`)
	groupRe := regexp.MustCompile(`group-title="([^"]*)"`)

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if strings.HasPrefix(line, "#EXTINF:") {
			currentChannel = models.Channel{}

			if m := tvgIDRe.FindStringSubmatch(line); len(m) > 1 {
				currentChannel.ID = m[1]
			}
			if m := tvgNameRe.FindStringSubmatch(line); len(m) > 1 {
				currentChannel.Name = m[1]
			}
			if m := tvgLogoRe.FindStringSubmatch(line); len(m) > 1 {
				currentChannel.Logo = m[1]
			}
			if m := groupRe.FindStringSubmatch(line); len(m) > 1 {
				currentChannel.Group = m[1]
			}

			// Name fallback from end of #EXTINF line
			if currentChannel.Name == "" {
				parts := strings.Split(line, ",")
				if len(parts) > 1 {
					currentChannel.Name = strings.TrimSpace(parts[len(parts)-1])
				}
			}
			if currentChannel.ID == "" {
				currentChannel.ID = utils.NormalizeTurkish(currentChannel.Name)
			}
		} else if strings.HasPrefix(line, "http") {
			if currentChannel.Name != "" {
				currentChannel.URL = line
				currentChannel.Headers = map[string]string{
					"User-Agent": "VLC/3.0.18",
				}
				channels = append(channels, currentChannel)
				currentChannel = models.Channel{}
			}
		}
	}

	return channels, nil
}

func (p *Provider) GetStreams(ctx context.Context, media models.MediaInfo) ([]models.Stream, error) {
	if media.Type == models.MediaTypeLive {
		channels, err := p.GetLiveChannels(ctx)
		if err != nil {
			return nil, err
		}

		targetNorm := utils.NormalizeTurkish(media.Title)
		var streams []models.Stream

		for _, ch := range channels {
			idNorm := utils.NormalizeTurkish(ch.ID)
			nameNorm := utils.NormalizeTurkish(ch.Name)

			if idNorm == targetNorm || nameNorm == targetNorm ||
				strings.Contains(idNorm, targetNorm) || strings.Contains(nameNorm, targetNorm) {
				streams = append(streams, models.Stream{
					Name:     ch.Name,
					Title:    fmt.Sprintf("⌜ MoOnCrOwN ⌟ | Canlı TV (%s)", ch.Name),
					URL:      ch.URL,
					Provider: ID,
					IsLive:   true,
					Headers:  ch.Headers,
				})
			}
		}
		return streams, nil
	}

	// Movie / TV Series M3U logic
	isTV := media.Type == models.MediaTypeTV
	targetURL := RemoteMovieM3U
	localPath := LocalMovieM3U
	if isTV {
		targetURL = RemoteTVM3U
		localPath = LocalTVM3U
	}

	content, err := p.loadM3U(ctx, targetURL, localPath)
	if err != nil {
		return nil, err
	}

	titleNorm := utils.NormalizeTurkish(media.Title)
	origNorm := utils.NormalizeTurkish(media.OriginalTitle)

	var episodeTags []string
	if isTV {
		episodeTags = []string{
			fmt.Sprintf("s%02de%02d", media.Season, media.Episode),
			fmt.Sprintf("%dx%02d", media.Season, media.Episode),
			fmt.Sprintf("%dx%d", media.Season, media.Episode),
			fmt.Sprintf("%dsezon%dbolum", media.Season, media.Episode),
		}
	}

	var streams []models.Stream
	scanner := bufio.NewScanner(bytes.NewReader([]byte(content)))

	var lastExtinf string

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if strings.HasPrefix(line, "#EXTINF:") {
			lastExtinf = line
		} else if strings.HasPrefix(line, "http") && lastExtinf != "" {
			extNorm := utils.NormalizeTurkish(lastExtinf)
			isMatch := false

			if isTV {
				nameMatch := (titleNorm != "" && strings.Contains(extNorm, titleNorm)) ||
					(origNorm != "" && strings.Contains(extNorm, origNorm))
				epMatch := false
				for _, tag := range episodeTags {
					if strings.Contains(extNorm, tag) {
						epMatch = true
						break
					}
				}
				if nameMatch && epMatch {
					isMatch = true
				}
			} else {
				if (titleNorm != "" && strings.Contains(extNorm, titleNorm)) ||
					(origNorm != "" && strings.Contains(extNorm, origNorm)) {
					isMatch = true
				}
			}

			if isMatch {
				displayTitle := media.Title
				parts := strings.Split(lastExtinf, ",")
				if len(parts) > 1 {
					displayTitle = strings.TrimSpace(parts[len(parts)-1])
				}

				streams = append(streams, models.Stream{
					Name:     displayTitle,
					Title:    fmt.Sprintf("⌜ M3U ⌟ | %s", displayTitle),
					URL:      line,
					Quality:  "Auto",
					Provider: ID,
					Headers: map[string]string{
						"User-Agent": "VLC/3.0.18",
					},
				})
			}
			lastExtinf = ""
		}
	}

	return streams, nil
}

// GetLiveStreamByID finds a live channel stream directly by its channel ID or Name.
func (p *Provider) GetLiveStreamByID(ctx context.Context, channelID string) (*models.Stream, error) {
	ch, err := p.GetChannelByID(ctx, channelID)
	if err != nil {
		return nil, err
	}
	return &models.Stream{
		Name:     ch.Name,
		Title:    fmt.Sprintf("⌜ MoOnCrOwN ⌟ | Canlı TV (%s)", ch.Name),
		URL:      ch.URL,
		Provider: ID,
		IsLive:   true,
		Headers:  ch.Headers,
	}, nil
}

// GetChannelByID finds a live channel model by ID or Name.
func (p *Provider) GetChannelByID(ctx context.Context, channelID string) (*models.Channel, error) {
	channels, err := p.GetLiveChannels(ctx)
	if err != nil {
		return nil, err
	}

	searchNorm := utils.NormalizeTurkish(channelID)
	for _, ch := range channels {
		if utils.NormalizeTurkish(ch.ID) == searchNorm || utils.NormalizeTurkish(ch.Name) == searchNorm {
			return &ch, nil
		}
	}
	return nil, fmt.Errorf("channel not found: %s", channelID)
}

func (p *Provider) ParseInt(s string) int {
	v, _ := strconv.Atoi(s)
	return v
}
