# PiDisplay — Быстрый старт

## Требования
- Docker + Docker Compose
- Node.js

## 1. Запустить бэкенд и image-builder

```bash
docker compose up --build -d
```

Сервисы:
- `http://localhost:8082` — бэкенд API
- `http://localhost:3000` — сборщик образов для Pi

## 2. Запустить фронтенд

```bash
cd frontend
npm install
cd vite-project
npm run dev
```

Открыть `http://localhost:5173`

## 3. Сделать образ для Raspberry Pi

1. Создать дизайн в редакторе
2. Нажать **"🍓 Образ для Pi"** — скачается `pidisplay.img`
3. Прошить на SD-карту (например, через Raspberry Pi Imager)
4. Вставить SD-карту в Pi и включить

## 4. Работа с Pi (офлайн)

После загрузки Pi создаёт точку доступа:
- **Wi-Fi:** `PiDisplay` / пароль: `pidisplay`
- **Редактор:** `http://192.168.4.1/` — открыть с телефона/ноутбука
- **Экран:** автоматически открывается на мониторе Pi

Нажать **"📺 На экран"** в редакторе — дизайн появится на экране Pi.
