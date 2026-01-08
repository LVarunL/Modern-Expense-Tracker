import type { TransactionDirection, TransactionType } from "../api/types";

export const TRANSACTION_CATEGORIES = [
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
];

export const TRANSACTION_TYPES: TransactionType[] = [
  "expense",
  "income",
  "repayment_received",
  "repayment_sent",
  "refund",
  "transfer",
  "investment_income",
  "other",
];

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  expense: "Expense",
  income: "Income",
  repayment_received: "Repayment In",
  repayment_sent: "Repayment Out",
  refund: "Refund",
  transfer: "Transfer",
  investment_income: "Investment Inc",
  other: "Other",
};

export const TYPE_DIRECTION_MAP: Record<TransactionType, TransactionDirection> =
  {
    expense: "outflow",
    income: "inflow",
    repayment_received: "inflow",
    repayment_sent: "outflow",
    refund: "inflow",
    transfer: "outflow",
    investment_income: "inflow",
    other: "outflow",
  };

export const TYPE_CATEGORY_MAP: Partial<Record<TransactionType, string>> = {
  income: "Income",
  investment_income: "Investments",
  repayment_received: "Loans",
  repayment_sent: "Loans",
  transfer: "Transfer",
};
