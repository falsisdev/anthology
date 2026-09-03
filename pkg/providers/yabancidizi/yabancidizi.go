package yabancidizi

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"strings"

	"github.com/PuerkitoBio/goquery"
	"github.com/falsisdev/anthology/pkg/extractors"
	"github.com/falsisdev/anthology/pkg/models"
	"github.com/falsisdev/anthology/pkg/provider"
	"github.com/falsisdev/anthology/pkg/utils"
)

const (
	ID      = "yabancidizi"
	Name    = "YabancıDizi"
	BaseURL = "https://yabancidizi.news"
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

type searchItem struct {
	ID    string `json:"s_id"`
	Type  string `json:"s_type"` // "0" for series, "1" for movies
	Link  string `json:"s_link"`
	Name  string `json:"s_name"`
	Image string `json:"s_image"`
	Year  string `json:"s_year"`
}

type searchResponse struct {
	Success int `json:"success"`
	Data    struct {
		Result []searchItem `json:"result"`
	} `json:"data"`
}

func (p *Provider) GetStreams(ctx context.Context, media models.MediaInfo) ([]models.Stream, error) {
	searchQuery := media.OriginalTitle
	if searchQuery == "" {
		searchQuery = media.Title
	}

	searchURL := fmt.Sprintf("%s/search?qr=%s", BaseURL, url.QueryEscape(searchQuery))
	headers := map[string]string{
		"User-Agent":       utils.DefaultUserAgent,
		"Referer":          BaseURL + "/",
		"X-Requested-With": "XMLHttpRequest",
		"Accept":           "application/json, text/javascript, */*; q=0.01",
	}

	resp, err := utils.DefaultClient.Request(ctx, "POST", searchURL, strings.NewReader(""), headers)
	if err != nil {
		if media.Title != "" && media.Title != searchQuery {
			searchURL = fmt.Sprintf("%s/search?qr=%s", BaseURL, url.QueryEscape(media.Title))
			resp, err = utils.DefaultClient.Request(ctx, "POST", searchURL, strings.NewReader(""), headers)
		}
		if err != nil {
			return nil, err
		}
	}
	defer resp.Body.Close()

	var sResp searchResponse
	if err := json.NewDecoder(resp.Body).Decode(&sResp); err != nil || len(sResp.Data.Result) == 0 {
		return nil, nil
	}

	var matchedItem *searchItem
	cleanQuery := strings.ToLower(utils.NormalizeTurkish(searchQuery))
	origQuery := strings.ToLower(utils.NormalizeTurkish(media.Title))

	expectedType := "1" // film
	if media.Type == models.MediaTypeTV {
		expectedType = "0" // dizi
	}

	for _, item := range sResp.Data.Result {
		nameNorm := strings.ToLower(utils.NormalizeTurkish(item.Name))
		if item.Type == expectedType {
			if strings.Contains(nameNorm, cleanQuery) || (origQuery != "" && strings.Contains(nameNorm, origQuery)) {
				matchedItem = &item
				break
			}
		}
	}

	if matchedItem == nil && len(sResp.Data.Result) > 0 {
		matchedItem = &sResp.Data.Result[0]
	}

	if matchedItem == nil {
		return nil, nil
	}

	var targetURL string
	if matchedItem.Type == "0" || media.Type == models.MediaTypeTV {
		season := media.Season
		if season <= 0 {
			season = 1
		}
		episode := media.Episode
		if episode <= 0 {
			episode = 1
		}
		targetURL = fmt.Sprintf("%s/dizi/%s/sezon-%d/bolum-%d", BaseURL, matchedItem.Link, season, episode)
	} else {
		targetURL = fmt.Sprintf("%s/film/%s", BaseURL, matchedItem.Link)
	}

	body, err := utils.DefaultClient.Get(ctx, targetURL, map[string]string{
		"User-Agent": utils.DefaultUserAgent,
		"Referer":    BaseURL + "/",
	})
	if err != nil {
		return nil, err
	}

	doc, err := goquery.NewDocumentFromReader(bytes.NewReader(body))
	if err != nil {
		return nil, err
	}

	var streams []models.Stream
	seenURLs := make(map[string]bool)

	addStream := func(streamURL, title, quality string) {
		if streamURL == "" || seenURLs[streamURL] {
			return
		}
		seenURLs[streamURL] = true
		streams = append(streams, models.Stream{
			Name:     media.Title,
			Title:    fmt.Sprintf("⌜ YabancıDizi ⌟ | %s", title),
			Quality:  quality,
			URL:      streamURL,
			Provider: ID,
			Headers: map[string]string{
				"Referer":    BaseURL + "/",
				"User-Agent": utils.DefaultUserAgent,
			},
		})
	}

	// 1. Check for alternate server tabs (VidMoly, OkRu, etc.)
	doc.Find("div.item[data-link]").Each(func(i int, s *goquery.Selection) {
		dataLink, _ := s.Attr("data-link")
		dataHash, _ := s.Attr("data-hash")
		queryType, _ := s.Attr("data-querytype")
		serverName := strings.TrimSpace(s.Text())
		if serverName == "" {
			serverName = "Alternatif"
		}

		if dataLink == "" || dataHash == "" {
			return
		}
		if queryType == "" {
			queryType = "alternate"
		}

		ajaxURL := fmt.Sprintf("%s/ajax/service", BaseURL)
		postVals := url.Values{
			"link":      {dataLink},
			"hash":      {dataHash},
			"querytype": {queryType},
			"type":      {"videoGet"},
		}

		ajaxHeaders := map[string]string{
			"User-Agent":       utils.DefaultUserAgent,
			"Referer":          targetURL,
			"Origin":           BaseURL,
			"X-Requested-With": "XMLHttpRequest",
			"Content-Type":     "application/x-www-form-urlencoded; charset=UTF-8",
			"Accept":           "application/json, text/javascript, */*; q=0.01",
		}

		if resp, err := utils.DefaultClient.Request(ctx, "POST", ajaxURL, strings.NewReader(postVals.Encode()), ajaxHeaders); err == nil {
			defer resp.Body.Close()
			var ajaxRes struct {
				Success   bool   `json:"success"`
				ApiIframe string `json:"api_iframe"`
				Api       struct {
					Iframe string `json:"iframe"`
					URL    string `json:"url"`
				} `json:"api"`
			}
			if err := json.NewDecoder(resp.Body).Decode(&ajaxRes); err == nil {
				iframeURL := ajaxRes.ApiIframe
				if iframeURL == "" {
					iframeURL = ajaxRes.Api.URL
				}
				if iframeURL != "" {
					if strings.HasPrefix(iframeURL, "//") {
						iframeURL = "https:" + iframeURL
					}
					extracted, err := extractors.Extract(ctx, iframeURL, targetURL)
					if err == nil && len(extracted) > 0 {
						for _, es := range extracted {
							addStream(es.URL, es.Title, es.Quality)
						}
					} else {
						addStream(iframeURL, serverName, "1080p")
					}
				}
			}
		}
	})

	// 2. Extract iframes
	doc.Find("iframe").Each(func(i int, s *goquery.Selection) {
		src, exists := s.Attr("src")
		if !exists || src == "" {
			src, _ = s.Attr("data-src")
		}
		if src == "" || strings.Contains(src, "facebook") || strings.Contains(src, "youtube") || strings.Contains(src, "google") {
			return
		}
		if strings.HasPrefix(src, "//") {
			src = "https:" + src
		}

		extracted, err := extractors.Extract(ctx, src, targetURL)
		if err == nil && len(extracted) > 0 {
			for _, es := range extracted {
				addStream(es.URL, es.Title, es.Quality)
			}
		} else {
			addStream(src, "Alternatif Player", "1080p")
		}
	})

	return streams, nil
}
