.PHONY: help db-setup test-frontend

help:
	@echo "Доступные команды:"
	@echo "  make db-setup      - создать/обновить локальные роль и БД PostgreSQL под backend"
	@echo "  make test-frontend - запуск frontend unit-тестов"

db-setup:
	./scripts/setup-postgres-local.sh

test-frontend:
	cd frontend && npm test
