package hdfilmdelisi

import (
	"bytes"
	"context"
	"fmt"
	"net/url"
	"strings"

	"github.com/PuerkitoBio/goquery"
	"github.com/falsisdev/nuviotr/pkg/models"
	"github.com/falsisdev/nuviotr/pkg/provider"
	"github.com/falsisdev/nuviotr/pkg/utils"
)

const (
	ID      = "hdfilmdelisi"
	Name    = "HDFilmdelisi"
	BaseURL = "https://hdfilmdelisi.one"
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
	return []models.MediaType{models.MediaTypeMovie}
}

func (p *Provider) GetStreams(ctx context.Context, media models.MediaInfo) ([]models.Stream, error) {
	if media.Type != models.MediaTypeMovie {
		return nil, nil
	}

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
	var filmURL string

	doc.Find("article a, .film-card a, .poster a, .post-title a, a").EachWithBreak(func(i int, s *goquery.Selection) bool {
		href, exists := s.Attr("href")
		if !exists || (!strings.HasPrefix(href, BaseURL) && !strings.HasPrefix(href, "/")) || strings.Contains(href, "/tur/") {
			return true
		}

		title := strings.ToLower(utils.NormalizeTurkish(s.Text()))
		if title == "" || len(title) < 3 {
			return true
		}

		if strings.Contains(title, cleanQuery) || (origQuery != "" && strings.Contains(title, origQuery)) {
			filmURL = href
			return false
		}
		return true
	})

	if filmURL == "" {
		slug := utils.ToSlug(media.OriginalTitle)
		if slug == "" {
			slug = utils.ToSlug(media.Title)
		}
		filmURL = fmt.Sprintf("%s/%s", BaseURL, slug)
	}

	filmBody, err := utils.DefaultClient.Get(ctx, filmURL, headers)
	if err != nil {
		return nil, nil
	}

	filmDoc, err := goquery.NewDocumentFromReader(bytes.NewReader(filmBody))
	if err != nil {
		return nil, nil
	}

	var streams []models.Stream
	filmDoc.Find("iframe").Each(func(i int, s *goquery.Selection) {
		src, exists := s.Attr("src")
		if !exists || src == "" {
			src, _ = s.Attr("data-src")
		}
		if src == "" || strings.Contains(src, "facebook") || strings.Contains(src, "youtube") || strings.Contains(src, "disqus") {
			return
		}

		serverName := "HDFilmdelisi Player"
		if strings.Contains(src, "vidmoly") {
			serverName = "VidMoly"
		} else if strings.Contains(src, "rapid") {
			serverName = "RapidPlay"
		} else if strings.Contains(src, "sibnet") {
			serverName = "Sibnet"
		}

		streams = append(streams, models.Stream{
			Name:     media.Title,
			Title:    fmt.Sprintf("⌜ HDFilmdelisi ⌟ | %s", serverName),
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
