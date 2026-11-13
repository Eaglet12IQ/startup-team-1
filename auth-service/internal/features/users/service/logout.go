package users_service

import (
	"context"
	"fmt"
)

func (s *UsersService) LogoutUser(ctx context.Context, refreshToken string) error {
	if err := s.token.RevokeRefresh(ctx, refreshToken); err != nil {
		return fmt.Errorf("revoke refresh session: %w", err)
	}

	return nil
}
