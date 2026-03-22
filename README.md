# diploma

Дипломный проект на тему «Веб-ориентированная информационная система коммунального предприятия». Бакалавриат, 2026 год.

## Технологический стек (Вариант A, без Docker)

- Frontend: React + TypeScript + Vite + Ant Design
- Backend: NestJS + TypeScript
- База данных: PostgreSQL (локально)
- ORM: Prisma
- Аутентификация: JWT (access + refresh)
- Генерация квитанций: HTML → PDF (базово), PDFKit (дополнительно)


## Как посмотреть сайт локально

1. Подними backend:

```bash
cd backend
npm install
cp .env.example .env
npm run prisma:generate
npm run start:dev
```

2. В отдельном терминале подними frontend:

```bash
cd frontend
npm install
npm run dev
```

3. Открой `http://localhost:5173/login`.

На текущем этапе авторизация использует пользователей из БД.
Перед входом создай демо-пользователей командой `cd backend && npm run seed:auth-users`, затем входи через форму `email + password`.


## Что ещё осталось сделать

Для удобства вынесен отдельный чек-лист незавершённых работ:

- `docs/project-completion-checklist.md`

## План старта

### Шаг 1 (сейчас): согласовать MVP и доменную модель

Перед кодом фиксируем минимальный функционал, который точно войдёт в первую рабочую версию:

1. Авторизация (администратор, оператор, абонент).
2. Абоненты и лицевые счета.
3. Заявки/обращения (создание и смена статуса).
4. Показания счётчиков.
5. Начисления и просмотр квитанции.

На этом шаге нужно утвердить сущности БД:

- `users`, `roles`
- `subscribers`, `accounts`
- `meters`, `meter_readings`
- `tariffs`, `accruals`, `payments`
- `requests`, `request_status_history`

Результаты шага 1:

- ER-модель: `docs/er-model.md`
- MVP API: `docs/api-mvp.md`

### Шаг 2: поднять каркас backend

1. Создать NestJS-проект.
2. Подключить PostgreSQL и Prisma.
3. Сделать модули `auth`, `users`, `subscribers`, `requests`.
4. Описать первые API-эндпоинты.

### Шаг 3: поднять каркас frontend

1. Создать React + Vite + TypeScript.
2. Настроить роутинг и layout.
3. Добавить страницы: Login, Dashboard, Абоненты, Заявки.
4. Подключить API-клиент.


## Текущий прогресс

- ✅ Шаг 1 завершён: ER-модель и MVP API зафиксированы в `docs/`.
- ✅ Шаг 2.1-2.5: backend-каркас собран, добавлены Prisma CRUD, валидация DTO, единый формат ошибок и RBAC guard.
- ✅ Шаг 3.1: создан каркас frontend (React + Vite + TS + Ant Design, routing и базовые страницы).
- ✅ Шаг 3.2: логин подключен к backend auth endpoint, добавлены auth storage и protected routes.
- ✅ Шаг 3.3: страницы Абоненты / Заявки / Лицевой счёт работают с реальными API-запросами.
- ✅ Шаг 4.1: добавлены формы создания абонентов и заявок из UI (POST).
- ✅ Шаг 4.2: улучшены валидации форм и добавлены уведомления об успешном создании.
- ✅ Шаг 4.3: добавлены prefill UUID-полей и человекочитаемые сообщения API-ошибок.
- ✅ Шаг 4.4: карточка лицевого счёта дополнена последними заявками и сводной статистикой.
- ✅ Шаг 5.1: добавлены фильтры и сортировка в списки Абоненты/Заявки.
- ✅ Шаг 5.2: добавлены пагинация и сохранение фильтров в URL.
- ✅ Шаг 5.3: добавлены быстрый сброс фильтров и операторские пресеты.
- ✅ Шаг 5.4: выбор пресетов сохраняется между сессиями пользователя.
- ✅ Шаг 6.1: выделены и покрыты тестами frontend-утилиты фильтрации/сортировки.
- ✅ Шаг 6.2: добавлены тесты и утилиты для URL query-state и пресетов.
- ✅ Шаг 6.3: покрыты тестами парсер API-ошибок и auth-storage (включая статусные/сетевые fallback-сценарии).
- ✅ Шаг 6.4: добавлены smoke-checklist и автоматизированные smoke/e2e скрипты.
- ✅ Шаг 7.1: усилена валидация auth login и добавлен e2e-check для невалидного payload.
- ✅ Шаг 7.2: добавлена UUID-валидация path-параметров в backend и e2e-check невалидного UUID в RBAC-сценарии.
- ✅ Шаг 7.3: исправлен парсинг demo-токена в backend auth guard для UUID user-id, добавлен e2e-check токена с UUID-like user-id.
- ✅ Шаг 7.4: e2e auth-flow дополнен негативными кейсами malformed demo-токенов (пустой user-id и неизвестная роль).
- ✅ Шаг 7.5: RBAC e2e дополнен проверкой malformed токена с неизвестной ролью (401 на защищённом endpoint).
- ✅ Шаг 7.6: e2e auth/rbac скрипты переведены на надёжный JSON-парсинг accessToken через Python.
- ✅ Шаг 7.7: добавлен общий helper `scripts/extract-access-token.py` для устранения дублирования в e2e auth/rbac скриптах.
- ✅ Шаг 7.8: tooling-проверки расширены: валидируется наличие/исполняемость и Python-синтаксис `scripts/extract-access-token.py`.
- ✅ Шаг 7.9: `verify-scripts.sh` теперь проверяет синтаксис как shell-, так и Python-скриптов проекта.
- ✅ Шаг 7.10: добавлен `verify-token-helper.sh` для поведенческих проверок helper-скрипта извлечения accessToken.
- ✅ Шаг 7.11: `verify-scripts.sh` переведён на auto-discovery всех `scripts/*.sh` и `scripts/*.py` для синтаксической проверки.
- ✅ Шаг 7.12: `verify-scripts.sh` дополнен проверкой executable-бита для всех найденных скриптов в `scripts/`.
- ✅ Шаг 7.13: `verify-scripts.sh` дополнительно валидирует корректный shebang у shell/python скриптов.
- ✅ Шаг 7.14: добавлен `verify-wait-for-http.sh` для поведенческой проверки скрипта ожидания HTTP endpoint.
- ✅ Шаг 7.15: `verify-token-helper.sh` дополнен кейсами пустого и нестрокового `accessToken`.
- ✅ Шаг 7.16: `verify-wait-for-http.sh` теперь проверяет точные exit-коды usage/timeout (`2`/`1`).
- ✅ Шаг 7.17: `wait-for-http.sh` дополнен валидацией timeout/interval и тестами этих кейсов в `verify-wait-for-http.sh`.
- ✅ Шаг 7.18: `wait-for-http.sh` теперь принимает сервис как доступный только при HTTP-статусе < 400; добавлен тест на 404.
- ✅ Шаг 7.19: `wait-for-http.sh` дополнен проверкой URL-схемы (`http/https`) и соответствующим негативным тестом.
- ✅ Шаг 7.20: `verify-wait-for-http.sh` дополнен кейсом redirect (HTTP 3xx) как валидной готовности сервиса.



## До финала проекта

Ориентир на текущий момент: осталось **2 укрупнённых этапа**:

1. Шаг 7 — стабилизация и интеграционные проверки.
2. Шаг 8 — предзащита/финальная упаковка проекта.

## Мониторинг прогресса

- Главный трекер: `docs/progress.md`
- Smoke-checklist (Шаг 6.4): `docs/smoke-checklist.md`
- Smoke scripts: `scripts/smoke-backend.sh`, `scripts/smoke-frontend.sh`, `scripts/smoke-all.sh`, `scripts/e2e-api-auth-flow.sh`, `scripts/e2e-api-rbac.sh`
- Smoke scripts поддерживают `WAIT_TIMEOUT` / `WAIT_INTERVAL` для ожидания старта сервисов
- Make targets: `make smoke`, `make smoke-full`, `make smoke-backend`, `make smoke-frontend`, `make e2e-api`, `make e2e-rbac`, `make e2e-auth-integration`, `make ci-auth-check`, `make ci-prepare-auth-db`, `make verify-scripts`, `make verify-structure`, `make verify-configs`, `make verify-token-helper`, `make verify-wait-for-http`, `make verify-prisma-migrate`, `make verify-prisma-redeploy`, `make verify-auth-seed`, `make verify-auth-seed-scope`, `make verify-auth-seed-after-runtime`, `make verify-auth-runtime`, `make verify-auth-runtime-domain-safety`, `make verify-auth-refresh-sessions`, `make verify-auth-multi-login`, `make verify-auth-logout-idempotent`, `make verify-auth-external-db-url`, `make verify-auth-no-seed`, `make verify-tooling`, `make test-frontend`
- Подсказка по командам: `make help`
- `make verify-tooling` дополнительно проверяет, что все `scripts/*.sh` существуют и имеют executable-бит, и запускает поведенческие проверки token-helper и wait-for-http
- CI auth-check target: `make ci-auth-check` (использует `BASE_URL` и `E2E_*` env для smoke+e2e auth-пакета на тестовой БД).
- CI DB prepare target: `make ci-prepare-auth-db` (`DATABASE_URL`, затем `prisma generate/migrate/seed`). Для полного прогона можно использовать `PREPARE_DB=1 make ci-auth-check`.
- Prisma migrate smoke-check: `make verify-prisma-migrate` (поднимает временный Postgres через Docker/Podman либо использует `TEST_DATABASE_URL`).
- Prisma redeploy smoke-check: `make verify-prisma-redeploy` (дважды запускает `prisma migrate deploy` на одной временной БД и проверяет отсутствие дублей в `_prisma_migrations`).
- Auth seed smoke-check: `make verify-auth-seed` (в изолированной БД прогоняет `prisma migrate deploy` + `seed-auth-users` и проверяет идемпотентность сида).
- Auth seed scope-check: `make verify-auth-seed-scope` (проверяет, что auth-seed создаёт только ожидаемых пользователей и не затрагивает доменные таблицы).
- Auth seed-after-runtime check: `make verify-auth-seed-after-runtime` (повторно запускает auth-seed после login/refresh/logout цикла и проверяет, что состав пользователей остаётся прежним).
- Auth runtime smoke-check: `make verify-auth-runtime` (поднимает backend на временной БД после migrate+seed и прогоняет login/refresh/logout + RBAC сценарий).
- Auth runtime/domain safety check: `make verify-auth-runtime-domain-safety` (после refresh/logout цикла проверяет повторный login и отсутствие доменных записей).
- Refresh session lifecycle check: `make verify-auth-refresh-sessions` (через SQL подтверждает lifecycle `refresh_sessions`: active после login, rotation на refresh и revoked после logout).
- Multiple login session check: `make verify-auth-multi-login` (через SQL подтверждает, что повторный login того же пользователя ревокает предыдущую `refresh_session`, а активной остаётся только последняя).
- Logout idempotency check: `make verify-auth-logout-idempotent` (проверяет, что `logout` со stale/revoked refresh token возвращает `success=true` и не отзывает текущую активную `refresh_session`).
- External DB URL check: `make verify-auth-external-db-url` (прогоняет runtime verify-скрипты в режиме внешнего `TEST_DATABASE_URL`, без их собственного container bootstrap).
- Auth no-seed smoke-check: `make verify-auth-no-seed` (поднимает backend после migrate без seed и проверяет, что health работает, а login демо-пользователя получает `401`).
- Общая логика временной Postgres БД вынесена в `scripts/lib/temp-postgres.sh`, чтобы `verify-prisma-migrate`, `verify-auth-seed` и `verify-auth-runtime` использовали один и тот же helper.
- Общая логика старта/остановки backend для runtime smoke-check вынесена в `scripts/lib/backend-runtime.sh`.
- По каждому завершённому шагу делается отдельный коммит.

## Ветки

- Разработка ведётся в побочной ветке (не `main`).
- Текущая рабочая ветка для следующих шагов: `work` (побочная ветка).


## FAQ

**Что значит «версии 1/2/3/4»?**

В контексте этого репозитория это **не версии ИИ-модели**, а номера этапов плана (шаги roadmap проекта).
