# Backend (NestJS + Prisma)

## Быстрый старт

```bash
cd backend
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate:deploy
npm run seed:auth-users
npm run start:dev
```

API будет доступен по адресу `http://localhost:3000/api/v1`.

Проверка доступности:

```bash
curl http://localhost:3000/api/v1/health
```



## Ошибка PrismaClientInitializationError (DB auth failed)

Если видишь ошибку:

`Authentication failed against database server at localhost`

проверь:

1. В `backend/.env` корректный `DATABASE_URL` (логин/пароль/порт/имя БД).
2. PostgreSQL действительно запущен и слушает нужный порт.
3. Этими же credentials можно зайти вручную через `psql`.

Пример типичного `DATABASE_URL` для локальной разработки:

`DATABASE_URL="postgresql://diploma_user:12345678@localhost:5432/diploma"`

Дальше выполни:

```bash
npm run prisma:generate
npm run prisma:migrate:deploy
```

И перезапусти backend.

## Авторизация (текущий этап)

Реализована базовая auth-модель через пользователей БД:

- `POST /auth/login` — вход по `email/password`;
- `POST /auth/refresh` — обновление access-токена по refresh-токену;
- `AuthGuard` проверяет Bearer access-токен и выставляет `request.user`.

### Сид пользователей для локальной разработки

После миграций выполни:

```bash
npm run seed:auth-users
```

Будут созданы пользователи:

- `admin@kp.local` / `password123`
- `operator@kp.local` / `password123`
- `subscriber@kp.local` / `password123`
