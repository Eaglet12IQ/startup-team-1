# PiDisplay

Конструктор экранов для Raspberry Pi: веб-редактор макетов → сохранение → сборка
готового образа ОС (`pidisplay.img`) для развёртывания на Pi. Дизайн отображается
на подключённом мониторе, редактирование — офлайн через точку доступа Pi.

Подробные инструкции по запуску и работе с Pi — в [Start.md](Start.md).

## Архитектура

| Компонент | Стек | Роль |
|---|---|---|
| `frontend/` | React + Vite | Веб-редактор макетов |
| `constructor-service/` | Python / FastAPI | CRUD макетов, раздача display.html |
| `chat-service/` | Python / FastAPI + Postgres + Redis | WebSocket-чат с LLM |
| `ai-agent/` | Python / LangGraph | Redis Streams воркер, обращается к LLM |
| `auth-service/` | Go + pgx | JWT-аутентификация (register / login / refresh) |
| `check-plugin/` | Kong Lua | Проверка JWT на API-шлюзе |
| `shared/` | TypeScript / React | Общие компоненты блоков (текст, изображение) |
| `pi-image-builder/` | Node.js | Сборка образа ОС для Raspberry Pi |
| `design-system/` | статика | Шрифты, логотипы, дизайн-токены |

Инфраструктура: API-шлюз Kong (`docker-compose.yml`), БД Postgres для auth и chat,
Redis для chat/ai-agent. Секреты — в `.env` (не коммитится; шаблон — `.env.example`).

## Быстрый старт

```bash
# 1. Скопировать шаблон окружения и заполнить секреты
cp .env.example .env

# 2. Запустить бэкенд-сервисы и image-builder
docker compose up --build -d

# 3. Запустить фронтенд в dev-режиме
cd frontend/vite-project && npm install && npm run dev
# открыть http://localhost:5173
```

## Структура репозитория

```
frontend/               # веб-редактор (Vite-приложение)
constructor-service/    # API макетов (schemas/ и uploads/ — рантайм-данные, не в git)
chat-service/           # чат-сервис (alembic-миграции)
ai-agent/               # LLM-воркер
auth-service/           # Go-сервис аутентификации
shared/                 # общие React-компоненты блоков
check-plugin/           # Lua-плагин Kong (jwt-check)
pi-image-builder/       # сборщик .img для Raspberry Pi
design-system/          # брендовые ассеты и токены
```
