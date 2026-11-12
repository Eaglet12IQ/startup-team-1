# Единый Dockerfile фронтенда для обоих режимов:
#   прод (VITE_PI_MODE=false, по умолчанию)  — nginx.prod.conf   (kong, SSL)
#   pi   (VITE_PI_MODE=true)                 — nginx.pi-test.conf (pidisplay-backend:8082)
# ВАЖНО: путь и имя аргумента зашиты в pi-image-builder/src/imageBuilder.js
# (--build-arg VITE_PI_MODE=true -f /app/source/frontend/Dockerfile) — не переименовывать.

FROM node:20-alpine AS builder

WORKDIR /app

# Общие модули блоков (разрешаются через алиас @shared)
COPY shared ./shared

# Зависимости из единственного package.json + lockfile
COPY frontend/package*.json ./
RUN npm ci

# Исходники приложения
# react для shared/ резолвится стандартным walk-up до /app/node_modules
COPY frontend/ .

ARG VITE_PI_MODE=false
ENV VITE_PI_MODE=$VITE_PI_MODE

RUN npm run build

FROM nginx:alpine

ARG VITE_PI_MODE=false

COPY --from=builder /app/dist /usr/share/nginx/html
COPY frontend/nginx.pi-test.conf /etc/nginx/conf.d/pi-test.conf
COPY frontend/nginx.prod.conf /etc/nginx/conf.d/prod.conf
# Включаем ровно одну конфигурацию в зависимости от режима
RUN if [ "$VITE_PI_MODE" = "true" ]; then \
      mv /etc/nginx/conf.d/pi-test.conf /etc/nginx/conf.d/default.conf && rm /etc/nginx/conf.d/prod.conf; \
    else \
      mv /etc/nginx/conf.d/prod.conf /etc/nginx/conf.d/default.conf && rm /etc/nginx/conf.d/pi-test.conf; \
    fi

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
