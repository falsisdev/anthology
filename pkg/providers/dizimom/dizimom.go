package dizimom

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"regexp"
	"strings"

	"github.com/PuerkitoBio/goquery"
	"github.com/falsisdev/anthology/pkg/extractors"
	"github.com/falsisdev/anthology/pkg/models"
	"github.com/falsisdev/anthology/pkg/provider"
	"github.com/falsisdev/anthology/pkg/utils"
)

const (
	ID      = "dizimom"
	Name    = "Dizimom"
	BaseURL = "https://www.dizimom.diy"
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

var reEmbedURL = regexp.MustCompile(`"embedUrl"\s*:\s*"(https?://[^"]+)"`)

func (p *Provider) GetStreams(ctx context.Context, media models.MediaInfo) ([]models.Stream, error) {
	if media.Type != models.MediaTypeTV {
		return nil, nil
	}

	searchQuery := media.Title
	if searchQuery == "" {
		searchQuery = media.OriginalTitle
	}

	headers := map[string]string{
		"User-Agent": utils.DefaultUserAgent,
		"Referer":    BaseURL + "/",
	}

	season := media.Season
	if season <= 0 {
		season = 1
	}
	episode := media.Episode
	if episode <= 0 {
		episode = 1
	}

	epMatchPattern := fmt.Sprintf("%d-sezon-%d-bolum", season, episode)
	epMatchShort := fmt.Sprintf("%d-bolum", episode)

	var showURL string
	var directEpURL string

	searchURL := fmt.Sprintf("%s/?s=%s", BaseURL, url.QueryEscape(searchQuery))
	body, err := utils.DefaultClient.Get(ctx, searchURL, headers)
	if err == nil {
		doc, err := goquery.NewDocumentFromReader(bytes.NewReader(body))
		if err == nil {
			doc.Find("article a, .film-card a, .post-title a, a").Each(func(i int, s *goquery.Selection) {
				href, exists := s.Attr("href")
				if !exists || (!strings.HasPrefix(href, BaseURL) && !strings.HasPrefix(href, "/")) {
					return
				}
				if strings.HasPrefix(href, "/") {
					href = BaseURL + href
				}

				// Direct episode match from search results
				if strings.Contains(href, epMatchPattern) || (season == 1 && strings.Contains(href, epMatchShort) && !strings.Contains(href, "-sezon-")) {
					if directEpURL == "" {
						directEpURL = href
					}
				}

				if strings.Contains(href, "/diziler/") {
					if showURL == "" {
						showURL = href
					}
				}
			})
		}
	}

	var activeEpURL string
	var epBody []byte

	if directEpURL != "" {
		b, err := utils.DefaultClient.Get(ctx, directEpURL, headers)
		if err == nil && len(b) > 0 && !strings.Contains(string(b), "not_found") {
			epBody = b
			activeEpURL = directEpURL
		}
	}

	if len(epBody) == 0 && showURL != "" {
		sBody, err := utils.DefaultClient.Get(ctx, showURL, headers)
		if err == nil {
			doc, err := goquery.NewDocumentFromReader(bytes.NewReader(sBody))
			if err == nil {
				doc.Find("a").EachWithBreak(func(i int, s *goquery.Selection) bool {
					href, exists := s.Attr("href")
					if !exists {
						return true
					}
					if strings.HasPrefix(href, "/") {
						href = BaseURL + href
					}
					if strings.Contains(href, epMatchPattern) || (season == 1 && strings.Contains(href, epMatchShort) && !strings.Contains(href, "-sezon-")) {
						activeEpURL = href
						return false
					}
					return true
				})
			}
		}

		if activeEpURL != "" {
			b, err := utils.DefaultClient.Get(ctx, activeEpURL, headers)
			if err == nil && len(b) > 0 && !strings.Contains(string(b), "not_found") {
				epBody = b
			}
		}
	}

	if len(epBody) == 0 {
		return nil, nil
	}

	var streams []models.Stream
	bodyStr := string(epBody)

	// Check schema embedUrl
	if m := reEmbedURL.FindStringSubmatch(bodyStr); len(m) > 1 {
		embedURL := m[1]
		if strings.Contains(embedURL, "hdplayersystem.com") {
			if s := fetchHDPlayerStream(ctx, embedURL, media.Title); s != nil {
				streams = append(streams, *s)
			}
		} else {
			extracted, err := extractors.Extract(ctx, embedURL, activeEpURL)
			if err == nil && len(extracted) > 0 {
				for _, es := range extracted {
					streams = append(streams, models.Stream{
						Name:     media.Title,
						Title:    fmt.Sprintf("⌜ Dizimom ⌟ | %s", es.Title),
						Quality:  es.Quality,
						Provider: ID,
						URL:      es.URL,
						Headers:  es.Headers,
					})
				}
			}
		}
	}

	epDoc, err := goquery.NewDocumentFromReader(bytes.NewReader(epBody))
	if err == nil {
		epDoc.Find("iframe").Each(func(i int, s *goquery.Selection) {
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

			if strings.Contains(src, "hdplayersystem.com") || strings.Contains(src, "hdstreamable.com") {
				if stream := fetchHDPlayerStream(ctx, src, media.Title); stream != nil {
					streams = append(streams, *stream)
				}
				return
			}

			extracted, err := extractors.Extract(ctx, src, activeEpURL)
			if err == nil && len(extracted) > 0 {
				for _, es := range extracted {
					streams = append(streams, models.Stream{
						Name:     media.Title,
						Title:    fmt.Sprintf("⌜ Dizimom ⌟ | %s", es.Title),
						Quality:  es.Quality,
						Provider: ID,
						URL:      es.URL,
						Headers:  es.Headers,
					})
				}
			}
		})
	}

	return streams, nil
}

func fetchHDPlayerStream(ctx context.Context, embedURL, mediaTitle string) *models.Stream {
	u, err := url.Parse(embedURL)
	if err != nil {
		return nil
	}
	dataID := u.Query().Get("data")
	if dataID == "" {
		parts := strings.Split(strings.Trim(u.Path, "/"), "/")
		dataID = parts[len(parts)-1]
	}
	if dataID == "" {
		return nil
	}

	apiURL := fmt.Sprintf("https://hdplayersystem.com/player/index.php?data=%s&do=getVideo", dataID)
	if strings.Contains(u.Host, "hdstreamable") {
		apiURL = fmt.Sprintf("https://%s%s?do=getVideo", u.Host, u.Path)
	}

	postData := url.Values{
		"hash": {dataID},
		"r":    {"https://www.dizimom.diy/"},
	}
	apiHeaders := map[string]string{
		"Content-Type":     "application/x-www-form-urlencoded",
		"X-Requested-With": "XMLHttpRequest",
		"Referer":          embedURL,
		"User-Agent":       utils.DefaultUserAgent,
	}

	resp, err := utils.DefaultClient.Request(ctx, "POST", apiURL, strings.NewReader(postData.Encode()), apiHeaders)
	if err != nil {
		return nil
	}
	defer resp.Body.Close()

	var res struct {
		SecuredLink  string `json:"securedLink"`
		VideoSource  string `json:"videoSource"`
		VideoSources []struct {
			File  string `json:"file"`
			Label string `json:"label"`
		} `json:"videoSources"`
	}
	json.NewDecoder(resp.Body).Decode(&res)

	targetLink := res.SecuredLink
	if targetLink == "" {
		targetLink = res.VideoSource
	}
	if targetLink == "" && len(res.VideoSources) > 0 {
		targetLink = res.VideoSources[0].File
	}

	if targetLink == "" {
		return nil
	}

	var headers map[string]string
	if !strings.Contains(targetLink, "twimg.com") {
		headers = map[string]string{
			"Referer": fmt.Sprintf("https://%s/", u.Host),
			"Origin":  fmt.Sprintf("https://%s", u.Host),
		}
	}

	return &models.Stream{
		Name:     mediaTitle,
		Title:    "⌜ Dizimom ⌟ | HLS (1080p)",
		Quality:  "1080p",
		Provider: ID,
		URL:      targetLink,
		Headers:  headers,
	}
}
