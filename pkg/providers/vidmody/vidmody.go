package vidmody

import (
	"context"
	"fmt"
	"strings"

	"github.com/falsisdev/anthology/pkg/models"
	"github.com/falsisdev/anthology/pkg/provider"
	"github.com/falsisdev/anthology/pkg/utils"
)

const (
	ID      = "vidmody"
	Name    = "Vidmody"
	BaseURL = "https://vidmody.com"
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
	return []models.MediaType{models.MediaTypeMovie, models.MediaTypeTV}
}

func (p *Provider) GetStreams(ctx context.Context, media models.MediaInfo) ([]models.Stream, error) {
	if media.IMDbID == "" || !strings.HasPrefix(media.IMDbID, "tt") {
		return nil, nil
	}

	var targetURL string
	var displayTitle string

	if media.Type == models.MediaTypeMovie {
		targetURL = fmt.Sprintf("%s/vs/%s", BaseURL, media.IMDbID)
		displayTitle = media.Title
		if media.Year != "" {
			displayTitle = fmt.Sprintf("%s (%s)", media.Title, media.Year)
		}
	} else if media.Type == models.MediaTypeTV {
		targetURL = fmt.Sprintf("%s/vs/%s/s%d/e%02d", BaseURL, media.IMDbID, media.Season, media.Episode)
		displayTitle = fmt.Sprintf("%s - S%02dE%02d", media.Title, media.Season, media.Episode)
	} else {
		return nil, nil
	}

	headers := map[string]string{
		"Referer":    BaseURL + "/",
		"User-Agent": utils.DefaultUserAgent,
	}

	// Verify target link with HEAD check
	if !utils.DefaultClient.CheckAlive(ctx, targetURL, headers) {
		return nil, nil
	}

	return []models.Stream{
		{
			Name:     "Vidmody",
			Title:    displayTitle,
			URL:      targetURL,
			Quality:  "Auto",
			Provider: ID,
			Headers:  headers,
		},
	}, nil
}
