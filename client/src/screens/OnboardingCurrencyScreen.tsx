import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { getErrorMessage } from "../api";
import { updateMe } from "../api/authApi";
import { PageHeader } from "../components/PageHeader";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { SelectSheet } from "../components/SelectSheet";
import { CURRENCY_OPTIONS } from "../constants/currencies";
import { useUserCurrency } from "../hooks/useUserCurrency";
import { useAuth } from "../state/auth";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

export function OnboardingCurrencyScreen() {
  const { updateUser } = useAuth();
  const userCurrency = useUserCurrency();
  const [selectedCurrency, setSelectedCurrency] = useState(userCurrency);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedLabel = useMemo(() => {
    const found = CURRENCY_OPTIONS.find(
      (option) => option.id === selectedCurrency
    );
    return found?.label ?? selectedCurrency;
  }, [selectedCurrency]);

  const handleContinue = async () => {
    if (isSaving) {
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const updated = await updateMe({
        currency: selectedCurrency,
        onboarding_completed: true,
      });
      updateUser(updated);
    } catch (err) {
      setError(getErrorMessage(err));
      setIsSaving(false);
    }
  };

  return (
    <Screen withGradient>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <PageHeader
            title="Choose your currency"
            subtitle="We will use this for parsing and analytics."
            align="center"
          />
        </View>

        <Pressable
          onPress={() => setIsSheetOpen(true)}
          style={({ pressed }) => [
            styles.currencyCard,
            pressed && styles.currencyCardPressed,
          ]}
        >
          <View style={styles.currencyIcon}>
            <Ionicons name="cash-outline" size={18} color={colors.cobalt} />
          </View>
          <View style={styles.currencyBody}>
            <Text style={styles.currencyLabel}>Currency</Text>
            <Text style={styles.currencyValue}>{selectedLabel}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.steel} />
        </Pressable>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <PrimaryButton
          label={isSaving ? "Saving..." : "Continue"}
          onPress={handleContinue}
          disabled={isSaving}
        />
      </ScrollView>

      <SelectSheet
        visible={isSheetOpen}
        title="Select currency"
        items={CURRENCY_OPTIONS}
        selectedId={selectedCurrency}
        onSelect={setSelectedCurrency}
        onClose={() => setIsSheetOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xxxl,
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  header: {
    paddingHorizontal: spacing.sm,
  },
  currencyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
  },
  currencyCardPressed: {
    borderColor: colors.cobalt,
  },
  currencyIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  currencyBody: {
    flex: 1,
    gap: 4,
  },
  currencyLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.slate,
  },
  currencyValue: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.md,
    color: colors.ink,
  },
  errorText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.danger,
  },
});
