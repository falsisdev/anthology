package openani

import (
	"context"
	"fmt"
	"regexp"
	"strings"

	"github.com/falsisdev/anthology/pkg/models"
	"github.com/falsisdev/anthology/pkg/provider"
	"github.com/falsisdev/anthology/pkg/utils"
)

const (
	ID      = "openani"
	Name    = "OpenAni"
	BaseURL = "https://openani.me"
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
	return []models.MediaType{models.MediaTypeMovie, models.MediaTypeTV}
}

var (
	reRandomCDN = regexp.MustCompile(`random_cdn_host:\s*["']([^"']+)["']`)
	reFileItem  = regexp.MustCompile(`resolution:\s*([0-9]+)[^}]*file:\s*["']([^"']+)["']`)
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

	headers := map[string]string{
		"User-Agent": utils.DefaultUserAgent,
		"Referer":    BaseURL + "/",
	}

	episodeURL := fmt.Sprintf("%s/anime/%s/%d/%d", BaseURL, slug, season, episode)
	body, err := utils.DefaultClient.Get(ctx, episodeURL, headers)
	if err != nil {
		return nil, nil
	}

	html := string(body)

	cdnMatches := reRandomCDN.FindStringSubmatch(html)
	if len(cdnMatches) < 2 {
		return nil, nil
	}
	cdnHost := cdnMatches[1]

	var streams []models.Stream
	seenFiles := make(map[string]bool)

	for _, m := range reFileItem.FindAllStringSubmatch(html, -1) {
		if len(m) > 2 {
			res := m[1]
			filename := m[2]
			if seenFiles[filename] {
				continue
			}
			seenFiles[filename] = true

			streamURL := fmt.Sprintf("%s/animes/%s/%d/%s", strings.TrimRight(cdnHost, "/"), slug, season, filename)
			quality := res + "p"
			streamTitle := fmt.Sprintf("⌜ OpenAni ⌟ | Direct MP4 [%s]", quality)

			streams = append(streams, models.Stream{
				Name:     media.Title,
				Title:    streamTitle,
				URL:      streamURL,
				Quality:  quality,
				Provider: ID,
				Headers: map[string]string{
					"Referer":    BaseURL + "/",
					"User-Agent": utils.DefaultUserAgent,
				},
			})
		}
	}

	return streams, nil
}
