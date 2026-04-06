#!/bin/sh
echo "Waiting for Kong Admin API to be ready..."

# Более надёжное ожидание (проверяем и /status, и что база в порядке)
until curl -s -f http://kong:8001/status > /dev/null 2>&1; do
  echo "Kong Admin API not ready yet... (waiting 2s)"
  sleep 2
done

echo "Kong Admin API is responding. Checking database status..."
until curl -s http://kong:8001/status | grep -q '"database": "ok"'; do
  echo "Database not yet ready in Kong status... (waiting 2s)"
  sleep 2
done

echo "Kong is fully ready! Creating services and routes..."

# Создаём Service
curl -i -X POST http://kong:8001/services \
  --data "name=auth-service" \
  --data "url=http://auth-service:8080"

# Создаём Route
curl -i -X POST http://kong:8001/services/auth-service/routes \
  --data "name=auth-routes" \
  --data "paths[]=/api/v1/refresh" \
  --data "paths[]=/api/v1/register" \
  --data "paths[]=/api/v1/auth" \
  --data "strip_path=false"

echo "=================================================="
echo "Setup completed successfully!"
echo "=================================================="

# # Регистрируем constructor-service
# curl -X POST http://localhost:8001/services \
#   --data "name=constructor-service" \
#   --data "url=http://constructor-service:8082"

# curl -X POST http://localhost:8001/services/constructor-service/routes \
#   --data "paths[]=/api" \
#   --data "strip_path=false"

echo "Done!"