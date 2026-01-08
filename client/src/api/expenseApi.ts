import { request } from "./client";
import type {
  ConfirmRequest,
  ConfirmResponse,
  ParseRequest,
  ParseResponse,
  SummaryResponse,
  TransactionOut,
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
