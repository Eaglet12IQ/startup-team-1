package users_transport_http

import (
	core_logger "auth-service/internal/core/logger"
	core_http_response "auth-service/internal/core/transport/http/response"
	"net/http"
)

func (u *UsersHTTPHandler) RefreshAccessToken(rw http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	responseHandler := core_http_response.NewHTTPResponseHandler(log, rw)

	cookie, err := r.Cookie("refresh")
	if err != nil {
		responseHandler.ErrorResponse(err, "cookie refresh")

		return
	}

	access, refresh, err := u.usersService.RefreshAccessToken(ctx, cookie.Value)
	if err != nil {
		responseHandler.ErrorResponse(err, "update access token")

		return
	}

	// Сомнительно
	http.SetCookie(rw, &http.Cookie{
		Name:     "refresh",
		Value:    refresh,
		HttpOnly: true,
		Secure:   false,
		Path:     "/",
		MaxAge:   86400,
		SameSite: http.SameSiteStrictMode,
	})

	// Тоже сомнительно как-будто
	response := map[string]string{
		"access": access,
	}

	responseHandler.JSONResponse(response, http.StatusOK)
}
