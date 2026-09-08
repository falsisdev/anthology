package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"runtime/debug"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/awslabs/aws-lambda-go-api-proxy/httpadapter"
	handler "github.com/falsisdev/anthology/api"
)

var adapter *httpadapter.HandlerAdapter

func init() {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("FATAL INIT PANIC: %v\nStack: %s", r, string(debug.Stack()))
		}
	}()
	adapter = httpadapter.New(http.HandlerFunc(handler.Handler))
}

func Handler(ctx context.Context, req events.APIGatewayProxyRequest) (resp events.APIGatewayProxyResponse, err error) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("PANIC in Handler: %v\nStack: %s", r, string(debug.Stack()))
			resp = events.APIGatewayProxyResponse{
				StatusCode: 500,
				Headers: map[string]string{
					"Content-Type": "application/json",
				},
				Body: fmt.Sprintf(`{"error":"internal_server_error","detail":"%v"}`, r),
			}
			err = nil
		}
	}()

	if adapter == nil {
		adapter = httpadapter.New(http.HandlerFunc(handler.Handler))
	}

	return adapter.ProxyWithContext(ctx, req)
}

func main() {
	lambda.Start(Handler)
}
