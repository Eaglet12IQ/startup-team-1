# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY frontend/vite-project/package*.json ./

# Install dependencies
RUN npm ci

# Copy shared modules next to the project (same level as vite.config.ts)
COPY shared ./shared

# Symlink node_modules so shared/ can resolve react
RUN ln -s /app/node_modules /app/shared/node_modules

# Copy source code
COPY frontend/vite-project .

# Build the application
RUN npm run build

EXPOSE 80

# Production stage
FROM nginx:alpine

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY frontend/vite-project/nginx.conf /etc/nginx/conf.d/default.conf

CMD ["nginx", "-g", "daemon off;"]
