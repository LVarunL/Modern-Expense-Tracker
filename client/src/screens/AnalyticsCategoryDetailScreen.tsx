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
import { StatPill } from "../components/StatPill";
import { TimeRangeFilter } from "../components/TimeRangeFilter";
import { ChartCard, LineSeriesChart } from "../components/charts";
import { useAnalyticsSeries, useAnalyticsSummary } from "../hooks/useAnalytics";
import { useAnalyticsRange } from "../hooks/useAnalyticsRange";
import type { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import {
  buildLineSeriesData,
  totalByDirection,
} from "../utils/analyticsChartTransforms";
import { formatBucketLabel } from "../utils/analyticsRange";
import { formatCurrency, formatCurrencyValue } from "../utils/format";

export function AnalyticsCategoryDetailScreen() {
  const route =
    useRoute<RouteProp<RootStackParamList, "AnalyticsCategoryDetail">>();
  const { width } = useWindowDimensions();
  const isCompact = width < 360;

  const { category, direction } = route.params;
  const { range, setRange, error, resolved, bucket, label, tz } =
    useAnalyticsRange(route.params.range);

  const fromMs = resolved?.fromMs ?? 0;
  const toMs = resolved?.toMs ?? 0;

  const summaryQuery = useAnalyticsSummary({
    from_ms: fromMs,
    to_ms: toMs,
    direction,
    category: [category],
  });

  const seriesQuery = useAnalyticsSeries({
    from_ms: fromMs,
    to_ms: toMs,
    bucket,
    tz,
    direction,
    category: [category],
  });

  const seriesItems = seriesQuery.data?.items ?? [];
  const lineData = useMemo(
    () => buildLineSeriesData(seriesItems),
    [seriesItems]
  );

  const summary = summaryQuery.data;
  const loadError = summaryQuery.error ?? seriesQuery.error;
  const errorMessage = loadError ? getErrorMessage(loadError) : null;
  const totalForDirection = totalByDirection(summary, direction);
  const netValue = summary?.net ?? 0;
  const netDirection = netValue >= 0 ? "inflow" : "outflow";
  const hasRange = Boolean(resolved) && !error;

  return (
    <Screen withGradient={false}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <AppHeader title={category} subtitle={label} showBack showAccount />

        <TimeRangeFilter
          value={range}
          onChange={setRange}
          compact={isCompact}
        />

        {!resolved ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Pick a time range</Text>
            <Text style={styles.stateSubtitle}>
              Select a range to explore this category.
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
            <Text style={styles.stateTitle}>Unable to load category</Text>
            <Text style={styles.stateSubtitle}>{errorMessage}</Text>
          </View>
        ) : null}

        {hasRange ? (
          <>
            <View
              style={[styles.statsRow, isCompact && styles.statsRowStacked]}
            >
              <StatPill
                label="Total"
                value={formatCurrencyValue(totalForDirection)}
              />
              <StatPill
                label="Transactions"
                value={`${summary?.transaction_count ?? 0}`}
              />
            </View>
            <StatPill
              label="Net"
              value={formatCurrency(Math.abs(netValue), netDirection)}
              tone="accent"
            />

            <ChartCard
              title={`${direction === "inflow" ? "Inflow" : "Outflow"} trend`}
              subtitle={`Bucketed by ${bucket}`}
            >
              <LineSeriesChart
                data={lineData}
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
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  statsRowStacked: {
    flexDirection: "column",
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
