package users_transport_http

import (
	"auth-service/internal/core/domain"
	core_http_server "auth-service/internal/core/server"
	"context"
	"net/http"
)

type UsersHTTPHandler struct {
	usersService UsersService
}

type UsersService interface {
	CreateUser(ctx context.Context, user domain.User) (domain.User, error)
	LoginUser(ctx context.Context, user domain.User) (string, string, error)
	RefreshAccessToken(ctx context.Context, refreshToken string) (string, string, error)
}

func NewUsersHTTPHandler(usersService UsersService) *UsersHTTPHandler {
	return &UsersHTTPHandler{usersService: usersService}
}

func (h *UsersHTTPHandler) Routes() []core_http_server.Route {
	return []core_http_server.Route{
		{
			Method:  http.MethodPost,
			Path:    "/register",
			Handler: h.CreateUser,
		},
		{
			Method:  http.MethodPost,
			Path:    "/auth",
			Handler: h.LoginUser,
		},
		{
			Method:  http.MethodPost,
			Path:    "/refresh",
			Handler: h.RefreshAccessToken,
		},
	}
}
