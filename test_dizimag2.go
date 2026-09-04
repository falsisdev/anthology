package main
import (
    "context"
    "fmt"
    "github.com/falsisdev/anthology/pkg/models"
    "github.com/falsisdev/anthology/pkg/provider"
    _ "github.com/falsisdev/anthology/pkg/providers/dizimag"
)
func main() {
    p, _ := provider.Get("dizimag")
    info := models.MediaInfo{
        Title: "Wednesday",
        OriginalTitle: "Wednesday",
        Year: "2022",
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
