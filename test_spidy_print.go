package main
import (
    "context"
    "fmt"
    "github.com/falsisdev/anthology/pkg/extractors"
)
func main() {
    res, err := extractors.Extract(context.Background(), "https://spidypro.com/embed/wDBfR9uJLu8tarL", "https://dizigom.biz/")
    fmt.Println("Err:", err)
    fmt.Println(res)
}
