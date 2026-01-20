import type { RouteProp } from "@react-navigation/native";
import { useRoute } from "@react-navigation/native";
import { useMemo } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { getErrorMessage } from "../api";
import { AppHeader } from "../components/AppHeader";
import { Screen } from "../components/Screen";
import { TimeRangeFilter } from "../components/TimeRangeFilter";
import {
  BarChart,
  ChartCard,
  ChartLegend,
  LineSeriesChart,
} from "../components/charts";
import { useAnalyticsSeries, useAnalyticsSummary } from "../hooks/useAnalytics";
import { useAnalyticsRange } from "../hooks/useAnalyticsRange";
import type { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import {
  buildCashflowBars,
  buildLineSeriesData,
} from "../utils/analyticsChartTransforms";
import { formatBucketLabel } from "../utils/analyticsRange";
import { formatCurrencyValue } from "../utils/format";

export function AnalyticsCashflowScreen() {
  const route = useRoute<RouteProp<RootStackParamList, "AnalyticsCashflow">>();
  const { width } = useWindowDimensions();
  const isCompact = width < 360;

  const { range, setRange, error, resolved, bucket, label, tz } =
    useAnalyticsRange(route.params?.range);
  const fromMs = resolved?.fromMs ?? 0;
  const toMs = resolved?.toMs ?? 0;

  const summaryQuery = useAnalyticsSummary({ from_ms: fromMs, to_ms: toMs });

  const inflowSeries = useAnalyticsSeries({
    from_ms: fromMs,
    to_ms: toMs,
    bucket,
    tz,
    direction: "inflow",
  });
  const outflowSeries = useAnalyticsSeries({
    from_ms: fromMs,
    to_ms: toMs,
    bucket,
    tz,
    direction: "outflow",
  });

  const inflowLine = useMemo(
    () => buildLineSeriesData(inflowSeries.data?.items ?? []),
    [inflowSeries.data?.items]
  );
  const outflowLine = useMemo(
    () => buildLineSeriesData(outflowSeries.data?.items ?? []),
    [outflowSeries.data?.items]
  );

  const summary = summaryQuery.data;
  const loadError =
    summaryQuery.error ?? inflowSeries.error ?? outflowSeries.error;
  const errorMessage = loadError ? getErrorMessage(loadError) : null;
  const hasRange = Boolean(resolved) && !error;
  const cashflowBars = useMemo(
    () =>
      buildCashflowBars(summary, {
        inflow: colors.success,
        outflow: colors.cobalt,
      }),
    [summary]
  );

  return (
    <Screen withGradient={false}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <AppHeader title="Cashflow" subtitle={label} showBack showAccount />

        <TimeRangeFilter
          value={range}
          onChange={setRange}
          compact={isCompact}
        />

        {!resolved ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Pick a time range</Text>
            <Text style={styles.stateSubtitle}>
              Select a range to compare cashflow.
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
            <Text style={styles.stateTitle}>Unable to load cashflow</Text>
            <Text style={styles.stateSubtitle}>{errorMessage}</Text>
          </View>
        ) : null}

        {hasRange ? (
          <>
            <ChartCard title="Inflow vs outflow">
              <BarChart data={cashflowBars} height={140} />
              <ChartLegend
                items={[
                  {
                    label: "Inflow",
                    value: formatCurrencyValue(summary?.total_inflow ?? 0),
                    color: colors.success,
                  },
                  {
                    label: "Outflow",
                    value: formatCurrencyValue(summary?.total_outflow ?? 0),
                    color: colors.cobalt,
                  },
                ]}
              />
            </ChartCard>

            <ChartCard title="Inflow trend" subtitle={`Bucketed by ${bucket}`}>
              <LineSeriesChart
                data={inflowLine}
                stroke={colors.success}
                formatXLabel={(value) => formatBucketLabel(bucket, value)}
              />
            </ChartCard>

            <ChartCard title="Outflow trend" subtitle={`Bucketed by ${bucket}`}>
              <LineSeriesChart
                data={outflowLine}
                stroke={colors.cobalt}
                formatXLabel={(value) => formatBucketLabel(bucket, value)}
              />
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
