FROM node:20-slim

RUN apt-get update && apt-get install -y \
    mount \
    util-linux \
    fdisk \
    e2fsprogs \
    qemu-user-static \
    binfmt-support \
    && rm -rf /var/lib/apt/lists/*

# Docker CLI + buildx для сборки ARM64 образов
RUN apt-get update && apt-get install -y ca-certificates curl gnupg && \
    install -m 0755 -d /etc/apt/keyrings && \
    curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian bookworm stable" \
      > /etc/apt/sources.list.d/docker.list && \
    apt-get update && apt-get install -y docker-ce-cli docker-buildx-plugin && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json .
RUN npm install

COPY src/ ./src/

RUN mkdir -p /app/images /tmp/pi-builds

# /app/source монтируется в docker-compose как весь корень проекта
# /app/images монтируется как volume с fullpageos.img

CMD ["node", "src/index.js"]
