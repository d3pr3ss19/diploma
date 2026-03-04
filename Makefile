.PHONY: smoke smoke-backend smoke-frontend test-frontend

smoke:
	./scripts/smoke-all.sh

smoke-backend:
	./scripts/smoke-backend.sh

smoke-frontend:
	./scripts/smoke-frontend.sh

test-frontend:
	cd frontend && npm test
