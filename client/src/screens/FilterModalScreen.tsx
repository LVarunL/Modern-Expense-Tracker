import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";

import { ChoiceChips } from "../components/ChoiceChips";
import { GhostButton } from "../components/GhostButton";
import { MultiSelectChips } from "../components/MultiSelectChips";
import { PageHeader } from "../components/PageHeader";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import {
  TRANSACTION_CATEGORIES,
  TRANSACTION_TYPES,
  TRANSACTION_TYPE_LABELS,
} from "../constants/transactions";
import type { RootStackParamList } from "../navigation/types";
import { useFeedFilters } from "../state/feedFilters";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useEntranceAnimation } from "../utils/animations";
import { sanitizeAmountInput } from "../utils/format";

type DirectionChoice = "all" | "inflow" | "outflow";

const DIRECTION_OPTIONS = [
  { id: "all", label: "All" },
  { id: "inflow", label: "Inflow" },
  { id: "outflow", label: "Outflow" },
] as const;

export function FilterModalScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { filters, setFilters, resetFilters } = useFeedFilters();
  const animation = useEntranceAnimation(18);
  const { width } = useWindowDimensions();
  const isCompact = width < 360;

  const [draft, setDraft] = useState(filters);
  const [error, setError] = useState<string | null>(null);

  const directionChoice = useMemo<DirectionChoice>(() => {
    if (!draft.direction) {
      return "all";
    }
    return draft.direction;
  }, [draft.direction]);

  const hasChanges = JSON.stringify(draft) !== JSON.stringify(filters);

  const typeOptions = useMemo(
    () =>
      TRANSACTION_TYPES.map((type) => ({
        id: type,
        label: TRANSACTION_TYPE_LABELS[type],
      })),
    []
  );
  const categoryOptions = useMemo(
    () =>
      TRANSACTION_CATEGORIES.map((category) => ({
        id: category,
        label: category,
      })),
    []
  );

  const validateAmounts = () => {
    const min = draft.minAmount.trim();
    const max = draft.maxAmount.trim();
    const minValue = min ? Number.parseFloat(min) : null;
    const maxValue = max ? Number.parseFloat(max) : null;

    if (min && (!Number.isFinite(minValue) || minValue < 0)) {
      return "Enter a valid minimum amount.";
    }
    if (max && (!Number.isFinite(maxValue) || maxValue < 0)) {
      return "Enter a valid maximum amount.";
    }
    if (minValue !== null && maxValue !== null && minValue > maxValue) {
      return "Minimum amount should be less than maximum.";
    }
    return null;
  };

  const handleApply = () => {
    const validationError = validateAmounts();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setFilters(draft);
    navigation.goBack();
  };

  const handleClear = () => {
    resetFilters();
    setDraft({
      direction: null,
      types: [],
      categories: [],
      minAmount: "",
      maxAmount: "",
    });
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
            title="Filters"
            subtitle="Fine-tune what appears in your feed."
          />
        </Animated.View>

        <ChoiceChips
          label="Direction"
          items={DIRECTION_OPTIONS}
          selectedId={directionChoice}
          onSelect={(value) =>
            setDraft((prev) => ({
              ...prev,
              direction: value === "all" ? null : value,
            }))
          }
        />

        <MultiSelectChips
          label="Type"
          items={typeOptions}
          selectedIds={draft.types}
          onChange={(types) => setDraft((prev) => ({ ...prev, types }))}
        />

        <MultiSelectChips
          label="Category"
          items={categoryOptions}
          selectedIds={draft.categories}
          onChange={(categories) =>
            setDraft((prev) => ({ ...prev, categories }))
          }
        />

        <View style={[styles.amountRow, isCompact && styles.amountRowStacked]}>
          <View style={styles.amountField}>
            <Text style={styles.amountLabel}>Min amount</Text>
            <View style={styles.amountInput}>
              <Text style={styles.currency}>₹</Text>
              <TextInput
                value={draft.minAmount}
                onChangeText={(value) =>
                  setDraft((prev) => ({
                    ...prev,
                    minAmount: sanitizeAmountInput(value),
                  }))
                }
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.steel}
                style={styles.amountText}
              />
            </View>
          </View>
          <View style={styles.amountField}>
            <Text style={styles.amountLabel}>Max amount</Text>
            <View style={styles.amountInput}>
              <Text style={styles.currency}>₹</Text>
              <TextInput
                value={draft.maxAmount}
                onChangeText={(value) =>
                  setDraft((prev) => ({
                    ...prev,
                    maxAmount: sanitizeAmountInput(value),
                  }))
                }
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.steel}
                style={styles.amountText}
              />
            </View>
          </View>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.actions}>
          <PrimaryButton
            label="Apply filters"
            onPress={handleApply}
            disabled={!hasChanges}
          />
          <GhostButton label="Clear all filters" onPress={handleClear} />
          <GhostButton label="Close" onPress={() => navigation.goBack()} />
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
  amountRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  amountRowStacked: {
    flexDirection: "column",
  },
  amountField: {
    flex: 1,
    gap: spacing.xs,
  },
  amountLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.slate,
  },
  amountInput: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#F9FAFB",
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
  actions: {
    gap: spacing.sm,
  },
  errorText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.danger,
  },
});
