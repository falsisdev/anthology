package diziwatch

import (
	"context"
	"fmt"

	"github.com/falsisdev/nuviotr/pkg/extractors"
	"github.com/falsisdev/nuviotr/pkg/models"
	"github.com/falsisdev/nuviotr/pkg/provider"
)

const (
	ID      = "diziwatch"
	Name    = "Diziwatch"
	BaseURL = "https://diziwatch8.com"
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

func (p *Provider) GetStreams(ctx context.Context, media models.MediaInfo) ([]models.Stream, error) {
	if media.TMDBID == "" {
		return nil, nil
	}

	var embedURL string
	if media.Type == models.MediaTypeTV {
		embedURL = fmt.Sprintf("https://videoplay.vip/dizi/%s/%d/%d?sid=diziwatch8.com", media.TMDBID, media.Season, media.Episode)
	} else {
		embedURL = fmt.Sprintf("https://videoplay.vip/film/%s?sid=diziwatch8.com", media.TMDBID)
	}

	extracted, err := extractors.ExtractVideoplay(ctx, embedURL, BaseURL+"/")
	if err != nil || len(extracted) == 0 {
		return nil, nil
	}

	var streams []models.Stream
	for _, s := range extracted {
		streams = append(streams, models.Stream{
			Name:     media.Title,
			Title:    fmt.Sprintf("⌜ Diziwatch ⌟ | %s", s.Title),
			Quality:  s.Quality,
			URL:      s.URL,
			Provider: ID,
			Headers:  s.Headers,
		})
	}

	return streams, nil
}
