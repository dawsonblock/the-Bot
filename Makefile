.PHONY: dev-db test dev typecheck db-migrate db-rollback test-all

dev-db:
	docker compose up -d

test:
	npm test

dev:
	npm run dev

typecheck:
	npm run typecheck

db-migrate:
	npm run db:migrate

db-rollback:
	npm run db:rollback

test-all: typecheck test
