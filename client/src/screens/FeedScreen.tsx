import { Ionicons } from "@expo/vector-icons";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { CompositeNavigationProp } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { fetchTransactions, getErrorMessage } from "../api";
import type { TransactionOut } from "../api/types";
import { ChoiceChips } from "../components/ChoiceChips";
import { GhostButton } from "../components/GhostButton";
import { Screen } from "../components/Screen";
import {
  TRANSACTION_SORT_OPTIONS,
  TransactionSortId,
} from "../constants/sorting";
import { TRANSACTION_TYPE_LABELS } from "../constants/transactions";
import type { RootStackParamList, TabParamList } from "../navigation/types";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { formatCurrency, formatDateTime } from "../utils/format";

const FEED_PAGINATION_SIZE = 50;

type FeedNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;

export function FeedScreen() {
  const navigation = useNavigation<FeedNavigation>();
  const [sortId, setSortId] = useState<TransactionSortId>(
    TRANSACTION_SORT_OPTIONS[0].id
  );
  const sortOption = useMemo(
    () =>
      TRANSACTION_SORT_OPTIONS.find((option) => option.id === sortId) ??
      TRANSACTION_SORT_OPTIONS[0],
    [sortId]
  );
  const query = useInfiniteQuery({
    queryKey: [
      "transactions",
      {
        limit: FEED_PAGINATION_SIZE,
        sort_by: sortOption.sort_by,
        sort_order: sortOption.sort_order,
      },
    ],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      fetchTransactions({
        limit: FEED_PAGINATION_SIZE,
        offset: pageParam,
        sort_by: sortOption.sort_by,
        sort_order: sortOption.sort_order,
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

  return (
    <Screen>
      <FlatList
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
                  <Text style={styles.editHint}>Edit</Text>
                </View>
              </View>
              <Text style={styles.cardSubtitle}>{subtitle}</Text>
              <Text style={styles.cardMeta}>
                {formatDateTime(item.occurred_time)}
              </Text>
            </Pressable>
          );
        }}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={true}
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
            <View style={styles.header}>
              <Text style={styles.title}>Feed</Text>
              <Text style={styles.subtitle}>
                Latest transactions across categories.
              </Text>
            </View>
            <ChoiceChips
              label="Sort by"
              items={TRANSACTION_SORT_OPTIONS}
              selectedId={sortId}
              onSelect={setSortId}
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

      <Pressable
        style={styles.fab}
        onPress={() => navigation.navigate("Capture")}
      >
        <Ionicons name="add" size={26} color={colors.ink} />
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerWrapper: {
    gap: spacing.lg,
    paddingBottom: spacing.lg,
  },
  header: {
    paddingTop: spacing.xxl,
    gap: spacing.sm,
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.display,
    color: colors.ink,
  },
  subtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.md,
    color: colors.slate,
  },
  list: {
    paddingBottom: 140,
  },
  separator: {
    height: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    gap: spacing.sm,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardTopRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  cardTitle: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.lg,
    color: colors.ink,
  },
  cardPressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.9,
  },
  amount: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.lg,
    color: colors.danger,
  },
  amountInflow: {
    color: colors.success,
  },
  cardSubtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.slate,
  },
  cardMeta: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.steel,
  },
  editHint: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.xs,
    color: colors.cobalt,
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
  fab: {
    position: "absolute",
    right: 20,
    bottom: 26,
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.citrus,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.ink,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
});
