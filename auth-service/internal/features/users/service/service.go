package users_service

import (
	"auth-service/internal/core/domain"
	core_token "auth-service/internal/core/token"
	"context"
)

type UsersService struct {
	usersRepository UsersRepository
	token           core_token.Token
}

type UsersRepository interface {
	CreateUser(ctx context.Context, user domain.User) (domain.User, error)
	GetUserByEmail(ctx context.Context, email string) (domain.User, error)
}

func NewUsersService(usersRepository UsersRepository, token core_token.Token) *UsersService {
	return &UsersService{
		usersRepository: usersRepository,
		token:           token,
	}
}
