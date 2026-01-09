import { StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  meta?: string;
  align?: "left" | "center";
}

export function PageHeader({
  title,
  subtitle,
  meta,
  align = "left",
}: PageHeaderProps) {
  const containerAlignment = align === "center" ? styles.centerContainer : null;
  const textAlignment = align === "center" ? styles.centerText : null;

  return (
    <View style={[styles.container, containerAlignment]}>
      <Text style={[styles.title, textAlignment]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, textAlignment]}>{subtitle}</Text>
      ) : null}
      {meta ? <Text style={[styles.meta, textAlignment]}>{meta}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  centerContainer: {
    alignItems: "center",
  },
  centerText: {
    textAlign: "center",
  },
  title: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.xxl,
    lineHeight: typography.lineHeight.title,
    color: colors.ink,
  },
  subtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.normal,
    color: colors.slate,
  },
  meta: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.xs,
    color: colors.steel,
  },
});
