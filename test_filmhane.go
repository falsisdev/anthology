package main

import (
	"context"
	"fmt"
	"time"
	"github.com/falsisdev/anthology/pkg/engine"
	"github.com/falsisdev/anthology/pkg/models"
	_ "github.com/falsisdev/anthology/pkg/providers/filmhane"
)

func main() {
	e := engine.New("", 15*time.Second)
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	fmt.Println("Probing Filmhane for 'Inception'...")
	// The provider needs original title or something? Wait, engine uses the TMDB API to get title! 
	// I didn't provide a TMDB API key, so engine doesn't know the title "Inception". It searches for "".
	// Let's pass the TMDB API key! I don't have it.
	// Oh, the Search function looks like this: Search(ctx, tmdbID, mediaType, season, episode, providerFilter)
	// Let's see what engine.Search does when tmdbID is passed.
}
