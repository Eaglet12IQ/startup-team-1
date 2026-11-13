package users_transport_http

import (
	"fmt"
	"net/http"

	core_errors "auth-service/internal/core/errors"
	core_logger "auth-service/internal/core/logger"
	core_http_response "auth-service/internal/core/transport/http/response"
)

func (h *UsersHTTPHandler) LogoutUser(rw http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	responseHandler := core_http_response.NewHTTPResponseHandler(log, rw)

	log.Debug("invoke LogoutUser handler")

	cookie, err := r.Cookie("refresh")
	if err != nil {
		responseHandler.ErrorResponse(
			fmt.Errorf("%w: %s", core_errors.ErrInvalidArgument, err),
			"no refresh cookie",
		)

		return
	}

	if err := h.usersService.LogoutUser(ctx, cookie.Value); err != nil {
		responseHandler.ErrorResponse(err, "failed to logout user")

		return
	}

	http.SetCookie(rw, &http.Cookie{
		Name:     "refresh",
		Value:    "",
		HttpOnly: true,
		Path:     "/",
		MaxAge:   -1,
		SameSite: http.SameSiteStrictMode,
	})

	responseHandler.JSONResponse(
		map[string]string{"message": "logout successful"},
		http.StatusOK,
	)
}
