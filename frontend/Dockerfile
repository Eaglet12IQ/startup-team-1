FROM node:20-alpine AS builder

WORKDIR /app

# shared
COPY shared/ ./shared/

# frontend/package.json (содержит tailwindcss и др.)
COPY frontend/package.json frontend/package-lock.json* ./frontend/

# frontend/vite-project/package.json
COPY frontend/vite-project/package.json frontend/vite-project/package-lock.json* ./frontend/vite-project/

# Ставим зависимости обоих package.json
RUN cd frontend && npm install --include=dev
RUN cd frontend/vite-project && npm install --include=dev

# node_modules из frontend/ доступны vite через поиск вверх по дереву
# shared видит node_modules через симлинк
RUN ln -s /app/frontend/vite-project/node_modules /app/shared/node_modules

# Копируем исходники
COPY frontend/vite-project/ ./frontend/vite-project/

RUN cd frontend/vite-project && npx vite build

FROM nginx:alpine
COPY --from=builder /app/frontend/vite-project/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
