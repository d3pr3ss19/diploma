# ER-модель MVP: Веб-ИС коммунального предприятия

## 1. Сущности и назначение

### `roles`
Справочник ролей пользователей системы.

- `id` (PK, int)
- `code` (varchar, unique) — `ADMIN`, `OPERATOR`, `SUBSCRIBER`
- `name` (varchar)

### `users`
Учетные записи для входа в систему.

- `id` (PK, uuid)
- `email` (varchar, unique)
- `password_hash` (varchar)
- `role_id` (FK -> `roles.id`)
- `is_active` (boolean)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### `subscribers`
Карточки абонентов (физлицо/домохозяйство).

- `id` (PK, uuid)
- `user_id` (FK -> `users.id`, nullable) — связь с ЛК абонента
- `full_name` (varchar)
- `phone` (varchar)
- `address` (varchar)
- `apartment` (varchar, nullable)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### `accounts`
Лицевые счета абонентов.

- `id` (PK, uuid)
- `subscriber_id` (FK -> `subscribers.id`)
- `account_number` (varchar, unique)
- `balance` (numeric(12,2))
- `is_active` (boolean)
- `opened_at` (date)

### `meters`
Счетчики, установленные на лицевом счете.

- `id` (PK, uuid)
- `account_id` (FK -> `accounts.id`)
- `meter_type` (varchar) — `COLD_WATER`, `HOT_WATER`, `ELECTRICITY`
- `serial_number` (varchar, unique)
- `installed_at` (date)
- `is_active` (boolean)

### `meter_readings`
История переданных показаний.

- `id` (PK, uuid)
- `meter_id` (FK -> `meters.id`)
- `reading_period` (date) — период учета (например, 2026-03-01)
- `value` (numeric(12,3))
- `submitted_by_user_id` (FK -> `users.id`)
- `submitted_at` (timestamp)
- unique(`meter_id`, `reading_period`)

### `tariffs`
Тарифы по услуге на период действия.

- `id` (PK, uuid)
- `service_type` (varchar)
- `price_per_unit` (numeric(12,4))
- `effective_from` (date)
- `effective_to` (date, nullable)
- `is_active` (boolean)

### `accruals`
Начисления по лицевому счету за период.

- `id` (PK, uuid)
- `account_id` (FK -> `accounts.id`)
- `period` (date)
- `service_type` (varchar)
- `consumption` (numeric(12,3))
- `amount` (numeric(12,2))
- `created_at` (timestamp)

### `payments`
Оплаты по лицевому счету.

- `id` (PK, uuid)
- `account_id` (FK -> `accounts.id`)
- `payment_date` (date)
- `amount` (numeric(12,2))
- `method` (varchar) — `CASH`, `CARD`, `BANK_TRANSFER`
- `external_ref` (varchar, nullable)
- `created_at` (timestamp)

### `requests`
Заявки/обращения абонентов.

- `id` (PK, uuid)
- `account_id` (FK -> `accounts.id`)
- `title` (varchar)
- `description` (text)
- `category` (varchar) — `ACCIDENT`, `COMPLAINT`, `QUESTION`
- `status` (varchar) — `NEW`, `IN_PROGRESS`, `DONE`, `REJECTED`
- `created_by_user_id` (FK -> `users.id`)
- `assigned_to_user_id` (FK -> `users.id`, nullable)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### `request_status_history`
Журнал изменения статусов заявок.

- `id` (PK, uuid)
- `request_id` (FK -> `requests.id`)
- `old_status` (varchar)
- `new_status` (varchar)
- `changed_by_user_id` (FK -> `users.id`)
- `changed_at` (timestamp)
- `comment` (text, nullable)

## 2. Основные связи

- `roles (1) -> (N) users`
- `users (1) -> (0..1) subscribers`
- `subscribers (1) -> (N) accounts`
- `accounts (1) -> (N) meters`
- `meters (1) -> (N) meter_readings`
- `accounts (1) -> (N) accruals`
- `accounts (1) -> (N) payments`
- `accounts (1) -> (N) requests`
- `requests (1) -> (N) request_status_history`

## 3. Бизнес-ограничения MVP

1. Один абонент может иметь несколько лицевых счетов.
2. На один тип услуги в периоде должен применяться ровно один активный тариф.
3. Для одного счетчика в одном периоде можно передать только одно значение.
4. Начисления за период считаются от разницы текущих и предыдущих показаний.
5. Баланс ЛС = сумма начислений - сумма оплат.
