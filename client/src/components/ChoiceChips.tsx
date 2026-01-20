import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

export type ChoiceChip<TId extends string> = {
  id: TId;
  label: string;
};

interface ChoiceChipsProps<TId extends string> {
  label?: string;
  items: ChoiceChip<TId>[];
  selectedId: TId;
  onSelect: (id: TId) => void;
  scrollable?: boolean;
}

export function ChoiceChips<TId extends string>({
  label,
  items,
  selectedId,
  onSelect,
  scrollable = true,
}: ChoiceChipsProps<TId>) {
  const chips = items.map((item) => {
    const isSelected = item.id === selectedId;
    return (
      <Pressable
        key={item.id}
        onPress={() => onSelect(item.id)}
        style={({ pressed }) => [
          styles.chip,
          isSelected && styles.chipSelected,
          pressed && styles.chipPressed,
        ]}
      >
        <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
          {item.label}
        </Text>
      </Pressable>
    );
  });

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      {scrollable ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.row}
        >
          {chips}
        </ScrollView>
      ) : (
        <View style={[styles.row, styles.rowWrap]}>{chips}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
  },
  label: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.slate,
  },
  row: {
    paddingRight: spacing.sm,
    gap: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
  },
  rowWrap: {
    flexWrap: "wrap",
    paddingRight: 0,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.divider,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    borderColor: colors.cobalt,
    backgroundColor: "#E0E7FF",
  },
  chipPressed: {
    opacity: 0.85,
  },
  chipText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.slate,
  },
  chipTextSelected: {
    color: colors.cobalt,
  },
});
