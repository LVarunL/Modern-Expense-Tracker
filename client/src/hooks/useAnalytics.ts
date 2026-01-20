import { useQuery } from "@tanstack/react-query";

import {
  fetchAnalyticsCategories,
  fetchAnalyticsSeries,
  fetchAnalyticsSummary,
  fetchAnalyticsTypes,
} from "../api/analyticsApi";
import type {
  AnalyticsBucket,
  AnalyticsCategoryResponse,
  AnalyticsSeriesResponse,
  AnalyticsSummaryResponse,
  AnalyticsTypeResponse,
  TransactionDirection,
  TransactionType,
} from "../api/types";

type AnalyticsBaseParams = {
  from_ms: number;
  to_ms: number;
  direction?: TransactionDirection;
  type?: TransactionType[];
  category?: string[];
  min_amount?: number;
  max_amount?: number;
};

export function useAnalyticsSeries(
  params: AnalyticsBaseParams & { bucket?: AnalyticsBucket; tz?: string }
) {
  return useQuery<AnalyticsSeriesResponse>({
    queryKey: ["analytics", "series", params],
    queryFn: () => fetchAnalyticsSeries(params),
    enabled:
      Number.isFinite(params.from_ms) &&
      params.from_ms >= 0 &&
      params.to_ms > 0,
  });
}

export function useAnalyticsCategories(params: AnalyticsBaseParams) {
  return useQuery<AnalyticsCategoryResponse>({
    queryKey: ["analytics", "categories", params],
    queryFn: () => fetchAnalyticsCategories(params),
    enabled:
      Number.isFinite(params.from_ms) &&
      params.from_ms >= 0 &&
      params.to_ms > 0,
  });
}

export function useAnalyticsSummary(params: AnalyticsBaseParams) {
  return useQuery<AnalyticsSummaryResponse>({
    queryKey: ["analytics", "summary", params],
    queryFn: () => fetchAnalyticsSummary(params),
    enabled:
      Number.isFinite(params.from_ms) &&
      params.from_ms >= 0 &&
      params.to_ms > 0,
  });
}

export function useAnalyticsTypes(params: AnalyticsBaseParams) {
  return useQuery<AnalyticsTypeResponse>({
    queryKey: ["analytics", "types", params],
    queryFn: () => fetchAnalyticsTypes(params),
    enabled:
      Number.isFinite(params.from_ms) &&
      params.from_ms >= 0 &&
      params.to_ms > 0,
  });
}
