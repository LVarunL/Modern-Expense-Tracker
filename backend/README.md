# Expense Tracker Backend

Project scaffold for the backend API. Details will be added as we build features.

## Run locally

Create and activate a virtual environment, then:

```bash
pip install -e ".[dev]"
uvicorn src.app:app --reload
```

## LLM configuration

Set these in `backend/.env` (see `.env.example`):

- `LLM_PROVIDER` (`openai` or `gemini`)
- `LLM_API_KEY`
- `LLM_BASE_URL` (OpenAI-compatible endpoint)
- `LLM_MODEL`
- `LLM_TIMEOUT_SECONDS`
- `LLM_TEMPERATURE`
- `PARSER_VERSION`

Gemini example:

```
LLM_PROVIDER=gemini
LLM_BASE_URL=https://generativelanguage.googleapis.com
LLM_MODEL=gemini-1.5-flash
LLM_API_KEY=your-api-key
```

## Parser expectations

To improve parse quality, keep prompts explicit and consistent:

- Include amounts explicitly (the parser does not invent numbers).
- If splitting a bill, specify the number of people when possible (e.g., "split among 3 friends").
- If a split is mentioned without a count, the parser assumes 2 people (50/50) and marks the result for confirmation.
- Mention the date/time if it matters; otherwise the parser may omit `occurred_at`.
- Relative dates (today/yesterday) are resolved using a server-side reference time in `Asia/Kolkata`.

## Run tests

```bash
pytest
```

Or:

```bash
make test
```

## Debugging test failures (ORM state)

If a test reads stale data after hitting an API endpoint, it is usually the SQLAlchemy identity map.
The API uses a different session, so the test session can keep an old object cached.

Quick checks:

- Re-query using a fresh session, or call `db_session.expire_all()` before the query.
- If you already have an instance, call `await db_session.refresh(instance)` to reload it.
- Avoid mixing in-memory objects created in the test with updates performed by the API without a refresh.

## Seed mock data

Use the script below to insert or delete a batch of mock transactions for UI testing.
It writes directly to the database (no parsing).

Create:

```bash
python -m scripts.seed_transactions create --count 300 --days 60 --tag seed:bulk
```

Delete:

```bash
python -m scripts.seed_transactions delete --tag seed:bulk
```

## OpenAPI docs

When the server is running:

- Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`
