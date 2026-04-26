# ER-модель (актуальная версия)

## Ключевые сущности

### `users`
- `id` (int, PK)
- `email` (unique)
- `full_name` (nullable)
- `password_hash`
- `role_id` (FK -> `roles.id`)
- `is_actual` (boolean)
- `deleted_at` (nullable timestamp)
- `created_at`, `updated_at`

### `roles`
- `id`
- `code` (`ADMIN`, `OPERATOR`, `SUBSCRIBER`)
- `name`

### `admin_audit_logs`
- `id`
- `actor_user_id` (nullable FK -> `users.id`)
- `target_user_id` (FK -> `users.id`)
- `action` (string code)
- `details` (json)
- `created_at`

### `subscribers`
- `id`
- `user_id` (nullable FK -> `users.id`)
- `full_name`, `phone`, `address`, `apartment`
- `created_at`, `updated_at`

### `accounts`
- `id`
- `subscriber_id` (FK -> `subscribers.id`)
- `account_number` (unique)
- `balance`
- `is_active`
- `opened_at`

### `requests`
- `id`
- `account_id` (FK -> `accounts.id`)
- `title`, `description`
- `category` (`ACCIDENT`, `COMPLAINT`, `QUESTION`)
- `status` (`NEW`, `IN_PROGRESS`, `DONE`, `REJECTED`)
- `created_by_user_id` (FK -> `users.id`)
- `assigned_to_user_id` (nullable FK -> `users.id`)
- `created_at`, `updated_at`

### `request_status_history`
- `id`
- `request_id` (FK -> `requests.id`)
- `old_status`, `new_status`
- `changed_by_user_id` (FK -> `users.id`)
- `comment` (nullable)
- `changed_at`

## Роли и ограничения (в системе)
- `ADMIN`: управление пользователями/ролями, аудит, создание абонентов.
- `OPERATOR`: полный операционный контур заявок + чтение абонентов/ЛС.
- `SUBSCRIBER`: ограниченный пользовательский контур.
