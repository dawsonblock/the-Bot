.PHONY: dev-db test dev

dev-db:
	docker compose up -d

test:
	pytest

dev:
	uvicorn aeon.main:app --reload
