package core_token

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type TokenStore interface {
	SaveRefreshToken(
		ctx context.Context,
		sessionID uuid.UUID,
		userID int,
		expiresAt time.Time,
	) error
	IsRefreshTokenValid(ctx context.Context, sessionID uuid.UUID) (bool, error)
	RevokeRefreshToken(ctx context.Context, sessionID uuid.UUID) error
}
