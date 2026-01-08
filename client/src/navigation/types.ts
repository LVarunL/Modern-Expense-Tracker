import type { ParseResponse, TransactionOut } from "../api/types";

export type RootStackParamList = {
  MainTabs: undefined;
  PreviewModal: {
    preview: ParseResponse;
    rawText: string;
  };
  EditTransactionModal: {
    transaction: TransactionOut;
  };
  FilterModal: undefined;
};

export type TabParamList = {
  Capture: undefined;
  Feed: undefined;
  Summary: undefined;
};
