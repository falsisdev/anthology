package sinezy

import (
	"context"
	"encoding/base64"
	"fmt"
	"io"
	"regexp"
	"strings"

	"github.com/PuerkitoBio/goquery"
	"github.com/falsisdev/anthology/pkg/extractors"
	"github.com/falsisdev/anthology/pkg/models"
	"github.com/falsisdev/anthology/pkg/provider"
	"github.com/falsisdev/anthology/pkg/utils"
)

const (
	ID      = "sinezy"
	Name    = "Sinezy"
	BaseURL = "https://sinezy.to"
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

var (
	// pdata['prt_dual0'] = 'BASE64...';
	// The frontend decodes these with atob(bakbuna + value) where bakbuna is
	// the base64 of '<iframe ' ('PGlmcmFtZSB'), so the value alone doesn't
	// decode cleanly — we must prepend it too.
	rePdata = regexp.MustCompile(`pdata\['prt_([a-zA-Z0-9_-]+)'\]\s*=\s*'([A-Za-z0-9+/=]+)'`)
	// <li id='dual0' class="psec"><a ...>DUAL</a></li>
	rePartLabel = regexp.MustCompile(`<li[^>]*id='([a-zA-Z0-9_-]+)'[^>]*class="psec"[^>]*>\s*<a[^>]*>([^<]+)</a>`)
	reIframeSrc = regexp.MustCompile(`src=["']([^"']+)["']`)
)

func headers() map[string]string {
	return map[string]string{
		"User-Agent": utils.DefaultUserAgent,
		"Referer":    BaseURL + "/",
	}
}

func (p *Provider) GetStreams(ctx context.Context, media models.MediaInfo) ([]models.Stream, error) {
	if media.Type != models.MediaTypeMovie {
		return nil, nil
	}

	searchQuery := media.Title
	if searchQuery == "" {
		searchQuery = media.OriginalTitle
	}

	var filmURL string
	// The search is AJAX-based: POST to /arama/ with form data
	// action=ajax_search&arama_kelime=QUERY
	searchURL := BaseURL + "/arama/"
	postData := "action=ajax_search&arama_kelime=" + strings.ReplaceAll(searchQuery, " ", "+")
	searchHeaders := headers()
	searchHeaders["Content-Type"] = "application/x-www-form-urlencoded"
	searchHeaders["X-Requested-With"] = "XMLHttpRequest"

	if resp, err := utils.DefaultClient.Request(ctx, "POST", searchURL, strings.NewReader(postData), searchHeaders); err == nil {
		defer resp.Body.Close()
		body, err := io.ReadAll(resp.Body)
		if err == nil {
			bodyStr := string(body)
			// Parse the AJAX response which contains HTML with film links
			// Each result is: <li><a title="..." href="..."><img...><span>...</span></a></li>
			cleanQuery := strings.ToLower(utils.NormalizeTurkish(searchQuery))
			origQuery := strings.ToLower(utils.NormalizeTurkish(media.OriginalTitle))

			// Extract all links from the response
			reLink := regexp.MustCompile(`<a[^>]*title="([^"]*)"[^>]*href="([^"]+)"`)
			for _, m := range reLink.FindAllStringSubmatch(bodyStr, -1) {
				if len(m) < 3 {
					continue
				}
				title := strings.ToLower(utils.NormalizeTurkish(m[1]))
				href := m[2]
				if href == "" || strings.Contains(href, "/arama") {
					continue
				}
				if strings.Contains(title, cleanQuery) || (origQuery != "" && strings.Contains(title, origQuery)) {
					filmURL = href
					break
				}
			}
		}
	}

	if filmURL == "" {
		slug := utils.ToSlug(media.OriginalTitle)
		if slug == "" {
			slug = utils.ToSlug(media.Title)
		}
		filmURL = fmt.Sprintf("%s/%s/", BaseURL, slug)
	}

	filmBody, err := utils.DefaultClient.Get(ctx, filmURL, headers())
	if err != nil {
		return nil, nil
	}
	bodyStr := string(filmBody)

	// Map part ids (dual0, tr1, ...) to their labels (DUAL, Türkçe, ...)
	partLabels := make(map[string]string)
	for _, m := range rePartLabel.FindAllStringSubmatch(bodyStr, -1) {
		if len(m) > 2 {
			partLabels[m[1]] = strings.TrimSpace(m[2])
		}
	}

	// Collect embed URLs from the pdata parts
	var embeds []struct {
		url   string
		label string
	}
	seen := make(map[string]bool)

	addEmbed := func(u, label string) {
		u = strings.TrimSpace(u)
		if u == "" || seen[u] {
			return
		}
		if strings.HasPrefix(u, "//") {
			u = "https:" + u
		}
		if !strings.HasPrefix(u, "http") {
			return
		}
		if strings.Contains(u, "facebook") || strings.Contains(u, "youtube") || strings.Contains(u, "disqus") {
			return
		}
		seen[u] = true
		embeds = append(embeds, struct {
			url   string
			label string
		}{u, label})
	}

	for _, m := range rePdata.FindAllStringSubmatch(bodyStr, -1) {
		partID, b64Val := m[1], m[2]
		label := partLabels[partID]
		if label == "" {
			label = strings.ToUpper(strings.TrimSuffix(strings.TrimPrefix(partID, "prt_"), "0"))
		}

		// Prepend the base64 of '<iframe ' exactly as the site's JS does
		full := "PGlmcmFtZSB" + b64Val
		if pad := len(full) % 4; pad > 0 {
			full += strings.Repeat("=", 4-pad)
		}
		if decoded, err := base64.StdEncoding.DecodeString(full); err == nil {
			if sm := reIframeSrc.FindStringSubmatch(string(decoded)); len(sm) > 1 {
				addEmbed(sm[1], label)
			}
		}
	}

	// Fallback: static iframes on the page
	if len(embeds) == 0 {
		filmDoc, err := goquery.NewDocumentFromReader(strings.NewReader(bodyStr))
		if err == nil {
			filmDoc.Find("iframe").Each(func(i int, s *goquery.Selection) {
				src, _ := s.Attr("src")
				if src == "" {
					src, _ = s.Attr("data-src")
				}
				addEmbed(src, "")
			})
		}
	}

	var streams []models.Stream
	for _, e := range embeds {
		extracted, err := extractors.Extract(ctx, e.url, filmURL)
		if err != nil || len(extracted) == 0 {
			continue
		}
		for _, es := range extracted {
			title := es.Title
			if e.label != "" {
				title = fmt.Sprintf("%s [%s]", es.Title, e.label)
			}
			streams = append(streams, models.Stream{
				Name:     media.Title,
				Title:    fmt.Sprintf("⌜ Sinezy ⌟ | %s", title),
				URL:      es.URL,
				Quality:  es.Quality,
				Provider: ID,
				Headers:  es.Headers,
			})
		}
	}

	return streams, nil
}
