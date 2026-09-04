package acheriya

import (
	"bytes"
	"context"
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
	ID      = "acheriya"
	Name    = "Acheriya"
	BaseURL = "https://acheriya.com"
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
	reIzleSlug     = regexp.MustCompile(`/izle/([a-zA-Z0-9_-]+)`)
	reAcheriyaM3U8 = regexp.MustCompile(`https?://[a-zA-Z0-9_.-]*acheriya\.com/hls/[a-zA-Z0-9_-]+/playlist\.m3u8`)
	reBunnyEmbed   = regexp.MustCompile(`https?://iframe\.mediadelivery\.net/embed/[0-9]+/[a-zA-Z0-9_-]+`)
)

func (p *Provider) GetStreams(ctx context.Context, media models.MediaInfo) ([]models.Stream, error) {
	searchQuery := media.OriginalTitle
	if searchQuery == "" {
		searchQuery = media.Title
	}

	searchURL := fmt.Sprintf("%s/ara?q=%s", BaseURL, url.QueryEscape(searchQuery))
	headers := map[string]string{
		"User-Agent": utils.DefaultUserAgent,
		"Referer":    BaseURL + "/",
	}

	body, err := utils.DefaultClient.Get(ctx, searchURL, headers)
	if err != nil {
		if media.Title != "" && media.Title != searchQuery {
			searchURL = fmt.Sprintf("%s/ara?q=%s", BaseURL, url.QueryEscape(media.Title))
			body, err = utils.DefaultClient.Get(ctx, searchURL, headers)
		}
		if err != nil {
			return nil, err
		}
	}

	doc, err := goquery.NewDocumentFromReader(bytes.NewReader(body))
	if err != nil {
		return nil, err
	}

	var targetSlug string
	cleanQuery := strings.ToLower(utils.NormalizeTurkish(searchQuery))
	origQuery := strings.ToLower(utils.NormalizeTurkish(media.Title))

	doc.Find("a[href*='/izle/']").EachWithBreak(func(i int, s *goquery.Selection) bool {
		href, _ := s.Attr("href")
		m := reIzleSlug.FindStringSubmatch(href)
		if len(m) > 1 {
			slug := m[1]
			if strings.HasPrefix(slug, "bolum-") {
				return true
			}
			text := strings.ToLower(utils.NormalizeTurkish(s.Text()))
			if text == "" {
				text = strings.ReplaceAll(slug, "-", " ")
			}
			if strings.Contains(text, cleanQuery) || (origQuery != "" && strings.Contains(text, origQuery)) {
				targetSlug = slug
				return false
			}
			if targetSlug == "" {
				targetSlug = slug
			}
		}
		return true
	})

	if targetSlug == "" {
		targetSlug = utils.ToSlug(media.OriginalTitle)
		if targetSlug == "" {
			targetSlug = utils.ToSlug(media.Title)
		}
	}

	episode := media.Episode
	if episode <= 0 {
		episode = 1
	}

	epURL := fmt.Sprintf("%s/izle/%s/bolum-%d", BaseURL, targetSlug, episode)
	epBody, err := utils.DefaultClient.Get(ctx, epURL, headers)
	if err != nil {
		return nil, nil
	}

	epStr := string(epBody)
	var streams []models.Stream
	seenURLs := make(map[string]bool)

	addStream := func(streamURL, title, quality string) {
		if streamURL == "" || seenURLs[streamURL] {
			return
		}
		seenURLs[streamURL] = true
		streams = append(streams, models.Stream{
			Name:     media.Title,
			Title:    fmt.Sprintf("⌜ Acheriya ⌟ | %s", title),
			URL:      streamURL,
			Quality:  quality,
			Provider: ID,
			Headers: map[string]string{
				"Referer":    BaseURL + "/",
				"User-Agent": utils.DefaultUserAgent,
			},
		})
	}

	// 1. Extract direct HLS master playlist
	for _, m := range reAcheriyaM3U8.FindAllString(epStr, -1) {
		cleanURL := strings.ReplaceAll(m, `\`, ``)
		addStream(cleanURL, "Tatsumi (HLS)", "1080p")
	}

	// 2. Extract BunnyCDN embed
	for _, m := range reBunnyEmbed.FindAllString(epStr, -1) {
		cleanURL := strings.ReplaceAll(m, `\`, ``)
		addStream(cleanURL, "BunnyCDN", "1080p")
	}

	// 3. Extract iframes
	epDoc, err := goquery.NewDocumentFromReader(bytes.NewReader(epBody))
	if err == nil {
		epDoc.Find("iframe").Each(func(i int, s *goquery.Selection) {
			src, exists := s.Attr("src")
			if !exists || src == "" {
				src, _ = s.Attr("data-src")
			}
			if src == "" || strings.Contains(src, "facebook") || strings.Contains(src, "youtube") || strings.Contains(src, "disqus") {
				return
			}
			extracted, err := extractors.Extract(ctx, src, epURL)
			if err == nil && len(extracted) > 0 {
				for _, es := range extracted {
					addStream(es.URL, es.Title, es.Quality)
				}
			}
		})
	}

	return streams, nil
}
