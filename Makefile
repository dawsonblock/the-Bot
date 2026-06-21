.PHONY: dev-db test dev typecheck test-ts dev-ts

dev-db:
	docker compose up -d

test:
	pytest

dev:
	uvicorn aeon.main:app --reload

typecheck:
	npm run typecheck

test-ts:
	npm test

test-all: typecheck test-ts

dev-ts:
	npm run dev
