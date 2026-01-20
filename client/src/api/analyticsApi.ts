import { request } from "./client";
import type {
  AnalyticsBucket,
  AnalyticsCategoryResponse,
  AnalyticsSeriesResponse,
  AnalyticsSummaryResponse,
  AnalyticsTypeResponse,
  TransactionDirection,
  TransactionType,
} from "./types";

export function fetchAnalyticsSeries(params: {
  from_ms: number;
  to_ms: number;
  bucket?: AnalyticsBucket;
  tz?: string;
  direction?: TransactionDirection;
  type?: TransactionType[];
  category?: string[];
  min_amount?: number;
  max_amount?: number;
}): Promise<AnalyticsSeriesResponse> {
  const query = new URLSearchParams();
  query.set("from_ms", String(params.from_ms));
  query.set("to_ms", String(params.to_ms));
  if (params.bucket) {
    query.set("bucket", params.bucket);
  }
  if (params.tz) {
    query.set("tz", params.tz);
  }
  if (params.direction) {
    query.set("direction", params.direction);
  }
  if (params.type?.length) {
    params.type.forEach((value) => query.append("type", value));
  }
  if (params.category?.length) {
    params.category.forEach((value) => query.append("category", value));
  }
  if (typeof params.min_amount === "number") {
    query.set("min_amount", String(params.min_amount));
  }
  if (typeof params.max_amount === "number") {
    query.set("max_amount", String(params.max_amount));
  }
  return request(`/v1/analytics/series?${query.toString()}`);
}

export function fetchAnalyticsCategories(params: {
  from_ms: number;
  to_ms: number;
  direction?: TransactionDirection;
  type?: TransactionType[];
  category?: string[];
  min_amount?: number;
  max_amount?: number;
}): Promise<AnalyticsCategoryResponse> {
  const query = new URLSearchParams();
  query.set("from_ms", String(params.from_ms));
  query.set("to_ms", String(params.to_ms));
  if (params.direction) {
    query.set("direction", params.direction);
  }
  if (params.type?.length) {
    params.type.forEach((value) => query.append("type", value));
  }
  if (params.category?.length) {
    params.category.forEach((value) => query.append("category", value));
  }
  if (typeof params.min_amount === "number") {
    query.set("min_amount", String(params.min_amount));
  }
  if (typeof params.max_amount === "number") {
    query.set("max_amount", String(params.max_amount));
  }
  return request(`/v1/analytics/categories?${query.toString()}`);
}

export function fetchAnalyticsSummary(params: {
  from_ms: number;
  to_ms: number;
  direction?: TransactionDirection;
  type?: TransactionType[];
  category?: string[];
  min_amount?: number;
  max_amount?: number;
}): Promise<AnalyticsSummaryResponse> {
  const query = new URLSearchParams();
  query.set("from_ms", String(params.from_ms));
  query.set("to_ms", String(params.to_ms));
  if (params.direction) {
    query.set("direction", params.direction);
  }
  if (params.type?.length) {
    params.type.forEach((value) => query.append("type", value));
  }
  if (params.category?.length) {
    params.category.forEach((value) => query.append("category", value));
  }
  if (typeof params.min_amount === "number") {
    query.set("min_amount", String(params.min_amount));
  }
  if (typeof params.max_amount === "number") {
    query.set("max_amount", String(params.max_amount));
  }
  return request(`/v1/analytics/summary?${query.toString()}`);
}

export function fetchAnalyticsTypes(params: {
  from_ms: number;
  to_ms: number;
  direction?: TransactionDirection;
  type?: TransactionType[];
  category?: string[];
  min_amount?: number;
  max_amount?: number;
}): Promise<AnalyticsTypeResponse> {
  const query = new URLSearchParams();
  query.set("from_ms", String(params.from_ms));
  query.set("to_ms", String(params.to_ms));
  if (params.direction) {
    query.set("direction", params.direction);
  }
  if (params.type?.length) {
    params.type.forEach((value) => query.append("type", value));
  }
  if (params.category?.length) {
    params.category.forEach((value) => query.append("category", value));
  }
  if (typeof params.min_amount === "number") {
    query.set("min_amount", String(params.min_amount));
  }
  if (typeof params.max_amount === "number") {
    query.set("max_amount", String(params.max_amount));
  }
  return request(`/v1/analytics/types?${query.toString()}`);
}
