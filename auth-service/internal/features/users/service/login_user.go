package users_service

import (
	"auth-service/internal/core/domain"
	core_errors "auth-service/internal/core/errors"
	"context"
	"errors"
	"fmt"

	"golang.org/x/crypto/bcrypt"
)

func (s *UsersService) LoginUser(
	ctx context.Context,
	user domain.User,
) (
	string,
	string,
	domain.User,
	error,
) {
	if err := user.ValidatePasswordAndEmail(); err != nil {
		return "", "", domain.User{}, fmt.Errorf("validate password and email domain: %w", err)
	}

	savedUser, err := s.usersRepository.GetUserByEmail(ctx, user.Email)
	if err != nil {
		if errors.Is(err, core_errors.ErrNotFound) {
			return "", "", domain.User{}, fmt.Errorf(
				"unknown email: %w",
				core_errors.ErrUnauthorized,
			)
		}

		return "", "", domain.User{}, fmt.Errorf("get user by email: %w", err)
	}

	if err := bcrypt.CompareHashAndPassword(
		[]byte(savedUser.Password),
		[]byte(user.Password),
	); err != nil {
		return "", "", domain.User{}, fmt.Errorf(
			"invalid password: %w: %w",
			err,
			core_errors.ErrUnauthorized,
		)
	}

	access, err := s.token.GenerateAccess(ctx, savedUser.ID)
	if err != nil {
		return "", "", domain.User{}, fmt.Errorf("service access: %w", err)
	}

	refresh, err := s.token.GenerateRefresh(ctx, savedUser.ID)
	if err != nil {
		return "", "", domain.User{}, fmt.Errorf("service refresh: %w", err)
	}

	return access, refresh, savedUser, nil
}
