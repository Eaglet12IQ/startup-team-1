package users_postgres_repository

import (
	"auth-service/internal/core/domain"
	"context"
	"fmt"
)

func (r *UsersRepository) GetUserByEmail(ctx context.Context, email string) (domain.User, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
	SELECT id, fullname, email, password
	FROM users 
	WHERE email=$1;
	`

	row := r.pool.QueryRow(ctx, query, email)

	var userModel UserModel
	err := row.Scan(
		&userModel.ID,
		&userModel.FullName,
		&userModel.Email,
		&userModel.Password,
	)
	if err != nil {
		return domain.User{}, fmt.Errorf("scan error: %w", err)
	}

	userDomain := domain.NewUser(
		userModel.ID,
		userModel.FullName,
		userModel.Email,
		userModel.Password,
	)

	return userDomain, nil
}
