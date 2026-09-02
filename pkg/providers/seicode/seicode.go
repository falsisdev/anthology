package seicode

import (
	"context"
	"fmt"
	"regexp"

	"github.com/falsisdev/nuviotr/pkg/extractors"
	"github.com/falsisdev/nuviotr/pkg/models"
	"github.com/falsisdev/nuviotr/pkg/provider"
	"github.com/falsisdev/nuviotr/pkg/utils"
)

const (
	ID      = "seicode"
	Name    = "SeiCode"
	BaseURL = "https://seicode.net"
)

func init() {
	provider.Register(New())
}

type Provider struct{}

func New() *Provider {
	return &Provider{}
}

func (p *Provider) ID() string {
	return ID
}

func (p *Provider) Name() string {
	return Name
}

func (p *Provider) SupportedTypes() []models.MediaType {
	return []models.MediaType{models.MediaTypeTV, models.MediaTypeMovie}
}

var (
	reKVLink = regexp.MustCompile(`["']?([a-zA-Z0-9_.-]+)["']?\s*:\s*["'](https?://[^"']+)["']`)
)

func (p *Provider) GetStreams(ctx context.Context, media models.MediaInfo) ([]models.Stream, error) {
	slug := utils.ToSlug(media.OriginalTitle)
	if slug == "" {
		slug = utils.ToSlug(media.Title)
	}
	if slug == "" {
		return nil, nil
	}

	season := media.Season
	if season <= 0 {
		season = 1
	}
	episode := media.Episode
	if episode <= 0 {
		episode = 1
	}

	pageURL := fmt.Sprintf("%s/anime/%s/%d/%d", BaseURL, slug, season, episode)
	headers := map[string]string{
		"User-Agent": utils.DefaultUserAgent,
		"Referer":    BaseURL + "/",
	}

	body, err := utils.DefaultClient.Get(ctx, pageURL, headers)
	if err != nil {
		pageURL = fmt.Sprintf("%s/anime/%s", BaseURL, slug)
		body, err = utils.DefaultClient.Get(ctx, pageURL, headers)
		if err != nil {
			return nil, nil
		}
	}

	bodyStr := string(body)

	// Target the specific episode
	reEpLinks := regexp.MustCompile(fmt.Sprintf(`episode_number\s*:\s*%d\s*,\s*(?:video_links|videoLinks)\s*:\s*\{([^}]+)\}`, episode))
	matches := reEpLinks.FindAllStringSubmatch(bodyStr, -1)
	if len(matches) == 0 {
		// Fallback to any video links (e.g. for movies)
		reAny := regexp.MustCompile(`(?:video_links|videoLinks)\s*:\s*\{([^}]+)\}`)
		matches = reAny.FindAllStringSubmatch(bodyStr, -1)
		if len(matches) == 0 {
			return nil, nil
		}
	}

	var streams []models.Stream
	seen := make(map[string]bool)

	for _, m := range matches {
		if len(m) < 2 {
			continue
		}
		linksBlock := m[1]
		kvMatches := reKVLink.FindAllStringSubmatch(linksBlock, -1)
		for _, kv := range kvMatches {
			if len(kv) < 3 {
				continue
			}
			serverName := kv[1]
			embedURL := kv[2]

			if seen[embedURL] {
				continue
			}
			seen[embedURL] = true

			extracted, err := extractors.Extract(ctx, embedURL, pageURL)
			if err == nil && len(extracted) > 0 {
				for _, es := range extracted {
					streams = append(streams, models.Stream{
						Name:     media.Title,
						Title:    fmt.Sprintf("⌜ SeiCode ⌟ | %s (%s)", serverName, es.Title),
						Quality:  es.Quality,
						URL:      es.URL,
						Provider: ID,
						Headers:  es.Headers,
					})
				}
			}
		}
	}

	return streams, nil
}
