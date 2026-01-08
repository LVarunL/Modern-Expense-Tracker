import { request } from "./client";
import type {
  ConfirmRequest,
  ConfirmResponse,
  ParseRequest,
  ParseResponse,
  SortOrder,
  SummaryResponse,
  TransactionDirection,
  TransactionOut,
  TransactionSortField,
  TransactionType,
  TransactionUpdateRequest,
  TransactionsResponse,
} from "./types";

export function parseEntry(payload: ParseRequest): Promise<ParseResponse> {
  return request<ParseResponse>("/v1/parse", {
    method: "POST",
    body: payload,
  });
}

export function confirmEntry(
  payload: ConfirmRequest
): Promise<ConfirmResponse> {
  return request<ConfirmResponse>("/v1/entries/confirm", {
    method: "POST",
    body: payload,
  });
}

export function fetchTransactions(params?: {
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
  sort_by?: TransactionSortField;
  sort_order?: SortOrder;
  direction?: TransactionDirection;
  type?: TransactionType[];
  category?: string[];
  min_amount?: number;
  max_amount?: number;
}): Promise<TransactionsResponse> {
  const query = new URLSearchParams();
  if (params?.from) {
    query.set("from", params.from);
  }
  if (params?.to) {
    query.set("to", params.to);
  }
  if (params?.limit) {
    query.set("limit", String(params.limit));
  }
  if (params?.offset) {
    query.set("offset", String(params.offset));
  }
  if (params?.sort_by) {
    query.set("sort_by", params.sort_by);
  }
  if (params?.sort_order) {
    query.set("sort_order", params.sort_order);
  }
  if (params?.direction) {
    query.set("direction", params.direction);
  }
  if (params?.type?.length) {
    params.type.forEach((value) => query.append("type", value));
  }
  if (params?.category?.length) {
    params.category.forEach((value) => query.append("category", value));
  }
  if (typeof params?.min_amount === "number") {
    query.set("min_amount", String(params.min_amount));
  }
  if (typeof params?.max_amount === "number") {
    query.set("max_amount", String(params.max_amount));
  }
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return request<TransactionsResponse>(`/v1/transactions${suffix}`);
}

export function fetchSummary(month: string): Promise<SummaryResponse> {
  const query = new URLSearchParams({ month });
  return request<SummaryResponse>(`/v1/summary?${query.toString()}`);
}

export function updateTransaction(
  transactionId: number,
  payload: TransactionUpdateRequest
): Promise<TransactionOut> {
  return request(`/v1/transactions/${transactionId}`, {
    method: "PATCH",
    body: payload,
  });
}
