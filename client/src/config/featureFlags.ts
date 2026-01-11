export type FeatureFlags = {
  authForgotPassword: boolean;
  authResetPassword: boolean;
  capturePromptSuggestions: boolean;
  captureRecentPreview: boolean;
};

export const featureFlags: FeatureFlags = {
  authForgotPassword: false,
  authResetPassword: false,
  capturePromptSuggestions: false,
  captureRecentPreview: true,
};
