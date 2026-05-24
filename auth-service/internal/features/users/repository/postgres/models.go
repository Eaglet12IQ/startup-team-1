package users_postgres_repository

type UserModel struct {
	ID       int
	FullName string
	Email    string
	Password string
}
