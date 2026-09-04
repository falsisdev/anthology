package cache

import (
	"testing"
	"time"
)

func TestCacheSetGet(t *testing.T) {
	c := New(0)
	c.Set("test", "hello", 1*time.Minute)

	val, found := c.Get("test")
	if !found || val != "hello" {
		t.Fatalf("expected 'hello', got %v", val)
	}
}

func TestCacheExpiry(t *testing.T) {
	c := New(0)
	c.Set("expiring", 123, 20*time.Millisecond)

	time.Sleep(30 * time.Millisecond)

	_, found := c.Get("expiring")
	if found {
		t.Fatalf("expected key to be expired")
	}
}
