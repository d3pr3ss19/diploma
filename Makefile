.PHONY: help smoke smoke-full smoke-backend smoke-frontend test-frontend e2e-api e2e-rbac e2e-auth-integration ci-auth-check ci-prepare-auth-db verify-scripts verify-structure verify-configs verify-token-helper verify-wait-for-http verify-prisma-migrate verify-prisma-redeploy verify-auth-seed verify-auth-seed-scope verify-auth-seed-after-runtime verify-auth-runtime verify-auth-runtime-domain-safety verify-auth-refresh-sessions verify-auth-multi-login verify-auth-external-db-url verify-auth-no-seed verify-tooling

help:
	@echo "Доступные команды:"
	@echo "  make smoke            - базовый smoke (backend + frontend)"
	@echo "  make smoke-full       - smoke + e2e сценарии"
	@echo "  make smoke-backend    - smoke только backend"
	@echo "  make smoke-frontend   - smoke только frontend"
	@echo "  make e2e-api          - API e2e сценарий auth flow"
	@echo "  make e2e-rbac         - API e2e сценарий RBAC"
	@echo "  make ci-auth-check    - CI auth smoke+e2e пакет (требует env)"
	@echo "  make ci-prepare-auth-db - CI prepare БД (prisma migrate + seed auth users)"
	@echo "  make verify-scripts   - синтаксис shell/python скриптов"
	@echo "  make verify-structure - проверка структуры обязательных файлов"
	@echo "  make verify-configs   - валидация JSON-конфигов проекта"
	@echo "  make verify-token-helper - поведение helper извлечения accessToken"
	@echo "  make verify-wait-for-http - поведенческая проверка wait-for-http.sh"
	@echo "  make verify-prisma-migrate - smoke-проверка prisma migrate deploy на временной Postgres БД"
	@echo "  make verify-prisma-redeploy - smoke-проверка повторного prisma migrate deploy на временной БД"
	@echo "  make verify-auth-seed - smoke-проверка seed-auth-users.ts на изолированной БД"
	@echo "  make verify-auth-seed-scope - проверка, что auth-seed не трогает доменные таблицы"
	@echo "  make verify-auth-seed-after-runtime - повторный auth-seed после runtime smoke"
	@echo "  make verify-auth-runtime - runtime smoke login/refresh/logout на временной БД"
	@echo "  make verify-auth-runtime-domain-safety - runtime check: domain rows stay empty и repeat login работает"
	@echo "  make verify-auth-refresh-sessions - SQL smoke-check lifecycle active/revoked в refresh_sessions"
	@echo "  make verify-auth-multi-login - SQL verify-check последовательных login и single active refresh_session"
	@echo "  make verify-auth-external-db-url - прогон runtime-check'ов через внешний TEST_DATABASE_URL"
	@echo "  make verify-auth-no-seed - negative smoke старта backend без seed пользователей"
	@echo "  make verify-tooling   - проверка tooling + dry-run make-таргетов"
	@echo "  make test-frontend    - запуск frontend unit-тестов"

smoke:
	./scripts/smoke-all.sh

smoke-full:
	RUN_E2E=1 ./scripts/smoke-all.sh

smoke-backend:
	./scripts/smoke-backend.sh

smoke-frontend:
	./scripts/smoke-frontend.sh

test-frontend:
	cd frontend && npm test

e2e-api:
	./scripts/e2e-api-auth-flow.sh

e2e-rbac:
	./scripts/e2e-api-rbac.sh

e2e-auth-integration:
	./scripts/e2e-api-auth-integration.sh

ci-auth-check:
	./scripts/ci-auth-check.sh

ci-prepare-auth-db:
	./scripts/ci-prepare-auth-db.sh

verify-scripts:
	./scripts/verify-scripts.sh

verify-tooling:
	./scripts/verify-tooling.sh

verify-token-helper:
	./scripts/verify-token-helper.sh

verify-wait-for-http:
	./scripts/verify-wait-for-http.sh

verify-structure:
	./scripts/verify-structure.sh

verify-configs:
	./scripts/verify-configs.sh

verify-prisma-migrate:
	./scripts/verify-prisma-migrate.sh

verify-prisma-redeploy:
	./scripts/verify-prisma-redeploy.sh

verify-auth-seed:
	./scripts/verify-auth-seed.sh

verify-auth-seed-scope:
	./scripts/verify-auth-seed-scope.sh

verify-auth-seed-after-runtime:
	./scripts/verify-auth-seed-after-runtime.sh

verify-auth-runtime:
	./scripts/verify-auth-runtime.sh

verify-auth-runtime-domain-safety:
	./scripts/verify-auth-runtime-domain-safety.sh

verify-auth-refresh-sessions:
	./scripts/verify-auth-refresh-sessions.sh

verify-auth-multi-login:
	./scripts/verify-auth-multi-login.sh

verify-auth-external-db-url:
	./scripts/verify-auth-external-db-url.sh

verify-auth-no-seed:
	./scripts/verify-auth-no-seed.sh
