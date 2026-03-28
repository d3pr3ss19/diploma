# Прогресс проекта

> Этот файл — главный трекер статуса по дипломному проекту.

## Текущий статус

- [x] Шаг 1: зафиксированы ER-модель и MVP API.
- [x] Шаг 2.1: создан каркас backend (NestJS + Prisma schema + health + модули).
- [x] Шаг 2.2: подключен PrismaModule и добавлены сервисы `subscribers` / `requests`.
- [x] Шаг 2.3: реализована реальная работа с БД для базовых операций `subscribers` и `requests`.
- [x] Шаг 2.4: добавлены валидация DTO и единый формат ошибок (HTTP/Prisma filters).
- [x] Шаг 2.5: добавлены auth guard и RBAC (roles decorator + roles guard).
- [x] Шаг 3.1: создан каркас frontend (React + Vite + TS + Ant Design, routing и базовые страницы).
- [x] Шаг 3.2: логин подключен к backend auth endpoint, добавлены auth storage и protected routes.
- [x] Шаг 3.3: страницы Абоненты / Заявки / Лицевой счёт переведены на реальные API-запросы.
- [x] Шаг 4.1: добавлены UI-формы создания абонентов и заявок (POST).
- [x] Шаг 4.2: улучшен UX форм (валидация UUID/телефона и уведомления об успехе).
- [x] Шаг 4.3: добавлен prefill UUID-полей из текущего пользователя и улучшены тексты API-ошибок.
- [x] Шаг 4.4: доработана карточка лицевого счёта (последние заявки и сводные показатели).
- [x] Шаг 5.1: добавлены фильтры и сортировка в списки Абоненты/Заявки.
- [x] Шаг 5.2: добавлена пагинация и сохранение фильтров в URL.
- [x] Шаг 5.3: добавлены быстрый сброс фильтров и пресеты для оператора.
- [x] Шаг 5.4: выбор пресетов сохраняется между сессиями пользователя.
- [x] Шаг 6.1: добавлены базовые unit-тесты для frontend-утилит фильтрации.
- [x] Шаг 6.2: добавлены тесты URL-параметров/пресетов и вынесена логика query-state.
- [x] Шаг 6.3: покрыты тестами парсер API-ошибок и auth-storage, добавлены fallback-сценарии по статусам/таймаутам.
- [x] Шаг 6.4: добавлены smoke-checklist и smoke/e2e-скрипты (`smoke-all`, `e2e-api-auth-flow`).
- [x] Шаг 7.1: усилена валидация auth login (DTO + class-validator) и добавлен e2e-check невалидного payload.
- [x] Шаг 7.2: добавлена валидация UUID path-параметров в `subscribers`/`requests` и e2e-check невалидного UUID в RBAC-сценарии.
- [x] Шаг 7.3: исправлен парсинг demo JWT-like токена в auth guard для UUID user-id и добавлен e2e-check токена с дефисами в user-id.
- [x] Шаг 7.4: расширен e2e auth-flow негативными кейсами malformed demo-токенов (пустой user-id и неизвестная роль).
- [x] Шаг 7.5: расширен RBAC e2e-кейс проверкой malformed токена с неизвестной ролью (ожидаемый 401 на защищённом endpoint).
- [x] Шаг 7.6: e2e-скрипты auth/rbac переведены на надёжный JSON-парсинг accessToken через Python вместо `sed`-regex.
- [x] Шаг 7.7: вынесен общий helper `scripts/extract-access-token.py` и убрано дублирование логики парсинга accessToken в e2e-скриптах.
- [x] Шаг 7.8: усилены verify-проверки для Python helper (`extract-access-token.py`): структура, executable-бит и синтаксис.
- [x] Шаг 7.9: `verify-scripts.sh` расширен на Python-скрипты (py_compile) и теперь валидирует и shell-, и Python-скрипты.
- [x] Шаг 7.10: добавлен `verify-token-helper.sh` с поведенческими проверками `extract-access-token.py` (валидный JSON и ошибки на битом/неполном payload).
- [x] Шаг 7.11: `verify-scripts.sh` переведён на auto-discovery и теперь валидирует синтаксис всех `scripts/*.sh` и `scripts/*.py`.
- [x] Шаг 7.12: `verify-scripts.sh` теперь дополнительно проверяет executable-бит для всех найденных shell/python скриптов.
- [x] Шаг 7.13: `verify-scripts.sh` дополнен проверкой корректного shebang для всех `scripts/*.sh` и `scripts/*.py`.
- [x] Шаг 7.14: добавлен `verify-wait-for-http.sh` с поведенческими проверками `wait-for-http.sh` (usage/success/timeout).
- [x] Шаг 7.15: `verify-token-helper.sh` расширен проверками пустого и нестрокового `accessToken`.
- [x] Шаг 7.16: `verify-wait-for-http.sh` усилен проверкой точных exit-кодов (`2` для usage и `1` для timeout).
- [x] Шаг 7.17: в `wait-for-http.sh` добавлена валидация timeout/interval как положительных целых и покрыта поведенческими проверками.
- [x] Шаг 7.18: `wait-for-http.sh` считает сервис готовым только при HTTP < 400; добавлен тест на обработку HTTP 404.
- [x] Шаг 7.19: `wait-for-http.sh` валидирует URL-схему (`http/https`), `verify-wait-for-http.sh` покрывает этот негативный кейс.
- [x] Шаг 7.20: `verify-wait-for-http.sh` дополнен проверкой, что HTTP 3xx (redirect) считается успешной готовностью.
- [x] Шаг 7.21: auth переведена с demo на БД-пользователей и JWT-like access/refresh токены; добавлен seed демо-пользователей для локального старта.
- [x] Шаг 7.22: e2e auth/rbac-скрипты обновлены под новую auth-модель (логин без role, проверки tampered token, refresh-flow).
- [x] Шаг 7.23: добавлен интеграционный e2e-сценарий `e2e-api-auth-integration.sh` (wrong password, login, refresh, guard/RBAC) и включён в smoke-full/tooling-проверки.
- [x] Шаг 7.24: добавлен CI-режим `ci-auth-check.sh`/`make ci-auth-check` для smoke+e2e auth-пакета с обязательными `BASE_URL`/`E2E_*` env.
- [x] Шаг 7.25: frontend auth-слой дополнен refresh/logout API-обёртками и unit-тестами (`auth.spec.ts`, `auth-storage.spec.ts`) для сценариев обновления access-токена.
- [x] Шаг 7.26: в frontend `http` добавлен авто-refresh access-токена на 401 через axios response interceptor с `clearAuth()` fallback при неуспешном refresh.
- [x] Шаг 7.27: добавлены frontend-тесты сценария 401→auto-refresh→retry и fallback logout/clearAuth при неуспешном refresh (`http-auth.spec.ts`).
- [x] Шаг 7.28: добавлен backend/CI check, что refresh-токен отклоняется (`401`) на защищённых endpoint при использовании как Bearer access.
- [x] Шаг 7.29: реализованы ротация refresh-токена на backend и logout-инвалидация (покрыто в `e2e-api-auth-integration.sh`).
- [x] Шаг 7.30: refresh-сессии перенесены в persistence-слой БД (`refresh_sessions`) вместо in-memory хранилища в auth-сервисе.
- [x] Шаг 7.31: добавлен CI-сценарий подготовки БД (`ci-prepare-auth-db.sh`) и режим `PREPARE_DB=1` в `ci-auth-check` для migrate+seed перед auth e2e.
- [x] Шаг 7.32: добавлены Prisma migration-файлы для текущей схемы и verify-check наличия migration-артефактов для auth-модели.
- [x] Шаг 7.33: добавлен отдельный smoke-check `prisma migrate deploy` на временной Postgres БД (`verify-prisma-migrate.sh`).
- [x] Шаг 7.34: добавлен backend smoke/integration-check на `seed-auth-users.ts` после `prisma migrate deploy` в изолированной БД.
- [x] Шаг 7.35: добавлен smoke-check логина/refresh/logout поверх временной БД после migrate+seed.
- [x] Шаг 7.36: общая логика временной Postgres БД вынесена в переиспользуемый shell helper для verify-скриптов.
- [x] Шаг 7.37: добавлен smoke-check повторного `prisma migrate deploy`/rollback-safety на уже подготовленной временной БД.
- [x] Шаг 7.38: добавлен общий helper для повторного запуска backend с временной БД и сокращено дублирование runtime verify-скриптов.
- [x] Шаг 7.39: добавлен отдельный smoke-check для негативного сценария старта backend без seed пользователей на временной БД.
- [x] Шаг 7.40: добавлен verify-check, что seed создаёт только ожидаемые auth-пользователи и не трогает доменные таблицы.
- [x] Шаг 7.41: добавлен verify-check на повторный auth-seed после runtime smoke (seed после login/refresh/logout цикла).
- [x] Шаг 7.42: добавлен smoke-check, что refresh/logout цикл не создаёт доменных записей и не ломает повторный login.
- [x] Шаг 7.43: добавлен verify-check, что `verify-auth-runtime` и `verify-auth-runtime-domain-safety` можно запускать с внешним `TEST_DATABASE_URL` без container runtime.
- [x] Шаг 7.44: добавлен отдельный smoke-check жизненного цикла `refresh_sessions` (active/rotated/revoked) через SQL-проверки после runtime auth-flow.
- [x] Шаг 7.45: добавлен verify-check на множественные последовательные login пользователя, чтобы предыдущая активная `refresh_session` ревокалась и в БД оставалась только одна активная запись.
- [x] Шаг 7.46: добавлен verify-check для logout с уже ревокнутым/устаревшим refresh token, чтобы операция оставалась идемпотентной и не затрагивала активную сессию.
- [x] Шаг 7.47: добавлен verify-check для повторного logout по одному и тому же refresh token, чтобы второй вызов оставался успешным и не менял состояние БД сверх первого revoke.
- [x] Шаг 7.48: добавлен verify-check, что logout с access token / malformed token не затрагивает `refresh_sessions` и остаётся безопасным no-op.
- [x] Шаг 7.49: добавлен verify-check устойчивости `logout` к payload с пустым `refreshToken`, чтобы ответ оставался контролируемым и состояние сессий не портилось.
- [x] Шаг 7.50: добавлен verify-check, что `logout` c нестроковым `refreshToken` (`number/null`) возвращает валидационную ошибку и не меняет `refresh_sessions`.
- [x] Шаг 7.51: добавлен verify-check для `logout` без поля `refreshToken`, чтобы поведение валидации было зафиксировано и состояние `refresh_sessions` оставалось неизменным.
- [x] Шаг 7.52: добавлен verify-check для `logout` с лишними полями в payload (`forbidNonWhitelisted`), чтобы возвращалась корректная `400` ошибка и `refresh_sessions` оставались неизменными.
- [x] Шаг 8.1: добавлен релизный чек-лист предзащиты (`docs/release-checklist.md`).
- [x] Шаг 8.2: добавлен компактный demo-сценарий защиты (`docs/demo-defense-scenario.md`).
- [x] Шаг 8.3: добавлен bootstrap локальной PostgreSQL БД (`make db-setup` + `scripts/setup-postgres-local.sh`) и обновлены инструкции запуска backend/frontend.
- [x] Шаг 8.4: добавлен гайд входа на сайт (`docs/site-access-guide.md`) и CLI-команда добавления пользователя (`npm run create:auth-user -- ...`).


## Оценка до финала

Остался 1 укрупнённый шаг:

1. **Шаг 8** — предзащита/релизный пакет (демо-сценарий, финальная документация, проверка развертывания).

## Где смотреть прогресс

1. Этот файл: `docs/progress.md`.
2. История коммитов (каждый законченный шаг — отдельный коммит).
3. Корневой `README.md` с общим контекстом и ссылками на артефакты.

## Следующий шаг (ближайший)

Перейти к Шагу 8.5: выполнить финальный dry-run по `docs/release-checklist.md` и зафиксировать результаты pre-defense прогона в документации.
