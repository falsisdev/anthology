package catalog

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
	"github.com/falsisdev/anthology/pkg/utils"
)

const hdfcBase = "https://www.hdfilmcehennemi.now"

func hdfcHeaders() map[string]string {
	return map[string]string{
		"User-Agent": utils.DefaultUserAgent,
		"Referer":    hdfcBase + "/",
	}
}

func searchHDFC(ctx context.Context, query string) ([]MetaItem, error) {
	searchURL := fmt.Sprintf("%s/?s=%s", hdfcBase, url.QueryEscape(query))
	body, err := utils.DefaultClient.Get(ctx, searchURL, hdfcHeaders())
	if err != nil {
		return nil, err
	}

	doc, err := goquery.NewDocumentFromReader(bytes.NewReader(body))
	if err != nil {
		return nil, err
	}

	var results []MetaItem
	seen := make(map[string]bool)

	doc.Find(".result-item, article, .poster").Each(func(i int, s *goquery.Selection) {
		a := s.Find("a").First()
		href, _ := a.Attr("href")
		if !strings.Contains(href, "/film/") || seen[href] {
			return
		}
		seen[href] = true

		img := s.Find("img").First()
		poster, _ := img.Attr("data-src")
		if poster == "" || strings.HasPrefix(poster, "data:") {
			poster, _ = img.Attr("data-original")
		}
		if poster == "" || strings.HasPrefix(poster, "data:") {
			poster, _ = img.Attr("src")
		}
		if strings.HasPrefix(poster, "data:") {
			poster = ""
		}

		title := strings.TrimSpace(s.Find("h2.flbaslik, .flbaslik, .title, h3, h2").First().Text())
		if title == "" {
			title, _ = img.Attr("alt")
		}
		if title == "" {
			title, _ = a.Attr("title")
		}
		title = regexp.MustCompile(`<[^>]*>`).ReplaceAllString(title, "")
		title = strings.TrimSpace(title)

		clean := strings.Trim(href, "/")
		parts := strings.Split(clean, "/")
		slug := parts[len(parts)-1]
		if title == "" {
			title = strings.Title(strings.ReplaceAll(strings.TrimSuffix(slug, "-izle"), "-", " "))
		}

		results = append(results, MetaItem{
			ID:          "hdfc:movie:" + slug,
			Type:        "movie",
			Name:        title,
			Poster:      poster,
			Background:  poster,
			Description: title + " - HDFilmCehennemi Filmi",
			Genres:      []string{"HDFilmCehennemi", "Film"},
		})
	})

	return results, nil
}

func defaultHDFC(ctx context.Context) ([]MetaItem, error) {
	body, err := utils.DefaultClient.Get(ctx, hdfcBase+"/", hdfcHeaders())
	if err != nil {
		return nil, err
	}

	doc, err := goquery.NewDocumentFromReader(bytes.NewReader(body))
	if err != nil {
		return nil, err
	}

	var results []MetaItem
	seen := make(map[string]bool)

	doc.Find(".poster a, article a").Each(func(i int, s *goquery.Selection) {
		href, _ := s.Attr("href")
		if !strings.Contains(href, "/film/") || seen[href] {
			return
		}
		seen[href] = true

		img := s.Find("img").First()
		poster, _ := img.Attr("data-src")
		if poster == "" || strings.HasPrefix(poster, "data:") {
			poster, _ = img.Attr("data-original")
		}
		if poster == "" || strings.HasPrefix(poster, "data:") {
			poster, _ = img.Attr("src")
		}
		if strings.HasPrefix(poster, "data:") {
			poster = ""
		}

		title := strings.TrimSpace(s.Find("h2.flbaslik, .flbaslik, .title, h2, h3").First().Text())
		if title == "" {
			title, _ = img.Attr("alt")
		}
		if title == "" {
			for _, l := range strings.Split(s.Text(), "\n") {
				l = strings.TrimSpace(l)
				if l != "" && !strings.Contains(l, "Dublaj") && !strings.Contains(l, "Altyazı") {
					title = l
					break
				}
			}
		}
		title = regexp.MustCompile(`<[^>]*>`).ReplaceAllString(title, "")
		title = strings.TrimSpace(title)

		clean := strings.Trim(href, "/")
		parts := strings.Split(clean, "/")
		slug := parts[len(parts)-1]
		if title == "" {
			title = strings.Title(strings.ReplaceAll(strings.TrimSuffix(slug, "-izle"), "-", " "))
		}

		results = append(results, MetaItem{
			ID:          "hdfc:movie:" + slug,
			Type:        "movie",
			Name:        title,
			Poster:      poster,
			Background:  poster,
			Description: title + " - HDFilmCehennemi Popüler Film",
			Genres:      []string{"HDFilmCehennemi", "Popüler Film"},
		})
	})

	return results, nil
}

func getHDFCMeta(ctx context.Context, movieID string) (*MetaDetail, error) {
	slug := strings.TrimPrefix(movieID, "hdfc:movie:")
	filmURL := fmt.Sprintf("%s/film/%s/", hdfcBase, slug)

	body, err := utils.DefaultClient.Get(ctx, filmURL, hdfcHeaders())
	if err != nil {
		return nil, err
	}

	doc, err := goquery.NewDocumentFromReader(bytes.NewReader(body))
	if err != nil {
		return nil, err
	}

	title := strings.TrimSpace(doc.Find("h1").First().Text())
	if title == "" {
		title = slug
	}

	poster, _ := doc.Find(".poster img, .cover img, article img").First().Attr("src")
	desc := strings.TrimSpace(doc.Find(".content, .ozet, p").First().Text())

	return &MetaDetail{
		ID:          movieID,
		Type:        "movie",
		Name:        title,
		Poster:      poster,
		Background:  poster,
		Description: desc,
		Genres:      []string{"HDFilmCehennemi", "Film"},
	}, nil
}

func getHDFCStream(ctx context.Context, movieID string) ([]models.Stream, error) {
	slug := strings.TrimPrefix(movieID, "hdfc:movie:")
	filmURL := fmt.Sprintf("%s/film/%s/", hdfcBase, slug)

	body, err := utils.DefaultClient.Get(ctx, filmURL, hdfcHeaders())
	if err != nil {
		return nil, err
	}

	bodyStr := string(body)
	reNonce := regexp.MustCompile(`nonce:\s*'([^']+)'`)
	mNonce := reNonce.FindStringSubmatch(bodyStr)
	if len(mNonce) < 2 {
		return nil, nil
	}
	nonce := mNonce[1]

	doc, err := goquery.NewDocumentFromReader(bytes.NewReader(body))
	if err != nil {
		return nil, err
	}

	var streams []models.Stream
	doc.Find("a[data-player-name]").Each(func(i int, s *goquery.Selection) {
		playerName, _ := s.Attr("data-player-name")
		postID, _ := s.Attr("data-post-id")

		if playerName != "" && postID != "" {
			ajaxURL := hdfcBase + "/wp-admin/admin-ajax.php"
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
				"Referer":          filmURL,
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
					playerURL := res.Data.URL
					if strings.HasPrefix(playerURL, "//") {
						playerURL = "https:" + playerURL
					}
					extracted, err := extractors.Extract(ctx, playerURL, filmURL)
					if err == nil && len(extracted) > 0 {
						for _, es := range extracted {
							streams = append(streams, models.Stream{
								Title:    fmt.Sprintf("⌜ HDFilmCehennemi ⌟ | %s (%s)", playerName, es.Title),
								Quality:  es.Quality,
								Provider: "hdfilmcehennemi",
								URL:      es.URL,
								YTID:     es.YTID,
								Headers:  es.Headers,
							})
						}
					}
				}
			}
		}
	})

	return streams, nil
}
