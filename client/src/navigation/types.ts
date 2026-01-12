import type { ParseResponse, TransactionOut } from "../api/types";

export type RootStackParamList = {
  Auth: undefined;
  ForgotPassword: { email?: string } | undefined;
  ResetPassword: undefined;
  AccountSettings: undefined;
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
