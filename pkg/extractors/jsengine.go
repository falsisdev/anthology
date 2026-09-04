package extractors

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/dop251/goja"
)

var (
	rePacker = regexp.MustCompile(`eval\(function\(p,a,c,k,e,d\)[\s\S]*?\}\((['"][\s\S]*?['"]),\s*(\d+),\s*(\d+),\s*(['"][\s\S]*?['"]\.split\(['"]\|['"]\))`)
	vmPool   = sync.Pool{
		New: func() interface{} {
			vm := goja.New()
			// Setup standard polyfills for common browser script idioms
			_ = vm.Set("atob", func(call goja.FunctionCall) goja.Value {
				// handled natively in goja or simple base64
				return goja.Undefined()
			})
			return vm
		},
	}
)

// RunJS executes JS code with a timeout and returns the resulting value.
func RunJS(script string, timeout time.Duration) (goja.Value, error) {
	if timeout <= 0 {
		timeout = 2 * time.Second
	}

	vm := goja.New()
	time.AfterFunc(timeout, func() {
		vm.Interrupt("execution timeout")
	})

	val, err := vm.RunString(script)
	if err != nil {
		return nil, fmt.Errorf("js execution error: %w", err)
	}
	return val, nil
}

// UnpackJS unpacks Dean Edwards (p,a,c,k,e,d) packed JavaScript code.
func UnpackJS(packedCode string) (string, error) {
	if !strings.Contains(packedCode, "p,a,c,k,e,") {
		return packedCode, nil
	}

	// Transform eval(...) to returning the unpacked payload string
	evalIdx := strings.Index(packedCode, "eval(function(")
	if evalIdx == -1 {
		return packedCode, nil
	}

	// Replace "eval(function(" with "function(" and wrap it to return result
	script := "function unpack() { return " + packedCode[evalIdx+5:]
	// If it ends with something, close the function
	script = strings.TrimSpace(script)
	if strings.HasSuffix(script, ";") {
		script = script[:len(script)-1]
	}
	script += "\n}\nunpack();"

	val, err := RunJS(script, 2*time.Second)
	if err != nil {
		// Fallback to pure Go unpacker if JS execution fails
		return fallbackUnpack(packedCode)
	}

	return val.String(), nil
}

// fallbackUnpack is a deterministic Go-native fallback for p,a,c,k,e,d unpacking.
func fallbackUnpack(packed string) (string, error) {
	m := rePacker.FindStringSubmatch(packed)
	if len(m) < 5 {
		return packed, nil
	}

	p := m[1]
	if len(p) >= 2 && (p[0] == '\'' || p[0] == '"') {
		p = p[1 : len(p)-1]
	}

	a, _ := strconv.Atoi(m[2])
	c, _ := strconv.Atoi(m[3])
	kRaw := m[4]

	// Extract split dictionary tokens
	kRaw = strings.TrimPrefix(kRaw, "'")
	kRaw = strings.TrimPrefix(kRaw, "\"")
	kRaw = strings.TrimSuffix(kRaw, ".split('|')")
	kRaw = strings.TrimSuffix(kRaw, ".split(\"|\")")
	kRaw = strings.TrimSuffix(kRaw, "'")
	kRaw = strings.TrimSuffix(kRaw, "\"")
	k := strings.Split(kRaw, "|")

	baseN := func(n int, radix int) string {
		chars := "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
		if n == 0 {
			return "0"
		}
		res := ""
		for n > 0 {
			res = string(chars[n%radix]) + res
			n = n / radix
		}
		return res
	}

	dict := make(map[string]string)
	for i := c - 1; i >= 0; i-- {
		key := baseN(i, a)
		if i < len(k) && k[i] != "" {
			dict[key] = k[i]
		} else {
			dict[key] = key
		}
	}

	wordRegex := regexp.MustCompile(`\b\w+\b`)
	result := wordRegex.ReplaceAllStringFunc(p, func(word string) string {
		if val, exists := dict[word]; exists {
			return val
		}
		return word
	})

	return result, nil
}
