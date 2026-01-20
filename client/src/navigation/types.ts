import type { NavigatorScreenParams } from "@react-navigation/native";

import type {
  ParseResponse,
  TransactionDirection,
  TransactionOut,
} from "../api/types";
import type { TimeRangeFilter } from "../utils/timeRange";

export type RootStackParamList = {
  Auth: undefined;
  ForgotPassword: { email?: string } | undefined;
  ResetPassword: undefined;
  AccountSettings: undefined;
  Onboarding: NavigatorScreenParams<OnboardingStackParamList>;
  MainTabs: NavigatorScreenParams<TabParamList>;
  PreviewModal: {
    preview: ParseResponse;
    rawText: string;
  };
  EditTransactionModal: {
    transaction: TransactionOut;
  };
  FilterModal: undefined;
  AnalyticsCategories: { range?: TimeRangeFilter } | undefined;
  AnalyticsCategoryDetail: {
    range?: TimeRangeFilter;
    category: string;
    direction: TransactionDirection;
  };
  AnalyticsTypes: { range?: TimeRangeFilter } | undefined;
  AnalyticsCashflow: { range?: TimeRangeFilter } | undefined;
};

export type OnboardingStackParamList = {
  OnboardingCurrency: undefined;
};

export type TabParamList = {
  Capture: { autoVoice?: boolean } | undefined;
  Feed: undefined;
  Summary: undefined;
};
