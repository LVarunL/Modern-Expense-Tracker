import type { RouteProp } from "@react-navigation/native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Animated, ScrollView, StyleSheet, Text, View } from "react-native";

import { getErrorMessage, updateTransaction } from "../api";
import {
  EditableTransactionCard,
  type EditableTransaction,
} from "../components/EditableTransactionCard";
import { GhostButton } from "../components/GhostButton";
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
import { formatDateTime, parseAmount } from "../utils/format";

export function EditTransactionScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route =
    useRoute<RouteProp<RootStackParamList, "EditTransactionModal">>();
  const { transaction } = route.params;
  const animation = useEntranceAnimation(18);
  const queryClient = useQueryClient();

  const [draft, setDraft] = useState<EditableTransaction>(() => ({
    id: `edit-${transaction.id}`,
    amountInput: String(transaction.amount),
    currency: transaction.currency ?? "INR",
    direction: transaction.direction,
    type: transaction.type,
    category: transaction.category,
    assumptions: Array.isArray(transaction.assumptions_json)
      ? transaction.assumptions_json
      : [],
    isDeleted: false,
  }));
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const amountError = (() => {
    const parsed = parseAmount(draft.amountInput);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return "Enter a valid amount.";
    }
    return null;
  })();

  const currencyError =
    draft.currency.trim().length === 3 ? null : "Use a 3-letter currency code.";

  const canSave = !amountError && !currencyError && !isSaving;

  const updateDraft = (updates: Partial<EditableTransaction>) => {
    setDraft((prev) => {
      const next = { ...prev, ...updates };
      if (updates.type) {
        next.direction = TYPE_DIRECTION_MAP[updates.type];
        const mappedCategory = TYPE_CATEGORY_MAP[updates.type];
        if (mappedCategory) {
          next.category = mappedCategory;
        }
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!canSave) {
      setSaveError("Fix the highlighted fields before saving.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      await updateTransaction(transaction.id, {
        amount: parseAmount(draft.amountInput),
        currency: draft.currency.trim().toUpperCase(),
        direction: draft.direction,
        type: draft.type,
        category: draft.category,
      });
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
      await queryClient.invalidateQueries({ queryKey: ["summary"] });
      navigation.goBack();
    } catch (error) {
      setSaveError(getErrorMessage(error));
    } finally {
      setIsSaving(false);
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
          <Text style={styles.title}>Edit transaction</Text>
          <Text style={styles.subtitle}>{transaction.category}</Text>
          <Text style={styles.meta}>
            {formatDateTime(transaction.occurred_time)}
          </Text>
        </Animated.View>

        <EditableTransactionCard
          index={0}
          title="Details"
          item={draft}
          categories={TRANSACTION_CATEGORIES}
          types={TRANSACTION_TYPES}
          typeLabels={TRANSACTION_TYPE_LABELS}
          amountError={amountError ?? undefined}
          onUpdate={updateDraft}
          onRemove={() => {}}
          onRestore={() => {}}
          allowRemove={false}
          showCurrency
        />

        {currencyError ? (
          <Text style={styles.errorText}>{currencyError}</Text>
        ) : null}
        {saveError ? <Text style={styles.errorText}>{saveError}</Text> : null}

        <View style={styles.actions}>
          <PrimaryButton
            label={isSaving ? "Saving..." : "Save changes"}
            onPress={handleSave}
            disabled={!canSave}
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
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.xxl,
    color: colors.ink,
  },
  subtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.md,
    color: colors.slate,
    marginTop: spacing.sm,
    lineHeight: typography.lineHeight.relaxed,
  },
  meta: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.steel,
    marginTop: spacing.xs,
  },
  actions: {
    gap: spacing.sm,
  },
  errorText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.danger,
  },
});
