import { StyleSheet, Text, View } from "react-native";

import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

export type LegendItem = {
  label: string;
  value?: string;
  color: string;
};

type Props = {
  items: LegendItem[];
  compact?: boolean;
};

export function ChartLegend({ items, compact = false }: Props) {
  return (
    <View style={styles.container}>
      {items.map((item, index) => (
        <View
          key={`${item.label}-${index}`}
          style={[styles.row, compact && styles.rowCompact]}
        >
          <View style={[styles.dot, { backgroundColor: item.color }]} />
          <Text
            style={[styles.label, compact && styles.labelCompact]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {item.label}
          </Text>
          {item.value ? (
            <Text
              style={[styles.value, compact && styles.valueCompact]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {item.value}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  rowCompact: {
    gap: spacing.xs,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  label: {
    flex: 1,
    minWidth: 0,
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.ink,
  },
  labelCompact: {
    fontSize: typography.size.xs,
    color: colors.slate,
  },
  value: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.ink,
  },
  valueCompact: {
    fontSize: typography.size.xs,
    color: colors.ink,
  },
});
