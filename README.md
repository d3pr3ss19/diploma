# Diploma — ИС коммунального предприятия

Веб-ориентированная информационная система коммунального предприятия (бакалавриат, 2026).

## Стек
- **Frontend:** React + TypeScript + Vite + Ant Design
- **Backend:** NestJS + TypeScript
- **DB:** PostgreSQL
- **ORM:** Prisma
- **Auth:** JWT (access + refresh)

## Быстрый запуск (локально)

### 1) Подготовить БД
```bash
make db-setup
```

### 2) Backend
```bash
cd backend
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate:deploy
npm run seed:auth-users
npm run start:dev
```

### 3) Frontend
```bash
cd frontend
npm install
npm run dev
```

Открыть: `http://localhost:5173/login`.

---

## Роли и права

### Только администратор
1. Управление пользователями:
   - смена роли (в т.ч. назначение оператора/админа),
   - активация/деактивация,
   - архивирование,
   - сброс пароля.
2. Создание абонента (потому что создаётся пользователь и учётные данные).
3. Просмотр административных аудит-логов.

### Оператор
1. Полная работа с заявками:
   - создание,
   - изменение статуса,
   - назначение исполнителя,
   - добавление комментариев,
   - сопровождение до выполнения.
2. Просмотр данных абонентов/лицевых счетов без админских действий управления пользователями.

### Абонент
- Базовые пользовательские сценарии (без админских/операторских функций).

---

## Полезные команды
- Проверки структуры/скриптов: `make verify-structure`, `make verify-scripts`
- Smoke: `make smoke`, `make smoke-full`
- E2E API: `make e2e-api`, `make e2e-rbac`
- Полный список: `make help`

## Документация
- ER-модель: `docs/er-model.md`
- MVP API: `docs/api-mvp.md`
- Доступ/вход: `docs/site-access-guide.md`
- Прогресс: `docs/progress.md`
- Release checklist: `docs/release-checklist.md`
