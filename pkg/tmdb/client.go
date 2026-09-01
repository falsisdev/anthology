package tmdb

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"sync"
	"time"

	"github.com/falsisdev/nuviotr/pkg/models"
)

const (
	DefaultTMDBKey = "500330721680edb6d5f7f12ba7cd9023"
	BaseURL        = "https://api.themoviedb.org/3"
)

// Client handles communication with TMDB API.
type Client struct {
	apiKey     string
	httpClient *http.Client
	cache      map[string]*models.MediaInfo
	mu         sync.RWMutex
}

// NewClient creates a new TMDB client.
func NewClient(apiKey string) *Client {
	if apiKey == "" {
		apiKey = DefaultTMDBKey
	}
	return &Client{
		apiKey: apiKey,
		httpClient: &http.Client{
			Timeout: 8 * time.Second,
		},
		cache: make(map[string]*models.MediaInfo),
	}
}

type tmdbResponse struct {
	ID            int    `json:"id"`
	Title         string `json:"title"`
	Name          string `json:"name"`
	OriginalTitle string `json:"original_title"`
	OriginalName  string `json:"original_name"`
	ReleaseDate   string `json:"release_date"`
	FirstAirDate  string `json:"first_air_date"`
	ExternalIDs   struct {
		IMDbID string `json:"imdb_id"`
	} `json:"external_ids"`
}

// GetMediaInfo fetches complete media information for a given TMDB ID and media type.
func (c *Client) GetMediaInfo(ctx context.Context, tmdbID string, mediaType models.MediaType, season, episode int) (*models.MediaInfo, error) {
	cacheKey := fmt.Sprintf("%s:%s:%d:%d", tmdbID, mediaType, season, episode)

	c.mu.RLock()
	if cached, ok := c.cache[cacheKey]; ok {
		c.mu.RUnlock()
		return cached, nil
	}
	c.mu.RUnlock()

	typePath := "movie"
	if mediaType == models.MediaTypeTV {
		typePath = "tv"
	}

	reqURL := fmt.Sprintf("%s/%s/%s?api_key=%s&language=tr-TR&append_to_response=external_ids",
		BaseURL, typePath, url.PathEscape(tmdbID), c.apiKey)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return nil, fmt.Errorf("tmdb new request failed: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("tmdb request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("tmdb returned HTTP %d", resp.StatusCode)
	}

	var data tmdbResponse
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return nil, fmt.Errorf("failed to decode tmdb response: %w", err)
	}

	title := data.Title
	if title == "" {
		title = data.Name
	}

	origTitle := data.OriginalTitle
	if origTitle == "" {
		origTitle = data.OriginalName
	}

	dateStr := data.ReleaseDate
	if dateStr == "" {
		dateStr = data.FirstAirDate
	}
	year := ""
	if len(dateStr) >= 4 {
		year = dateStr[:4]
	}

	info := &models.MediaInfo{
		TMDBID:        tmdbID,
		IMDbID:        data.ExternalIDs.IMDbID,
		Title:         title,
		OriginalTitle: origTitle,
		Year:          year,
		Season:        season,
		Episode:       episode,
		Type:          mediaType,
	}

	c.mu.Lock()
	c.cache[cacheKey] = info
	c.mu.Unlock()

	return info, nil
}
