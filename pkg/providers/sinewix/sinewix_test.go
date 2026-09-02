package sinewix

import (
	"context"
	"testing"

	"github.com/falsisdev/anthology/pkg/models"
)

func TestSineWixMovie(t *testing.T) {
	p := New()
	ctx := context.Background()

	media := models.MediaInfo{
		Title:         "Dövüş Kulübü",
		OriginalTitle: "Fight Club",
		Type:          models.MediaTypeMovie,
	}

	streams, err := p.GetStreams(ctx, media)
	if err != nil {
		t.Fatalf("GetStreams failed: %v", err)
	}

	t.Logf("SineWix returned %d streams for Fight Club", len(streams))
	for _, s := range streams {
		t.Logf("Stream: %s -> %s", s.Title, s.URL)
	}
}

func TestSineWixSeries(t *testing.T) {
	p := New()
	ctx := context.Background()

	media := models.MediaInfo{
		Title:         "Breaking Bad",
		OriginalTitle: "Breaking Bad",
		Season:        1,
		Episode:       1,
		Type:          models.MediaTypeTV,
	}

	streams, err := p.GetStreams(ctx, media)
	if err != nil {
		t.Fatalf("GetStreams failed: %v", err)
	}

	t.Logf("SineWix returned %d streams for Breaking Bad S1E1", len(streams))
	for _, s := range streams {
		t.Logf("Stream: %s -> %s", s.Title, s.URL)
	}
}
