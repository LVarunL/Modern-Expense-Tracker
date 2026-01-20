import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { ChoiceChips } from "../components/ChoiceChips";
import { GhostButton } from "../components/GhostButton";
import { MultiSelectSheet } from "../components/MultiSelectSheet";
import { PageHeader } from "../components/PageHeader";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { TimeRangeFilter } from "../components/TimeRangeFilter";
import {
  TRANSACTION_CATEGORIES,
  TRANSACTION_TYPES,
  TRANSACTION_TYPE_LABELS,
} from "../constants/transactions";
import { useUserCurrency } from "../hooks/useUserCurrency";
import type { RootStackParamList } from "../navigation/types";
import { useFeedFilters } from "../state/feedFilters";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useEntranceAnimation } from "../utils/animations";
import { getCurrencySymbol } from "../utils/currency";
import { sanitizeAmountInput } from "../utils/format";
import { validateTimeRange } from "../utils/timeRange";

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
  const currency = useUserCurrency();
  const currencySymbol = getCurrencySymbol(currency);

  const [draft, setDraft] = useState(filters);
  const [error, setError] = useState<string | null>(null);
  const [typeSheetOpen, setTypeSheetOpen] = useState(false);
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);

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
  const typeSummary = useMemo(() => {
    if (!draft.types.length) {
      return "Any";
    }
    if (draft.types.length === 1) {
      return TRANSACTION_TYPE_LABELS[draft.types[0]] ?? draft.types[0];
    }
    return `${draft.types.length} selected`;
  }, [draft.types]);
  const categorySummary = useMemo(() => {
    if (!draft.categories.length) {
      return "Any";
    }
    if (draft.categories.length === 1) {
      return draft.categories[0];
    }
    return `${draft.categories.length} selected`;
  }, [draft.categories]);

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
    const timeError = validateTimeRange(draft.timeRange);
    if (timeError) {
      setError(timeError);
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
      timeRange: {
        preset: "all",
        customStart: "",
        customEnd: "",
      },
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

        <TimeRangeFilter
          value={draft.timeRange}
          onChange={(timeRange) =>
            setDraft((prev) => ({
              ...prev,
              timeRange,
            }))
          }
          compact={isCompact}
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Type</Text>
          <Pressable
            style={({ pressed }) => [
              styles.selectorRow,
              pressed && styles.selectorRowPressed,
            ]}
            onPress={() => setTypeSheetOpen(true)}
          >
            <Text style={styles.selectorValue}>{typeSummary}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.steel} />
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Category</Text>
          <Pressable
            style={({ pressed }) => [
              styles.selectorRow,
              pressed && styles.selectorRowPressed,
            ]}
            onPress={() => setCategorySheetOpen(true)}
          >
            <Text style={styles.selectorValue}>{categorySummary}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.steel} />
          </Pressable>
        </View>

        <View style={[styles.amountRow, isCompact && styles.amountRowStacked]}>
          <View style={styles.amountField}>
            <Text style={styles.amountLabel}>Min amount</Text>
            <View style={styles.amountInput}>
              <Text style={styles.currency}>{currencySymbol}</Text>
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
              <Text style={styles.currency}>{currencySymbol}</Text>
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
      <MultiSelectSheet
        visible={typeSheetOpen}
        title="Types"
        items={typeOptions}
        selectedIds={draft.types}
        onChange={(types) => setDraft((prev) => ({ ...prev, types }))}
        onClose={() => setTypeSheetOpen(false)}
      />
      <MultiSelectSheet
        visible={categorySheetOpen}
        title="Categories"
        items={categoryOptions}
        selectedIds={draft.categories}
        onChange={(categories) => setDraft((prev) => ({ ...prev, categories }))}
        onClose={() => setCategorySheetOpen(false)}
      />
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
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.slate,
  },
  selectorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
  },
  selectorRowPressed: {
    borderColor: colors.cobalt,
  },
  selectorValue: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.ink,
  },
});
