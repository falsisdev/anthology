package provider

import (
	"sync"

	"github.com/falsisdev/anthology/pkg/models"
)

type Registry struct {
	mu        sync.RWMutex
	providers map[string]Provider
}

var globalRegistry = &Registry{
	providers: make(map[string]Provider),
}

// Register adds a provider to the global registry.
func Register(p Provider) {
	globalRegistry.mu.Lock()
	defer globalRegistry.mu.Unlock()
	globalRegistry.providers[p.ID()] = p
}

// Get retrieves a provider by ID from the global registry.
func Get(id string) (Provider, bool) {
	globalRegistry.mu.RLock()
	defer globalRegistry.mu.RUnlock()
	p, ok := globalRegistry.providers[id]
	return p, ok
}

// All returns all registered providers.
func All() []Provider {
	globalRegistry.mu.RLock()
	defer globalRegistry.mu.RUnlock()
	list := make([]Provider, 0, len(globalRegistry.providers))
	for _, p := range globalRegistry.providers {
		list = append(list, p)
	}
	return list
}

// GetForType returns all providers that support the specified media type.
func GetForType(mediaType models.MediaType) []Provider {
	globalRegistry.mu.RLock()
	defer globalRegistry.mu.RUnlock()
	var list []Provider
	for _, p := range globalRegistry.providers {
		for _, t := range p.SupportedTypes() {
			if t == mediaType {
				list = append(list, p)
				break
			}
		}
	}
	return list
}
