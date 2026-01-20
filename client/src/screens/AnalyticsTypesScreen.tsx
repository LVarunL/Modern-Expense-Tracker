import { useMemo } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import type { RouteProp } from "@react-navigation/native";
import { useRoute } from "@react-navigation/native";
import { getErrorMessage } from "../api";
import { AppHeader } from "../components/AppHeader";
import { Screen } from "../components/Screen";
import { TimeRangeFilter } from "../components/TimeRangeFilter";
import { BarChart, ChartCard, ChartLegend } from "../components/charts";
import { TRANSACTION_TYPE_LABELS } from "../constants/transactions";
import { useAnalyticsTypes } from "../hooks/useAnalytics";
import { useAnalyticsRange } from "../hooks/useAnalyticsRange";
import { useUserCurrency } from "../hooks/useUserCurrency";
import type { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import {
  buildBarPoints,
  splitTypeTotals,
} from "../utils/analyticsChartTransforms";
import { formatCurrencyValue } from "../utils/format";

export function AnalyticsTypesScreen() {
  const route = useRoute<RouteProp<RootStackParamList, "AnalyticsTypes">>();
  const { width } = useWindowDimensions();
  const isCompact = width < 360;
  const currency = useUserCurrency();

  const { range, setRange, error, resolved, label } = useAnalyticsRange(
    route.params?.range
  );
  const fromMs = resolved?.fromMs ?? 0;
  const toMs = resolved?.toMs ?? 0;

  const typesQuery = useAnalyticsTypes({ from_ms: fromMs, to_ms: toMs });
  const items = typesQuery.data?.items ?? [];
  const errorMessage = typesQuery.error
    ? getErrorMessage(typesQuery.error)
    : null;
  const hasRange = Boolean(resolved) && !error;

  const { outflow, inflow } = useMemo(() => splitTypeTotals(items), [items]);

  const outflowPalette = [colors.cobalt, colors.citrus];
  const inflowPalette = [colors.success, colors.cobalt];

  const buildLegend = (list: typeof outflow, palette: string[]) =>
    list.map((item, index) => ({
      label: TRANSACTION_TYPE_LABELS[item.type] ?? item.type,
      value: formatCurrencyValue(Number(item.total), currency),
      color: palette[index % palette.length],
    }));

  return (
    <Screen withGradient={false}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <AppHeader title="Type split" subtitle={label} showBack showAccount />

        <TimeRangeFilter
          value={range}
          onChange={setRange}
          compact={isCompact}
        />

        {!resolved ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Pick a time range</Text>
            <Text style={styles.stateSubtitle}>
              Select a range to explore types.
            </Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Check your date range</Text>
            <Text style={styles.stateSubtitle}>{error}</Text>
          </View>
        ) : null}

        {errorMessage ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Unable to load type split</Text>
            <Text style={styles.stateSubtitle}>{errorMessage}</Text>
          </View>
        ) : null}

        {hasRange ? (
          <>
            <ChartCard title="Outflow types">
              <BarChart
                data={buildBarPoints(outflow, outflowPalette)}
                height={140}
              />
              <ChartLegend items={buildLegend(outflow, outflowPalette)} />
            </ChartCard>

            <ChartCard title="Inflow types">
              <BarChart
                data={buildBarPoints(inflow, inflowPalette)}
                height={140}
              />
              <ChartLegend items={buildLegend(inflow, inflowPalette)} />
            </ChartCard>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxxl,
    gap: spacing.xl,
  },
  stateCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    gap: spacing.sm,
  },
  stateTitle: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.md,
    color: colors.ink,
  },
  stateSubtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.slate,
  },
});
