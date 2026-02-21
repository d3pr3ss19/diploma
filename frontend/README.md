# Frontend (React + Vite + TypeScript + Ant Design)

## Запуск

```bash
npm install
npm run dev
```

Приложение поднимается по адресу `http://localhost:5173`.

## Маршруты MVP

- `/login` — страница входа
- `/dashboard` — панель
- `/subscribers` — список абонентов
- `/requests` — список заявок
- `/account` — просмотр лицевого счёта по `subscriberId`

## API

HTTP-клиент настроен в `src/api/http.ts` с базовым URL:

`http://localhost:3000/api/v1`


## Что уже реализовано (Шаг 3.2)

- Форма логина отправляет `POST /auth/login`.
- Токен и пользователь сохраняются в `localStorage`.
- Для защищённых роутов подключён `RequireAuth`.
- Axios автоматически добавляет `Authorization: Bearer <token>`.


## Что уже реализовано (Шаг 3.3)

- Страница `Абоненты` загружает данные через `GET /subscribers`.
- Страница `Заявки` загружает данные через `GET /requests`.
- Страница `Лицевой счёт` получает данные через `GET /subscribers/:id` и показывает связанные счета.
