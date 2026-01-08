import { SortOrder, TransactionSortField } from "../api/types";

export enum TransactionSortId {
  recent = "recent",
  oldest = "oldest",
  amount_high = "amount_high",
  amount_low = "amount_low",
  category_az = "category_az",
}

export type SortOption = {
  id: TransactionSortId;
  label: string;
  sort_by: TransactionSortField;
  sort_order: SortOrder;
};

export const TRANSACTION_SORT_OPTIONS: SortOption[] = [
  {
    id: TransactionSortId.recent,
    label: "Newest",
    sort_by: TransactionSortField.occurred_time,
    sort_order: SortOrder.desc,
  },
  {
    id: TransactionSortId.oldest,
    label: "Oldest",
    sort_by: TransactionSortField.occurred_time,
    sort_order: SortOrder.asc,
  },
  {
    id: TransactionSortId.amount_high,
    label: "Amount high",
    sort_by: TransactionSortField.amount,
    sort_order: SortOrder.desc,
  },
  {
    id: TransactionSortId.amount_low,
    label: "Amount low",
    sort_by: TransactionSortField.amount,
    sort_order: SortOrder.asc,
  },
  {
    id: TransactionSortId.category_az,
    label: "Category A-Z",
    sort_by: TransactionSortField.category,
    sort_order: SortOrder.asc,
  },
];
