import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { fetchSummary, getErrorMessage } from '../api';
import type { SummaryResponse } from '../api/types';
import { GhostButton } from '../components/GhostButton';
import { Screen } from '../components/Screen';
import { StatPill } from '../components/StatPill';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { formatCurrency, formatCurrencyValue } from '../utils/format';

function getMonthParam(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function formatMonthLabel(month: string): string {
  const [year, monthValue] = month.split('-').map((part) => Number(part));
  if (!year || !monthValue) {
    return month;
  }
  return new Date(year, monthValue - 1, 1).toLocaleString('en-IN', {
    month: 'long',
    year: 'numeric',
  });
}

export function SummaryScreen() {
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const monthParam = useMemo(() => getMonthParam(), []);

  const loadSummary = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchSummary(monthParam);
      setSummary(response);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadSummary();
  }, [monthParam]);

  const categories = summary?.by_category ?? [];
  const maxValue = Math.max(...categories.map((item) => Number(item.total)), 0);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Monthly Summary</Text>
          <Text style={styles.subtitle}>{summary ? formatMonthLabel(summary.month) : 'This month'}</Text>
        </View>

        {isLoading ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Loading summary...</Text>
            <Text style={styles.stateSubtitle}>Crunching totals for this month.</Text>
          </View>
        ) : null}

        {!isLoading && error ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Unable to load summary</Text>
            <Text style={styles.stateSubtitle}>{error}</Text>
            <GhostButton label="Try again" onPress={loadSummary} />
          </View>
        ) : null}

        {!isLoading && !error && summary ? (
          <>
            <View style={styles.statsRow}>
              <StatPill label="Inflow" value={formatCurrencyValue(summary.total_inflow)} />
              <StatPill label="Outflow" value={formatCurrencyValue(summary.total_outflow)} />
            </View>
            <StatPill
              label="Net"
              value={formatCurrency(
                Math.abs(summary.net),
                summary.net >= 0 ? 'inflow' : 'outflow',
              )}
              tone="accent"
            />

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>By category</Text>
              {categories.length === 0 ? (
                <Text style={styles.sectionEmpty}>No category totals yet.</Text>
              ) : (
                categories.map((item) => {
                  const numericTotal = Math.abs(Number(item.total));
                  const ratio = maxValue ? numericTotal / maxValue : 0;
                  return (
                    <View key={`${item.category}-${item.direction}`} style={styles.categoryRow}>
                      <View style={styles.categoryHeader}>
                        <Text style={styles.categoryLabel}>{item.category}</Text>
                        <Text
                          style={[
                            styles.categoryValue,
                            item.direction === 'inflow' && styles.categoryValueInflow,
                          ]}
                        >
                          {formatCurrency(item.total, item.direction)}
                        </Text>
                      </View>
                      <View style={styles.barTrack}>
                        <View style={[styles.barFill, { width: `${Math.round(ratio * 100)}%` }]} />
                      </View>
                    </View>
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
  header: {
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
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
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
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  categoryLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.md,
    color: colors.ink,
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
    backgroundColor: '#E0E7FF',
    borderRadius: 999,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: colors.cobalt,
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
});
