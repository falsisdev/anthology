package animexe

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
	ID      = "animexe"
	Name    = "Animexe"
	BaseURL = "https://animexe.com"
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

type videoSourceItem struct {
	ID      int    `json:"id"`
	Key     string `json:"key"`
	Label   string `json:"label"`
	URL     string `json:"url"`
	Type    string `json:"type"`
	Quality string `json:"quality"`
}

var (
	reMP4          = regexp.MustCompile(`const\s+MP4\s*=\s*["']([^"']+)["']`)
	reM3U8         = regexp.MustCompile(`const\s+M3U8\s*=\s*["']([^"']+)["']`)
	reVideoSources = regexp.MustCompile(`const\s+VIDEO_SOURCES\s*=\s*(\[.*?\])\s*;`)
	reDataURL      = regexp.MustCompile(`data-url=["']([^"']+)["']`)
	reAnimeSlug    = regexp.MustCompile(`/anime/([a-zA-Z0-9_-]+)`)
)

func (p *Provider) GetStreams(ctx context.Context, media models.MediaInfo) ([]models.Stream, error) {
	searchQuery := media.OriginalTitle
	if searchQuery == "" {
		searchQuery = media.Title
	}

	searchURL := fmt.Sprintf("%s/search?q=%s", BaseURL, url.QueryEscape(searchQuery))
	headers := map[string]string{
		"User-Agent": utils.DefaultUserAgent,
		"Referer":    BaseURL + "/",
	}

	body, err := utils.DefaultClient.Get(ctx, searchURL, headers)
	if err != nil {
		if media.Title != "" && media.Title != searchQuery {
			searchURL = fmt.Sprintf("%s/search?q=%s", BaseURL, url.QueryEscape(media.Title))
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

	var animeSlug string
	cleanQuery := strings.ToLower(utils.NormalizeTurkish(searchQuery))
	origQuery := strings.ToLower(utils.NormalizeTurkish(media.Title))

	doc.Find("a[href*='/anime/']").EachWithBreak(func(i int, s *goquery.Selection) bool {
		href, _ := s.Attr("href")
		m := reAnimeSlug.FindStringSubmatch(href)
		if len(m) > 1 {
			slug := m[1]
			text := strings.ToLower(utils.NormalizeTurkish(s.Text()))
			if text == "" {
				text = strings.ReplaceAll(slug, "-", " ")
			}
			if strings.Contains(text, cleanQuery) || (origQuery != "" && strings.Contains(text, origQuery)) {
				animeSlug = slug
				return false
			}
			if animeSlug == "" {
				animeSlug = slug
			}
		}
		return true
	})

	if animeSlug == "" {
		animeSlug = utils.ToSlug(media.OriginalTitle)
		if animeSlug == "" {
			animeSlug = utils.ToSlug(media.Title)
		}
	}

	season := media.Season
	if season <= 0 {
		season = 1
	}
	episode := media.Episode
	if episode <= 0 {
		episode = 1
	}

	watchURL := fmt.Sprintf("%s/watch/%s/%d/%d", BaseURL, animeSlug, season, episode)
	watchBody, err := utils.DefaultClient.Get(ctx, watchURL, headers)
	if err != nil {
		return nil, nil
	}

	watchStr := string(watchBody)
	var streams []models.Stream
	seenURLs := make(map[string]bool)

	addStream := func(streamURL, label, quality string) {
		if streamURL == "" || seenURLs[streamURL] {
			return
		}
		seenURLs[streamURL] = true

		finalURL := streamURL
		if quality == "" {
			quality = "1080p"
			if strings.Contains(label, "720") {
				quality = "720p"
			} else if strings.Contains(label, "480") {
				quality = "480p"
			}
		}

		streamTitle := fmt.Sprintf("⌜ Animexe ⌟ | %s [%s]", label, strings.ToUpper(quality))
		streams = append(streams, models.Stream{
			Name:     media.Title,
			Title:    streamTitle,
			URL:      finalURL,
			Quality:  quality,
			Provider: ID,
			Headers: map[string]string{
				"Referer":    BaseURL + "/",
				"User-Agent": utils.DefaultUserAgent,
			},
		})
	}

	// 1. VIDEO_SOURCES json array
	if vsMatches := reVideoSources.FindStringSubmatch(watchStr); len(vsMatches) > 1 {
		var vsList []videoSourceItem
		if err := json.Unmarshal([]byte(vsMatches[1]), &vsList); err == nil {
			for _, item := range vsList {
				label := item.Label
				if label == "" {
					label = "Animexe"
				}
				addStream(item.URL, label, item.Quality)
			}
		}
	}

	// 2. data-url matches
	for _, m := range reDataURL.FindAllStringSubmatch(watchStr, -1) {
		if len(m) > 1 {
			addStream(m[1], "Alternatif", "HD")
		}
	}

	// 3. MP4 constant
	if mp4Matches := reMP4.FindStringSubmatch(watchStr); len(mp4Matches) > 1 {
		cleanURL := strings.ReplaceAll(mp4Matches[1], `\/`, `/`)
		addStream(cleanURL, "Ana Kaynak", "1080p")
	}

	// 4. M3U8 constant
	if m3u8Matches := reM3U8.FindStringSubmatch(watchStr); len(m3u8Matches) > 1 {
		cleanURL := strings.ReplaceAll(m3u8Matches[1], `\/`, `/`)
		addStream(cleanURL, "HLS", "1080p")
	}

	// 5. Iframes
	watchDoc, err := goquery.NewDocumentFromReader(bytes.NewReader(watchBody))
	if err == nil {
		watchDoc.Find("iframe").Each(func(i int, s *goquery.Selection) {
			src, exists := s.Attr("src")
			if !exists || src == "" {
				src, _ = s.Attr("data-src")
			}
			if src == "" || strings.Contains(src, "facebook") || strings.Contains(src, "youtube") || strings.Contains(src, "disqus") {
				return
			}
			extracted, err := extractors.Extract(ctx, src, watchURL)
			if err == nil && len(extracted) > 0 {
				for _, es := range extracted {
					addStream(es.URL, es.Title, es.Quality)
				}
			}
		})
	}

	return streams, nil
}
