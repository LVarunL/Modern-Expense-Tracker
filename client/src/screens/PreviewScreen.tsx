import type { RouteProp } from "@react-navigation/native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Animated, ScrollView, StyleSheet, Text, View } from "react-native";

import { confirmEntry, getErrorMessage } from "../api";
import type { ConfirmRequest } from "../api/types";
import {
  EditableTransactionCard,
  type EditableTransaction,
} from "../components/EditableTransactionCard";
import { GhostButton } from "../components/GhostButton";
import { PageHeader } from "../components/PageHeader";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import {
  TRANSACTION_CATEGORIES,
  TRANSACTION_TYPES,
  TRANSACTION_TYPE_LABELS,
  TYPE_CATEGORY_MAP,
  TYPE_DIRECTION_MAP,
} from "../constants/transactions";
import type { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useEntranceAnimation } from "../utils/animations";
import { parseAmount } from "../utils/format";

export function PreviewScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "PreviewModal">>();
  const { preview, rawText } = route.params;
  const animation = useEntranceAnimation(20);
  const queryClient = useQueryClient();

  const [draftTransactions, setDraftTransactions] = useState<
    EditableTransaction[]
  >(() =>
    preview.transactions.map((transaction, index) => ({
      id: `tx-${index}`,
      amountInput: String(transaction.amount),
      currency: transaction.currency ?? "INR",
      direction: transaction.direction,
      type: transaction.type,
      category: transaction.category,
      assumptions: transaction.assumptions ?? [],
      isDeleted: false,
    }))
  );
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const occurredAtLabel = preview.occurred_time
    ? new Date(preview.occurred_time).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "No date captured";

  const amountErrors = draftTransactions.map((item) => {
    if (item.isDeleted) {
      return null;
    }
    const parsed = parseAmount(item.amountInput);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return "Enter a valid amount.";
    }
    return null;
  });

  const activeTransactions = draftTransactions.filter(
    (item) => !item.isDeleted
  );
  const hasInvalidAmounts = amountErrors.some((error) => Boolean(error));
  const canConfirm =
    activeTransactions.length > 0 && !hasInvalidAmounts && !isConfirming;

  const updateTransaction = (
    id: string,
    updates: Partial<EditableTransaction>
  ) => {
    setDraftTransactions((prev) =>
      prev.map((item) => {
        if (item.id !== id) {
          return item;
        }
        const next = { ...item, ...updates };
        if (updates.type) {
          next.direction = TYPE_DIRECTION_MAP[updates.type];
          const mappedCategory = TYPE_CATEGORY_MAP[updates.type];
          if (mappedCategory) {
            next.category = mappedCategory;
          }
        }
        return next;
      })
    );
  };

  const handleConfirm = async () => {
    if (!canConfirm) {
      setConfirmError("Fix the highlighted amounts before confirming.");
      return;
    }

    setIsConfirming(true);
    setConfirmError(null);

    try {
      const occurredAt = preview.occurred_time ?? new Date().toISOString();
      const payload: ConfirmRequest = {
        entry_id: preview.entry_id,
        transactions: activeTransactions.map((item) => ({
          occurred_time: occurredAt,
          amount: parseAmount(item.amountInput),
          currency: item.currency ?? "INR",
          direction: item.direction,
          type: item.type,
          category: item.category,
          assumptions: item.assumptions ?? [],
        })),
      };
      await confirmEntry(payload);
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
      await queryClient.invalidateQueries({ queryKey: ["summary"] });
      navigation.goBack();
    } catch (error) {
      setConfirmError(getErrorMessage(error));
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <Screen withGradient={false}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{
            opacity: animation.opacity,
            transform: [{ translateY: animation.translateY }],
          }}
        >
          <PageHeader
            title="Preview & Confirm"
            subtitle={preview.entry_summary ?? rawText}
            meta={occurredAtLabel}
          />
        </Animated.View>

        {preview.assumptions.length ? (
          <View style={styles.assumptionsCard}>
            <Text style={styles.assumptionsLabel}>Assumptions</Text>
            {preview.assumptions.map((assumption, index) => (
              <Text key={`assumption-${index}`} style={styles.assumptionsText}>
                - {assumption}
              </Text>
            ))}
          </View>
        ) : null}

        <View style={styles.list}>
          {draftTransactions.length ? (
            draftTransactions.map((item, index) => (
              <EditableTransactionCard
                key={item.id}
                index={index}
                item={item}
                categories={TRANSACTION_CATEGORIES}
                types={TRANSACTION_TYPES}
                typeLabels={TRANSACTION_TYPE_LABELS}
                amountError={amountErrors[index] ?? undefined}
                onUpdate={(updates) => updateTransaction(item.id, updates)}
                onRemove={() => updateTransaction(item.id, { isDeleted: true })}
                onRestore={() =>
                  updateTransaction(item.id, { isDeleted: false })
                }
              />
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>
                No transactions extracted yet.
              </Text>
              <Text style={styles.emptySubtitle}>
                Edit your input and try parsing again.
              </Text>
            </View>
          )}
        </View>

        {confirmError ? (
          <Text style={styles.errorText}>{confirmError}</Text>
        ) : null}

        <View style={styles.actions}>
          <PrimaryButton
            label={isConfirming ? "Saving..." : "Confirm & Save"}
            onPress={handleConfirm}
            disabled={!canConfirm}
          />
          <GhostButton label="Cancel" onPress={() => navigation.goBack()} />
        </View>
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
  assumptionsCard: {
    backgroundColor: "#F8F6EE",
    borderRadius: 18,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  assumptionsLabel: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.slate,
  },
  assumptionsText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.slate,
  },
  list: {
    gap: spacing.lg,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    gap: spacing.xs,
  },
  emptyTitle: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.md,
    color: colors.ink,
  },
  emptySubtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.slate,
  },
  errorText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.danger,
  },
  actions: {
    gap: spacing.sm,
  },
});
