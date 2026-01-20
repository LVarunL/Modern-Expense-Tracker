export type TransactionDirection = "inflow" | "outflow";

export enum SortOrder {
  asc = "asc",
  desc = "desc",
}

export enum TransactionSortField {
  occurred_time = "occurred_time",
  amount = "amount",
  category = "category",
}

export type TransactionType =
  | "expense"
  | "income"
  | "repayment_received"
  | "repayment_sent"
  | "refund"
  | "transfer"
  | "investment_income"
  | "other";

export interface ParseTransaction {
  amount: number;
  currency: string;
  direction: TransactionDirection;
  type: TransactionType;
  category: string;
  assumptions: string[];
}

export interface ParseRequest {
  raw_text: string;
  reference_datetime?: number | null;
}

export interface ParseResponse {
  entry_id: number;
  status: "parsed" | "pending_confirmation" | "confirmed" | "rejected";
  entry_summary?: string | null;
  occurred_time?: number | null;
  transactions: ParseTransaction[];
  assumptions: string[];
}

export interface ConfirmTransactionInput {
  occurred_time: number;
  amount: number;
  currency: string;
  direction: TransactionDirection;
  type: TransactionType;
  category: string;
  assumptions: string[];
}

export interface ConfirmRequest {
  entry_id: number;
  transactions: ConfirmTransactionInput[];
}

export interface TransactionOut {
  id: number;
  entry_id: number;
  occurred_time: number;
  created_time: number;
  modified_time: number;
  amount: number;
  currency: string;
  direction: TransactionDirection;
  type: TransactionType;
  category: string;
  assumptions_json?: string[] | null;
}

export interface TransactionUpdateRequest {
  amount: number;
  currency: string;
  direction: TransactionDirection;
  type: TransactionType;
  category: string;
}

export interface EntryOut {
  id: number;
  raw_text: string;
  source: string;
  created_time: number;
  modified_time: number;
  parser_output_json?: Record<string, unknown> | null;
  parser_version?: string | null;
  notes?: string | null;
}

export interface ConfirmResponse {
  entry: EntryOut;
  transactions: TransactionOut[];
}

export interface TransactionsResponse {
  items: TransactionOut[];
  total_count: number;
  limit: number;
  offset: number;
}

export interface CategorySummary {
  direction: TransactionDirection;
  category: string;
  total: number;
}

export interface SummaryResponse {
  month: string;
  total_inflow: number;
  total_outflow: number;
  net: number;
  by_category: CategorySummary[];
  transaction_count: number;
}

export type AnalyticsBucket = "day" | "week" | "month";

export interface AnalyticsSeriesPoint {
  bucket_start: number;
  total: number;
  transaction_count: number;
}

export interface AnalyticsSeriesResponse {
  bucket: AnalyticsBucket;
  items: AnalyticsSeriesPoint[];
}

export interface AnalyticsCategoryPoint {
  direction: TransactionDirection;
  category: string;
  total: number;
  transaction_count: number;
}

export interface AnalyticsCategoryResponse {
  items: AnalyticsCategoryPoint[];
}

export interface AnalyticsTypePoint {
  direction: TransactionDirection;
  type: TransactionType;
  total: number;
  transaction_count: number;
}

export interface AnalyticsTypeResponse {
  items: AnalyticsTypePoint[];
}

export interface AnalyticsSummaryResponse {
  total_inflow: number;
  total_outflow: number;
  net: number;
  transaction_count: number;
}

export interface AuthUser {
  id: string;
  email: string;
  has_password: boolean;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  expires_in: number;
  user: AuthUser;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface GoogleLoginRequest {
  id_token: string;
}

export interface RefreshRequest {
  refresh_token: string;
}

export interface LogoutRequest {
  refresh_token: string;
}

export interface DeleteAccountRequest {
  password?: string;
}

export interface MessageResponse {
  message: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordConfirmRequest {
  email: string;
  otp: string;
  new_password: string;
}

export interface ResetPasswordConfirmRequest {
  otp: string;
  new_password: string;
}
