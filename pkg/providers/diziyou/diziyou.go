package diziyou

import (
	"bytes"
	"context"
	"fmt"
	"net/url"
	"path"
	"strings"

	"github.com/PuerkitoBio/goquery"
	"github.com/falsisdev/nuviotr/pkg/models"
	"github.com/falsisdev/nuviotr/pkg/provider"
	"github.com/falsisdev/nuviotr/pkg/utils"
)

const (
	ID         = "diziyou"
	Name       = "DiziYou"
	BaseURL    = "https://www.diziyou.one"
	StorageURL = "https://storage.diziyou.one"
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

func (p *Provider) GetStreams(ctx context.Context, media models.MediaInfo) ([]models.Stream, error) {
	if media.Type != models.MediaTypeTV {
		return nil, nil
	}

	headers := map[string]string{
		"User-Agent": utils.DefaultUserAgent,
		"Referer":    BaseURL + "/",
		"Accept":     "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
	}

	query := media.Title
	if query == "" {
		query = media.OriginalTitle
	}

	searchURL := fmt.Sprintf("%s/?s=%s", BaseURL, url.QueryEscape(query))
	body, err := utils.DefaultClient.Get(ctx, searchURL, headers)
	if err != nil {
		return nil, fmt.Errorf("diziyou search failed: %w", err)
	}

	doc, err := goquery.NewDocumentFromReader(bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("failed to parse search html: %w", err)
	}

	searchTitleLower := strings.ToLower(strings.TrimSpace(media.Title))
	orgTitleLower := strings.ToLower(strings.TrimSpace(media.OriginalTitle))
	var foundLink string

	doc.Find(".list-series a, .post-title a, #categorytitle a, .entry-title a").EachWithBreak(func(i int, s *goquery.Selection) bool {
		href, exists := s.Attr("href")
		if !exists || strings.Contains(href, "/kategori/") {
			return true
		}

		currentTitle := strings.ToLower(strings.TrimSpace(strings.ReplaceAll(s.Text(), "izle", "")))
		isExact := (currentTitle == searchTitleLower || currentTitle == orgTitleLower)
		isBrackets := strings.Contains(currentTitle, searchTitleLower+" (") || strings.Contains(currentTitle, orgTitleLower+" (")
		isDiziSuffix := strings.Contains(currentTitle, searchTitleLower+" dizi") || strings.Contains(currentTitle, orgTitleLower+" dizi")

		if isExact || isBrackets || isDiziSuffix {
			foundLink = href
			return false
		}
		return true
	})

	if foundLink == "" {
		firstLink := doc.Find(".list-series a, .post-title a, #categorytitle a, .entry-title a").First()
		if href, exists := firstLink.Attr("href"); exists && !strings.Contains(href, "/kategori/") {
			foundLink = href
		}
	}

	if foundLink == "" {
		return nil, nil
	}

	// Extract slug
	cleanPath := strings.Trim(foundLink, "/")
	slug := path.Base(cleanPath)

	epURL := fmt.Sprintf("%s/%s-%d-sezon-%d-bolum/", BaseURL, slug, media.Season, media.Episode)
	epBody, err := utils.DefaultClient.Get(ctx, epURL, headers)
	if err != nil {
		return nil, fmt.Errorf("failed to get episode page: %w", err)
	}

	epDoc, err := goquery.NewDocumentFromReader(bytes.NewReader(epBody))
	if err != nil {
		return nil, fmt.Errorf("failed to parse episode page: %w", err)
	}

	playerSrc, exists := epDoc.Find("#diziyouPlayer").Attr("src")
	if !exists || playerSrc == "" {
		return nil, nil
	}

	// Extract item ID from player src (e.g. /episodes/10551.html -> 10551)
	srcPath := strings.Split(playerSrc, "?")[0]
	baseItem := path.Base(srcPath)
	itemID := strings.TrimSuffix(baseItem, ".html")

	epHTML := string(epBody)
	hasSub := strings.Contains(epHTML, "turkceAltyazili")
	hasDub := strings.Contains(epHTML, "turkceDublaj")

	var streams []models.Stream

	if hasSub {
		streams = append(streams, models.Stream{
			Name:     media.Title,
			Title:    "⌜ DiziYou ⌟ | 🌐 Türkçe Altyazılı",
			URL:      fmt.Sprintf("%s/episodes/%s/play.m3u8", StorageURL, itemID),
			Quality:  "1080p",
			Provider: ID,
			Headers: map[string]string{
				"Referer": BaseURL + "/",
			},
			Subtitles: []models.Subtitle{
				{
					Label: "Turkish",
					URL:   fmt.Sprintf("%s/subtitles/%s/tr.vtt", StorageURL, itemID),
				},
			},
		})
	}

	if hasDub {
		streams = append(streams, models.Stream{
			Name:     media.Title,
			Title:    "⌜ DiziYou ⌟ | 🇹🇷 Türkçe Dublaj",
			URL:      fmt.Sprintf("%s/episodes/%s_tr/play.m3u8", StorageURL, itemID),
			Quality:  "1080p",
			Provider: ID,
			Headers: map[string]string{
				"Referer": BaseURL + "/",
			},
			Subtitles: []models.Subtitle{
				{
					Label: "Turkish",
					URL:   fmt.Sprintf("%s/subtitles/%s/tr.vtt", StorageURL, itemID),
				},
			},
		})
	}

	if len(streams) == 0 {
		streams = append(streams, models.Stream{
			Name:     media.Title,
			Title:    "⌜ DiziYou ⌟ | 🌐 Otomatik Stream",
			URL:      fmt.Sprintf("%s/episodes/%s/play.m3u8", StorageURL, itemID),
			Quality:  "1080p",
			Provider: ID,
			Headers: map[string]string{
				"Referer": BaseURL + "/",
			},
		})
	}

	return streams, nil
}
