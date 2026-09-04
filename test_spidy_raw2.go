package main
import (
    "context"
    "fmt"
    "regexp"
    "encoding/json"
    "encoding/base64"
    "github.com/falsisdev/anthology/pkg/utils"
)
type cryptoJSPayload struct {
	CT string `json:"ct"`
}
func main() {
    body, _ := utils.DefaultClient.Get(context.Background(), "https://spidypro.com/embed/wDBfR9uJLu8tarL", nil)
    re := regexp.MustCompile(`bePlayer\(['"]([^"']+)['"]\s*,\s*['"]({.*})['"]\)`)
    m := re.FindStringSubmatch(string(body))
    var payload cryptoJSPayload
    json.Unmarshal([]byte(m[2]), &payload)
    fmt.Printf("CT prefix: %s\n", payload.CT[:10])
    for i := 0; i < 10; i++ {
        fmt.Printf("byte %d: %c (0x%02X)\n", i, payload.CT[i], payload.CT[i])
    }
    _, err := base64.StdEncoding.DecodeString(payload.CT)
    fmt.Println(err)
}
