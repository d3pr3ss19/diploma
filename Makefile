.PHONY: help smoke smoke-full smoke-backend smoke-frontend test-frontend e2e-api e2e-rbac verify-scripts verify-tooling

help:
	@echo "Доступные команды:"
	@echo "  make smoke            - базовый smoke (backend + frontend)"
	@echo "  make smoke-full       - smoke + e2e сценарии"
	@echo "  make smoke-backend    - smoke только backend"
	@echo "  make smoke-frontend   - smoke только frontend"
	@echo "  make e2e-api          - API e2e сценарий auth flow"
	@echo "  make e2e-rbac         - API e2e сценарий RBAC"
	@echo "  make verify-scripts   - синтаксис shell-скриптов (bash -n)"
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

verify-scripts:
	./scripts/verify-scripts.sh

verify-tooling:
	./scripts/verify-tooling.sh
