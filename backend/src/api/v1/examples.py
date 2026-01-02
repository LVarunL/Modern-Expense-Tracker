"""OpenAPI examples for v1 endpoints."""

PARSE_REQUEST_EXAMPLES = {
    "default": {
        "summary": "Simple multi-transaction input",
        "value": {
            "raw_text": "Dinner 600 and dessert 200, movie 350",
            "occurred_at_hint": "2025-01-10T19:30:00+05:30",
        },
    }
}

PARSE_RESPONSE_EXAMPLES = {
    "parsed": {
        "summary": "Parsed preview response",
        "value": {
            "entry_id": 42,
            "status": "pending_confirmation",
            "entry_summary": "User spent on dinner, dessert, and movie.",
            "occurred_at": "2025-01-10T19:30:00+05:30",
            "transactions": [
                {
                    "amount": 600,
                    "currency": "INR",
                    "direction": "outflow",
                    "type": "expense",
                    "category": "Food & Drinks",
                    "subcategory": "Dining",
                    "merchant": None,
                    "needs_confirmation": False,
                    "assumptions": [],
                },
                {
                    "amount": 200,
                    "currency": "INR",
                    "direction": "outflow",
                    "type": "expense",
                    "category": "Food & Drinks",
                    "subcategory": "Dessert",
                    "merchant": None,
                    "needs_confirmation": False,
                    "assumptions": [],
                },
                {
                    "amount": 350,
                    "currency": "INR",
                    "direction": "outflow",
                    "type": "expense",
                    "category": "Entertainment",
                    "subcategory": "Movies",
                    "merchant": None,
                    "needs_confirmation": False,
                    "assumptions": [],
                },
            ],
            "needs_confirmation": False,
            "assumptions": [],
            "follow_up_question": None,
        },
    }
}

CONFIRM_REQUEST_EXAMPLES = {
    "default": {
        "summary": "Confirm a single transaction",
        "value": {
            "entry_id": 42,
            "transactions": [
                {
                    "occurred_at": "2025-01-10T19:30:00+05:30",
                    "amount": 600,
                    "currency": "INR",
                    "direction": "outflow",
                    "type": "expense",
                    "category": "Food & Drinks",
                    "subcategory": "Dining",
                    "merchant": None,
                    "needs_confirmation": False,
                    "assumptions": [],
                }
            ],
        },
    }
}

CONFIRM_RESPONSE_EXAMPLES = {
    "default": {
        "summary": "Confirmed entry response",
        "value": {
            "entry": {
                "id": 42,
                "user_id": "demo-user",
                "raw_text": "Dinner 600 and dessert 200, movie 350",
                "source": "manual_text",
                "created_at": "2025-01-10T19:35:00+05:30",
                "occurred_at_hint": "2025-01-10T19:30:00+05:30",
                "parser_output_json": None,
                "parser_version": "mock-v0",
                "status": "confirmed",
                "notes": None,
            },
            "transactions": [
                {
                    "id": 101,
                    "entry_id": 42,
                    "occurred_at": "2025-01-10T19:30:00+05:30",
                    "amount": 600,
                    "currency": "INR",
                    "direction": "outflow",
                    "type": "expense",
                    "category": "Food & Drinks",
                    "subcategory": "Dining",
                    "merchant": None,
                    "needs_confirmation": False,
                    "assumptions_json": [],
                }
            ],
        },
    }
}

TRANSACTIONS_RESPONSE_EXAMPLES = {
    "default": {
        "summary": "Transaction list response",
        "value": {
            "items": [
                {
                    "id": 101,
                    "entry_id": 42,
                    "occurred_at": "2025-01-10T19:30:00+05:30",
                    "amount": 600,
                    "currency": "INR",
                    "direction": "outflow",
                    "type": "expense",
                    "category": "Food & Drinks",
                    "subcategory": "Dining",
                    "merchant": None,
                    "needs_confirmation": False,
                    "assumptions_json": [],
                }
            ],
            "count": 1,
            "total_count": 12,
            "limit": 200,
            "offset": 0,
        },
    }
}

SUMMARY_RESPONSE_EXAMPLES = {
    "default": {
        "summary": "Monthly summary response",
        "value": {
            "month": "2025-01",
            "total_inflow": 25000,
            "total_outflow": 5800,
            "net": 19200,
            "by_category": [
                {
                    "direction": "outflow",
                    "category": "Food & Drinks",
                    "total": 1800,
                },
                {
                    "direction": "inflow",
                    "category": "Income",
                    "total": 25000,
                },
            ],
            "transaction_count": 12,
        },
    }
}
