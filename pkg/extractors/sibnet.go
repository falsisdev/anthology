package extractors

import (
	"context"
	"fmt"
	"regexp"

	"github.com/falsisdev/nuviotr/pkg/models"
	"github.com/falsisdev/nuviotr/pkg/utils"
)

var (
	reSibnetVideo = regexp.MustCompile(`["'](/v/[^"']+\.mp4)["']`)
)

func ExtractSibnet(ctx context.Context, embedURL, referer string) ([]models.Stream, error) {
	headers := map[string]string{
		"User-Agent": utils.DefaultUserAgent,
		"Referer":    "https://video.sibnet.ru/",
	}

	body, err := utils.DefaultClient.Get(ctx, embedURL, headers)
	if err != nil {
		return nil, err
	}

	bodyStr := string(body)
	m := reSibnetVideo.FindStringSubmatch(bodyStr)
	if len(m) < 2 {
		return nil, nil
	}

	videoPath := m[1]
	directURL := fmt.Sprintf("https://video.sibnet.ru%s", videoPath)

	return []models.Stream{
		{
			Title:   "Sibnet (MP4)",
			URL:     directURL,
			Quality: "720p",
			Headers: map[string]string{
				"Referer": embedURL,
			},
		},
	}, nil
}
