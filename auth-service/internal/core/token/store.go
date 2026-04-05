package core_token

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type TokenStore interface {
	SaveRefreshToken(ctx context.Context, sessionID uuid.UUID, userID uuid.UUID, expiresAt time.Time) error
	IsRefreshTokenValid(ctx context.Context, sessionID uuid.UUID) (bool, error)
	RevokeRefreshToken(ctx context.Context, sessionID uuid.UUID) error
}

type RefreshToken struct {
	SessionID uuid.UUID
	UserID    uuid.UUID
	ExpiresAt time.Time
	Revoked   bool
}
