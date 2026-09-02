package filmzal

import (
	"bytes"
	"context"
	"fmt"
	"net/url"
	"strings"

	"github.com/PuerkitoBio/goquery"
	"github.com/falsisdev/anthology/pkg/models"
	"github.com/falsisdev/anthology/pkg/provider"
	"github.com/falsisdev/anthology/pkg/utils"
)

const (
	ID      = "filmzal"
	Name    = "Filmzal"
	BaseURL = "https://filmzal.me"
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
	searchQuery := media.Title
	if searchQuery == "" {
		searchQuery = media.OriginalTitle
	}

	searchURL := fmt.Sprintf("%s/?s=%s", BaseURL, url.QueryEscape(searchQuery))
	headers := map[string]string{
		"User-Agent": utils.DefaultUserAgent,
		"Referer":    BaseURL + "/",
	}

	body, err := utils.DefaultClient.Get(ctx, searchURL, headers)
	if err != nil {
		return nil, err
	}

	doc, err := goquery.NewDocumentFromReader(bytes.NewReader(body))
	if err != nil {
		return nil, err
	}

	cleanQuery := strings.ToLower(utils.NormalizeTurkish(searchQuery))
	origQuery := strings.ToLower(utils.NormalizeTurkish(media.OriginalTitle))
	var targetURL string

	doc.Find("article a, .film-card a, .poster a, .post-title a, a").EachWithBreak(func(i int, s *goquery.Selection) bool {
		href, exists := s.Attr("href")
		if !exists || (!strings.HasPrefix(href, BaseURL) && !strings.HasPrefix(href, "/")) || strings.Contains(href, "/category/") {
			return true
		}

		title := strings.ToLower(utils.NormalizeTurkish(s.Text()))
		if title == "" || len(title) < 3 {
			return true
		}

		if strings.Contains(title, cleanQuery) || (origQuery != "" && strings.Contains(title, origQuery)) {
			targetURL = href
			return false
		}
		return true
	})

	if targetURL == "" {
		slug := utils.ToSlug(media.OriginalTitle)
		if slug == "" {
			slug = utils.ToSlug(media.Title)
		}
		targetURL = fmt.Sprintf("%s/%s", BaseURL, slug)
	}

	if media.Type == models.MediaTypeTV {
		targetURL = fmt.Sprintf("%s-%d-sezon-%d-bolum", strings.TrimSuffix(targetURL, "/"), media.Season, media.Episode)
	}

	targetBody, err := utils.DefaultClient.Get(ctx, targetURL, headers)
	if err != nil {
		return nil, nil
	}

	targetDoc, err := goquery.NewDocumentFromReader(bytes.NewReader(targetBody))
	if err != nil {
		return nil, nil
	}

	var streams []models.Stream
	targetDoc.Find("iframe").Each(func(i int, s *goquery.Selection) {
		src, exists := s.Attr("src")
		if !exists || src == "" {
			src, _ = s.Attr("data-src")
		}
		if src == "" || strings.Contains(src, "facebook") || strings.Contains(src, "youtube") || strings.Contains(src, "disqus") {
			return
		}

		serverName := "Filmzal Player"
		if strings.Contains(src, "vidmoly") {
			serverName = "VidMoly"
		} else if strings.Contains(src, "sibnet") {
			serverName = "Sibnet"
		}

		streams = append(streams, models.Stream{
			Name:     media.Title,
			Title:    fmt.Sprintf("⌜ Filmzal ⌟ | %s", serverName),
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
