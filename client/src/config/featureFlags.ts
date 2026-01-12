export type FeatureFlags = {
  authForgotPassword: boolean;
  authResetPassword: boolean;
  capturePromptSuggestions: boolean;
  captureRecentPreview: boolean;
};

export const featureFlags: FeatureFlags = {
  authForgotPassword: true,
  authResetPassword: true,
  capturePromptSuggestions: false,
  captureRecentPreview: true,
};
