FROM golang:1.24.3

WORKDIR /app

COPY go.mod go.sum ./

RUN go mod download

COPY . .

RUN go build -o app ./cmd/auth-service

EXPOSE 8080

CMD ["./app"]