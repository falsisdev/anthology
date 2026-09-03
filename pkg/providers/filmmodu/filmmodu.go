package filmmodu

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"regexp"
	"strings"

	"github.com/PuerkitoBio/goquery"
	"github.com/falsisdev/anthology/pkg/models"
	"github.com/falsisdev/anthology/pkg/provider"
	"github.com/falsisdev/anthology/pkg/utils"
)

const (
	ID      = "filmmodu"
	Name    = "FilmModu"
	BaseURL = "https://www.filmmodu.one"
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

type sourceItem struct {
	Type  string `json:"type"`
	Src   string `json:"src"`
	Label string `json:"label"`
	Res   string `json:"res"`
}

type getSourceResponse struct {
	Subtitle string       `json:"subtitle"`
	Sources  []sourceItem `json:"sources"`
}

var (
	reVideoID   = regexp.MustCompile(`var\s+videoId\s*=\s*['"]([^'"]+)['"]`)
	reVideoType = regexp.MustCompile(`var\s+videoType\s*=\s*['"]([^'"]+)['"]`)
)

func (p *Provider) GetStreams(ctx context.Context, media models.MediaInfo) ([]models.Stream, error) {
	if media.Type != models.MediaTypeMovie {
		return nil, nil
	}

	searchQuery := media.Title
	if searchQuery == "" {
		searchQuery = media.OriginalTitle
	}

	searchURL := fmt.Sprintf("%s/film-ara?term=%s", BaseURL, url.QueryEscape(searchQuery))
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

	var movieURL string
	cleanQuery := strings.ToLower(utils.NormalizeTurkish(searchQuery))
	origQuery := strings.ToLower(utils.NormalizeTurkish(media.OriginalTitle))

	doc.Find("div.movie a, a").EachWithBreak(func(i int, s *goquery.Selection) bool {
		href, exists := s.Attr("href")
		if !exists || !strings.Contains(href, "filmmodu.one") {
			return true
		}
		if !strings.HasSuffix(href, "-film-izle") && !strings.Contains(href, "-izle") {
			return true
		}
		text := strings.ToLower(utils.NormalizeTurkish(s.Text()))
		if strings.Contains(text, cleanQuery) || (origQuery != "" && strings.Contains(text, origQuery)) {
			movieURL = href
			return false
		}
		if movieURL == "" && !strings.Contains(href, "/film-tur/") && !strings.Contains(href, "/film-yil/") {
			movieURL = href
		}
		return true
	})

	if movieURL == "" {
		return nil, nil
	}

	// Fetch movie page
	movieBody, err := utils.DefaultClient.Get(ctx, movieURL, headers)
	if err != nil {
		return nil, err
	}

	movieDoc, err := goquery.NewDocumentFromReader(bytes.NewReader(movieBody))
	if err != nil {
		return nil, err
	}

	// Collect target URLs to check (main movie page + alternate dubbed/subbed pages)
	type pageTarget struct {
		url   string
		label string
	}
	var targets []pageTarget

	movieDoc.Find("div.alternates a").Each(func(i int, s *goquery.Selection) {
		href, exists := s.Attr("href")
		if exists && href != "" {
			label := strings.TrimSpace(s.Text())
			if label != "Fragman" {
				targets = append(targets, pageTarget{
					url:   href,
					label: label,
				})
			}
		}
	})

	if len(targets) == 0 {
		targets = append(targets, pageTarget{
			url:   movieURL,
			label: "Orijinal",
		})
	}

	var streams []models.Stream
	seenURLs := make(map[string]bool)

	for _, target := range targets {
		var pageHTML string
		if target.url == movieURL {
			pageHTML = string(movieBody)
		} else {
			targetBody, err := utils.DefaultClient.Get(ctx, target.url, headers)
			if err != nil {
				continue
			}
			pageHTML = string(targetBody)
		}

		vidIDMatch := reVideoID.FindStringSubmatch(pageHTML)
		vidTypeMatch := reVideoType.FindStringSubmatch(pageHTML)

		if len(vidIDMatch) < 2 {
			continue
		}
		vidID := vidIDMatch[1]
		vidType := "en"
		if len(vidTypeMatch) >= 2 {
			vidType = vidTypeMatch[1]
		}

		apiURL := fmt.Sprintf("%s/get-source?movie_id=%s&type=%s", BaseURL, vidID, vidType)
		apiHeaders := map[string]string{
			"User-Agent":       utils.DefaultUserAgent,
			"Referer":          target.url,
			"X-Requested-With": "XMLHttpRequest",
		}

		respBytes, err := utils.DefaultClient.Get(ctx, apiURL, apiHeaders)
		if err != nil {
			continue
		}

		var srcRes getSourceResponse
		if err := json.Unmarshal(respBytes, &srcRes); err != nil {
			continue
		}

		for _, src := range srcRes.Sources {
			if src.Src == "" || seenURLs[src.Src] {
				continue
			}
			seenURLs[src.Src] = true

			quality := src.Label
			if quality == "" {
				quality = "1080p"
			}

			streams = append(streams, models.Stream{
				Name:     media.Title,
				Title:    fmt.Sprintf("⌜ FilmModu ⌟ | %s [%s]", quality, target.label),
				Quality:  quality,
				URL:      src.Src,
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
