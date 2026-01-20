import type {
  AnalyticsCategoryPoint,
  AnalyticsSeriesPoint,
  AnalyticsSummaryResponse,
  AnalyticsTypePoint,
  TransactionDirection,
} from "../api/types";
import type {
  BarPoint,
  DonutSegment,
  LineSeriesPoint,
} from "../components/charts";

export function buildLineSeriesData(
  items: AnalyticsSeriesPoint[]
): LineSeriesPoint[] {
  return [...items]
    .sort((a, b) => a.bucket_start - b.bucket_start)
    .map((item) => ({
      x: item.bucket_start,
      y: Number(item.total),
    }));
}

export function splitCategoryTotals(items: AnalyticsCategoryPoint[]) {
  const outflow = items
    .filter((item) => item.direction === "outflow")
    .sort((a, b) => Number(b.total) - Number(a.total));
  const inflow = items
    .filter((item) => item.direction === "inflow")
    .sort((a, b) => Number(b.total) - Number(a.total));
  return { inflow, outflow };
}

export function splitTypeTotals(items: AnalyticsTypePoint[]) {
  const outflow = items
    .filter((item) => item.direction === "outflow")
    .sort((a, b) => Number(b.total) - Number(a.total));
  const inflow = items
    .filter((item) => item.direction === "inflow")
    .sort((a, b) => Number(b.total) - Number(a.total));
  return { inflow, outflow };
}

export function buildDonutSegments(
  categories: AnalyticsCategoryPoint[],
  palette: string[],
  maxSegments = 4
): { segments: DonutSegment[]; total: number } {
  if (!categories.length) {
    return { segments: [], total: 0 };
  }
  const top = categories.slice(0, maxSegments);
  const rest = categories.slice(maxSegments);
  const restTotal = rest.reduce((sum, item) => sum + Number(item.total), 0);
  const segments: DonutSegment[] = top.map((item, index) => ({
    value: Number(item.total),
    color: palette[index % palette.length],
    label: item.category,
  }));
  if (restTotal > 0) {
    segments.push({
      value: restTotal,
      color: palette[palette.length - 1] ?? "#9CA3AF",
      label: "Other",
    });
  }
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  return { segments, total };
}

export function buildCashflowBars(
  summary: AnalyticsSummaryResponse | null | undefined,
  colors: { inflow: string; outflow: string }
): BarPoint[] {
  if (!summary) {
    return [];
  }
  return [
    {
      label: "Inflow",
      value: Number(summary.total_inflow),
      color: colors.inflow,
    },
    {
      label: "Outflow",
      value: Number(summary.total_outflow),
      color: colors.outflow,
    },
  ];
}

export function buildBarPoints<T extends { total: number }>(
  items: T[],
  palette: string[]
): BarPoint[] {
  return items.map((item, index) => ({
    value: Number(item.total),
    color: palette[index % palette.length],
  }));
}

export function totalByDirection(
  summary: AnalyticsSummaryResponse | null | undefined,
  direction: TransactionDirection
): number {
  if (!summary) {
    return 0;
  }
  return direction === "inflow"
    ? Number(summary.total_inflow)
    : Number(summary.total_outflow);
}
