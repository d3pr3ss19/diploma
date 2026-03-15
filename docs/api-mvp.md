# MVP API (REST) для Веб-ИС коммунального предприятия

Базовый префикс: `/api/v1`

## 1. Auth

### `POST /auth/login`
Вход по email/password.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "secret"
}
```

**Response 200:**
```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "OPERATOR"
  }
}
```

### `POST /auth/refresh`
Обновление access токена с ротацией refresh токена.

**Body:**
```json
{
  "refreshToken": "..."
}
```

**Response 200:**
```json
{
  "accessToken": "...",
  "refreshToken": "..."
}
```

### `POST /auth/logout`
Выход (инвалидация refresh токена).

**Body:**
```json
{
  "refreshToken": "..."
}
```

## 2. Users/Roles (админ)

### `GET /roles`
Получить список ролей.

### `GET /users`
Список пользователей.

### `POST /users`
Создать пользователя.

### `PATCH /users/:id`
Изменить данные/статус пользователя.

## 3. Subscribers & Accounts

### `GET /subscribers`
Поиск/список абонентов.

Query-параметры: `search`, `page`, `limit`.

### `POST /subscribers`
Создать абонента.

### `GET /subscribers/:id`
Карточка абонента.

### `POST /accounts`
Создать лицевой счет.

### `GET /accounts/:id`
Детали лицевого счета + баланс.

## 4. Meters & Readings

### `POST /meters`
Добавить счетчик на лицевой счет.

### `GET /accounts/:accountId/meters`
Список счетчиков по ЛС.

### `POST /meter-readings`
Передать показания.

**Body:**
```json
{
  "meterId": "uuid",
  "readingPeriod": "2026-03-01",
  "value": 1234.567
}
```

### `GET /meters/:meterId/readings`
История показаний.

## 5. Tariffs & Accruals

### `GET /tariffs`
Список тарифов.

### `POST /tariffs`
Создать/обновить тариф.

### `POST /accruals/run`
Запустить расчет начислений за период.

**Body:**
```json
{
  "period": "2026-03-01"
}
```

### `GET /accounts/:accountId/accruals`
Начисления по лицевому счету.

## 6. Payments

### `POST /payments`
Зарегистрировать оплату.

### `GET /accounts/:accountId/payments`
История оплат.

## 7. Requests (обращения)

### `POST /requests`
Создать заявку.

### `GET /requests`
Список заявок (фильтры: `status`, `category`, `assignedTo`, `accountId`).

### `GET /requests/:id`
Детали заявки.

### `PATCH /requests/:id/status`
Смена статуса заявки.

**Body:**
```json
{
  "status": "IN_PROGRESS",
  "comment": "Назначен выезд мастера"
}
```

### `GET /requests/:id/history`
История статусов.

## 8. PDF квитанции

### `GET /accounts/:accountId/receipt?period=2026-03-01`
Сгенерировать PDF-квитанцию за период.

- Контент-тайп: `application/pdf`
- В MVP можно реализовать через HTML-шаблон + рендер в PDF.

## 9. Минимальные правила доступа (RBAC)

- `ADMIN`: полный доступ.
- `OPERATOR`: работа с абонентами, счетами, заявками, начислениями, оплатами.
- `SUBSCRIBER`: только свои данные (свой ЛС, свои показания, свои заявки, своя квитанция).
