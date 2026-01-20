import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import DraggableFlatList, {
  ScaleDecorator,
  type RenderItemParams,
} from "react-native-draggable-flatlist";

import { getErrorMessage } from "../api";
import { AppHeader } from "../components/AppHeader";
import { Screen } from "../components/Screen";
import { StatPill } from "../components/StatPill";
import { TimeRangeFilter } from "../components/TimeRangeFilter";
import {
  BarChart,
  ChartCard,
  ChartLegend,
  DonutChart,
  LineSeriesChart,
} from "../components/charts";
import { TRANSACTION_TYPE_LABELS } from "../constants/transactions";
import {
  useAnalyticsCategories,
  useAnalyticsSeries,
  useAnalyticsSummary,
  useAnalyticsTypes,
} from "../hooks/useAnalytics";
import { useAnalyticsRange } from "../hooks/useAnalyticsRange";
import type { RootStackParamList } from "../navigation/types";
import {
  DEFAULT_ANALYTICS_ORDER,
  loadAnalyticsLayout,
  saveAnalyticsLayout,
  type AnalyticsCardId,
  type AnalyticsLayout,
} from "../state/analyticsLayout";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import {
  buildBarPoints,
  buildCashflowBars,
  buildDonutSegments,
  buildLineSeriesData,
  splitCategoryTotals,
  splitTypeTotals,
} from "../utils/analyticsChartTransforms";
import { formatBucketLabel } from "../utils/analyticsRange";
import { formatCurrency, formatCurrencyValue } from "../utils/format";

const DONUT_COLORS = [
  colors.cobalt,
  "#0EA5E9",
  "#F97316",
  "#16A34A",
  colors.steel,
];

const CARD_LABELS: Record<AnalyticsCardId, string> = {
  trend: "Spending trend",
  categories: "Outflow categories",
  types: "Type split",
  cashflow: "Cashflow",
};

export function AnalyticsHomeScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { width } = useWindowDimensions();
  const isCompact = width < 360;
  const [layout, setLayout] = useState<AnalyticsLayout>({
    order: DEFAULT_ANALYTICS_ORDER,
    hidden: [],
  });
  const [layoutReady, setLayoutReady] = useState(false);
  const [isEditingLayout, setIsEditingLayout] = useState(false);

  const { range, setRange, error, resolved, bucket, label, tz } =
    useAnalyticsRange();
  const fromMs = resolved?.fromMs ?? 0;
  const toMs = resolved?.toMs ?? 0;

  const summaryQuery = useAnalyticsSummary({ from_ms: fromMs, to_ms: toMs });
  const seriesQuery = useAnalyticsSeries({
    from_ms: fromMs,
    to_ms: toMs,
    bucket,
    tz,
    direction: "outflow",
  });
  const categoriesQuery = useAnalyticsCategories({
    from_ms: fromMs,
    to_ms: toMs,
  });
  const typesQuery = useAnalyticsTypes({
    from_ms: fromMs,
    to_ms: toMs,
  });

  const summary = summaryQuery.data ?? null;
  const loadError =
    summaryQuery.error ??
    seriesQuery.error ??
    categoriesQuery.error ??
    typesQuery.error;
  const errorMessage = loadError ? getErrorMessage(loadError) : null;
  const netValue = summary?.net ?? 0;
  const netDirection = netValue >= 0 ? "inflow" : "outflow";
  const hasRange = Boolean(resolved) && !error;
  const seriesItems = seriesQuery.data?.items ?? [];
  const lineData = useMemo(
    () => buildLineSeriesData(seriesItems),
    [seriesItems]
  );

  const categoryItems = categoriesQuery.data?.items ?? [];
  const { outflow: outflowCategories } = useMemo(
    () => splitCategoryTotals(categoryItems),
    [categoryItems]
  );

  const { segments: donutSegments, total: donutTotal } = useMemo(
    () => buildDonutSegments(outflowCategories, DONUT_COLORS, 4),
    [outflowCategories]
  );

  const typePalette = [colors.cobalt, colors.citrus, "#0EA5E9", "#F97316"];
  const typeItems = typesQuery.data?.items ?? [];
  const { outflow: outflowTypes } = useMemo(
    () => splitTypeTotals(typeItems),
    [typeItems]
  );
  const topOutflowTypes = useMemo(
    () => outflowTypes.slice(0, 4),
    [outflowTypes]
  );
  const typeBars = useMemo(
    () => buildBarPoints(topOutflowTypes, typePalette),
    [topOutflowTypes]
  );
  const typeLegend = useMemo(
    () =>
      topOutflowTypes.map((item, index) => ({
        label: TRANSACTION_TYPE_LABELS[item.type] ?? item.type,
        value: formatCurrencyValue(Number(item.total)),
        color: typePalette[index % typePalette.length],
      })),
    [topOutflowTypes]
  );

  useEffect(() => {
    let mounted = true;
    loadAnalyticsLayout(DEFAULT_ANALYTICS_ORDER).then((value) => {
      if (mounted) {
        setLayout(value);
        setLayoutReady(true);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!layoutReady) {
      return;
    }
    saveAnalyticsLayout(layout);
  }, [layout, layoutReady]);

  const visibleCards = useMemo(
    () => layout.order.filter((id) => !layout.hidden.includes(id)),
    [layout.hidden, layout.order]
  );

  const toggleHidden = (id: AnalyticsCardId) => {
    setLayout((prev) => {
      const hidden = new Set(prev.hidden);
      if (hidden.has(id)) {
        hidden.delete(id);
      } else {
        hidden.add(id);
      }
      return { ...prev, hidden: Array.from(hidden) };
    });
  };

  const renderCard = (id: AnalyticsCardId) => {
    switch (id) {
      case "trend":
        return (
          <ChartCard
            key={id}
            title="Spending trend"
            subtitle={`Bucketed by ${bucket}`}
          >
            <LineSeriesChart
              data={lineData}
              formatXLabel={(value) => formatBucketLabel(bucket, value)}
            />
          </ChartCard>
        );
      case "categories":
        return (
          <ChartCard
            key={id}
            title="Outflow categories"
            subtitle="Top categories in this range"
            actionLabel="View"
            onPress={() =>
              navigation.navigate("AnalyticsCategories", { range })
            }
          >
            <View style={styles.donutRow}>
              <DonutChart
                data={donutSegments}
                centerValue={formatCurrencyValue(donutTotal)}
                centerLabel="Total outflow"
                size={150}
                onSegmentPress={(segment) => {
                  if (!segment.label) {
                    return;
                  }
                  if (segment.label === "Other") {
                    navigation.navigate("AnalyticsCategories", { range });
                    return;
                  }
                  navigation.navigate("AnalyticsCategoryDetail", {
                    range,
                    category: segment.label,
                    direction: "outflow",
                  });
                }}
              />
              <View style={styles.legend}>
                <ChartLegend items={donutLegend} />
              </View>
            </View>
          </ChartCard>
        );
      case "types":
        return (
          <ChartCard
            key={id}
            title="Type split"
            subtitle="Top outflow types"
            actionLabel="View"
            onPress={() => navigation.navigate("AnalyticsTypes", { range })}
          >
            <BarChart data={typeBars} height={140} />
            <ChartLegend items={typeLegend} />
          </ChartCard>
        );
      case "cashflow":
        return (
          <ChartCard
            key={id}
            title="Cashflow"
            actionLabel="View"
            onPress={() => navigation.navigate("AnalyticsCashflow", { range })}
          >
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
        );
      default:
        return null;
    }
  };

  const renderLayoutRow = ({
    item,
    drag,
    isActive,
  }: RenderItemParams<AnalyticsCardId>) => {
    const isHidden = layout.hidden.includes(item);
    return (
      <ScaleDecorator>
        <View
          style={[
            styles.layoutRow,
            isActive && styles.layoutRowActive,
            isHidden && styles.layoutRowHidden,
          ]}
        >
          <Pressable
            onLongPress={drag}
            style={({ pressed }) => [
              styles.layoutHandle,
              pressed && styles.layoutHandlePressed,
            ]}
          >
            <Ionicons name="reorder-three" size={18} color={colors.steel} />
          </Pressable>
          <Text
            style={[styles.layoutLabel, isHidden && styles.layoutLabelMuted]}
          >
            {CARD_LABELS[item]}
          </Text>
          <Pressable
            onPress={() => toggleHidden(item)}
            style={({ pressed }) => [
              styles.layoutIconButton,
              pressed && styles.layoutIconButtonPressed,
            ]}
          >
            <Ionicons
              name={isHidden ? "eye" : "eye-off"}
              size={16}
              color={isHidden ? colors.cobalt : colors.steel}
            />
          </Pressable>
        </View>
      </ScaleDecorator>
    );
  };

  const donutLegend = useMemo(
    () =>
      donutSegments.map((segment) => ({
        label: segment.label ?? "Other",
        value: formatCurrencyValue(segment.value),
        color: segment.color,
      })),
    [donutSegments]
  );

  const cashflowBars = useMemo(
    () =>
      buildCashflowBars(summary, {
        inflow: colors.success,
        outflow: colors.cobalt,
      }),
    [summary]
  );

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <AppHeader title="Analytics" subtitle={label} showAccount />

        <TimeRangeFilter
          value={range}
          onChange={setRange}
          compact={isCompact}
        />

        <View style={styles.layoutCard}>
          <View style={styles.layoutHeader}>
            <Text style={styles.layoutTitle}>Layout</Text>
            <Pressable
              onPress={() => setIsEditingLayout((prev) => !prev)}
              style={({ pressed }) => [
                styles.layoutAction,
                pressed && styles.layoutActionPressed,
              ]}
            >
              <Text style={styles.layoutActionText}>
                {isEditingLayout ? "Done" : "Edit"}
              </Text>
            </Pressable>
          </View>
          {isEditingLayout ? (
            <View style={styles.layoutList}>
              <DraggableFlatList
                data={layout.order}
                keyExtractor={(item) => item}
                onDragEnd={({ data }) =>
                  setLayout((prev) => ({ ...prev, order: data }))
                }
                renderItem={renderLayoutRow}
                scrollEnabled={false}
              />
              <Text style={styles.layoutHint}>
                Drag the handle to reorder. Tap the eye to hide or restore a
                card.
              </Text>
            </View>
          ) : layout.hidden.length ? (
            <Text style={styles.layoutHint}>
              Hidden: {layout.hidden.map((id) => CARD_LABELS[id]).join(", ")}
            </Text>
          ) : (
            <Text style={styles.layoutHint}>
              Reorder or hide cards to personalize analytics.
            </Text>
          )}
        </View>

        {!resolved ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Pick a time range</Text>
            <Text style={styles.stateSubtitle}>
              Select a range to see analytics insights.
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
            <Text style={styles.stateTitle}>Unable to load analytics</Text>
            <Text style={styles.stateSubtitle}>{errorMessage}</Text>
          </View>
        ) : null}

        {hasRange ? (
          <>
            <View
              style={[styles.statsRow, isCompact && styles.statsRowStacked]}
            >
              <StatPill
                label="Inflow"
                value={formatCurrencyValue(summary?.total_inflow ?? 0)}
              />
              <StatPill
                label="Outflow"
                value={formatCurrencyValue(summary?.total_outflow ?? 0)}
              />
            </View>
            <StatPill
              label="Net"
              value={formatCurrency(Math.abs(netValue), netDirection)}
              tone="accent"
            />

            {visibleCards.map((id) => renderCard(id))}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Deep dives</Text>
              <Pressable
                style={({ pressed }) => [
                  styles.actionRow,
                  pressed && styles.actionRowPressed,
                ]}
                onPress={() =>
                  navigation.navigate("AnalyticsCategories", { range })
                }
              >
                <Text style={styles.actionText}>Category drill-down</Text>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.steel}
                />
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.actionRow,
                  pressed && styles.actionRowPressed,
                ]}
                onPress={() => navigation.navigate("AnalyticsTypes", { range })}
              >
                <Text style={styles.actionText}>Type split</Text>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.steel}
                />
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.actionRow,
                  pressed && styles.actionRowPressed,
                ]}
                onPress={() =>
                  navigation.navigate("AnalyticsCashflow", { range })
                }
              >
                <Text style={styles.actionText}>Inflow vs outflow</Text>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.steel}
                />
              </Pressable>
            </View>
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
  donutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
  },
  legend: {
    flex: 1,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    gap: spacing.sm,
  },
  layoutCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    gap: spacing.sm,
  },
  layoutHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  layoutTitle: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.md,
    color: colors.ink,
  },
  layoutAction: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  layoutActionPressed: {
    borderColor: colors.cobalt,
  },
  layoutActionText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.xs,
    color: colors.steel,
  },
  layoutList: {
    gap: spacing.sm,
  },
  layoutRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    borderRadius: 12,
  },
  layoutRowActive: {
    backgroundColor: "#EEF2FF",
  },
  layoutRowHidden: {
    opacity: 0.7,
  },
  layoutHandle: {
    width: 30,
    height: 30,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.divider,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  layoutHandlePressed: {
    borderColor: colors.cobalt,
  },
  layoutLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.ink,
    flex: 1,
  },
  layoutLabelMuted: {
    color: colors.steel,
    textDecorationLine: "line-through",
  },
  layoutIconButton: {
    width: 30,
    height: 30,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.divider,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  layoutIconButtonPressed: {
    borderColor: colors.cobalt,
  },
  layoutIconButtonDisabled: {
    opacity: 0.4,
  },
  layoutHint: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.steel,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.lg,
    color: colors.ink,
  },
  actionRow: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.divider,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.background,
  },
  actionRowPressed: {
    borderColor: colors.cobalt,
  },
  actionText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.md,
    color: colors.ink,
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
