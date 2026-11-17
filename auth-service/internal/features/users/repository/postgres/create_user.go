package users_postgres_repository

import (
	"auth-service/internal/core/domain"
	core_errors "auth-service/internal/core/errors"
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5/pgconn"
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
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return domain.User{}, fmt.Errorf(
				"user already exists: %w",
				core_errors.ErrConflict,
			)
		}

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
