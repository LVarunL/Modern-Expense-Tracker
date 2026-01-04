import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface StatPillProps {
  label: string;
  value: string;
  tone?: 'default' | 'accent';
}

export function StatPill({ label, value, tone = 'default' }: StatPillProps) {
  return (
    <View style={[styles.card, tone === 'accent' && styles.cardAccent]}>
      <Text style={[styles.label, tone === 'accent' && styles.labelAccent]}>{label}</Text>
      <Text style={[styles.value, tone === 'accent' && styles.valueAccent]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  cardAccent: {
    backgroundColor: colors.cobalt,
    borderColor: colors.cobalt,
  },
  label: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.slate,
  },
  labelAccent: {
    color: '#DCE6FF',
  },
  value: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.lg,
    color: colors.ink,
    marginTop: 6,
  },
  valueAccent: {
    color: colors.surface,
  },
});
