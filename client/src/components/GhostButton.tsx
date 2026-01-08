import { Pressable, StyleSheet, Text } from "react-native";

import { colors } from "../theme/colors";
import { typography } from "../theme/typography";

interface GhostButtonProps {
  onPress: () => void;
  label: string;
  disabled?: boolean;
}

export function GhostButton({
  onPress,
  label,
  disabled = false,
}: GhostButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.divider,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: "center",
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    color: colors.ink,
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.md,
  },
});
