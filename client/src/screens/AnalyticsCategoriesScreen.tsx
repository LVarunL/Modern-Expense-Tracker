import { Ionicons } from "@expo/vector-icons";
import type { RouteProp } from "@react-navigation/native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMemo } from "react";
import {
  Pressable,
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
import { useAnalyticsCategories } from "../hooks/useAnalytics";
import { useAnalyticsRange } from "../hooks/useAnalyticsRange";
import { useUserCurrency } from "../hooks/useUserCurrency";
import type { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { splitCategoryTotals } from "../utils/analyticsChartTransforms";
import { formatCurrency, formatCurrencyValue } from "../utils/format";

type ScreenNavigation = NativeStackNavigationProp<
  RootStackParamList,
  "AnalyticsCategories"
>;

export function AnalyticsCategoriesScreen() {
  const navigation = useNavigation<ScreenNavigation>();
  const route =
    useRoute<RouteProp<RootStackParamList, "AnalyticsCategories">>();
  const { width } = useWindowDimensions();
  const isCompact = width < 360;
  const currency = useUserCurrency();

  const { range, setRange, error, resolved, label } = useAnalyticsRange(
    route.params?.range
  );
  const fromMs = resolved?.fromMs ?? 0;
  const toMs = resolved?.toMs ?? 0;

  const categoriesQuery = useAnalyticsCategories({
    from_ms: fromMs,
    to_ms: toMs,
  });
  const errorMessage = categoriesQuery.error
    ? getErrorMessage(categoriesQuery.error)
    : null;
  const hasRange = Boolean(resolved) && !error;

  const items = categoriesQuery.data?.items ?? [];
  const { outflow, inflow } = useMemo(
    () => splitCategoryTotals(items),
    [items]
  );

  const outflowMax = Math.max(...outflow.map((item) => Number(item.total)), 0);
  const inflowMax = Math.max(...inflow.map((item) => Number(item.total)), 0);

  return (
    <Screen withGradient={false}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <AppHeader
          title="Category drill-down"
          subtitle={label}
          showBack
          showAccount
        />

        <TimeRangeFilter
          value={range}
          onChange={setRange}
          compact={isCompact}
        />

        {!resolved ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Pick a time range</Text>
            <Text style={styles.stateSubtitle}>
              Select a range to explore categories.
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
            <Text style={styles.stateTitle}>Unable to load categories</Text>
            <Text style={styles.stateSubtitle}>{errorMessage}</Text>
          </View>
        ) : null}

        {hasRange ? (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Outflow categories</Text>
              {outflow.length === 0 ? (
                <Text style={styles.sectionEmpty}>No outflow categories.</Text>
              ) : (
                outflow.map((item) => {
                  const ratio = outflowMax
                    ? Number(item.total) / outflowMax
                    : 0;
                  return (
                    <Pressable
                      key={`${item.category}-outflow`}
                      style={({ pressed }) => [
                        styles.categoryRow,
                        pressed && styles.categoryRowPressed,
                      ]}
                      onPress={() =>
                        navigation.navigate("AnalyticsCategoryDetail", {
                          range,
                          category: item.category,
                          direction: item.direction,
                        })
                      }
                    >
                      <View style={styles.categoryHeader}>
                        <Text style={styles.categoryLabel}>
                          {item.category}
                        </Text>
                        <View style={styles.categoryMeta}>
                          <Text style={styles.categoryValue}>
                            {formatCurrency(
                              item.total,
                              item.direction,
                              currency
                            )}
                          </Text>
                          <Ionicons
                            name="chevron-forward"
                            size={16}
                            color={colors.steel}
                          />
                        </View>
                      </View>
                      <View style={styles.barTrack}>
                        <View
                          style={[
                            styles.barFill,
                            { width: `${Math.round(ratio * 100)}%` },
                          ]}
                        />
                      </View>
                    </Pressable>
                  );
                })
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Inflow categories</Text>
              {inflow.length === 0 ? (
                <Text style={styles.sectionEmpty}>No inflow categories.</Text>
              ) : (
                inflow.map((item) => {
                  const ratio = inflowMax ? Number(item.total) / inflowMax : 0;
                  return (
                    <Pressable
                      key={`${item.category}-inflow`}
                      style={({ pressed }) => [
                        styles.categoryRow,
                        pressed && styles.categoryRowPressed,
                      ]}
                      onPress={() =>
                        navigation.navigate("AnalyticsCategoryDetail", {
                          range,
                          category: item.category,
                          direction: item.direction,
                        })
                      }
                    >
                      <View style={styles.categoryHeader}>
                        <Text style={styles.categoryLabel}>
                          {item.category}
                        </Text>
                        <View style={styles.categoryMeta}>
                          <Text
                            style={[
                              styles.categoryValue,
                              styles.categoryValueInflow,
                            ]}
                          >
                            {formatCurrencyValue(Number(item.total), currency)}
                          </Text>
                          <Ionicons
                            name="chevron-forward"
                            size={16}
                            color={colors.steel}
                          />
                        </View>
                      </View>
                      <View style={styles.barTrack}>
                        <View
                          style={[
                            styles.barFillInflow,
                            { width: `${Math.round(ratio * 100)}%` },
                          ]}
                        />
                      </View>
                    </Pressable>
                  );
                })
              )}
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
  section: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    gap: spacing.md,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.lg,
    color: colors.ink,
  },
  sectionEmpty: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.slate,
  },
  categoryRow: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  categoryRowPressed: {
    borderColor: colors.cobalt,
  },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  categoryLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.md,
    color: colors.ink,
    flex: 1,
    minWidth: 0,
  },
  categoryMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  categoryValue: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.md,
    color: colors.cobalt,
  },
  categoryValueInflow: {
    color: colors.success,
  },
  barTrack: {
    height: 8,
    backgroundColor: "#E0E7FF",
    borderRadius: 999,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    backgroundColor: colors.cobalt,
  },
  barFillInflow: {
    height: "100%",
    backgroundColor: colors.success,
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
