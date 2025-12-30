# Expense Tracker Backend

Project scaffold for the backend API. Details will be added as we build features.

## Run locally

Create and activate a virtual environment, then:

```bash
pip install -e ".[dev]"
uvicorn src.app:app --reload
```

## Run tests

```bash
pytest
```

Or:

```bash
make test
```

## OpenAPI docs

When the server is running:

- Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`
