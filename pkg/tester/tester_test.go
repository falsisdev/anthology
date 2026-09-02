package tester

import (
	"context"
	"testing"
)

// buildTestView equivalent checks that runConcurrent returns stable sorted
// results and never panics for empty input.
func TestRunConcurrentEmpty(t *testing.T) {
	res := runConcurrent(context.Background(), func(context.Context, int) TestResult {
		return TestResult{OK: true}
	}, 0)
	if len(res) != 0 {
		t.Fatalf("expected 0 results, got %d", len(res))
	}
}

func TestRunConcurrentOrder(t *testing.T) {
	names := []string{"Beta", "alpha", "Gamma", "delta"}
	res := runConcurrent(context.Background(), func(_ context.Context, i int) TestResult {
		return TestResult{Name: names[i], OK: i%2 == 0}
	}, len(names))
	if len(res) != 4 {
		t.Fatalf("expected 4 results, got %d", len(res))
	}
	for i := 1; i < len(res); i++ {
		if res[i-1].Name > res[i].Name {
			t.Fatalf("results not sorted: %v", res)
		}
	}
}

func TestTruncate(t *testing.T) {
	if got := truncate("short", 100); got != "short" {
		t.Fatalf("unexpected: %q", got)
	}
	long := "1234567890"
	if got := truncate(long, 5); got != "12345…" {
		t.Fatalf("unexpected truncation: %q", got)
	}
}
