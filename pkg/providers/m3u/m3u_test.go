package m3u

import (
	"context"
	"os"
	"testing"

	"github.com/falsisdev/nuviotr/pkg/models"
)

func TestGetLiveChannels(t *testing.T) {
	// Check if local file exists
	if _, err := os.Stat("../../../lists/canli.m3u"); err != nil {
		t.Skip("lists/canli.m3u not found from test package directory")
	}

	p := New()
	ctx := context.Background()

	channels, err := p.GetLiveChannels(ctx)
	if err != nil {
		t.Fatalf("GetLiveChannels failed: %v", err)
	}

	if len(channels) == 0 {
		t.Errorf("Expected live channels, got 0")
	}

	t.Logf("Successfully parsed %d live channels from M3U", len(channels))

	// Test specific channel lookup
	stream, err := p.GetLiveStreamByID(ctx, "TRT1tr")
	if err != nil {
		t.Logf("TRT1tr lookup: %v (trying name match)", err)
	} else {
		t.Logf("Found stream for TRT1tr: %s", stream.URL)
	}
}

func TestM3UStreamSearch(t *testing.T) {
	p := New()
	ctx := context.Background()

	media := models.MediaInfo{
		Title: "TRT 1",
		Type:  models.MediaTypeLive,
	}

	streams, err := p.GetStreams(ctx, media)
	if err != nil {
		t.Fatalf("GetStreams failed: %v", err)
	}

	t.Logf("Live search returned %d streams", len(streams))
}
