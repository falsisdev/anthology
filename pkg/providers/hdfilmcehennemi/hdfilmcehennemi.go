package hdfilmcehennemi

import (
	"bytes"
	"context"
	"fmt"
	"strings"

	"github.com/PuerkitoBio/goquery"
	"github.com/falsisdev/nuviotr/pkg/models"
	"github.com/falsisdev/nuviotr/pkg/provider"
	"github.com/falsisdev/nuviotr/pkg/utils"
)

const (
	ID      = "hdfilmcehennemi"
	Name    = "HDFilmCehennemi"
	BaseURL = "https://www.hdfilmcehennemi.nl"
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

func (p *Provider) GetStreams(ctx context.Context, media models.MediaInfo) ([]models.Stream, error) {
	slug := utils.ToSlug(media.Title)
	if slug == "" {
		slug = utils.ToSlug(media.OriginalTitle)
	}

	headers := map[string]string{
		"User-Agent": utils.DefaultUserAgent,
		"Referer":    BaseURL + "/",
	}

	var targetURLs []string
	if media.Type == models.MediaTypeTV {
		targetURLs = []string{
			fmt.Sprintf("%s/dizi/%s-izle/sezon-%d/bolum-%d/", BaseURL, slug, media.Season, media.Episode),
			fmt.Sprintf("%s/dizi/%s-izle-2/sezon-%d/bolum-%d/", BaseURL, slug, media.Season, media.Episode),
			fmt.Sprintf("%s/dizi/%s/sezon-%d/bolum-%d/", BaseURL, slug, media.Season, media.Episode),
			fmt.Sprintf("%s/%s-izle/", BaseURL, slug),
		}
	} else {
		targetURLs = []string{
			fmt.Sprintf("%s/%s-izle/", BaseURL, slug),
			fmt.Sprintf("%s/%s-film-izle/", BaseURL, slug),
			fmt.Sprintf("%s/%s-hd-izle/", BaseURL, slug),
			fmt.Sprintf("%s/%s/", BaseURL, slug),
		}
	}

	var streams []models.Stream
	for _, targetURL := range targetURLs {
		body, err := utils.DefaultClient.Get(ctx, targetURL, headers)
		if err != nil {
			continue
		}

		doc, err := goquery.NewDocumentFromReader(bytes.NewReader(body))
		if err != nil {
			continue
		}

		doc.Find("iframe").Each(func(i int, s *goquery.Selection) {
			src, _ := s.Attr("src")
			if src == "" || src == "about:blank" {
				src, _ = s.Attr("data-src")
			}
			if src == "" || strings.Contains(src, "facebook") || strings.Contains(src, "youtube") || strings.Contains(src, "disqus") {
				return
			}
			if strings.HasPrefix(src, "//") {
				src = "https:" + src
			}

			serverName := "Rapidrame"
			if strings.Contains(src, "vidmoly") {
				serverName = "VidMoly"
			} else if strings.Contains(src, "sibnet") {
				serverName = "Sibnet"
			}

			streams = append(streams, models.Stream{
				Name:     media.Title,
				Title:    fmt.Sprintf("⌜ HDFilmCehennemi ⌟ | %s", serverName),
				URL:      src,
				Quality:  "1080p",
				Provider: ID,
				Headers: map[string]string{
					"Referer": BaseURL + "/",
				},
			})
		})

		if len(streams) > 0 {
			break
		}
	}

	return streams, nil
}
