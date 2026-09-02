package catalog

import (
	"context"
	"strings"

	"github.com/falsisdev/anthology/pkg/models"
)

type MetaItem struct {
	ID          string   `json:"id"`
	Type        string   `json:"type"`
	Name        string   `json:"name"`
	Poster      string   `json:"poster,omitempty"`
	Background  string   `json:"background,omitempty"`
	Logo        string   `json:"logo,omitempty"`
	Description string   `json:"description,omitempty"`
	Genres      []string `json:"genres,omitempty"`
}

type VideoItem struct {
	ID       string `json:"id"`
	Title    string `json:"title"`
	Season   int    `json:"season"`
	Episode  int    `json:"episode"`
	Released string `json:"released,omitempty"`
}

type MetaDetail struct {
	ID          string      `json:"id"`
	Type        string      `json:"type"`
	Name        string      `json:"name"`
	Poster      string      `json:"poster,omitempty"`
	Background  string      `json:"background,omitempty"`
	Logo        string      `json:"logo,omitempty"`
	Description string      `json:"description,omitempty"`
	Genres      []string    `json:"genres,omitempty"`
	Videos      []VideoItem `json:"videos,omitempty"`
}

// Search queries the specified provider catalog
func Search(ctx context.Context, catalogID, query string) ([]MetaItem, error) {
	query = strings.TrimSpace(query)
	if query == "" {
		return GetDefaultCatalog(ctx, catalogID)
	}

	switch catalogID {
	case "anthology_ddizi":
		return searchDdizi(ctx, query)
	case "anthology_dizimom":
		return searchDizimom(ctx, query)
	case "anthology_diziyou":
		return searchDiziYou(ctx, query)
	case "anthology_hdfc":
		return searchHDFC(ctx, query)
	case "anthology_sinewix_series":
		return searchSineWix(ctx, "series", query)
	case "anthology_sinewix_movies":
		return searchSineWix(ctx, "movie", query)
	default:
		return nil, nil
	}
}

// GetDefaultCatalog returns recent or trending items for catalog browsing
func GetDefaultCatalog(ctx context.Context, catalogID string) ([]MetaItem, error) {
	switch catalogID {
	case "anthology_ddizi":
		return defaultDdizi(ctx)
	case "anthology_dizimom":
		return defaultDizimom(ctx)
	case "anthology_diziyou":
		return defaultDiziYou(ctx)
	case "anthology_hdfc":
		return defaultHDFC(ctx)
	default:
		return nil, nil
	}
}

// GetMeta returns full details including seasons & episodes for a custom item
func GetMeta(ctx context.Context, mediaType, rawID string) (*MetaDetail, error) {
	switch {
	case strings.HasPrefix(rawID, "ddizi:show:"):
		return getDdiziMeta(ctx, rawID)
	case strings.HasPrefix(rawID, "dizimom:show:"):
		return getDizimomMeta(ctx, rawID)
	case strings.HasPrefix(rawID, "diziyou:show:"):
		return getDiziYouMeta(ctx, rawID)
	case strings.HasPrefix(rawID, "hdfc:movie:"):
		return getHDFCMeta(ctx, rawID)
	case strings.HasPrefix(rawID, "sinewix:"):
		return getSineWixMeta(ctx, rawID)
	default:
		return nil, nil
	}
}

// GetStream resolves a custom catalog episode or movie ID into playable streams
func GetStream(ctx context.Context, rawID string) ([]models.Stream, error) {
	switch {
	case strings.HasPrefix(rawID, "ddizi:ep:"):
		return getDdiziStream(ctx, rawID)
	case strings.HasPrefix(rawID, "dizimom:ep:"):
		return getDizimomStream(ctx, rawID)
	case strings.HasPrefix(rawID, "diziyou:ep:"):
		return getDiziYouStream(ctx, rawID)
	case strings.HasPrefix(rawID, "hdfc:movie:"):
		return getHDFCStream(ctx, rawID)
	case strings.HasPrefix(rawID, "sinewix:"):
		return getSineWixStream(ctx, rawID)
	default:
		return nil, nil
	}
}
