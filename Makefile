.PHONY: all build run-server test clean

all: test build

build:
	@mkdir -p bin
	go build -o bin/server cmd/server/main.go
	go build -o bin/cli cmd/cli/main.go

test:
	go test -v ./...

run-server:
	go run cmd/server/main.go -port 8080

clean:
	rm -rf bin/
