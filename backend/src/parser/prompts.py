"""Prompt templates and few-shot examples for the parser."""

from __future__ import annotations

import json

ALLOWED_CATEGORIES = [
    "Food & Drinks",
    "Groceries",
    "Transport",
    "Entertainment",
    "Shopping",
    "Subscriptions",
    "Bills & Utilities",
    "Health",
    "Rent",
    "Travel",
    "Education",
    "Income",
    "Investments",
    "Loans",
    "Transfer",
    "Other",
]

ALLOWED_TYPES = [
    "expense",
    "income",
    "repayment_received",
    "repayment_sent",
    "investment_income",
    "refund",
    "transfer",
    "other",
]

ALLOWED_DIRECTIONS = ["inflow", "outflow"]
DEFAULT_CURRENCY = "INR"

SYSTEM_PROMPT = "You are an expense parsing engine."

SCHEMA_SKELETON = {
    "entry_summary": None,
    "occurred_at": None,
    "transactions": [
        {
            "amount": 0,
            "currency": "INR",
            "direction": "outflow",
            "type": "expense",
            "category": "Other",
            "subcategory": None,
            "merchant": None,
            "confidence": 0.0,
            "needs_confirmation": False,
            "assumptions": [],
        }
    ],
    "overall_confidence": 0.0,
    "needs_confirmation": False,
    "assumptions": [],
    "follow_up_question": None,
}

SYSTEM_RULES = [
    "Output must be a single JSON object. Keys must match the schema skeleton exactly.",
    "Include all top-level keys, even if values are null or empty.",
    "Each transaction must include all transaction keys. No additional keys anywhere.",
    "Return JSON only. No markdown or commentary.",
    "Allowed categories: " + ", ".join(ALLOWED_CATEGORIES),
    "Allowed types: " + ", ".join(ALLOWED_TYPES),
    "Allowed direction: inflow or outflow only.",
    f"Default currency is {DEFAULT_CURRENCY} unless explicitly another currency.",
    "Amount must be positive. Do not use negative numbers.",
    "If type='income' => category='Income'.",
    "If type='investment_income' => category='Investments'.",
    "If type in ('repayment_received','repayment_sent') => category='Loans'.",
    "If type='transfer' => category='Transfer'.",
    "Merchant must be set only if explicitly mentioned; otherwise null.",
    "If multiple distinct spends/incomes with different amounts, output multiple transactions.",
    "If multiple amounts refer to one total, output one transaction and add an assumption.",
    "Parse amounts like '1,300', '₹1300', '1300 rs', 'rs 1300'.",
    "Parse suffixes like '1.2k' => 1200 and '85k' => 85000.",
    "Do not invent or round amounts unless text says 'approx/around'; then add assumption and confirmation.",
    "If occurred_at_hint is provided, you may use it for occurred_at when it is consistent.",
    "Use reference_datetime to resolve relative dates like 'yesterday' or 'today'.",
    "If relative date is used but reference_datetime missing, set occurred_at=null and add an assumption.",
    "If no date/time is specified, occurred_at must be null.",
    "If a date is specified without a time, set time to 00:00 and add an assumption.",
    "Assumptions only when you had to assume (split ratio, taxes included, approx amount, date/time default).",
    "Assumptions must be short (one sentence max).",
    "If an assumption affects money/type/category/share, set needs_confirmation=true for that transaction.",
    "Top-level assumptions must include all transaction assumptions.",
    "If there are no transactions, use top-level assumptions for missing info (e.g., amount missing).",
    "Top-level needs_confirmation is true if any transaction needs confirmation or follow_up_question is not null.",
    "Set follow_up_question (single short question) when amount is missing,",
    "split is mentioned but user share is unknown and not inferable,",
    "direction is genuinely unclear, or amounts cannot be mapped to items.",
]


def build_system_message() -> str:
    schema_text = json.dumps(SCHEMA_SKELETON, ensure_ascii=True)
    rules_text = "\n".join(f"- {rule}" for rule in SYSTEM_RULES)
    return f"{SYSTEM_PROMPT}\n\nSchema skeleton:\n{schema_text}\n\nRules:\n{rules_text}"


FEW_SHOT_EXAMPLES: list[dict[str, str]] = [
    {
        "input": (
            "reference_datetime: 2025-01-10T12:00:00+05:30\n"
            "timezone: Asia/Kolkata\n"
            "text: Paid rent 18000 on 2025-01-03."
        ),
        "output": json.dumps(
            {
                "entry_summary": "User paid rent.",
                "occurred_at": "2025-01-03T00:00:00+05:30",
                "transactions": [
                    {
                        "amount": 18000,
                        "currency": "INR",
                        "direction": "outflow",
                        "type": "expense",
                        "category": "Rent",
                        "subcategory": None,
                        "merchant": None,
                        "confidence": 0.92,
                        "needs_confirmation": False,
                        "assumptions": ["Time not specified; defaulted to start of day."],
                    }
                ],
                "overall_confidence": 0.92,
                "needs_confirmation": False,
                "assumptions": ["Time not specified; defaulted to start of day."],
                "follow_up_question": None,
            },
            ensure_ascii=True,
        ),
    },
    {
        "input": (
            "reference_datetime: 2025-01-10T12:00:00+05:30\n"
            "timezone: Asia/Kolkata\n"
            "text: Salary credited 52000."
        ),
        "output": json.dumps(
            {
                "entry_summary": "User received salary.",
                "occurred_at": None,
                "transactions": [
                    {
                        "amount": 52000,
                        "currency": "INR",
                        "direction": "inflow",
                        "type": "income",
                        "category": "Income",
                        "subcategory": None,
                        "merchant": None,
                        "confidence": 0.95,
                        "needs_confirmation": False,
                        "assumptions": [],
                    }
                ],
                "overall_confidence": 0.95,
                "needs_confirmation": False,
                "assumptions": [],
                "follow_up_question": None,
            },
            ensure_ascii=True,
        ),
    },
    {
        "input": (
            "reference_datetime: 2025-01-10T12:00:00+05:30\n"
            "timezone: Asia/Kolkata\n"
            "text: Dinner 600 and dessert 200, movie 350 yesterday."
        ),
        "output": json.dumps(
            {
                "entry_summary": "User spent on dinner, dessert, and movie.",
                "occurred_at": "2025-01-09T00:00:00+05:30",
                "transactions": [
                    {
                        "amount": 600,
                        "currency": "INR",
                        "direction": "outflow",
                        "type": "expense",
                        "category": "Food & Drinks",
                        "subcategory": "Dining",
                        "merchant": None,
                        "confidence": 0.9,
                        "needs_confirmation": False,
                        "assumptions": ["Time not specified; defaulted to start of day."],
                    },
                    {
                        "amount": 200,
                        "currency": "INR",
                        "direction": "outflow",
                        "type": "expense",
                        "category": "Food & Drinks",
                        "subcategory": "Dessert",
                        "merchant": None,
                        "confidence": 0.86,
                        "needs_confirmation": False,
                        "assumptions": ["Time not specified; defaulted to start of day."],
                    },
                    {
                        "amount": 350,
                        "currency": "INR",
                        "direction": "outflow",
                        "type": "expense",
                        "category": "Entertainment",
                        "subcategory": "Movies",
                        "merchant": None,
                        "confidence": 0.82,
                        "needs_confirmation": False,
                        "assumptions": ["Time not specified; defaulted to start of day."],
                    },
                ],
                "overall_confidence": 0.86,
                "needs_confirmation": False,
                "assumptions": ["Time not specified; defaulted to start of day."],
                "follow_up_question": None,
            },
            ensure_ascii=True,
        ),
    },
    {
        "input": (
            "reference_datetime: 2025-01-10T12:00:00+05:30\n"
            "timezone: Asia/Kolkata\n"
            "text: Paid back Rohan 1200 for the trip."
        ),
        "output": json.dumps(
            {
                "entry_summary": "User repaid a friend.",
                "occurred_at": None,
                "transactions": [
                    {
                        "amount": 1200,
                        "currency": "INR",
                        "direction": "outflow",
                        "type": "repayment_sent",
                        "category": "Loans",
                        "subcategory": None,
                        "merchant": "Rohan",
                        "confidence": 0.84,
                        "needs_confirmation": False,
                        "assumptions": [],
                    }
                ],
                "overall_confidence": 0.84,
                "needs_confirmation": False,
                "assumptions": [],
                "follow_up_question": None,
            },
            ensure_ascii=True,
        ),
    },
    {
        "input": (
            "reference_datetime: 2025-01-10T12:00:00+05:30\n"
            "timezone: Asia/Kolkata\n"
            "text: Netflix subscription 649 with taxes."
        ),
        "output": json.dumps(
            {
                "entry_summary": "User paid for a subscription.",
                "occurred_at": None,
                "transactions": [
                    {
                        "amount": 649,
                        "currency": "INR",
                        "direction": "outflow",
                        "type": "expense",
                        "category": "Subscriptions",
                        "subcategory": None,
                        "merchant": "Netflix",
                        "confidence": 0.7,
                        "needs_confirmation": True,
                        "assumptions": ["Assumed 649 is the total including taxes."],
                    }
                ],
                "overall_confidence": 0.7,
                "needs_confirmation": True,
                "assumptions": ["Assumed 649 is the total including taxes."],
                "follow_up_question": None,
            },
            ensure_ascii=True,
        ),
    },
    {
        "input": (
            "reference_datetime: 2025-01-10T12:00:00+05:30\n"
            "timezone: Asia/Kolkata\n"
            "text: Rohan paid me back 1500 for last week."
        ),
        "output": json.dumps(
            {
                "entry_summary": "User received a repayment.",
                "occurred_at": None,
                "transactions": [
                    {
                        "amount": 1500,
                        "currency": "INR",
                        "direction": "inflow",
                        "type": "repayment_received",
                        "category": "Loans",
                        "subcategory": None,
                        "merchant": "Rohan",
                        "confidence": 0.85,
                        "needs_confirmation": False,
                        "assumptions": ["Timing unclear ('last week'); occurred_at not set."],
                    }
                ],
                "overall_confidence": 0.85,
                "needs_confirmation": False,
                "assumptions": ["Timing unclear ('last week'); occurred_at not set."],
                "follow_up_question": None,
            },
            ensure_ascii=True,
        ),
    },
    {
        "input": (
            "reference_datetime: 2025-01-10T12:00:00+05:30\n"
            "timezone: Asia/Kolkata\n"
            "text: Split dinner 1200 with a friend."
        ),
        "output": json.dumps(
            {
                "entry_summary": "User split a dinner bill.",
                "occurred_at": None,
                "transactions": [
                    {
                        "amount": 600,
                        "currency": "INR",
                        "direction": "outflow",
                        "type": "expense",
                        "category": "Food & Drinks",
                        "subcategory": "Dining",
                        "merchant": None,
                        "confidence": 0.78,
                        "needs_confirmation": True,
                        "assumptions": ["Split assumed 2 people."],
                    }
                ],
                "overall_confidence": 0.78,
                "needs_confirmation": True,
                "assumptions": ["Split assumed 2 people."],
                "follow_up_question": None,
            },
            ensure_ascii=True,
        ),
    },
    {
        "input": (
            "reference_datetime: 2025-01-10T12:00:00+05:30\n"
            "timezone: Asia/Kolkata\n"
            "text: Bought groceries today."
        ),
        "output": json.dumps(
            {
                "entry_summary": "User bought groceries.",
                "occurred_at": None,
                "transactions": [],
                "overall_confidence": 0.35,
                "needs_confirmation": True,
                "assumptions": ["Amount not provided."],
                "follow_up_question": "How much did you spend on groceries?",
            },
            ensure_ascii=True,
        ),
    },
    {
        "input": (
            "reference_datetime: 2025-01-10T12:00:00+05:30\n"
            "timezone: Asia/Kolkata\n"
            "text: Got dividend from TCS worth 420 rs."
        ),
        "output": json.dumps(
            {
                "entry_summary": "User received dividend income.",
                "occurred_at": None,
                "transactions": [
                    {
                        "amount": 420,
                        "currency": "INR",
                        "direction": "inflow",
                        "type": "investment_income",
                        "category": "Investments",
                        "subcategory": "Dividend",
                        "merchant": "TCS",
                        "confidence": 0.9,
                        "needs_confirmation": False,
                        "assumptions": [],
                    }
                ],
                "overall_confidence": 0.9,
                "needs_confirmation": False,
                "assumptions": [],
                "follow_up_question": None,
            },
            ensure_ascii=True,
        ),
    },
    {
        "input": (
            "reference_datetime: 2025-01-10T12:00:00+05:30\n"
            "timezone: Asia/Kolkata\n"
            "text: Google autopay debited 180 for YouTube Premium."
        ),
        "output": json.dumps(
            {
                "entry_summary": "User paid for a subscription via autopay.",
                "occurred_at": None,
                "transactions": [
                    {
                        "amount": 180,
                        "currency": "INR",
                        "direction": "outflow",
                        "type": "expense",
                        "category": "Subscriptions",
                        "subcategory": None,
                        "merchant": "YouTube Premium",
                        "confidence": 0.9,
                        "needs_confirmation": False,
                        "assumptions": [],
                    }
                ],
                "overall_confidence": 0.9,
                "needs_confirmation": False,
                "assumptions": [],
                "follow_up_question": None,
            },
            ensure_ascii=True,
        ),
    },
    {
        "input": (
            "reference_datetime: 2025-01-10T12:00:00+05:30\n"
            "timezone: Asia/Kolkata\n"
            "text: Lunch cost around 1300 rs."
        ),
        "output": json.dumps(
            {
                "entry_summary": "User spent on lunch.",
                "occurred_at": None,
                "transactions": [
                    {
                        "amount": 1300,
                        "currency": "INR",
                        "direction": "outflow",
                        "type": "expense",
                        "category": "Food & Drinks",
                        "subcategory": "Dining",
                        "merchant": None,
                        "confidence": 0.75,
                        "needs_confirmation": True,
                        "assumptions": ["Amount is approximate ('around')."],
                    }
                ],
                "overall_confidence": 0.75,
                "needs_confirmation": True,
                "assumptions": ["Amount is approximate ('around')."],
                "follow_up_question": None,
            },
            ensure_ascii=True,
        ),
    },
    {
        "input": (
            "reference_datetime: 2025-01-10T12:00:00+05:30\n"
            "timezone: Asia/Kolkata\n"
            "text: Split dinner 1200 with 3 friends."
        ),
        "output": json.dumps(
            {
                "entry_summary": "User split a dinner bill with friends.",
                "occurred_at": None,
                "transactions": [
                    {
                        "amount": 300,
                        "currency": "INR",
                        "direction": "outflow",
                        "type": "expense",
                        "category": "Food & Drinks",
                        "subcategory": "Dining",
                        "merchant": None,
                        "confidence": 0.86,
                        "needs_confirmation": False,
                        "assumptions": [],
                    }
                ],
                "overall_confidence": 0.86,
                "needs_confirmation": False,
                "assumptions": [],
                "follow_up_question": None,
            },
            ensure_ascii=True,
        ),
    },
]
