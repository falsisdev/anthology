package extractors

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/md5"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"regexp"
	"strings"

	"github.com/falsisdev/anthology/pkg/models"
	"github.com/falsisdev/anthology/pkg/utils"
)

var (
	reSpidyproPayload = regexp.MustCompile(`bePlayer\(['"]([^"']+)['"]\s*,\s*['"]({[^}]*})['"]\)`)
)

type cryptoJSPayload struct {
	CT string `json:"ct"`
	IV string `json:"iv"`
	S  string `json:"s"`
}

func ExtractSpidypro(ctx context.Context, embedURL, referer string) ([]models.Stream, error) {
	headers := map[string]string{
		"User-Agent": utils.DefaultUserAgent,
		"Referer":    referer,
	}

	body, err := utils.DefaultClient.Get(ctx, embedURL, headers)
	if err != nil {
		return nil, err
	}

	bodyStr := string(body)
	m := reSpidyproPayload.FindStringSubmatch(bodyStr)
	if len(m) < 3 {
		return nil, nil
	}

	passBase64 := m[1]
	payloadStr := m[2]

	// The password is base64-encoded in the bePlayer() call; decode it
	// before using it in EVP_BytesToKey so the derived key matches
	// CryptoJS.AES.decrypt(password, …) on the frontend.
	passBytes, err := base64.StdEncoding.DecodeString(passBase64)
	if err != nil {
		// Fallback: use the raw string if decoding fails
		passBytes = []byte(passBase64)
	}

	var payload cryptoJSPayload
	if err := json.Unmarshal([]byte(payloadStr), &payload); err != nil {
		return nil, err
	}

	payload.CT = strings.ReplaceAll(payload.CT, " ", "")
	payload.CT = strings.ReplaceAll(payload.CT, "\n", "")
	payload.CT = strings.ReplaceAll(payload.CT, "\r", "")

	ctBytes, err := base64.StdEncoding.DecodeString(payload.CT)
	if err != nil {
		return nil, err
	}
	ivBytes, err := hex.DecodeString(payload.IV)
	if err != nil {
		return nil, err
	}
	saltBytes, err := hex.DecodeString(payload.S)
	if err != nil {
		return nil, err
	}

	// EVP_BytesToKey
	var key []byte
	var d []byte
	for len(key) < 32 {
		hasher := md5.New()
		hasher.Write(d)
		hasher.Write(passBytes)
		hasher.Write(saltBytes)
		d = hasher.Sum(nil)
		key = append(key, d...)
	}
	key = key[:32]

	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}

	if len(ctBytes)%aes.BlockSize != 0 {
		return nil, fmt.Errorf("ciphertext is not a multiple of the block size")
	}

	mode := cipher.NewCBCDecrypter(block, ivBytes)
	mode.CryptBlocks(ctBytes, ctBytes)

	// PKCS7 unpadding
	padLen := int(ctBytes[len(ctBytes)-1])
	if padLen > 0 && padLen <= aes.BlockSize {
		ctBytes = ctBytes[:len(ctBytes)-padLen]
	}

	var decrypted map[string]interface{}
	if err := json.Unmarshal(ctBytes, &decrypted); err != nil {
		return nil, err
	}

	videoURL, ok := decrypted["video_location"].(string)
	if !ok || videoURL == "" {
		return nil, nil
	}

	var streams []models.Stream
	if strings.Contains(videoURL, "http") {
		streams = append(streams, models.Stream{
			Title:   "HLS (1080p)",
			URL:     videoURL,
			Quality: "1080p",
			Headers: map[string]string{
				"Referer": embedURL,
				"Origin":  strings.Split(embedURL, "/embed")[0],
			},
		})
	}

	return streams, nil
}
