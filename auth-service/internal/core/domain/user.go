package domain

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
