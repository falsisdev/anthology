package extractors

import (
	"context"
	"fmt"
	"net/url"
	"regexp"

	"github.com/falsisdev/nuviotr/pkg/models"
	"github.com/falsisdev/nuviotr/pkg/utils"
)

var (
	reVideoplaySrc = regexp.MustCompile(`const\s+src\s*=\s*['"](/play\.m3u8[^'"]+)['"]`)
)

func ExtractVideoplay(ctx context.Context, embedURL, referer string) ([]models.Stream, error) {
	headers := map[string]string{
		"User-Agent": utils.DefaultUserAgent,
	}
	if referer != "" {
		headers["Referer"] = referer
	} else {
		headers["Referer"] = "https://diziwatch8.com/"
	}

	body, err := utils.DefaultClient.Get(ctx, embedURL, headers)
	if err != nil {
		return nil, err
	}

	bodyStr := string(body)
	m := reVideoplaySrc.FindStringSubmatch(bodyStr)
	if len(m) < 2 {
		return nil, nil
	}

	playPath := m[1]
	u, err := url.Parse(embedURL)
	baseURL := "https://videoplay.vip"
	if err == nil && u.Host != "" {
		baseURL = fmt.Sprintf("%s://%s", u.Scheme, u.Host)
	}

	directURL := fmt.Sprintf("%s%s", baseURL, playPath)

	return []models.Stream{
		{
			Title:   "⌜ VideoPlay ⌟ | HLS (1080p)",
			URL:     directURL,
			Quality: "1080p",
			Headers: map[string]string{
				"Referer": embedURL,
			},
		},
	}, nil
}
