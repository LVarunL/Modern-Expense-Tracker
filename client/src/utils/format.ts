import type { TransactionDirection } from "../api/types";
import { getCurrencySymbol } from "./currency";
import { normalizeEpochMs } from "./time";

export function formatCurrency(
  amount: number,
  direction: TransactionDirection,
  currencyCode = "INR"
): string {
  const symbol = getCurrencySymbol(currencyCode);
  const sign = direction === "outflow" ? "-" : "+";
  const formatted = Number.isFinite(amount)
    ? amount.toLocaleString(undefined, { maximumFractionDigits: 2 })
    : "0";
  return `${sign}${symbol}${formatted}`;
}

export function formatCurrencyValue(
  amount: number,
  currencyCode = "INR"
): string {
  const symbol = getCurrencySymbol(currencyCode);
  const formatted = Number.isFinite(amount)
    ? amount.toLocaleString(undefined, { maximumFractionDigits: 2 })
    : "0";
  return `${symbol}${formatted}`;
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
