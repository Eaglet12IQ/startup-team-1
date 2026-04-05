package users_service

import (
	"auth-service/internal/core/domain"
	"context"
	"fmt"

	"golang.org/x/crypto/bcrypt"
)

func (s *UsersService) LoginUser(ctx context.Context, user domain.User) (string, string, error) {
	if err := user.ValidatePasswordAndEmail(); err != nil {
		return "", "", fmt.Errorf("validate password and email domain: %w", err)
	}

	savedUser, err := s.usersRepository.GetUserByEmail(ctx, user.Email)
	if err != nil {
		return "", "", fmt.Errorf("get user by email: %w", err)
	}

	if err := bcrypt.CompareHashAndPassword([]byte(savedUser.Password), []byte(user.Password)); err != nil {
		return "", "", fmt.Errorf("failed to compare hash: %w", err)
	}

	access, err := s.token.GenerateAccess(ctx, savedUser.ID)
	if err != nil {
		return "", "", fmt.Errorf("service access: %w", err)
	}

	refresh, err := s.token.GenerateRefresh(ctx, savedUser.ID)
	if err != nil {
		return "", "", fmt.Errorf("service refresh: %w", err)
	}

	return access, refresh, nil
}
