.PHONY: run lint typecheck test

run:
	uvicorn src.app:app --reload

lint:
	ruff check .

typecheck:
	mypy src tests

test:
	pytest
