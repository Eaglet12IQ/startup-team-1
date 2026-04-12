# PiDisplay — Быстрый старт

## Требования
- Docker + Docker Compose
- Node.js 20+

---

## Режим разработки (основной)

Используется для создания дизайнов и сборки образов для Pi.

### 1. Запустить бэкенд и image-builder

```bash
docker compose up --build -d
```

Сервисы:
- `http://localhost:8082` — бэкенд API
- `http://localhost:3000` — сборщик образов для Pi

### 2. Запустить фронтенд

```bash
cd frontend/vite-project && npm run dev
```

Открыть `http://localhost:5173`

### 3. Собрать образ для Raspberry Pi

1. Создать дизайн в редакторе
2. Нажать **"🍓 Образ для Pi"** — скачается `pidisplay.img`
3. Прошить на SD-карту (например, через Raspberry Pi Imager)
4. Вставить SD-карту в Pi и включить

---

## Тестовая среда Pi (без SD-карты)

Позволяет проверить Pi-режим локально — без прошивки.

### Запустить

```bash
docker compose -f docker-compose.pi-test.yml up --build -d
```

Открыть два окна браузера:
- `http://localhost:8080` — редактор в Pi-режиме (кнопка "📺 На экран", без авторизации)
- `http://localhost:8082/api/display/` — дисплей (что видит Chromium на Pi)

### Остановить

```bash
docker compose -f docker-compose.pi-test.yml down
```

---

## Работа с Pi (офлайн)

После загрузки Pi создаёт точку доступа:
- **Wi-Fi:** `PiDisplay` / пароль: `pidisplay`
- **Редактор:** `http://192.168.4.1/` — открыть с телефона
- **Экран:** автоматически открывается на мониторе Pi при старте

Подключиться с телефона к Wi-Fi `PiDisplay`, открыть `http://192.168.4.1/` — сразу список табло без авторизации. Нажать **"📺 На экран"** — дизайн мгновенно появится на экране Pi через SSE без мигания.

---

## Если что-то не работает на Pi

```bash
sudo systemctl status pidisplay
sudo systemctl status hostapd
sudo docker ps
ls /usr/local/bin/docker-compose
journalctl -u pidisplay -n 50
```

---

## Если Docker не запускается (конфликт сетей)

Если при `docker compose up` ошибка `Resource is still in use` — сначала останови тестовую среду:

```bash
docker compose -f docker-compose.pi-test.yml down
docker compose up --build -d
```

Если ошибка с кэшем Docker:

```bash
docker compose down && docker builder prune -f && docker compose up --build -d
```
