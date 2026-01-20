"""OpenAPI examples for v1 endpoints."""

PARSE_REQUEST_EXAMPLES = {
    "default": {
        "summary": "Simple multi-transaction input",
        "value": {
            "raw_text": "Dinner 600 and dessert 200, movie 350",
            "reference_datetime": 1736517600000,
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
            "occurred_time": 1736517600000,
            "transactions": [
                {
                    "amount": 600,
                    "currency": "INR",
                    "direction": "outflow",
                    "type": "expense",
                    "category": "Food & Drinks",
                    "assumptions": [],
                },
                {
                    "amount": 200,
                    "currency": "INR",
                    "direction": "outflow",
                    "type": "expense",
                    "category": "Food & Drinks",
                    "assumptions": [],
                },
                {
                    "amount": 350,
                    "currency": "INR",
                    "direction": "outflow",
                    "type": "expense",
                    "category": "Entertainment",
                    "assumptions": [],
                },
            ],
            "assumptions": [],
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
                    "occurred_time": 1736517600000,
                    "amount": 600,
                    "currency": "INR",
                    "direction": "outflow",
                    "type": "expense",
                    "category": "Food & Drinks",
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
                "raw_text": "Dinner 600 and dessert 200, movie 350",
                "source": "manual_text",
                "created_time": 1736517900000,
                "modified_time": 1736517900000,
                "parser_output_json": None,
                "parser_version": "mock-v0",
                "notes": None,
            },
            "transactions": [
                {
                    "id": 101,
                    "entry_id": 42,
                    "occurred_time": 1736517600000,
                    "created_time": 1736517900000,
                    "modified_time": 1736517900000,
                    "amount": 600,
                    "currency": "INR",
                    "direction": "outflow",
                    "type": "expense",
                    "category": "Food & Drinks",
                    "assumptions_json": [],
                }
            ],
        },
    }
}

TRANSACTION_UPDATE_REQUEST_EXAMPLES = {
    "default": {
        "summary": "Update a transaction",
        "value": {
            "amount": 750,
            "currency": "INR",
            "direction": "outflow",
            "type": "expense",
            "category": "Food & Drinks",
        },
    }
}

TRANSACTION_UPDATE_RESPONSE_EXAMPLES = {
    "default": {
        "summary": "Updated transaction response",
        "value": {
            "id": 101,
            "entry_id": 42,
            "occurred_time": 1736517600000,
            "created_time": 1736517900000,
            "modified_time": 1736518200000,
            "amount": 750,
            "currency": "INR",
            "direction": "outflow",
            "type": "expense",
            "category": "Food & Drinks",
            "assumptions_json": [],
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
                    "occurred_time": 1736517600000,
                    "created_time": 1736517900000,
                    "modified_time": 1736517900000,
                    "amount": 600,
                    "currency": "INR",
                    "direction": "outflow",
                    "type": "expense",
                    "category": "Food & Drinks",
                    "assumptions_json": [],
                }
            ],
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

ANALYTICS_SERIES_EXAMPLES = {
    "default": {
        "summary": "Daily totals",
        "value": {
            "bucket": "day",
            "items": [
                {"bucket_start": 1736512200000, "total": 1200, "transaction_count": 4},
                {"bucket_start": 1736598600000, "total": 950, "transaction_count": 3},
            ],
        },
    }
}

ANALYTICS_CATEGORY_EXAMPLES = {
    "default": {
        "summary": "Totals by category",
        "value": {
            "items": [
                {
                    "direction": "outflow",
                    "category": "Food & Drinks",
                    "total": 1800,
                    "transaction_count": 5,
                },
                {
                    "direction": "inflow",
                    "category": "Income",
                    "total": 25000,
                    "transaction_count": 2,
                },
            ],
        },
    }
}

ANALYTICS_SUMMARY_EXAMPLES = {
    "default": {
        "summary": "Summary totals",
        "value": {
            "total_inflow": 25000,
            "total_outflow": 5800,
            "net": 19200,
            "transaction_count": 12,
        },
    }
}

ANALYTICS_TYPE_EXAMPLES = {
    "default": {
        "summary": "Totals by type",
        "value": {
            "items": [
                {
                    "direction": "outflow",
                    "type": "expense",
                    "total": 5400,
                    "transaction_count": 18,
                },
                {
                    "direction": "inflow",
                    "type": "income",
                    "total": 32000,
                    "transaction_count": 2,
                },
            ],
        },
    }
}
