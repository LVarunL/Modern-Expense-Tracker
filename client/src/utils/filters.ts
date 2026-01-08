import type { TransactionDirection, TransactionType } from "../api/types";
import type { FeedFilters } from "../state/feedFilters";

export type FeedQueryFilters = {
  direction?: TransactionDirection;
  type?: TransactionType[];
  category?: string[];
  min_amount?: number;
  max_amount?: number;
};

function normalizeArray<T extends string>(values: T[]): T[] {
  return Array.from(new Set(values)).sort();
}

function parseAmount(value: string): number | undefined {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return undefined;
  }
  return parsed;
}

export function buildFeedQueryFilters(filters: FeedFilters): FeedQueryFilters {
  const normalizedTypes = normalizeArray(filters.types);
  const normalizedCategories = normalizeArray(filters.categories);
  const minAmount = parseAmount(filters.minAmount);
  const maxAmount = parseAmount(filters.maxAmount);

  return {
    direction: filters.direction ?? undefined,
    type: normalizedTypes.length ? normalizedTypes : undefined,
    category: normalizedCategories.length ? normalizedCategories : undefined,
    min_amount: minAmount,
    max_amount: maxAmount,
  };
}

export function countActiveFilters(filters: FeedFilters): number {
  let count = 0;
  if (filters.direction) {
    count += 1;
  }
  if (filters.types.length) {
    count += 1;
  }
  if (filters.categories.length) {
    count += 1;
  }
  if (filters.minAmount.trim()) {
    count += 1;
  }
  if (filters.maxAmount.trim()) {
    count += 1;
  }
  return count;
}
