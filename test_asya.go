package main
import (
    "context"
    "fmt"
    "github.com/falsisdev/anthology/pkg/models"
    "github.com/falsisdev/anthology/pkg/provider"
    _ "github.com/falsisdev/anthology/pkg/providers/asyaanimeleri"
)
func main() {
    p, _ := provider.Get("asyaanimeleri")
    info := models.MediaInfo{
        Title: "Solo Leveling",
        OriginalTitle: "Solo Leveling",
        Year: "2024",
        Type: models.MediaTypeTV,
        Season: 1,
        Episode: 1,
    }
    res, err := p.GetStreams(context.Background(), info)
    fmt.Println(err)
    for _, s := range res {
        fmt.Println(s.URL)
    }
}
