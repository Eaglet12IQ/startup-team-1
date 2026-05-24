# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY frontend/vite-project/package*.json ./

# Install dependencies
RUN npm ci

# Copy shared modules inside the project for module resolution
COPY shared ./shared

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
