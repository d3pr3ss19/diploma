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


## Оценка до финала

Осталось 2 укрупнённых шага:

1. **Шаг 7** — стабилизация backend/frontend + полноценная рабочая авторизация (users в БД, hash паролей, JWT access/refresh, refresh flow).
2. **Шаг 8** — предзащита/релизный пакет (демо-сценарий, финальная документация, проверка развертывания).

## Где смотреть прогресс

1. Этот файл: `docs/progress.md`.
2. История коммитов (каждый законченный шаг — отдельный коммит).
3. Корневой `README.md` с общим контекстом и ссылками на артефакты.

## Следующий шаг (ближайший)

Перейти к Шагу 7.28: добавить backend/CI check, что refresh-токен нельзя использовать как Bearer access в защищённых endpoint.
