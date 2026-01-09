import { Ionicons } from "@expo/vector-icons";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { CompositeNavigationProp } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { fetchTransactions, getErrorMessage } from "../api";
import type { TransactionOut } from "../api/types";
import { GhostButton } from "../components/GhostButton";
import { PageHeader } from "../components/PageHeader";
import { Screen } from "../components/Screen";
import { SelectSheet } from "../components/SelectSheet";
import {
  TRANSACTION_SORT_OPTIONS,
  TransactionSortId,
} from "../constants/sorting";
import { TRANSACTION_TYPE_LABELS } from "../constants/transactions";
import type { RootStackParamList, TabParamList } from "../navigation/types";
import { useFeedFilters } from "../state/feedFilters";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { buildFeedQueryFilters, countActiveFilters } from "../utils/filters";
import { formatCurrency, formatDateTime } from "../utils/format";

const FEED_PAGINATION_SIZE = 50;

type FeedNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;

export function FeedScreen() {
  const navigation = useNavigation<FeedNavigation>();
  const { filters, resetFilters } = useFeedFilters();
  const { width } = useWindowDimensions();
  const isCompact = width < 360;
  const listRef = useRef<FlatList<TransactionOut>>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [sortId, setSortId] = useState<TransactionSortId>(
    TRANSACTION_SORT_OPTIONS[0].id
  );
  const sortOption = useMemo(
    () =>
      TRANSACTION_SORT_OPTIONS.find((option) => option.id === sortId) ??
      TRANSACTION_SORT_OPTIONS[0],
    [sortId]
  );
  const queryFilters = useMemo(() => buildFeedQueryFilters(filters), [filters]);
  const query = useInfiniteQuery({
    queryKey: [
      "transactions",
      {
        limit: FEED_PAGINATION_SIZE,
        sort_by: sortOption.sort_by,
        sort_order: sortOption.sort_order,
        filters: queryFilters,
      },
    ],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      fetchTransactions({
        limit: FEED_PAGINATION_SIZE,
        offset: pageParam,
        sort_by: sortOption.sort_by,
        sort_order: sortOption.sort_order,
        ...queryFilters,
      }),
    getNextPageParam: (lastPage, allPages) => {
      const nextOffset = allPages.length * FEED_PAGINATION_SIZE;
      return nextOffset < lastPage.total_count ? nextOffset : undefined;
    },
  });
  const items: TransactionOut[] =
    query.data?.pages.flatMap((page) => page.items) ?? [];
  const error = query.error ? getErrorMessage(query.error) : null;
  const isLoading = query.isLoading;
  const isRefreshing = query.isRefetching && !query.isFetchingNextPage;
  const showErrorState = Boolean(error) && items.length === 0;
  const showEmptyState = !isLoading && !error && items.length === 0;
  const showFooterError = Boolean(error) && items.length > 0;
  const activeFilterCount = countActiveFilters(filters);

  return (
    <Screen>
      <FlatList
        ref={listRef}
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => {
          const title = item.category;
          const subtitle = TRANSACTION_TYPE_LABELS[item.type] ?? item.type;
          return (
            <Pressable
              style={({ pressed }) => [
                styles.card,
                pressed && styles.cardPressed,
              ]}
              onPress={() =>
                navigation.navigate("EditTransactionModal", {
                  transaction: item,
                })
              }
            >
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle}>{title}</Text>
                <View style={styles.cardTopRight}>
                  <Text
                    style={[
                      styles.amount,
                      item.direction === "inflow" && styles.amountInflow,
                    ]}
                  >
                    {formatCurrency(item.amount, item.direction)}
                  </Text>
                </View>
              </View>
              <Text style={styles.cardSubtitle}>{subtitle}</Text>
              <Text style={styles.cardMeta}>
                {formatDateTime(item.occurred_time)}
              </Text>
              <View style={styles.editIcon} pointerEvents="none">
                <Ionicons
                  name="create-outline"
                  size={14}
                  color={colors.cobalt}
                />
              </View>
            </Pressable>
          );
        }}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        onScroll={(event) => {
          const offsetY = event.nativeEvent.contentOffset.y;
          setShowScrollTop(offsetY > 320);
        }}
        scrollEventThrottle={16}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) {
            void query.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.3}
        refreshing={isRefreshing}
        onRefresh={() => query.refetch()}
        ListHeaderComponent={
          <View style={styles.headerWrapper}>
            <View
              style={[styles.headerRow, isCompact && styles.headerRowStacked]}
            >
              <View style={styles.header}>
                <PageHeader
                  title="Feed"
                  subtitle="Latest transactions across categories."
                />
              </View>
              <View
                style={[
                  styles.headerActions,
                  isCompact && styles.headerActionsStacked,
                ]}
              >
                <View style={styles.actionRow}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.iconButton,
                      pressed && styles.iconButtonPressed,
                    ]}
                    onPress={() => setIsSortOpen(true)}
                  >
                    <Ionicons
                      name="swap-vertical-outline"
                      size={18}
                      color={colors.cobalt}
                    />
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      styles.iconButton,
                      pressed && styles.iconButtonPressed,
                    ]}
                    onPress={() => navigation.navigate("FilterModal")}
                  >
                    <Ionicons
                      name="options-outline"
                      size={18}
                      color={colors.cobalt}
                    />
                  </Pressable>
                </View>
                {activeFilterCount ? (
                  <Pressable
                    style={({ pressed }) => [
                      styles.clearFiltersButton,
                      pressed && styles.clearFiltersPressed,
                    ]}
                    onPress={resetFilters}
                  >
                    <Text style={styles.clearFiltersText}>
                      Clear filters ({activeFilterCount})
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
            <SelectSheet
              visible={isSortOpen}
              title="Sort transactions"
              items={TRANSACTION_SORT_OPTIONS}
              selectedId={sortId}
              onSelect={setSortId}
              onClose={() => setIsSortOpen(false)}
            />

            {isLoading ? (
              <View style={styles.stateCard}>
                <Text style={styles.stateTitle}>Loading feed...</Text>
                <Text style={styles.stateSubtitle}>
                  Fetching your latest entries.
                </Text>
              </View>
            ) : null}

            {showErrorState ? (
              <View style={styles.stateCard}>
                <Text style={styles.stateTitle}>Unable to load feed</Text>
                <Text style={styles.stateSubtitle}>{error}</Text>
                <GhostButton
                  label="Try again"
                  onPress={() => query.refetch()}
                />
              </View>
            ) : null}

            {showEmptyState ? (
              <View style={styles.stateCard}>
                <Text style={styles.stateTitle}>No transactions yet</Text>
                <Text style={styles.stateSubtitle}>
                  Capture your first expense to see it here.
                </Text>
              </View>
            ) : null}
          </View>
        }
        ListFooterComponent={
          query.isFetchingNextPage ? (
            <View style={styles.stateCard}>
              <Text style={styles.stateTitle}>Loading more...</Text>
              <Text style={styles.stateSubtitle}>
                Pulling in additional transactions.
              </Text>
            </View>
          ) : showFooterError ? (
            <View style={styles.stateCard}>
              <Text style={styles.stateTitle}>Unable to load more</Text>
              <Text style={styles.stateSubtitle}>{error}</Text>
              <GhostButton
                label="Try again"
                onPress={() => query.fetchNextPage()}
              />
            </View>
          ) : null
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        removeClippedSubviews
        maxToRenderPerBatch={FEED_PAGINATION_SIZE}
        windowSize={7}
        initialNumToRender={0}
      />

      {showScrollTop ? (
        <Pressable
          style={({ pressed }) => [
            styles.scrollTopButton,
            pressed && styles.scrollTopButtonPressed,
          ]}
          onPress={() => listRef.current?.scrollToOffset({ offset: 0 })}
        >
          <Ionicons name="arrow-up-outline" size={20} color={colors.cobalt} />
        </Pressable>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerWrapper: {
    gap: spacing.lg,
    paddingBottom: spacing.lg,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
    flexWrap: "wrap",
  },
  headerRowStacked: {
    flexDirection: "column",
    alignItems: "flex-start",
  },
  header: {
    paddingTop: spacing.xxl,
    gap: spacing.sm,
    flex: 1,
    minWidth: 220,
  },
  headerActions: {
    alignItems: "flex-end",
    gap: spacing.xs,
  },
  headerActionsStacked: {
    alignItems: "flex-start",
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingTop: spacing.xl,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonPressed: {
    opacity: 0.85,
  },
  clearFiltersButton: {
    alignSelf: "flex-start",
  },
  clearFiltersPressed: {
    opacity: 0.7,
  },
  clearFiltersText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.cobalt,
  },
  list: {
    paddingBottom: 140,
  },
  separator: {
    height: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.divider,
    gap: spacing.xs,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  cardTopRight: {
    alignItems: "flex-end",
    gap: 4,
    maxWidth: "50%",
  },
  cardTitle: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.md,
    color: colors.ink,
    flex: 1,
    minWidth: 0,
    paddingRight: spacing.sm,
  },
  cardPressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.9,
  },
  amount: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.md,
    color: colors.danger,
  },
  amountInflow: {
    color: colors.success,
  },
  cardSubtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.slate,
  },
  cardMeta: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.xs,
    color: colors.steel,
    paddingRight: 28,
  },
  editIcon: {
    position: "absolute",
    right: spacing.md,
    bottom: spacing.md,
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  stateCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
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
  scrollTopButton: {
    position: "absolute",
    right: 20,
    bottom: 98,
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
    shadowColor: colors.ink,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  scrollTopButtonPressed: {
    opacity: 0.85,
  },
});
