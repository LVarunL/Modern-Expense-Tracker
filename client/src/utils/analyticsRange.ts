import type { AnalyticsBucket } from "../api/types";
import { formatMonthYear, formatShortDate } from "./format";
import {
  buildTimeRange,
  formatDateInput,
  parseDateInput,
  type TimeRangeFilter,
} from "./timeRange";

export type ResolvedRange = {
  fromMs: number;
  toMs: number;
};

function startOfNextDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
}

export function resolveAnalyticsRange(
  range: TimeRangeFilter
): ResolvedRange | null {
  if (range.preset === "all") {
    const now = new Date();
    return { fromMs: 0, toMs: startOfNextDay(now).getTime() };
  }
  const resolved = buildTimeRange(range);
  if (!resolved.fromMs || !resolved.toMs) {
    return null;
  }
  return {
    fromMs: resolved.fromMs,
    toMs: resolved.toMs,
  };
}

export function deriveAnalyticsBucket(
  fromMs: number,
  toMs: number
): AnalyticsBucket {
  const days = Math.max((toMs - fromMs) / (1000 * 60 * 60 * 24), 1);
  if (days <= 21) {
    return "day";
  }
  if (days <= 180) {
    return "week";
  }
  return "month";
}

export function getDeviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC";
}

export function formatRangeLabel(range: TimeRangeFilter): string {
  switch (range.preset) {
    case "today":
      return "Today";
    case "last7":
      return "Last 7 days";
    case "last30":
      return "Last 30 days";
    case "thisMonth":
      return "This month";
    case "lastMonth":
      return "Last month";
    case "custom": {
      const start = parseDateInput(range.customStart);
      const end = parseDateInput(range.customEnd);
      if (!start || !end) {
        return "Custom range";
      }
      const startLabel = formatDateInput(start);
      const endLabel = formatDateInput(end);
      return `${startLabel} to ${endLabel}`;
    }
    default:
      return "All time";
  }
}

export function formatBucketLabel(
  bucket: AnalyticsBucket,
  value: number
): string {
  if (bucket === "month") {
    return formatMonthYear(value);
  }
  if (bucket === "week") {
    return `Wk of ${formatShortDate(value)}`;
  }
  return formatShortDate(value);
}
