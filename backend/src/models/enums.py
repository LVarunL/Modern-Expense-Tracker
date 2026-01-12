"""Enum definitions for database models."""

from enum import Enum


class EntrySource(str, Enum):
    manual_text = "manual_text"


class EntryStatus(str, Enum):
    parsed = "parsed"
    pending_confirmation = "pending_confirmation"
    confirmed = "confirmed"
    rejected = "rejected"


class TransactionDirection(str, Enum):
    inflow = "inflow"
    outflow = "outflow"


class TransactionType(str, Enum):
    expense = "expense"
    income = "income"
    repayment_received = "repayment_received"
    repayment_sent = "repayment_sent"
    refund = "refund"
    transfer = "transfer"
    investment_income = "investment_income"
    other = "other"


class OAuthProvider(str, Enum):
    google = "google"


class OtpPurpose(str, Enum):
    forgot_password = "forgot_password"
    reset_password = "reset_password"
