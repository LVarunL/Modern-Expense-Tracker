import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { fetchTransactions, getErrorMessage } from '../api';
import type { TransactionOut } from '../api/types';
import { GhostButton } from '../components/GhostButton';
import { Screen } from '../components/Screen';
import { TRANSACTION_TYPE_LABELS } from '../constants/transactions';
import type { RootStackParamList, TabParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { formatCurrency, formatDateTime } from '../utils/format';

const FEED_LIMIT = 50;

type FeedNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;

export function FeedScreen() {
  const navigation = useNavigation<FeedNavigation>();
  const [items, setItems] = useState<TransactionOut[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTransactions = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchTransactions({ limit: FEED_LIMIT, offset: 0 });
      setItems(response.items);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      void loadTransactions();
    }, []),
  );

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Feed</Text>
        <Text style={styles.subtitle}>Latest transactions across categories.</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Loading feed...</Text>
            <Text style={styles.stateSubtitle}>Fetching your latest entries.</Text>
          </View>
        ) : null}

        {!isLoading && error ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Unable to load feed</Text>
            <Text style={styles.stateSubtitle}>{error}</Text>
            <GhostButton label="Try again" onPress={loadTransactions} />
          </View>
        ) : null}

        {!isLoading && !error && items.length === 0 ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>No transactions yet</Text>
            <Text style={styles.stateSubtitle}>Capture your first expense to see it here.</Text>
          </View>
        ) : null}

        {!isLoading && !error
          ? items.map((item) => {
              const title = item.category;
              const subtitle = TRANSACTION_TYPE_LABELS[item.type] ?? item.type;
              return (
                <Pressable
                  key={item.id}
                  style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                  onPress={() =>
                    navigation.navigate('EditTransactionModal', { transaction: item })
                  }
                >
                  <View style={styles.cardTop}>
                    <Text style={styles.cardTitle}>{title}</Text>
                    <View style={styles.cardTopRight}>
                      <Text
                        style={[
                          styles.amount,
                          item.direction === 'inflow' && styles.amountInflow,
                        ]}
                      >
                        {formatCurrency(item.amount, item.direction)}
                      </Text>
                      <Text style={styles.editHint}>Edit</Text>
                    </View>
                  </View>
                  <Text style={styles.cardSubtitle}>{subtitle}</Text>
                  <Text style={styles.cardMeta}>{formatDateTime(item.occurred_time)}</Text>
                </Pressable>
              );
            })
          : null}
      </ScrollView>

      <Pressable style={styles.fab} onPress={() => navigation.navigate('Capture')}>
        <Ionicons name="add" size={26} color={colors.ink} />
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
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
    gap: spacing.lg,
    paddingBottom: 120,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTopRight: {
    alignItems: 'flex-end',
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
    position: 'absolute',
    right: 20,
    bottom: 26,
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.citrus,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.ink,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
});
