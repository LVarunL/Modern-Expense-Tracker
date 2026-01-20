import type { TransactionDirection } from "../api/types";
import { normalizeEpochMs } from "./time";

export function formatCurrency(
  amount: number,
  direction: TransactionDirection,
  currencySymbol = "₹"
): string {
  const sign = direction === "outflow" ? "-" : "+";
  const formatted = Number.isFinite(amount)
    ? amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })
    : "0";
  return `${sign}${currencySymbol}${formatted}`;
}

export function formatCurrencyValue(
  amount: number,
  currencySymbol = "₹"
): string {
  const formatted = Number.isFinite(amount)
    ? amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })
    : "0";
  return `${currencySymbol}${formatted}`;
}

export function formatDateTime(
  value: number | string | null | undefined
): string {
  const epochMs = normalizeEpochMs(value);
  if (epochMs === null) {
    return "";
  }
  const date = new Date(epochMs);
  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatShortDate(
  value: number | string | null | undefined
): string {
  const epochMs = normalizeEpochMs(value);
  if (epochMs === null) {
    return "";
  }
  const date = new Date(epochMs);
  return date.toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
  });
}

export function formatMonthYear(
  value: number | string | null | undefined
): string {
  const epochMs = normalizeEpochMs(value);
  if (epochMs === null) {
    return "";
  }
  const date = new Date(epochMs);
  return date.toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
  });
}

export function sanitizeAmountInput(value: string): string {
  const cleaned = value.replace(/[^0-9.]/g, "");
  const [whole, ...rest] = cleaned.split(".");
  if (rest.length === 0) {
    return whole;
  }
  return `${whole}.${rest.join("")}`;
}

export function parseAmount(value: string): number {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return parsed;
}
