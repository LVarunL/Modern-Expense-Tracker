import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

export type MultiSelectChip<TId extends string> = {
  id: TId;
  label: string;
};

interface MultiSelectChipsProps<TId extends string> {
  label?: string;
  items: MultiSelectChip<TId>[];
  selectedIds: TId[];
  onChange: (selected: TId[]) => void;
  horizontal?: boolean;
}

export function MultiSelectChips<TId extends string>({
  label,
  items,
  selectedIds,
  onChange,
  horizontal = false,
}: MultiSelectChipsProps<TId>) {
  const selectedSet = new Set(selectedIds);

  const toggle = (id: TId) => {
    const next = new Set(selectedSet);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onChange(Array.from(next));
  };

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <ScrollView
        horizontal={horizontal}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.row, horizontal && styles.rowInline]}
      >
        {items.map((item) => {
          const isSelected = selectedSet.has(item.id);
          return (
            <Pressable
              key={item.id}
              onPress={() => toggle(item.id)}
              style={({ pressed }) => [
                styles.chip,
                isSelected && styles.chipSelected,
                pressed && styles.chipPressed,
              ]}
            >
              <Text
                style={[styles.chipText, isSelected && styles.chipTextSelected]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
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
    gap: spacing.sm,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  rowInline: {
    flexWrap: "nowrap",
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
