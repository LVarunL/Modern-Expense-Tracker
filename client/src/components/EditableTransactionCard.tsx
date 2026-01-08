import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { TransactionDirection, TransactionType } from '../api/types';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { sanitizeAmountInput } from '../utils/format';

export interface EditableTransaction {
  id: string;
  amountInput: string;
  currency: string;
  direction: TransactionDirection;
  type: TransactionType;
  category: string;
  assumptions: string[];
  isDeleted: boolean;
}

interface EditableTransactionCardProps {
  index: number;
  item: EditableTransaction;
  categories: string[];
  types: TransactionType[];
  typeLabels: Record<TransactionType, string>;
  amountError?: string;
  onUpdate: (updates: Partial<EditableTransaction>) => void;
  onRemove: () => void;
  onRestore: () => void;
  allowRemove?: boolean;
  showCurrency?: boolean;
  title?: string;
}

export function EditableTransactionCard({
  index,
  item,
  categories,
  types,
  typeLabels,
  amountError,
  onUpdate,
  onRemove,
  onRestore,
  allowRemove = true,
  showCurrency = false,
  title,
}: EditableTransactionCardProps) {
  const headerTitle = title ?? `Transaction ${index + 1}`;

  return (
    <View style={[styles.card, item.isDeleted && styles.cardDeleted]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{headerTitle}</Text>
        {allowRemove ? (
          <Pressable
            onPress={item.isDeleted ? onRestore : onRemove}
            style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
          >
            <Text style={[styles.actionText, item.isDeleted && styles.restoreText]}>
              {item.isDeleted ? 'Undo' : 'Remove'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {item.isDeleted ? (
        <Text style={styles.deletedText}>Removed from this entry.</Text>
      ) : (
        <>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Amount</Text>
            <View style={[styles.amountInput, amountError && styles.amountInputError]}>
              <Text style={styles.currency}>₹</Text>
              <TextInput
                value={item.amountInput}
                onChangeText={(value) => onUpdate({ amountInput: sanitizeAmountInput(value) })}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.steel}
                style={styles.amountText}
              />
            </View>
          </View>
          {amountError ? <Text style={styles.errorText}>{amountError}</Text> : null}

          {showCurrency ? (
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Currency</Text>
              <View style={styles.textInput}>
                <TextInput
                  value={item.currency}
                  onChangeText={(value) =>
                    onUpdate({
                      currency: value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3),
                    })
                  }
                  autoCapitalize="characters"
                  placeholder="INR"
                  placeholderTextColor={colors.steel}
                  style={styles.amountText}
                  maxLength={3}
                />
              </View>
            </View>
          ) : null}

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Category</Text>
            <View style={styles.chipWrap}>
              {categories.map((category) => (
                <Pressable
                  key={category}
                  onPress={() => onUpdate({ category })}
                  style={({ pressed }) => [
                    styles.chip,
                    category === item.category && styles.chipSelected,
                    pressed && styles.chipPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      category === item.category && styles.chipTextSelected,
                    ]}
                  >
                    {category}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Type</Text>
            <View style={styles.chipWrap}>
              {types.map((type) => (
                <Pressable
                  key={type}
                  onPress={() => onUpdate({ type })}
                  style={({ pressed }) => [
                    styles.chip,
                    type === item.type && styles.chipSelected,
                    pressed && styles.chipPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      type === item.type && styles.chipTextSelected,
                    ]}
                  >
                    {typeLabels[type]}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {item.assumptions.length ? (
            <View style={styles.assumptions}>
              <Text style={styles.assumptionsTitle}>Assumptions</Text>
              {item.assumptions.map((assumption, idx) => (
                <Text key={`${item.id}-assumption-${idx}`} style={styles.assumptionText}>
                  - {assumption}
                </Text>
              ))}
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    gap: spacing.sm,
  },
  cardDeleted: {
    opacity: 0.6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.md,
    color: colors.ink,
  },
  action: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  actionPressed: {
    opacity: 0.7,
  },
  actionText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.danger,
  },
  restoreText: {
    color: colors.cobalt,
  },
  deletedText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.slate,
  },
  fieldRow: {
    gap: spacing.xs,
  },
  fieldLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.slate,
  },
  amountInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
  },
  amountInputError: {
    borderColor: colors.danger,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
  },
  currency: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.md,
    color: colors.ink,
    marginRight: 6,
  },
  amountText: {
    flex: 1,
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.md,
    color: colors.ink,
  },
  errorText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.danger,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.divider,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    borderColor: colors.cobalt,
    backgroundColor: '#E0E7FF',
  },
  chipPressed: {
    opacity: 0.8,
  },
  chipText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.slate,
  },
  chipTextSelected: {
    color: colors.cobalt,
  },
  assumptions: {
    backgroundColor: '#F8F6EE',
    borderRadius: 12,
    padding: spacing.sm,
  },
  assumptionsTitle: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.slate,
    marginBottom: spacing.xs,
  },
  assumptionText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.slate,
  },
});
