#!/bin/sh
set -e

echo 'Waiting for Kong Admin API...'
sleep 30

echo 'Kong is ready, creating services and routes...'

curl -i -X POST http://kong:8001/services \
  -d name=auth-service \
  -d url=http://auth-service:8080

curl -i -X POST http://kong:8001/services/auth-service/routes \
  -d name=auth-routes \
  -d 'paths[]=/api/v1/register' \
  -d 'paths[]=/api/v1/auth' \
  -d 'paths[]=/api/v1/refresh' \
  -d strip_path=false

# # Регистрируем constructor-service
# curl -X POST http://localhost:8001/services \
#   --data "name=constructor-service" \
#   --data "url=http://constructor-service:8082"

# curl -X POST http://localhost:8001/services/constructor-service/routes \
#   --data "paths[]=/api" \
#   --data "strip_path=false"

echo "Done!"