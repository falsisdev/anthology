package extractors

import (
	"strings"
	"testing"
	"time"
)

func TestRunJS(t *testing.T) {
	val, err := RunJS("1 + 2", 1*time.Second)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if val.ToInteger() != 3 {
		t.Fatalf("expected 3, got %v", val.ToInteger())
	}
}

func TestUnpackJS(t *testing.T) {
	packed := `eval(function(p,a,c,k,e,d){while(c--)if(k[c])p=p.replace(new RegExp('\\b'+c.toString(a)+'\\b','g'),k[c]);return p}('0 1="2";',3,3,'var|hello|world'.split('|')))`
	unpacked, err := UnpackJS(packed)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !strings.Contains(unpacked, `hello="world"`) && !strings.Contains(unpacked, `hello = "world"`) {
		t.Fatalf("expected unpacked content with hello=\"world\", got: %s", unpacked)
	}
}
