package main
import (
    "context"
    "fmt"
    "regexp"
    "github.com/falsisdev/anthology/pkg/utils"
)
func main() {
    body, _ := utils.DefaultClient.Get(context.Background(), "https://spidypro.com/embed/wDBfR9uJLu8tarL", nil)
    re := regexp.MustCompile(`bePlayer\(['"]([^"']+)['"]\s*,\s*['"]({.*})['"]\)`)
    m := re.FindStringSubmatch(string(body))
    if len(m) > 2 {
        fmt.Println(m[2][:20])
    }
}
