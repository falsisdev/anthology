package extractors

import (
	"context"
	"encoding/json"
	"fmt"
	"regexp"
	"strings"

	"github.com/falsisdev/anthology/pkg/models"
	"github.com/falsisdev/anthology/pkg/utils"
)

var (
	reOkDataOptions = regexp.MustCompile(`data-options="([^"]+)"`)
)

type okVideoItem struct {
	Name string `json:"name"`
	URL  string `json:"url"`
}

type okMetadata struct {
	Videos         []okVideoItem `json:"videos"`
	HlsManifestURL string        `json:"hlsManifestUrl"`
}

type okFlashvars struct {
	Metadata okMetadata `json:"metadata"`
}

type okDataOptions struct {
	Flashvars okFlashvars `json:"flashvars"`
}

func ExtractOkru(ctx context.Context, embedURL, referer string) ([]models.Stream, error) {
	headers := map[string]string{
		"User-Agent": utils.DefaultUserAgent,
	}
	if referer != "" {
		headers["Referer"] = referer
	}

	body, err := utils.DefaultClient.Get(ctx, embedURL, headers)
	if err != nil {
		return nil, err
	}

	bodyStr := string(body)
	m := reOkDataOptions.FindStringSubmatch(bodyStr)
	if len(m) < 2 {
		return nil, nil
	}

	jsonStr := strings.ReplaceAll(m[1], "&quot;", "\"")
	var opts okDataOptions
	if err := json.Unmarshal([]byte(jsonStr), &opts); err != nil {
		return nil, err
	}

	meta := opts.Flashvars.Metadata
	var streams []models.Stream

	// HLS if available
	if meta.HlsManifestURL != "" {
		streams = append(streams, models.Stream{
			Title:   "⌜ OK.ru ⌟ | HLS (Otomatik)",
			URL:     meta.HlsManifestURL,
			Quality: "Auto",
		})
	}

	qualityMap := map[string]string{
		"ultra":  "4K",
		"quad":   "1440p",
		"full":   "1080p",
		"hd":     "720p",
		"sd":     "480p",
		"low":    "360p",
		"lowest": "240p",
		"mobile": "144p",
	}

	// Direct MP4 streams
	for _, v := range meta.Videos {
		if v.URL == "" {
			continue
		}
		q := qualityMap[strings.ToLower(v.Name)]
		if q == "" {
			q = strings.ToUpper(v.Name)
		}
		streams = append(streams, models.Stream{
			Title:   fmt.Sprintf("⌜ OK.ru ⌟ | MP4 (%s)", q),
			URL:     v.URL,
			Quality: q,
		})
	}

	return streams, nil
}
