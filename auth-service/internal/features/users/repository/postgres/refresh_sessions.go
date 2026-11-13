package users_postgres_repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	core_postgres_pool "auth-service/internal/core/repository/postgres/pool"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type RefreshSessionsRepository struct {
	pool core_postgres_pool.Pool
}

func NewRefreshSessionsRepository(pool core_postgres_pool.Pool) *RefreshSessionsRepository {
	return &RefreshSessionsRepository{pool: pool}
}

func (r *RefreshSessionsRepository) SaveRefreshToken(
	ctx context.Context,
	sessionID uuid.UUID,
	userID int,
	expiresAt time.Time,
) error {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
	INSERT INTO refresh_sessions (session_id, user_id, expires_at)
	VALUES ($1, $2, $3);
	`

	if _, err := r.pool.Exec(ctx, query, sessionID, userID, expiresAt); err != nil {
		return fmt.Errorf("exec error: %w", err)
	}

	return nil
}

func (r *RefreshSessionsRepository) IsRefreshTokenValid(
	ctx context.Context,
	sessionID uuid.UUID,
) (bool, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
	SELECT NOT revoked AND expires_at > now()
	FROM refresh_sessions
	WHERE session_id = $1;
	`

	var valid bool
	err := r.pool.QueryRow(ctx, query, sessionID).Scan(&valid)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("scan error: %w", err)
	}

	return valid, nil
}

func (r *RefreshSessionsRepository) RevokeRefreshToken(
	ctx context.Context,
	sessionID uuid.UUID,
) error {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
	UPDATE refresh_sessions
	SET revoked = TRUE
	WHERE session_id = $1;
	`

	if _, err := r.pool.Exec(ctx, query, sessionID); err != nil {
		return fmt.Errorf("exec error: %w", err)
	}

	return nil
}
