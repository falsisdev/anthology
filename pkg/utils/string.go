package utils

import (
	"regexp"
	"strings"
	"unicode"
)

var nonAlphaNumRegex = regexp.MustCompile(`[^a-z0-9]`)
var whitespaceRegex = regexp.MustCompile(`\s+`)

// NormalizeTurkish converts Turkish special characters to ASCII equivalents and removes symbols.
func NormalizeTurkish(s string) string {
	if s == "" {
		return ""
	}
	s = strings.ToLower(s)
	replacer := strings.NewReplacer(
		"ı", "i", "İ", "i",
		"ğ", "g", "Ğ", "g",
		"ü", "u", "Ü", "u",
		"ş", "s", "Ş", "s",
		"ö", "o", "Ö", "o",
		"ç", "c", "Ç", "c",
	)
	s = replacer.Replace(s)
	s = nonAlphaNumRegex.ReplaceAllString(s, "")
	return strings.TrimSpace(s)
}

// ToSlug converts any title string into a clean URL-friendly slug.
func ToSlug(s string) string {
	if s == "" {
		return ""
	}
	s = strings.ToLower(s)
	replacer := strings.NewReplacer(
		"ı", "i", "İ", "i",
		"ğ", "g", "Ğ", "g",
		"ü", "u", "Ü", "u",
		"ş", "s", "Ş", "s",
		"ö", "o", "Ö", "o",
		"ç", "c", "Ç", "c",
	)
	s = replacer.Replace(s)
	// Replace non-alphanumeric with hyphen
	reg := regexp.MustCompile(`[^a-z0-9]+`)
	s = reg.ReplaceAllString(s, "-")
	return strings.Trim(s, "-")
}

// CleanTitle removes parenthetical notes, brackets, and extra spaces.
func CleanTitle(s string) string {
	if s == "" {
		return ""
	}
	bracketReg := regexp.MustCompile(`[\(\[\{].*?[\)\]\}]`)
	s = bracketReg.ReplaceAllString(s, "")
	s = whitespaceRegex.ReplaceAllString(s, " ")
	return strings.TrimSpace(s)
}

// UltraClean returns lowercase alphanumeric only for reliable string matching.
func UltraClean(s string) string {
	var b strings.Builder
	for _, r := range strings.ToLower(s) {
		switch r {
		case 'ı', 'İ':
			b.WriteRune('i')
		case 'ğ', 'Ğ':
			b.WriteRune('g')
		case 'ü', 'Ü':
			b.WriteRune('u')
		case 'ş', 'Ş':
			b.WriteRune('s')
		case 'ö', 'Ö':
			b.WriteRune('o')
		case 'ç', 'Ç':
			b.WriteRune('c')
		default:
			if unicode.IsLetter(r) || unicode.IsDigit(r) {
				b.WriteRune(r)
			}
		}
	}
	return b.String()
}
