package users_service

import (
	"auth-service/internal/core/domain"
	"context"
)

func (s *UsersService) CreateUser(ctx context.Context, user domain.User) (domain.User, error)
