package core_token

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const (
	accessType  = "access"
	refreshType = "refresh"
	prefix      = "Bearer "
)

type Token interface {
	GenerateAccess(ctx context.Context, userID int) (string, error)
	GenerateRefresh(ctx context.Context, userID int) (string, error)
	RefreshAccessToken(
		ctx context.Context,
		refreshToken string,
	) (
		newAccessToken,
		newRefreshToken string,
		err error,
	)
	ValidateAccessToken(tokenStr string) (*Claims, error)
}

type Claims struct {
	UserID int    `json:"user_id"`
	Type   string `json:"type"`
	jwt.RegisteredClaims
}

type JWT struct {
	config     Config
	tokenStore TokenStore
}

func NewJWTService(config Config, store TokenStore) *JWT {
	return &JWT{config: config, tokenStore: store}
}

func (t *JWT) GenerateAccess(ctx context.Context, userID int) (string, error) {
	accessClaims := Claims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(t.config.AccessTTL)),
		},
		Type: accessType,
	}

	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)

	access, err := accessToken.SignedString([]byte(t.config.JWTSecret))
	if err != nil {
		return "", fmt.Errorf("generate access token: %w", err)
	}

	return access, nil
}

func (t *JWT) GenerateRefresh(ctx context.Context, userID int) (string, error) {
	refreshClaims := Claims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(t.config.RefreshTTL)),
		},
		Type: refreshType,
	}

	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)

	refresh, err := refreshToken.SignedString([]byte(t.config.JWTSecret))
	if err != nil {
		return "", fmt.Errorf("generate refresh token: %w", err)
	}

	return refresh, nil
}

func (t *JWT) RefreshAccessToken(
	ctx context.Context,
	refreshToken string,
) (
	newAccessToken,
	newRefreshToken string,
	err error,
) {
	claims, err := t.parseToken(refreshToken)
	if err != nil {
		return "", "", fmt.Errorf("refresh parse token: %w", err)
	}

	access, err := t.GenerateAccess(ctx, claims.UserID)
	if err != nil {
		return "", "", fmt.Errorf("generate access: %w", err)
	}

	refresh, err := t.GenerateRefresh(ctx, claims.UserID)
	if err != nil {
		return "", "", fmt.Errorf("generate refresh: %w", err)
	}

	return access, refresh, nil
}

func (t *JWT) ValidateAccessToken(access string) (*Claims, error) {
	claims, err := t.parseToken(access)
	if err != nil {
		return nil, err
	}

	if claims.Type != accessType {
		return nil, fmt.Errorf("invalid token type")
	}

	return claims, nil
}

func (t *JWT) parseToken(token string) (*Claims, error) {
	parsedToken, err := jwt.ParseWithClaims(token, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		return []byte(t.config.JWTSecret), nil
	})
	if err != nil {
		return nil, fmt.Errorf("parse token: %w", err)
	}

	if !parsedToken.Valid {
		return nil, fmt.Errorf("parsed token invalid: %w", err)
	}

	claims, ok := parsedToken.Claims.(*Claims)
	if !ok {
		return nil, fmt.Errorf("invalid claims: %w", err)
	}

	return claims, nil
}

func ExtractTokenFromRequest(r *http.Request) (string, error) {
	token := r.Header.Get("access")
	if token == "" {
		return "", fmt.Errorf("no token in header")
	}

	if !strings.HasPrefix(token, prefix) {
		return "", fmt.Errorf("no token prefix in header")
	}

	return strings.TrimPrefix(token, prefix), nil
}
