.PHONY: smoke smoke-backend smoke-frontend test-frontend e2e-api e2e-rbac

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

e2e-rbac:
	./scripts/e2e-api-rbac.sh
