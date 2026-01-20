import { useIsFocused } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";

import { useTutorialFlow } from "../state/tutorialFlow";
import {
  isTutorialComplete,
  markTutorialComplete,
  type TutorialId,
} from "../state/tutorialStorage";

export function useTutorial(id: TutorialId, stepCount: number) {
  const isFocused = useIsFocused();
  const { activeId, advance, isEnabled } = useTutorialFlow();
  const isFlowActive = isEnabled && activeId === id;
  const [isReady, setIsReady] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (isEnabled) {
      setIsActive(isFlowActive);
      setIsReady(true);
      setStepIndex(0);
      return;
    }
    let isMounted = true;
    const load = async () => {
      const done = await isTutorialComplete(id);
      if (!isMounted) {
        return;
      }
      setIsActive(!done);
      setIsReady(true);
      setStepIndex(0);
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [id, isEnabled, isFlowActive]);

  const complete = useCallback(() => {
    setIsActive(false);
    void markTutorialComplete(id);
    if (isFlowActive) {
      advance();
    }
  }, [advance, id, isFlowActive]);

  const next = useCallback(() => {
    setStepIndex((prev) => {
      if (prev + 1 >= stepCount) {
        complete();
        return prev;
      }
      return prev + 1;
    });
  }, [complete, stepCount]);

  const skip = useCallback(() => {
    complete();
  }, [complete]);

  return {
    isReady,
    isVisible: isFocused && isReady && isActive,
    stepIndex,
    next,
    skip,
  };
}
