export type TransactionDirection = 'inflow' | 'outflow';

export type TransactionType =
  | 'expense'
  | 'income'
  | 'repayment_received'
  | 'repayment_sent'
  | 'refund'
  | 'transfer'
  | 'investment_income'
  | 'other';

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
  reference_datetime?: string | null;
}

export interface ParseResponse {
  entry_id: number;
  status: 'parsed' | 'pending_confirmation' | 'confirmed' | 'rejected';
  entry_summary?: string | null;
  occurred_time?: string | null;
  transactions: ParseTransaction[];
  assumptions: string[];
}

export interface ConfirmTransactionInput {
  occurred_time: string;
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
  occurred_time: string;
  created_time: string;
  modified_time: string;
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
  created_time: string;
  modified_time: string;
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
