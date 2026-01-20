import type {
  AnalyticsBucket,
  TransactionDirection,
  TransactionType,
} from "../api/types";
import type { FeedFilters } from "../state/feedFilters";
import { buildTimeRange } from "./timeRange";

export type AnalyticsQueryParams = {
  from_ms: number;
  to_ms: number;
  bucket?: AnalyticsBucket;
  tz?: string;
  direction?: TransactionDirection;
  type?: TransactionType[];
  category?: string[];
  min_amount?: number;
  max_amount?: number;
};

function parseAmount(value: string): number | undefined {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return undefined;
  }
  return parsed;
}

export function buildAnalyticsParams(
  filters: FeedFilters,
  options?: {
    bucket?: AnalyticsBucket;
    tz?: string;
  }
): AnalyticsQueryParams | null {
  const range = buildTimeRange(filters.timeRange);
  if (!range.fromMs || !range.toMs) {
    return null;
  }
  const minAmount = parseAmount(filters.minAmount);
  const maxAmount = parseAmount(filters.maxAmount);

  return {
    from_ms: range.fromMs,
    to_ms: range.toMs,
    bucket: options?.bucket,
    tz: options?.tz,
    direction: filters.direction ?? undefined,
    type: filters.types.length ? filters.types : undefined,
    category: filters.categories.length ? filters.categories : undefined,
    min_amount: minAmount,
    max_amount: maxAmount,
  };
}
