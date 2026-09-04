package main
import (
    "fmt"
    "net/http"
    "time"
)
func main() {
    tlds := []string{"pro", "site", "online", "lol", "live", "info", "me", "biz", "tube"}
    for _, t := range tlds {
        url := "https://dizilla." + t
        client := &http.Client{Timeout: 3 * time.Second}
        res, err := client.Get(url)
        if err == nil {
            fmt.Println("Found:", url, "Status:", res.StatusCode)
            return
        }
    }
    fmt.Println("None found")
}
