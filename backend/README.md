# Backend (NestJS + Prisma)

## Быстрый старт

```bash
cd backend
npm install
cp .env.example .env
npm run prisma:generate
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

## MVP авторизация (текущий этап)

Временный формат access token: `demo-<ROLE>-<USER_ID>`.

Пример: `Authorization: Bearer demo-OPERATOR-12345`.

Поддерживаемые роли: `ADMIN`, `OPERATOR`, `SUBSCRIBER`.

### Логин без пользователей в БД

На текущем этапе `POST /auth/login` работает в демо-режиме:

- endpoint не проверяет существование пользователя в БД;
- возвращает access/refresh токены на основе переданных `login` и `role`;
- подходит для smoke/UI-проверок до внедрения полноценной auth-модели.

Поэтому открыть UI и пройти авторизацию можно даже на пустой базе данных.
