package sezonlukdizi

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
	ID      = "sezonlukdizi"
	Name    = "SezonlukDizi"
	BaseURL = "https://sezonlukdizi.cc"
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
	return []models.MediaType{models.MediaTypeTV}
}

func (p *Provider) GetStreams(ctx context.Context, media models.MediaInfo) ([]models.Stream, error) {
	if media.Type != models.MediaTypeTV {
		return nil, nil
	}

	slug := utils.ToSlug(media.OriginalTitle)
	if slug == "" {
		slug = utils.ToSlug(media.Title)
	}

	headers := map[string]string{
		"User-Agent": utils.DefaultUserAgent,
		"Referer":    BaseURL + "/",
	}

	// Episode URL format
	epURL := fmt.Sprintf("%s/%s/%d-sezon-%d-bolum.html", BaseURL, slug, media.Season, media.Episode)
	body, err := utils.DefaultClient.Get(ctx, epURL, headers)
	if err != nil {
		// Fallback to Turkish title slug
		trSlug := utils.ToSlug(media.Title)
		if trSlug != "" && trSlug != slug {
			epURL = fmt.Sprintf("%s/%s/%d-sezon-%d-bolum.html", BaseURL, trSlug, media.Season, media.Episode)
			body, err = utils.DefaultClient.Get(ctx, epURL, headers)
			if err != nil {
				return nil, nil
			}
		} else {
			return nil, nil
		}
	}

	doc, err := goquery.NewDocumentFromReader(bytes.NewReader(body))
	if err != nil {
		return nil, nil
	}

	var streams []models.Stream
	doc.Find("iframe").Each(func(i int, s *goquery.Selection) {
		src, exists := s.Attr("src")
		if !exists || src == "" {
			src, _ = s.Attr("data-src")
		}
		if src == "" || strings.Contains(src, "facebook") || strings.Contains(src, "disqus") {
			return
		}

		serverName := "SezonlukDizi Player"
		if strings.Contains(src, "vidmoly") {
			serverName = "VidMoly"
		} else if strings.Contains(src, "sibnet") {
			serverName = "Sibnet"
		}

		streams = append(streams, models.Stream{
			Name:     media.Title,
			Title:    fmt.Sprintf("⌜ SezonlukDizi ⌟ | %s", serverName),
			URL:      src,
			Quality:  "1080p",
			Provider: ID,
			Headers: map[string]string{
				"Referer": BaseURL + "/",
			},
		})
	})

	return streams, nil
}
