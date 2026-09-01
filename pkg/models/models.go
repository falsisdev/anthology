package models

type MediaType string

const (
	MediaTypeMovie MediaType = "movie"
	MediaTypeTV    MediaType = "tv"
	MediaTypeLive  MediaType = "live"
)

// MediaInfo represents the metadata of requested movie or tv series.
type MediaInfo struct {
	TMDBID        string    `json:"tmdb_id"`
	IMDbID        string    `json:"imdb_id,omitempty"`
	Title         string    `json:"title"`
	OriginalTitle string    `json:"original_title,omitempty"`
	Year          string    `json:"year,omitempty"`
	Season        int       `json:"season,omitempty"`
	Episode       int       `json:"episode,omitempty"`
	Type          MediaType `json:"type"`
}

// Subtitle represents subtitle track information.
type Subtitle struct {
	Label string `json:"label"`
	URL   string `json:"url"`
}

// Stream represents a playable stream link.
type Stream struct {
	Name      string            `json:"name"`
	Title     string            `json:"title"`
	URL       string            `json:"url"`
	Quality   string            `json:"quality,omitempty"`
	Provider  string            `json:"provider"`
	Headers   map[string]string `json:"headers,omitempty"`
	Subtitles []Subtitle        `json:"subtitles,omitempty"`
	IsLive    bool              `json:"is_live,omitempty"`
}

// Channel represents an IPTV live stream item.
type Channel struct {
	ID      string            `json:"id"`
	Name    string            `json:"name"`
	Logo    string            `json:"logo,omitempty"`
	Group   string            `json:"group,omitempty"`
	URL     string            `json:"url"`
	Headers map[string]string `json:"headers,omitempty"`
}
