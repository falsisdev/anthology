package main

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/md5"
	"encoding/base64"
	"encoding/hex"
	"fmt"
)

func main() {
	passBase64 := "RXdDNlg0SnBqZ05zYjE2QW9jSDgyZz09"
	passStrBytes, _ := base64.StdEncoding.DecodeString(passBase64)
	fmt.Printf("passBytes: %s\n", string(passStrBytes))

	ct := "4d17HPJQwT8S3CiNLkzR3Cm3NqXkJ5pqZSeyBAX3ARk2HrFTMQy+8HdAJwOLQt8qBqFFMBiwoT3QuXD6MlPDYjapxlcOW+uY7kwicSzLuOpLyc40bP8vHg5r48HJt786YhRdTCYItGHLIk4lWo7BLEK69b+LDoXP5kEe4gNuYr0aeA0G/SN5oLbtdUptSbl4GpOFlfFTjCM9PsB7jn+ssp6oog87E4+f31FbmNB5NAkTClir2PLXriCD6IZLeIHEntWTGNz9gvvfkm33YTxxaGMR+vg9M1F/V0HWoKypaLsJqJ9XvdMYABgy5v4b+G2KOSDg0Gw+PK+e52zuuUXUHzq7uc1SbtZ5lMclz+0B4zwmDXGNeZb+ySySmWsRjtKPvr6Cv/UqOiYPawTHFcRKS49PI3fKMIzR4oPHZyblYs8vhOLCKjkrNi8oYv7fnF1y+pzjRoX1sMF4g1cLR5HL941oNUg5zZfXrsKfkfQGm0g5MJnpv3sw68gtj/O7hf9k0Tc47NdEaJrf2CVNxWAGK60ojGwacoUaCe4Ohjvd6nIcQ9hBe6M+wk8QV8iOXXgb3bOxxJ43hKn+wl4EZr03aB3OJBvO823BrHnjGDyQ137+VBYzUWCerRy4Q24SSkDyxKlwwEkc24RLBm4nmNZgRmF+c1UtGKvaZl+D5ujMcPDIL9ViS9gkAQRxelAyMQrj7jJxaE1xXJbw5UibIowRMzO4VE7CuCACkP9sbMWK/CwvxNHwbxKX6Y4wAng2OeDtsjklSCIjXV5MPD6JXwCN7cwmtyaHh3C0PPkVk1eYQg9tC4qOpJOM0M33h/9P3nFQO4xuA9OoJhWIae5xhmKZig3wgWcEaG8j+Br6e1h6ui2DW5lEB5FcrCVmNC4XTSF9vjhYgAjZ86Re9gk05GrefMIw974414GRkrg2ES9lQbF+W5aGI3lqEKTmEB8X01hw8ClRek2Vi5A5HtmxMhqjUVG3I/VS2BkYPfG8P3r5MIZ8CoxuppIVEnu74rSt3MApnrA4zyZN3XHxGcMXZ6lAuf6ym+gFRwPSKbaK05h8VMdxYffa3tcpztQhRbkR9R0i3LZq6WnAQZQ+ASqX08vjVn3Ez0QEoVO2fiZnisnoY14Ru3G2+JxZHyg60cLhb7lKDBIRpJrTmeR+bFGLX9o2X3k4cN+13IDMNa4KyRiuqOJK3XNd4XHZNmUe/u+NrcrVl17KRNDcy2jm6ZsaPtIjxQ=="
	ivHex := "10395c5a5ce9f53f0724020ea3920682"
	sHex := "fc200e8048824afe"

	ctBytes, _ := base64.StdEncoding.DecodeString(ct)
	ivBytes, _ := hex.DecodeString(ivHex)
	saltBytes, _ := hex.DecodeString(sHex)

	var key []byte
	var d []byte
	for len(key) < 32 {
		hasher := md5.New()
		hasher.Write(d)
		hasher.Write(passStrBytes)
		hasher.Write(saltBytes)
		d = hasher.Sum(nil)
		key = append(key, d...)
	}
	key = key[:32]

	block, _ := aes.NewCipher(key)
	mode := cipher.NewCBCDecrypter(block, ivBytes)
	mode.CryptBlocks(ctBytes, ctBytes)

	padLen := int(ctBytes[len(ctBytes)-1])
	if padLen > 0 && padLen <= aes.BlockSize {
		ctBytes = ctBytes[:len(ctBytes)-padLen]
	}

	fmt.Println(string(ctBytes)[:100])
}
