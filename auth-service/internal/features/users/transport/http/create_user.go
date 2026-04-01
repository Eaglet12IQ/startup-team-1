package users_transport_http

import (
	"auth-service/internal/core/domain"
	core_logger "auth-service/internal/core/logger"
	core_http_request "auth-service/internal/core/transport/http/request"
	core_http_response "auth-service/internal/core/transport/http/response"
	"net/http"
)

type CreateUserRequest struct {
	FullName string `json:"full_name" validate:"required,min=3,max=50"`
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=10"`
}

type CreateUserResponse struct {
	ID       int    `json:"id"`
	FullName string `json:"full_name"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (h *UsersHTTPHandler) CreateUser(rw http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	responseHandler := core_http_response.NewHTTPResponseHandler(log, rw)

	log.Debug("invoke CreateUser handler")

	var request CreateUserRequest
	if err := core_http_request.DecodeAndValidateRequest(r, &request); err != nil {
		responseHandler.ErrorResponse(err, "failed to decode and validate HTTP request")

		return
	}

	userDomain := domainFromDTO(request)

	userDomain, err := h.usersService.CreateUser(ctx, userDomain)
	if err != nil {
		responseHandler.ErrorResponse(err, "failed to create user")

		return
	}

	response := dtoFromDomain(userDomain)

	responseHandler.JSONResponse(response, http.StatusCreated)
}

func domainFromDTO(dto CreateUserRequest) domain.User {
	return domain.NewUserUninitialized(dto.FullName, dto.Email, dto.Password)
}

func dtoFromDomain(user domain.User) CreateUserResponse {
	return CreateUserResponse{
		ID:       user.ID,
		FullName: user.FullName,
		Email:    user.Email,
		Password: user.Password,
	}
}
