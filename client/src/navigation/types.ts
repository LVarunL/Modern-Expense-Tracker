import type { NavigatorScreenParams } from "@react-navigation/native";

import type { ParseResponse, TransactionOut } from "../api/types";

export type RootStackParamList = {
  Auth: undefined;
  ForgotPassword: { email?: string } | undefined;
  ResetPassword: undefined;
  AccountSettings: undefined;
  MainTabs: NavigatorScreenParams<TabParamList>;
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
  Capture: { autoVoice?: boolean } | undefined;
  Feed: undefined;
  Summary: undefined;
};
