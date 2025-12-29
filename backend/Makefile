.PHONY: run lint typecheck

run:
	uvicorn src.app:app --reload

lint:
	ruff check .

typecheck:
	mypy src tests
