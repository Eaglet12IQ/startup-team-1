FROM node:20-slim

# Нужны утилиты для монтирования образов
RUN apt-get update && apt-get install -y \
    mount \
    util-linux \
    fdisk \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json .
RUN npm install

COPY src/ ./src/

RUN mkdir -p /app/images /tmp/pi-builds

CMD ["node", "src/index.js"]