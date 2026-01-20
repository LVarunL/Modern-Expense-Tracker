import { Ionicons } from "@expo/vector-icons";
import type { PropsWithChildren } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

type Props = PropsWithChildren<{
  title: string;
  subtitle?: string;
  footer?: string;
  onPress?: () => void;
  actionLabel?: string;
}>;

export function ChartCard({
  title,
  subtitle,
  footer,
  onPress,
  actionLabel,
  children,
}: Props) {
  const cardContent = (
    <>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{title}</Text>
          {onPress && actionLabel ? (
            <View style={styles.action}>
              <Text style={styles.actionText}>{actionLabel}</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.steel} />
            </View>
          ) : null}
        </View>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <View style={styles.body}>{children}</View>
      {footer ? <Text style={styles.footer}>{footer}</Text> : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      >
        {cardContent}
      </Pressable>
    );
  }

  return <View style={styles.card}>{cardContent}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  cardPressed: {
    borderColor: colors.cobalt,
    transform: [{ scale: 0.99 }],
  },
  header: {
    gap: spacing.xs,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  title: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.md,
    color: colors.ink,
    flex: 1,
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  actionText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.xs,
    color: colors.steel,
  },
  subtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.slate,
  },
  body: {
    gap: spacing.sm,
  },
  footer: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.xs,
    color: colors.steel,
  },
});
