package dizilla

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/url"
	"regexp"
	"strings"

	"github.com/falsisdev/anthology/pkg/extractors"
	"github.com/falsisdev/anthology/pkg/models"
	"github.com/falsisdev/anthology/pkg/provider"
	"github.com/falsisdev/anthology/pkg/utils"
)

const (
	ID            = "dizilla"
	Name          = "Dizilla"
	BaseURL       = "https://dizilla.now"
	privateAESKey = "9bYMCNQiWsXIYFWYAu7EkdsSbmGBTyUI"
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

type searchAPIResponse struct {
	Success  bool   `json:"success"`
	Response string `json:"response"`
}

type dizillaSearchResultItem struct {
	ObjectID   int    `json:"object_id"`
	ObjectName string `json:"object_name"`
	UsedSlug   string `json:"used_slug"`
}

type searchDecryptedData struct {
	State  bool                      `json:"state"`
	Result []dizillaSearchResultItem `json:"result"`
}

var (
	reSecureData    = regexp.MustCompile(`"secureData"\s*:\s*"([^"]+)"`)
	reSourceContent = regexp.MustCompile(`"source_content"\s*:\s*"((?:[^"\\]|\\.)*)"`)
	reIframeSrc     = regexp.MustCompile(`src=["']([^"']+)["']`)
)

func decryptAES(keyStr string, b64Cipher string) (string, error) {
	key := []byte(keyStr)
	iv := make([]byte, 16) // 16 zeros as per Dizilla implementation

	ct, err := base64.StdEncoding.DecodeString(b64Cipher)
	if err != nil {
		return "", err
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	if len(ct)%aes.BlockSize != 0 {
		return "", fmt.Errorf("ciphertext is not a multiple of the block size")
	}

	mode := cipher.NewCBCDecrypter(block, iv)
	mode.CryptBlocks(ct, ct)

	padLen := int(ct[len(ct)-1])
	if padLen > 0 && padLen <= aes.BlockSize {
		ct = ct[:len(ct)-padLen]
	}

	return string(ct), nil
}

func (p *Provider) GetStreams(ctx context.Context, media models.MediaInfo) ([]models.Stream, error) {
	if media.Type != models.MediaTypeTV {
		return nil, nil
	}

	searchQuery := media.Title
	if searchQuery == "" {
		searchQuery = media.OriginalTitle
	}

	searchAPIURL := fmt.Sprintf("%s/api/bg/searchContent", BaseURL)
	headers := map[string]string{
		"User-Agent":       utils.DefaultUserAgent,
		"Referer":          BaseURL + "/",
		"X-Requested-With": "XMLHttpRequest",
		"Accept":           "application/json, text/plain, */*",
	}

	formData := url.Values{
		"searchterm": {searchQuery},
	}

	headers["Content-Type"] = "application/x-www-form-urlencoded"

	resp, err := utils.DefaultClient.Request(ctx, "POST", searchAPIURL, strings.NewReader(formData.Encode()), headers)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var apiRes searchAPIResponse
	if err := json.Unmarshal(bodyBytes, &apiRes); err != nil {
		return nil, err
	}

	if !apiRes.Success || apiRes.Response == "" {
		return nil, nil
	}

	decryptedJSON, err := decryptAES(privateAESKey, apiRes.Response)
	if err != nil {
		return nil, err
	}

	var searchDec searchDecryptedData
	if err := json.Unmarshal([]byte(decryptedJSON), &searchDec); err != nil {
		return nil, err
	}

	if len(searchDec.Result) == 0 {
		return nil, nil
	}

	// Match the best series slug
	cleanQuery := strings.ToLower(utils.NormalizeTurkish(searchQuery))
	origQuery := strings.ToLower(utils.NormalizeTurkish(media.OriginalTitle))
	var seriesSlug string

	for _, item := range searchDec.Result {
		name := strings.ToLower(utils.NormalizeTurkish(item.ObjectName))
		if strings.Contains(name, cleanQuery) || (origQuery != "" && strings.Contains(name, origQuery)) {
			seriesSlug = item.UsedSlug
			break
		}
	}
	if seriesSlug == "" && len(searchDec.Result) > 0 {
		seriesSlug = searchDec.Result[0].UsedSlug
	}

	seriesSlug = strings.TrimPrefix(seriesSlug, "dizi/")
	seriesSlug = strings.TrimPrefix(seriesSlug, "/")

	if seriesSlug == "" {
		return nil, nil
	}

	// Format episode URL: https://dizilla.now/{slug}-{season}-sezon-{episode}-bolum
	epURL := fmt.Sprintf("%s/%s-%d-sezon-%d-bolum", BaseURL, seriesSlug, media.Season, media.Episode)
	epHeaders := map[string]string{
		"User-Agent": utils.DefaultUserAgent,
		"Referer":    BaseURL + "/",
	}

	epBody, err := utils.DefaultClient.Get(ctx, epURL, epHeaders)
	if err != nil {
		return nil, err
	}

	epHTML := string(epBody)
	m := reSecureData.FindStringSubmatch(epHTML)
	if len(m) < 2 {
		return nil, nil
	}

	decryptedSecure, err := decryptAES(privateAESKey, m[1])
	if err != nil {
		return nil, err
	}

	var streams []models.Stream
	seenURLs := make(map[string]bool)

	addStream := func(streamURL, title, quality string) {
		if streamURL == "" || seenURLs[streamURL] {
			return
		}
		seenURLs[streamURL] = true
		streams = append(streams, models.Stream{
			Name:     media.Title,
			Title:    fmt.Sprintf("⌜ Dizilla ⌟ | %s", title),
			Quality:  quality,
			URL:      streamURL,
			Provider: ID,
			Headers: map[string]string{
				"Referer":    BaseURL + "/",
				"User-Agent": utils.DefaultUserAgent,
			},
		})
	}

	sourceMatches := reSourceContent.FindAllStringSubmatch(decryptedSecure, -1)
	for i, sm := range sourceMatches {
		if len(sm) < 2 {
			continue
		}
		rawHTML := strings.ReplaceAll(sm[1], `\"`, `"`)
		rawHTML = strings.ReplaceAll(rawHTML, `\/`, `/`)

		if im := reIframeSrc.FindStringSubmatch(rawHTML); len(im) > 1 {
			iframeURL := im[1]
			if strings.HasPrefix(iframeURL, "//") {
				iframeURL = "https:" + iframeURL
			}

			extracted, err := extractors.Extract(ctx, iframeURL, epURL)
			if err == nil && len(extracted) > 0 {
				for _, es := range extracted {
					addStream(es.URL, es.Title, es.Quality)
				}
			} else {
				addStream(iframeURL, fmt.Sprintf("Alternatif %d", i+1), "1080p")
			}
		}
	}

	return streams, nil
}
