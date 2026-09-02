package hdfilmcehennemi

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
	ID      = "hdfilmcehennemi"
	Name    = "HDFilmCehennemi"
	BaseURL = "https://www.hdfilmcehennemi.now"
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
	searchURL := fmt.Sprintf("%s/?s=%s", BaseURL, url.QueryEscape(media.Title))
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

	var targetURL string
	doc.Find("div.title a").EachWithBreak(func(i int, s *goquery.Selection) bool {
		href, exists := s.Attr("href")
		if exists && strings.Contains(href, "/film/") {
			targetURL = href
			return false // break
		}
		return true
	})

	if targetURL == "" {
		return nil, nil
	}

	// Fetch movie page
	body, err = utils.DefaultClient.Get(ctx, targetURL, headers)
	if err != nil {
		return nil, err
	}

	bodyStr := string(body)

	// Extract nonce
	reNonce := regexp.MustCompile(`nonce:\s*'([^']+)'`)
	mNonce := reNonce.FindStringSubmatch(bodyStr)
	if len(mNonce) < 2 {
		return nil, nil
	}
	nonce := mNonce[1]

	// Extract player names and post id
	doc, err = goquery.NewDocumentFromReader(bytes.NewReader(body))
	if err != nil {
		return nil, err
	}

	var streams []models.Stream
	doc.Find("a[data-player-name]").Each(func(i int, s *goquery.Selection) {
		playerName, _ := s.Attr("data-player-name")
		postID, _ := s.Attr("data-post-id")
		
		if playerName != "" && postID != "" {
			ajaxURL := BaseURL + "/wp-admin/admin-ajax.php"
			postData := url.Values{
				"action":      {"get_video_url"},
				"nonce":       {nonce},
				"post_id":     {postID},
				"player_name": {playerName},
				"part_key":    {""},
			}
			ajaxHeaders := map[string]string{
				"Content-Type":     "application/x-www-form-urlencoded",
				"X-Requested-With": "XMLHttpRequest",
				"Referer":          targetURL,
				"User-Agent":       utils.DefaultUserAgent,
			}
			
			resp, err := utils.DefaultClient.Request(ctx, "POST", ajaxURL, strings.NewReader(postData.Encode()), ajaxHeaders)
			if err == nil {
				defer resp.Body.Close()
				var res struct {
					Success bool `json:"success"`
					Data    struct {
						URL string `json:"url"`
					} `json:"data"`
				}
				json.NewDecoder(resp.Body).Decode(&res)
				
				if res.Success && res.Data.URL != "" {
					streams = append(streams, models.Stream{
						Name:     media.Title,
						Title:    fmt.Sprintf("⌜ HDFilmCehennemi ⌟ | %s", playerName),
						Quality:  "1080p",
						Provider: ID,
						URL:      res.Data.URL,
						Headers: map[string]string{
							"Referer": BaseURL + "/",
						},
					})
				}
			}
		}
	})

	return streams, nil
}
