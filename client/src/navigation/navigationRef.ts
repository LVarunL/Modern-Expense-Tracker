import { createNavigationContainerRef } from "@react-navigation/native";

import type { RootStackParamList } from "./types";

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigateToVoiceCapture() {
  if (!navigationRef.isReady()) {
    return;
  }
  navigationRef.navigate("MainTabs", {
    screen: "Capture",
    params: { autoVoice: true },
  });
}
