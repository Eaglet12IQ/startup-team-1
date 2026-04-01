package users_service

type UsersService struct {
	usersRepository UsersRepository
}

type UsersRepository interface {
}

func NewUsersService(usersRepository UsersRepository) *UsersService {
	return &UsersService{usersRepository: usersRepository}
}
