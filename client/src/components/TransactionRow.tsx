import { StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/colors";
import { typography } from "../theme/typography";

interface TransactionRowProps {
  title: string;
  subtitle?: string;
  amount: string;
  accent?: "inflow" | "outflow";
}

export function TransactionRow({
  title,
  subtitle,
  amount,
  accent = "outflow",
}: TransactionRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.meta}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <Text style={[styles.amount, accent === "inflow" && styles.amountInflow]}>
        {amount}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  meta: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.md,
    color: colors.ink,
  },
  subtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.slate,
    marginTop: 2,
  },
  amount: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.md,
    color: colors.ink,
  },
  amountInflow: {
    color: colors.success,
  },
});
