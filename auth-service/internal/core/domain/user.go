package domain

import (
	core_errors "auth-service/internal/core/errors"
	"fmt"
	"regexp"
)

type User struct {
	ID       int
	FullName string
	Email    string
	Password string
}

func NewUser(id int, fullname, email, password string) User {
	return User{
		ID:       id,
		FullName: fullname,
		Email:    email,
		Password: password,
	}
}

func NewUserUninitialized(fullname, email, password string) User {
	return NewUser(
		UninitializedID,
		fullname,
		email,
		password,
	)
}

func (u *User) Validate() error {
	fullnameLength := len([]rune(u.FullName))
	if fullnameLength < 3 || fullnameLength > 50 {
		return fmt.Errorf("invalid fullname length: %d: %w", fullnameLength, core_errors.ErrInvalidArgument)
	}

	passwordLength := len([]rune(u.Password))
	if passwordLength < 5 {
		return fmt.Errorf("invalid password length: %d, %w", passwordLength, core_errors.ErrInvalidArgument)
	}

	re := regexp.MustCompile("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$")
	if !re.MatchString(u.Email) {
		return fmt.Errorf("invalid email: %v: %w", u.Email, core_errors.ErrInvalidArgument)
	}

	return nil
}
