import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface PrimaryButtonProps {
  onPress: () => void;
  label: string;
  suffix?: string;
  disabled?: boolean;
}

export function PrimaryButton({
  onPress,
  label,
  suffix,
  disabled = false,
}: PropsWithChildren<PrimaryButtonProps>) {
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
      {suffix ? (
        <View style={styles.suffix}>
          <Text style={styles.suffixText}>{suffix}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.cobalt,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: colors.ink,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.95,
  },
  disabled: {
    opacity: 0.55,
  },
  label: {
    color: colors.surface,
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.lg,
  },
  suffix: {
    backgroundColor: colors.citrus,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  suffixText: {
    color: colors.ink,
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
  },
});
