package users_service

import (
	"context"
	"fmt"
)

func (s *UsersService) RefreshAccessToken(ctx context.Context, refreshToken string) (string, string, error) {
	access, refresh, err := s.token.RefreshAccessToken(ctx, refreshToken)
	if err != nil {
		return "", "", fmt.Errorf("update access service: %w", err)
	}

	return access, refresh, nil
}
