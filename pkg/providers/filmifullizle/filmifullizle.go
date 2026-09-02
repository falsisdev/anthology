package filmifullizle

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
	ID      = "filmifullizle"
	Name    = "Filmifullizle"
	BaseURL = "https://www.filmifullizle.mx"
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

	// Try Title first, or OriginalTitle if Title yields nothing
	queries := []string{media.Title}
	if media.OriginalTitle != "" && media.OriginalTitle != media.Title {
		queries = append(queries, media.OriginalTitle)
	}

	headers := map[string]string{
		"User-Agent": utils.DefaultUserAgent,
		"Referer":    BaseURL + "/",
	}

	var filmURL string
	for _, q := range queries {
		if q == "" {
			continue
		}
		searchURL := fmt.Sprintf("%s/?s=%s", BaseURL, url.QueryEscape(q))
		body, err := utils.DefaultClient.Get(ctx, searchURL, headers)
		if err != nil {
			continue
		}

		doc, err := goquery.NewDocumentFromReader(bytes.NewReader(body))
		if err != nil {
			continue
		}

		cleanQuery := strings.ToLower(utils.NormalizeTurkish(q))
		cleanNoThe := strings.TrimSpace(strings.TrimPrefix(cleanQuery, "the "))
		origQuery := strings.ToLower(utils.NormalizeTurkish(media.OriginalTitle))
		origNoThe := strings.TrimSpace(strings.TrimPrefix(origQuery, "the "))

		doc.Find("article a, .film-card a, .poster a, .post-title a, a").EachWithBreak(func(i int, s *goquery.Selection) bool {
			href, exists := s.Attr("href")
			if !exists || (!strings.HasPrefix(href, BaseURL) && !strings.HasPrefix(href, "/")) || strings.Contains(href, "/uye-ol") {
				return true
			}

			title := strings.ToLower(utils.NormalizeTurkish(s.Text()))
			if title == "" || len(title) < 3 {
				return true
			}

			isMatch := title == cleanQuery || title == cleanNoThe || (origQuery != "" && (title == origQuery || title == origNoThe))
			if !isMatch {
				trimmed := strings.TrimSpace(regexp.MustCompile(`\s*(?:izle|filmi|full|hd|1080p|turkce|dublaj|altyazili).*$`).ReplaceAllString(title, ""))
				if trimmed == cleanQuery || trimmed == cleanNoThe || (origQuery != "" && (trimmed == origQuery || trimmed == origNoThe)) {
					isMatch = true
				}
			}
			if !isMatch && len(cleanQuery) > 5 && (strings.Contains(title, cleanQuery) || strings.Contains(title, cleanNoThe)) {
				isMatch = true
			}
			if !isMatch && origQuery != "" && len(origQuery) > 5 && (strings.Contains(title, origQuery) || strings.Contains(title, origNoThe)) {
				isMatch = true
			}

			if isMatch {
				filmURL = href
				return false
			}
			return true
		})

		if filmURL != "" {
			break
		}
	}

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

	bodyStr := string(filmBody)
	var embedURLs []string
	seenEmbeds := make(map[string]bool)

	addEmbed := func(u string) {
		u = strings.TrimSpace(u)
		if u == "" || seenEmbeds[u] || strings.Contains(u, "facebook") || strings.Contains(u, "youtube") || strings.Contains(u, "disqus") {
			return
		}
		if strings.HasPrefix(u, "//") {
			u = "https:" + u
		}
		seenEmbeds[u] = true
		embedURLs = append(embedURLs, u)
	}

	// 1. Static iframes
	filmDoc, err := goquery.NewDocumentFromReader(bytes.NewReader(filmBody))
	if err == nil {
		filmDoc.Find("iframe").Each(func(i int, s *goquery.Selection) {
			src, exists := s.Attr("src")
			if !exists || src == "" {
				src, _ = s.Attr("data-src")
			}
			addEmbed(src)
		})
	}

	// 2. Dynamic embed URLs inside scripts (e.g. embed2.php?vid=https://vidmoly..., vidmoly, okru)
	reEmbed2 := regexp.MustCompile(`embed2\.php\?vid=(https?://[^'"&\s]+)`)
	for _, m := range reEmbed2.FindAllStringSubmatch(bodyStr, -1) {
		if len(m) > 1 {
			addEmbed(m[1])
		}
	}

	reDirectPlayers := regexp.MustCompile(`https?://(?:www\.)?(?:vidmoly\.[a-z]+/embed-[a-zA-Z0-9]+|ok\.ru/videoembed/\d+|my\.mail\.ru/video/embed/[a-zA-Z0-9/]+)`)
	for _, m := range reDirectPlayers.FindAllString(bodyStr, -1) {
		addEmbed(m)
	}

	var streams []models.Stream
	for _, embedURL := range embedURLs {
		extracted, err := extractors.Extract(ctx, embedURL, filmURL)
		if err == nil && len(extracted) > 0 {
			for _, es := range extracted {
				streams = append(streams, models.Stream{
					Name:     media.Title,
					Title:    fmt.Sprintf("⌜ Filmifullizle ⌟ | %s", es.Title),
					URL:      es.URL,
					Quality:  es.Quality,
					Provider: ID,
					Headers:  es.Headers,
				})
			}
		}
	}

	return streams, nil
}
