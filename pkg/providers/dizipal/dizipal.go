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
	BaseURL    = "https://dizipal1579.com"
	DecryptKey = "3hPn4uCjTVtfYWcjIcoJQ4cL1WWk1qxXI39egLYOmNv6IblA7eKJz68uU3eLzux1biZLCms0quEjTYniGv5z1JcKbNIsDQFSeIZOBZJz4is6pD7UyWDggWWzTLBQbHcQFpBQdClnuQaMNUHtLHTpzCvZy33p6I7wFBvL4fnXBYH84aUIyWGTRvM2G5cfoNf4705tO2kv"
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

type dizipalSearchResult struct {
	Data struct {
		Result []struct {
			ObjectID    int    `json:"object_id"`
			UsedSlug    string `json:"used_slug"`
			ObjectName  string `json:"object_name"`
			ReleaseYear int    `json:"object_release_year"`
			ImdbID      string `json:"object_related_imdb_id"`
		} `json:"result"`
	} `json:"data"`
}

func (p *Provider) GetStreams(ctx context.Context, media models.MediaInfo) ([]models.Stream, error) {
	searchQuery := media.Title
	if searchQuery == "" {
		searchQuery = media.OriginalTitle
	}

	searchURL := fmt.Sprintf("%s/bg/searchcontent", BaseURL)
	postData := url.Values{
		"searchterm": {searchQuery},
	}
	headers := map[string]string{
		"User-Agent":       utils.DefaultUserAgent,
		"Referer":          BaseURL + "/",
		"Content-Type":     "application/x-www-form-urlencoded",
		"X-Requested-With": "XMLHttpRequest",
	}

	resp, err := utils.DefaultClient.Request(ctx, "POST", searchURL, strings.NewReader(postData.Encode()), headers)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var sRes dizipalSearchResult
	if err := json.NewDecoder(resp.Body).Decode(&sRes); err != nil {
		return nil, err
	}

	var targetSlug string
	for _, item := range sRes.Data.Result {
		if media.IMDbID != "" && item.ImdbID == media.IMDbID {
			targetSlug = item.UsedSlug
			break
		}
		if targetSlug == "" {
			targetSlug = item.UsedSlug
		}
	}

	if targetSlug == "" {
		slug := utils.ToSlug(media.OriginalTitle)
		if slug == "" {
			slug = utils.ToSlug(media.Title)
		}
		if media.Type == models.MediaTypeTV {
			targetSlug = "series/" + slug
		} else {
			targetSlug = "film/" + slug
		}
	}

	var pageURL string
	if media.Type == models.MediaTypeTV {
		cleanSlug := strings.TrimPrefix(targetSlug, "series/")
		cleanSlug = strings.TrimPrefix(cleanSlug, "film/")
		cleanSlug = strings.TrimPrefix(cleanSlug, "movies/")
		pageURL = fmt.Sprintf("%s/bolum/%s-%dx%d", BaseURL, cleanSlug, media.Season, media.Episode)
	} else {
		if strings.HasPrefix(targetSlug, "movies/") || strings.HasPrefix(targetSlug, "film/") {
			pageURL = fmt.Sprintf("%s/%s", BaseURL, targetSlug)
		} else {
			pageURL = fmt.Sprintf("%s/movies/%s", BaseURL, targetSlug)
		}
	}

	body, err := utils.DefaultClient.Get(ctx, pageURL, headers)
	if err != nil {
		return nil, err
	}

	doc, err := goquery.NewDocumentFromReader(bytes.NewReader(body))
	if err != nil {
		return nil, err
	}

	var streams []models.Stream

	// Check for encrypted player div
	encryptedJSON := ""
	doc.Find("div[data-rm-k='true']").Each(func(i int, s *goquery.Selection) {
		encryptedJSON = strings.TrimSpace(s.Text())
	})

	if encryptedJSON != "" {
		playerURL, err := decryptDizipal(DecryptKey, encryptedJSON)
		if err == nil && playerURL != "" {
			if strings.HasPrefix(playerURL, "//") {
				playerURL = "https:" + playerURL
			}
			extracted, err := extractors.Extract(ctx, playerURL, pageURL)
			if err == nil && len(extracted) > 0 {
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

	// Also check iframes
	doc.Find("iframe").Each(func(i int, s *goquery.Selection) {
		src, _ := s.Attr("src")
		if src == "" || strings.Contains(src, "facebook") || strings.Contains(src, "youtube") {
			return
		}
		if strings.HasPrefix(src, "//") {
			src = "https:" + src
		}
		extracted, err := extractors.Extract(ctx, src, pageURL)
		if err == nil && len(extracted) > 0 {
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

	return streams, nil
}
