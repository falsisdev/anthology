package dizipal

import (
	"bytes"
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/hmac"
	"crypto/sha512"
	"encoding/base64"
	"encoding/hex"
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
	ID         = "dizipal"
	Name       = "Dizipal"
	DecryptKey = "3hPn4uCjTVtfYWcjIcoJQ4cL1WWk1qxXI39egLYOmNv6IblA7eKJz68uU3eLzux1biZLCms0quEjTYniGv5z1JcKbNIsDQFSeIZOBZJz4is6pD7UyWDggWWzTLBQbHcQFpBQdClnuQaMNUHtLHTpzCvZy33p6I7wFBvL4fnXBYH84aUIyWGTRvM2G5cfoNf4705tO2kv"
)

// Dizipal frequently rotates domains (dizipal2122.com → dizipal2123.com → …).
// We try them in order and fall back if the current one is dead.
var candidateDomains = []string{
	"https://dizipal2124.com",
	"https://dizipal2123.com",
	"https://dizipal2125.com",
	"https://dizipal2122.com",
}

// BaseURL is the primary (first) domain; GetStreams will fall back to others.
var BaseURL = candidateDomains[0]

func copyMap(m map[string]string) map[string]string {
	out := make(map[string]string, len(m))
	for k, v := range m {
		out[k] = v
	}
	return out
}

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
	return []models.MediaType{models.MediaTypeTV, models.MediaTypeMovie}
}

func pbkdf2SHA512(password, salt []byte, iter, keyLen int) []byte {
	prf := hmac.New(sha512.New, password)
	hashLen := prf.Size()
	numBlocks := (keyLen + hashLen - 1) / hashLen

	var result []byte
	for block := 1; block <= numBlocks; block++ {
		prf.Reset()
		prf.Write(salt)
		prf.Write([]byte{byte(block >> 24), byte(block >> 16), byte(block >> 8), byte(block)})
		u := prf.Sum(nil)
		blockKey := make([]byte, len(u))
		copy(blockKey, u)

		for i := 2; i <= iter; i++ {
			prf.Reset()
			prf.Write(u)
			u = prf.Sum(nil)
			for j := range blockKey {
				blockKey[j] ^= u[j]
			}
		}
		result = append(result, blockKey...)
	}
	return result[:keyLen]
}

func decryptDizipal(keyStr, cipherJSON string) (string, error) {
	var obj struct {
		Ciphertext string `json:"ciphertext"`
		IV         string `json:"iv"`
		Salt       string `json:"salt"`
	}
	if err := json.Unmarshal([]byte(cipherJSON), &obj); err != nil {
		return "", err
	}

	salt, err := hex.DecodeString(obj.Salt)
	if err != nil {
		return "", err
	}
	iv, err := hex.DecodeString(obj.IV)
	if err != nil {
		return "", err
	}
	ct, err := base64.StdEncoding.DecodeString(obj.Ciphertext)
	if err != nil {
		return "", err
	}

	derivedKey := pbkdf2SHA512([]byte(keyStr), salt, 999, 32)
	block, err := aes.NewCipher(derivedKey)
	if err != nil {
		return "", err
	}

	if len(ct)%aes.BlockSize != 0 {
		return "", fmt.Errorf("invalid ciphertext size")
	}

	mode := cipher.NewCBCDecrypter(block, iv)
	mode.CryptBlocks(ct, ct)

	if len(ct) > 0 {
		padLen := int(ct[len(ct)-1])
		if padLen > 0 && padLen <= aes.BlockSize && padLen <= len(ct) {
			ct = ct[:len(ct)-padLen]
		}
	}

	return string(ct), nil
}

type dizipalAjaxSearch struct {
	Success bool `json:"success"`
	Results []struct {
		ID     int    `json:"id"`
		Title  string `json:"title"`
		Year   int    `json:"year"`
		Type   string `json:"type"` // "Film" or "Dizi"
		Poster string `json:"poster"`
		URL    string `json:"url"`
	} `json:"results"`
}

type dizipalVideoConfig struct {
	V string `json:"v"`
	T string `json:"t"`
	P string `json:"p"`
}

type imagestooResponse struct {
	HLS         bool   `json:"hls"`
	VideoSource string `json:"videoSource"`
	SecuredLink string `json:"securedLink"`
}

var (
	reDataCfg     = regexp.MustCompile(`data-cfg=["']([^"']+)["']`)
	reImagestooID = regexp.MustCompile(`imagestoo\.com/video/([a-zA-Z0-9_-]+)`)
)

func (p *Provider) GetStreams(ctx context.Context, media models.MediaInfo) ([]models.Stream, error) {
	searchQuery := media.Title
	if searchQuery == "" {
		searchQuery = media.OriginalTitle
	}

	headers := map[string]string{
		"User-Agent":       utils.DefaultUserAgent,
		"X-Requested-With": "XMLHttpRequest",
		"Accept":           "application/json, text/javascript, */*; q=0.01",
	}

	// Dizipal frequently rotates domains. Try each candidate domain until
	// one responds successfully.
	var respBytes []byte
	var err error
	var activeBaseURL string

	for _, d := range candidateDomains {
		searchURL := fmt.Sprintf("%s/ajax-search?q=%s", d, url.QueryEscape(searchQuery))
		h := copyMap(headers)
		h["Referer"] = d + "/"
		respBytes, err = utils.DefaultClient.Get(ctx, searchURL, h)
		if err == nil && len(respBytes) > 0 && bytes.Contains(respBytes, []byte(`"success": true`)) {
			activeBaseURL = d
			break
		}
		if media.OriginalTitle != "" && media.OriginalTitle != searchQuery {
			searchURL = fmt.Sprintf("%s/ajax-search?q=%s", d, url.QueryEscape(media.OriginalTitle))
			respBytes, err = utils.DefaultClient.Get(ctx, searchURL, h)
			if err == nil && len(respBytes) > 0 && bytes.Contains(respBytes, []byte(`"success": true`)) {
				activeBaseURL = d
				break
			}
		}
	}

	if activeBaseURL == "" {
		// Fall back to original BaseURL (may still work if it redirects)
		activeBaseURL = BaseURL
		searchURL := fmt.Sprintf("%s/ajax-search?q=%s", BaseURL, url.QueryEscape(searchQuery))
		h := copyMap(headers)
		h["Referer"] = BaseURL + "/"
		respBytes, err = utils.DefaultClient.Get(ctx, searchURL, h)
	}

	// Update the Referer in headers for subsequent requests
	headers["Referer"] = activeBaseURL + "/"

	var targetURL string
	var isSeries bool

	if err == nil && len(respBytes) > 0 {
		var sRes dizipalAjaxSearch
		if err := json.Unmarshal(respBytes, &sRes); err == nil && sRes.Success && len(sRes.Results) > 0 {
			targetType := "Film"
			if media.Type == models.MediaTypeTV {
				targetType = "Dizi"
			}

			for _, item := range sRes.Results {
				if strings.EqualFold(item.Type, targetType) {
					targetURL = item.URL
					if targetType == "Dizi" {
						isSeries = true
					}
					break
				}
			}
			if targetURL == "" && len(sRes.Results) > 0 {
				targetURL = sRes.Results[0].URL
				if strings.EqualFold(sRes.Results[0].Type, "Dizi") {
					isSeries = true
				}
			}
		}
	}

	if targetURL == "" {
		slug := utils.ToSlug(media.Title)
		if slug == "" {
			slug = utils.ToSlug(media.OriginalTitle)
		}
		if media.Type == models.MediaTypeTV {
			targetURL = fmt.Sprintf("%s/dizi/%s", activeBaseURL, slug)
			isSeries = true
		} else {
			targetURL = fmt.Sprintf("%s/film/%s", activeBaseURL, slug)
		}
	}

	pageURL := targetURL
	if isSeries || media.Type == models.MediaTypeTV {
		season := media.Season
		if season <= 0 {
			season = 1
		}
		episode := media.Episode
		if episode <= 0 {
			episode = 1
		}
		pageURL = fmt.Sprintf("%s/sezon-%d/bolum-%d", strings.TrimRight(targetURL, "/"), season, episode)
	}

	body, err := utils.DefaultClient.Get(ctx, pageURL, map[string]string{
		"User-Agent": utils.DefaultUserAgent,
		"Referer":    activeBaseURL + "/",
	})
	if err != nil {
		return nil, err
	}

	var streams []models.Stream
	bodyStr := string(body)

	// 2. Extract data-cfg base64 payload
	cfgMatches := reDataCfg.FindStringSubmatch(bodyStr)
	if len(cfgMatches) > 1 {
		rawCfg := cfgMatches[1]
		if pad := len(rawCfg) % 4; pad > 0 {
			rawCfg += strings.Repeat("=", 4-pad)
		}
		if decoded, err := base64.StdEncoding.DecodeString(rawCfg); err == nil {
			var cfg dizipalVideoConfig
			if err := json.Unmarshal(decoded, &cfg); err == nil && cfg.V != "" {
				embedURL := cfg.V
				if strings.HasPrefix(embedURL, "//") {
					embedURL = "https:" + embedURL
				}

				if imgMatches := reImagestooID.FindStringSubmatch(embedURL); len(imgMatches) > 1 {
					videoID := imgMatches[1]
					imgAPIURL := fmt.Sprintf("https://imagestoo.com/player/index.php?data=%s&do=getVideo", videoID)
					imgHeaders := map[string]string{
						"User-Agent":       utils.DefaultUserAgent,
						"Referer":          embedURL,
						"X-Requested-With": "XMLHttpRequest",
						"Accept":           "*/*",
					}
					if imgResp, err := utils.DefaultClient.Request(ctx, "POST", imgAPIURL, strings.NewReader(""), imgHeaders); err == nil {
						defer imgResp.Body.Close()
						var imgRes imagestooResponse
						if err := json.NewDecoder(imgResp.Body).Decode(&imgRes); err == nil {
							m3u8URL := imgRes.SecuredLink
							if m3u8URL == "" {
								m3u8URL = imgRes.VideoSource
							}
							if m3u8URL != "" {
								streams = append(streams, models.Stream{
									Name:     media.Title,
									Title:    "⌜ Dizipal ⌟ | Imagestoo (HLS)",
									Quality:  "1080p",
									URL:      m3u8URL,
									Provider: ID,
									Headers: map[string]string{
										"Referer":    embedURL,
										"User-Agent": utils.DefaultUserAgent,
									},
								})
							}
						}
					}
				}

				if extracted, err := extractors.Extract(ctx, embedURL, pageURL); err == nil && len(extracted) > 0 {
					for _, es := range extracted {
						streams = append(streams, models.Stream{
							Name:     media.Title,
							Title:    fmt.Sprintf("⌜ Dizipal ⌟ | %s", es.Title),
							Quality:  es.Quality,
							URL:      es.URL,
							Provider: ID,
							Headers:  es.Headers,
						})
					}
				}
			}
		}
	}

	// 3. Fallback: Check for encrypted player div (data-rm-k)
	doc, err := goquery.NewDocumentFromReader(bytes.NewReader(body))
	if err == nil {
		doc.Find("div[data-rm-k='true']").Each(func(i int, s *goquery.Selection) {
			encryptedJSON := strings.TrimSpace(s.Text())
			if encryptedJSON != "" {
				if playerURL, err := decryptDizipal(DecryptKey, encryptedJSON); err == nil && playerURL != "" {
					if strings.HasPrefix(playerURL, "//") {
						playerURL = "https:" + playerURL
					}
					if extracted, err := extractors.Extract(ctx, playerURL, pageURL); err == nil && len(extracted) > 0 {
						for _, es := range extracted {
							streams = append(streams, models.Stream{
								Name:     media.Title,
								Title:    fmt.Sprintf("⌜ Dizipal ⌟ | %s", es.Title),
								Quality:  es.Quality,
								URL:      es.URL,
								Provider: ID,
								Headers:  es.Headers,
							})
						}
					}
				}
			}
		})

		// 4. Fallback: Check iframes
		doc.Find("iframe").Each(func(i int, s *goquery.Selection) {
			src, _ := s.Attr("src")
			if src == "" || strings.Contains(src, "facebook") || strings.Contains(src, "youtube") {
				return
			}
			if strings.HasPrefix(src, "//") {
				src = "https:" + src
			}
			if extracted, err := extractors.Extract(ctx, src, pageURL); err == nil && len(extracted) > 0 {
				for _, es := range extracted {
					streams = append(streams, models.Stream{
						Name:     media.Title,
						Title:    fmt.Sprintf("⌜ Dizipal ⌟ | %s", es.Title),
						Quality:  es.Quality,
						URL:      es.URL,
						Provider: ID,
						Headers:  es.Headers,
					})
				}
			}
		})
	}

	return streams, nil
}
