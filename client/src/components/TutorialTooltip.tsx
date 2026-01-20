import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Tooltip from "react-native-walkthrough-tooltip";

import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

interface TutorialTooltipProps {
  visible: boolean;
  title: string;
  body: string;
  step: number;
  total: number;
  placement?: "top" | "bottom" | "left" | "right";
  nextLabel?: string;
  onNext: () => void;
  onSkip: () => void;
  fullWidth?: boolean;
  children: ReactNode;
}

export function TutorialTooltip({
  visible,
  title,
  body,
  step,
  total,
  placement = "bottom",
  nextLabel = "Next",
  onNext,
  onSkip,
  fullWidth = true,
  children,
}: TutorialTooltipProps) {
  return (
    <Tooltip
      isVisible={visible}
      content={
        <View style={styles.content}>
          <Text style={styles.stepText}>{`Step ${step} of ${total}`}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
          <View style={styles.actions}>
            <Pressable
              onPress={onSkip}
              style={({ pressed }) => [
                styles.skipButton,
                pressed && styles.skipButtonPressed,
              ]}
            >
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>
            <Pressable
              onPress={onNext}
              style={({ pressed }) => [
                styles.nextButton,
                pressed && styles.nextButtonPressed,
              ]}
            >
              <Text style={styles.nextText}>{nextLabel}</Text>
            </Pressable>
          </View>
        </View>
      }
      placement={placement}
      onClose={onSkip}
      backgroundColor={colors.overlay}
      contentStyle={styles.tooltip}
      arrowStyle={styles.arrow}
      allowChildInteraction={false}
      closeOnBackgroundInteraction={false}
      closeOnContentInteraction={false}
      closeOnChildInteraction={false}
      showChildInTooltip
    >
      <View
        collapsable={false}
        style={fullWidth ? styles.childFullWidth : undefined}
      >
        {children}
      </View>
    </Tooltip>
  );
}

const styles = StyleSheet.create({
  tooltip: {
    borderRadius: 16,
    padding: 0,
    backgroundColor: colors.surface,
  },
  arrow: {
    borderColor: colors.surface,
  },
  content: {
    padding: spacing.md,
    gap: spacing.xs,
    // maxWidth: 260,
  },
  stepText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.xs,
    color: colors.steel,
  },
  title: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.md,
    color: colors.ink,
  },
  body: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.slate,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.sm,
  },
  skipButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  skipButtonPressed: {
    borderColor: colors.cobalt,
  },
  skipText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.xs,
    color: colors.slate,
  },
  nextButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: colors.cobalt,
  },
  nextButtonPressed: {
    opacity: 0.9,
  },
  nextText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.xs,
    color: colors.surface,
  },
  childFullWidth: {
    width: "100%",
  },
});
