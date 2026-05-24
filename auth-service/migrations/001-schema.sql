CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    fullname VARCHAR(50) NOT NULL 
        CHECK (char_length(fullname) BETWEEN 3 AND 50),
    email VARCHAR(50) UNIQUE NOT NULL 
        CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    password VARCHAR(100) NOT NULL
        CHECK (char_length(password) <= 100)
)