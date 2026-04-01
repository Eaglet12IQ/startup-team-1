package users_postgres_repository

import (
	"auth-service/internal/core/domain"
	"context"
	"fmt"
)

func (r *UsersRepository) CreateUser(ctx context.Context, user domain.User) (domain.User, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
	INSERT INTO users (fullname, email, password)
	VALUES ($1, $2, $3)
	RETURNING id, fullname, email;
	`

	row := r.pool.QueryRow(ctx, query, user.FullName, user.Email, user.Password)

	var userModel UserModel
	err := row.Scan(
		&userModel.ID,
		&userModel.FullName,
		&userModel.Email,
	)
	if err != nil {
		return domain.User{}, fmt.Errorf("scan error: %w", err)
	}

	userDomain := domain.NewUser(
		userModel.ID,
		user.FullName,
		user.Email,
		user.Password,
	)

	return userDomain, nil
}
