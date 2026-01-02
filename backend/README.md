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

## OpenAPI docs

When the server is running:

- Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`
