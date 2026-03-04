.PHONY: smoke smoke-backend smoke-frontend test-frontend e2e-api

smoke:
	./scripts/smoke-all.sh

smoke-backend:
	./scripts/smoke-backend.sh

smoke-frontend:
	./scripts/smoke-frontend.sh

test-frontend:
	cd frontend && npm test

e2e-api:
	./scripts/e2e-api-auth-flow.sh
