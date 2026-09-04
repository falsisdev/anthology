package mahsunsports

import (
	"context"
	"testing"
	"time"
)

func TestMahsunSports_GetLiveChannels(t *testing.T) {
	p := New()
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	channels, err := p.GetLiveChannels(ctx)
	if err != nil {
		t.Fatalf("GetLiveChannels failed: %v", err)
	}

	if len(channels) == 0 {
		t.Fatalf("Expected channels, got 0")
	}

	t.Logf("Successfully fetched %d channels and matches from Mahsun Sports!", len(channels))
	foundSports := false
	foundMatch := false

	for _, ch := range channels {
		if ch.Group == "⚽ SPOR KANALLARI (Mahsun)" {
			foundSports = true
		}
		if ch.Group == "🔴 CANLI MAÇLAR (Mahsun)" {
			foundMatch = true
		}
	}

	if !foundSports {
		t.Errorf("Expected at least one sports channel")
	}
	t.Logf("Sports channels found: %v, Matches found: %v", foundSports, foundMatch)
}
