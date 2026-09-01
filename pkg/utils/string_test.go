package utils

import (
	"testing"
)

func TestNormalizeTurkish(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"Dövüş Kulübü", "dovuskulubu"},
		{"Başlangıç", "baslangic"},
		{"Şahsiyet", "sahsiyet"},
		{"Ölümlü Dünya 2", "olumludunya2"},
		{"Gibi - 1. Sezon", "gibi1sezon"},
	}

	for _, tt := range tests {
		got := NormalizeTurkish(tt.input)
		if got != tt.expected {
			t.Errorf("NormalizeTurkish(%q) = %q, want %q", tt.input, got, tt.expected)
		}
	}
}

func TestToSlug(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"Breaking Bad", "breaking-bad"},
		{"Dövüş Kulübü", "dovus-kulubu"},
		{"Game of Thrones (2011)", "game-of-thrones-2011"},
	}

	for _, tt := range tests {
		got := ToSlug(tt.input)
		if got != tt.expected {
			t.Errorf("ToSlug(%q) = %q, want %q", tt.input, got, tt.expected)
		}
	}
}
