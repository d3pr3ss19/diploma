# MVP API (актуально)

Базовый префикс: `/api/v1`.

## 1) Auth
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `PATCH /auth/me` — обновление своего профиля (email, ФИО)

## 2) Админские операции пользователей
- `POST /auth/users/:id/activate`
- `POST /auth/users/:id/deactivate`
- `DELETE /auth/users/:id` (архив)
- `POST /auth/users/:id/reset-password`
- `PATCH /auth/users/:id/role`
- `GET /auth/audit-logs?section=USERS|SUBSCRIBERS|REQUESTS`

## 3) Абоненты и ЛС
- `GET /subscribers` — admin/operator
- `GET /subscribers/:id` — admin/operator
- `POST /subscribers` — только admin (создаёт абонента + user + стартовый account)
- `PATCH /subscribers/:id` — только admin

## 4) Заявки
- `GET /requests` — admin/operator
- `GET /requests/:id` — admin/operator
- `GET /requests/:id/history` — admin/operator
- `POST /requests` — admin/operator
- `PATCH /requests/:id` — admin/operator (статус, назначение, комментарий)

## 5) Что в ближайшем roadmap
- Начисления/оплаты/квитанции (сквозной контур для защиты диплома).
- Ограниченный self-service абонента (свои заявки/свои данные).
