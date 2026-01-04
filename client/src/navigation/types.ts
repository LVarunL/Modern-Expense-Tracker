import type { ParseResponse } from '../api/types';

export type RootStackParamList = {
  MainTabs: undefined;
  PreviewModal: {
    preview: ParseResponse;
    rawText: string;
  };
};

export type TabParamList = {
  Capture: undefined;
  Feed: undefined;
  Summary: undefined;
};
