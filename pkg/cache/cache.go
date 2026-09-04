package cache

import (
	"sync"
	"time"
)

type item struct {
	value      interface{}
	expiration int64
}

func (i item) isExpired() bool {
	if i.expiration == 0 {
		return false
	}
	return time.Now().UnixNano() > i.expiration
}

// Cache provides a thread-safe, TTL-based in-memory cache.
type Cache struct {
	items map[string]item
	mu    sync.RWMutex
	stop  chan struct{}
}

// New creates a new in-memory cache with an automated cleanup interval.
func New(cleanupInterval time.Duration) *Cache {
	c := &Cache{
		items: make(map[string]item),
		stop:  make(chan struct{}),
	}

	if cleanupInterval > 0 {
		go c.startJanitor(cleanupInterval)
	}

	return c
}

// Set adds or overwrites an item with a duration. If ttl <= 0, the item never expires.
func (c *Cache) Set(key string, value interface{}, ttl time.Duration) {
	var exp int64
	if ttl > 0 {
		exp = time.Now().Add(ttl).UnixNano()
	}

	c.mu.Lock()
	defer c.mu.Unlock()

	c.items[key] = item{
		value:      value,
		expiration: exp,
	}
}

// Get retrieves an item by key. Returns nil, false if not found or expired.
func (c *Cache) Get(key string) (interface{}, bool) {
	c.mu.RLock()
	itm, found := c.items[key]
	c.mu.RUnlock()

	if !found {
		return nil, false
	}

	if itm.isExpired() {
		c.Delete(key)
		return nil, false
	}

	return itm.value, true
}

// Delete removes an item from cache.
func (c *Cache) Delete(key string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	delete(c.items, key)
}

// Flush clears all items.
func (c *Cache) Flush() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.items = make(map[string]item)
}

// Close stops the janitor cleanup goroutine.
func (c *Cache) Close() {
	close(c.stop)
}

func (c *Cache) startJanitor(interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			c.cleanupExpired()
		case <-c.stop:
			return
		}
	}
}

func (c *Cache) cleanupExpired() {
	now := time.Now().UnixNano()
	c.mu.Lock()
	defer c.mu.Unlock()

	for k, itm := range c.items {
		if itm.expiration > 0 && now > itm.expiration {
			delete(c.items, k)
		}
	}
}

// Global default cache instance for application-wide caching
var Default = New(5 * time.Minute)
