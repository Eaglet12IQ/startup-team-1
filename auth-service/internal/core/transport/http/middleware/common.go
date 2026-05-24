package core_http_middleware

import (
	core_errors "auth-service/internal/core/errors"
	core_logger "auth-service/internal/core/logger"
	core_token "auth-service/internal/core/token"
	core_http_response "auth-service/internal/core/transport/http/response"
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"
)

const (
	requestIDHeader = "X-Request-ID"
	prefix          = "/api/v1/"
)

func RequestID() Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			requestID := r.Header.Get(requestIDHeader)
			if requestID == "" {
				requestID = uuid.NewString()
			}

			r.Header.Set(requestIDHeader, requestID)
			w.Header().Set(requestIDHeader, requestID)

			next.ServeHTTP(w, r)
		})
	}
}

func Logger(log *core_logger.Logger) Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			requestID := r.Header.Get(requestIDHeader)

			l := log.With(
				zap.String("request_id", requestID),
				zap.String("url", r.URL.User.String()),
			)

			ctx := context.WithValue(r.Context(), "log", l)

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func Auth(jwt core_token.JWT) Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(rw http.ResponseWriter, r *http.Request) {
			ctx := r.Context()
			log := core_logger.FromContext(ctx)
			responseHandler := core_http_response.NewHTTPResponseHandler(log, rw)

			if isPublicRoute(r) {
				next.ServeHTTP(rw, r)

				return
			}

			token, err := core_token.ExtractTokenFromRequest(r)
			if err != nil {
				responseHandler.ErrorResponse(core_errors.ErrUnauthorized, "no access token in request")

				return
			}

			claims, err := jwt.ValidateAccessToken(token)
			if err != nil {
				responseHandler.ErrorResponse(core_errors.ErrUnauthorized, "invalid access token")

				return
			}

			ctx = context.WithValue(r.Context(), "user_id", claims.UserID)

			next.ServeHTTP(rw, r.WithContext(ctx))
		})
	}
}

func Panic() Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := r.Context()
			log := core_logger.FromContext(ctx)
			responseHandler := core_http_response.NewHTTPResponseHandler(log, w)

			defer func() {
				if p := recover(); p != nil {
					responseHandler.PanicResponse(p, "during handle HTTP request got unexpected panic")
				}
			}()

			next.ServeHTTP(w, r)
		})
	}
}

func Trace() Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := r.Context()
			log := core_logger.FromContext(ctx)
			rw := core_http_response.NewResponseWriter(w)

			before := time.Now()
			log.Debug(
				">>> incoming HTTP request",
				zap.Time("time", before.UTC()),
			)

			next.ServeHTTP(rw, r)

			log.Debug(
				"<<< done HTTP request",
				zap.Int("status_code", rw.GetStatusCodeOrPanic()),
				zap.Duration("latency", time.Now().Sub(before)),
			)
		})
	}
}

func isPublicRoute(r *http.Request) bool {
	if r.Method == http.MethodPost && (r.URL.Path == concatenatePath(prefix, "register") || r.URL.Path == concatenatePath(prefix, "auth") || r.URL.Path == concatenatePath(prefix, "refresh")) {
		return true
	}

	return false
}

func concatenatePath(prefix, path string) string {
	return fmt.Sprintf("%s%s", prefix, path)
}
