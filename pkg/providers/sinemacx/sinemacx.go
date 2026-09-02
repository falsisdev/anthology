package sinemacx

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"

	"github.com/PuerkitoBio/goquery"
	"github.com/falsisdev/anthology/pkg/models"
	"github.com/falsisdev/anthology/pkg/provider"
	"github.com/falsisdev/anthology/pkg/utils"
)

const (
	ID        = "sinemacx"
	Name      = "SinemaCX"
	BaseURL   = "https://www.sinema.gg"
	PlayerURL = "https://player.filmizle.in"
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

type playerResponse struct {
	SecuredLink string `json:"securedLink"`
}

func (p *Provider) GetStreams(ctx context.Context, media models.MediaInfo) ([]models.Stream, error) {
	headers := map[string]string{
		"User-Agent": utils.DefaultUserAgent,
		"Referer":    BaseURL + "/",
	}

	searchQuery := media.Title
	if searchQuery == "" {
		searchQuery = media.OriginalTitle
	}

	searchURL := fmt.Sprintf("%s/?s=%s", BaseURL, url.QueryEscape(searchQuery))
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
	var targetFilmURL string

	doc.Find("a").EachWithBreak(func(i int, s *goquery.Selection) bool {
		href, exists := s.Attr("href")
		if !exists || !strings.HasPrefix(href, BaseURL) || strings.Contains(href, "/category/") || strings.Contains(href, "/izle/film-listeleri/") {
			return true
		}

		title := strings.ToLower(utils.NormalizeTurkish(s.Text()))
		if title == "" || len(title) < 3 {
			return true
		}

		if strings.Contains(title, cleanQuery) || (origQuery != "" && strings.Contains(title, origQuery)) {
			targetFilmURL = href
			return false
		}
		return true
	})

	if targetFilmURL == "" {
		return nil, nil
	}

	pageBody, err := utils.DefaultClient.Get(ctx, targetFilmURL, headers)
	if err != nil {
		return nil, err
	}

	pageDoc, err := goquery.NewDocumentFromReader(bytes.NewReader(pageBody))
	if err != nil {
		return nil, err
	}

	var iframeURL string
	pageDoc.Find("iframe").EachWithBreak(func(i int, s *goquery.Selection) bool {
		src, exists := s.Attr("src")
		if !exists || src == "" {
			src, _ = s.Attr("data-vsrc")
		}
		if strings.Contains(src, "player.filmizle.in") {
			iframeURL = strings.Split(src, "?img=")[0]
			return false
		}
		return true
	})

	if iframeURL == "" {
		return nil, nil
	}

	// Extract video ID from iframe URL
	parts := strings.Split(strings.Trim(iframeURL, "/"), "/")
	videoID := parts[len(parts)-1]

	apiURL := fmt.Sprintf("%s/player/index.php?data=%s&do=getVideo", PlayerURL, videoID)
	formBody := strings.NewReader(fmt.Sprintf("data=%s&do=getVideo", videoID))

	postHeaders := map[string]string{
		"Content-Type":     "application/x-www-form-urlencoded",
		"X-Requested-With": "XMLHttpRequest",
		"Referer":          iframeURL,
		"User-Agent":       utils.DefaultUserAgent,
	}

	resp, err := utils.DefaultClient.Request(ctx, http.MethodPost, apiURL, formBody, postHeaders)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var pResp playerResponse
	if err := json.NewDecoder(resp.Body).Decode(&pResp); err != nil {
		return nil, err
	}

	if pResp.SecuredLink == "" {
		return nil, nil
	}

	return []models.Stream{
		{
			Name:     media.Title,
			Title:    "⌜ SinemaCX ⌟ | 1080p HD",
			URL:      pResp.SecuredLink,
			Quality:  "1080p",
			Provider: ID,
			Headers: map[string]string{
				"Referer": PlayerURL + "/",
			},
		},
	}, nil
}
