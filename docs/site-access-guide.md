# Гайд: как зайти на сайт и авторизоваться

## 1) Подготовь БД и backend

Из корня проекта:

```bash
make db-setup
```

Далее backend:

```bash
cd backend
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate:deploy
npm run seed:auth-users
npm run start:dev
```

## 2) Подними frontend

В новом терминале:

```bash
cd frontend
npm install
npm run dev
```

Открой: `http://localhost:5173/login`.

## 3) Логин стандартными пользователями

После `npm run seed:auth-users` доступны:

- `admin@kp.local` / `password123`
- `operator@kp.local` / `password123`
- `subscriber@kp.local` / `password123`

## 4) Добавить своего пользователя

Можно добавить (или обновить) пользователя вручную:

```bash
cd backend
npm run create:auth-user -- user1@kp.local StrongPass123 OPERATOR
```

Где роль: `ADMIN`, `OPERATOR` или `SUBSCRIBER`.

> Важно: роли должны существовать в БД. Обычно достаточно один раз выполнить `npm run seed:auth-users`.

## 5) Если логин не работает

Проверь:

1. backend запущен на `http://localhost:3000`;
2. в `backend/.env` корректный `DATABASE_URL`;
3. миграции применены (`npm run prisma:migrate:deploy`);
4. пользователь действительно есть в БД (повтори `create:auth-user` или `seed:auth-users`).
