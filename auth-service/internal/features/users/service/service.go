package users_service

import (
	"auth-service/internal/core/domain"
	"context"
)

type UsersService struct {
	usersRepository UsersRepository
}

type UsersRepository interface {
	CreateUser(ctx context.Context, user domain.User) (domain.User, error)
}

func NewUsersService(usersRepository UsersRepository) *UsersService {
	return &UsersService{usersRepository: usersRepository}
}
