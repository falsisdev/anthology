package provider

import (
	"context"

	"github.com/falsisdev/anthology/pkg/models"
)

// Provider defines the interface that all streaming scrapers must implement.
type Provider interface {
	// ID returns the unique identifier for the provider (e.g. "sinewix", "diziyou").
	ID() string

	// Name returns the human-readable name of the provider.
	Name() string

	// SupportedTypes returns which media types this provider handles (movie, tv, live).
	SupportedTypes() []models.MediaType

	// GetStreams searches for playable streams given the media metadata.
	GetStreams(ctx context.Context, media models.MediaInfo) ([]models.Stream, error)
}
