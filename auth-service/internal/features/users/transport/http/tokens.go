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
		responseHandler.ErrorResponse(err, "no refresh cookie")

		return
	}

	access, refresh, err := u.usersService.RefreshAccessToken(ctx, cookie.Value)
	if err != nil {
		responseHandler.ErrorResponse(err, "can not update access token")

		return
	}

	responseHandler.TokensResponse(rw, access, refresh, http.StatusOK)
}
