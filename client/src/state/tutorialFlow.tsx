import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AppState } from "react-native";

import { featureFlags } from "../config/featureFlags";
import type { TabParamList } from "../navigation/types";
import { useAuth } from "./auth";
import type { TutorialId } from "./tutorialStorage";

const FLOW_ORDER: TutorialId[] = ["capture", "analytics", "feed"];

export const TUTORIAL_TAB_ROUTES: Record<TutorialId, keyof TabParamList> = {
  capture: "Capture",
  analytics: "Summary",
  feed: "Feed",
};

type TutorialFlowContextValue = {
  isEnabled: boolean;
  activeId: TutorialId | null;
  advance: () => void;
  reset: () => void;
};

const TutorialFlowContext = createContext<TutorialFlowContextValue | undefined>(
  undefined
);

export function TutorialFlowProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const isEnabled =
    featureFlags.forceTutorialOnAppOpen &&
    isAuthenticated &&
    Boolean(user?.onboarding_completed);
  const [activeId, setActiveId] = useState<TutorialId | null>(null);

  const reset = useCallback(() => {
    setActiveId(isEnabled ? FLOW_ORDER[0] : null);
  }, [isEnabled]);

  useEffect(() => {
    if (!isEnabled) {
      setActiveId(null);
      return;
    }
    if (AppState.currentState === "active") {
      reset();
    }
  }, [isEnabled, reset]);

  useEffect(() => {
    if (!isEnabled) {
      return;
    }
    const handleAppStateChange = (state: string) => {
      if (state === "active") {
        reset();
      }
    };
    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );
    return () => subscription.remove();
  }, [isEnabled, reset]);

  const advance = useCallback(() => {
    setActiveId((prev) => {
      if (!prev) {
        return prev;
      }
      const index = FLOW_ORDER.indexOf(prev);
      if (index < 0 || index >= FLOW_ORDER.length - 1) {
        return null;
      }
      return FLOW_ORDER[index + 1];
    });
  }, []);

  const value = useMemo(
    () => ({
      isEnabled,
      activeId,
      advance,
      reset,
    }),
    [activeId, advance, isEnabled, reset]
  );

  return (
    <TutorialFlowContext.Provider value={value}>
      {children}
    </TutorialFlowContext.Provider>
  );
}

export function useTutorialFlow() {
  const context = useContext(TutorialFlowContext);
  if (!context) {
    throw new Error("useTutorialFlow must be used within TutorialFlowProvider");
  }
  return context;
}
