package users_transport_http

import (
	"auth-service/internal/core/domain"
	core_logger "auth-service/internal/core/logger"
	core_http_request "auth-service/internal/core/transport/http/request"
	core_http_response "auth-service/internal/core/transport/http/response"
	"net/http"
)

type LoginUserRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (h *UsersHTTPHandler) LoginUser(rw http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	responseHandler := core_http_response.NewHTTPResponseHandler(log, rw)

	log.Debug("invoke LoginUser handler")

	var request LoginUserRequest
	if err := core_http_request.DecodeAndValidateRequest(r, &request); err != nil {
		responseHandler.ErrorResponse(err, "failed to decode and validate request")

		return
	}

	user := domainFromLoginUserDTO(request)

	access, refresh, err := h.usersService.LoginUser(ctx, user)
	if err != nil {
		responseHandler.ErrorResponse(err, "failed to login user")

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

func domainFromLoginUserDTO(dto LoginUserRequest) domain.User {
	return domain.User{
		Email:    dto.Email,
		Password: dto.Password,
	}
}
