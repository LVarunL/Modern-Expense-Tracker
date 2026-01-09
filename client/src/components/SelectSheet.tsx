import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

export type SelectSheetItem<TId extends string> = {
  id: TId;
  label: string;
  description?: string;
};

interface SelectSheetProps<TId extends string> {
  visible: boolean;
  title: string;
  items: SelectSheetItem<TId>[];
  selectedId: TId;
  onSelect: (id: TId) => void;
  onClose: () => void;
}

export function SelectSheet<TId extends string>({
  visible,
  title,
  items,
  selectedId,
  onSelect,
  onClose,
}: SelectSheetProps<TId>) {
  const insets = useSafeAreaInsets();
  const paddedItems = useMemo(() => items, [items]);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.closeButtonPressed,
              ]}
              onPress={onClose}
            >
              <Ionicons name="close" size={18} color={colors.slate} />
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          >
            {paddedItems.map((item) => {
              const isSelected = item.id === selectedId;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    onSelect(item.id);
                    onClose();
                  }}
                  style={({ pressed }) => [
                    styles.option,
                    isSelected && styles.optionSelected,
                    pressed && styles.optionPressed,
                  ]}
                >
                  <View style={styles.optionText}>
                    <Text
                      style={[
                        styles.optionLabel,
                        isSelected && styles.optionLabelSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                    {item.description ? (
                      <Text style={styles.optionDescription}>
                        {item.description}
                      </Text>
                    ) : null}
                  </View>
                  {isSelected ? (
                    <Ionicons
                      name="checkmark"
                      size={18}
                      color={colors.cobalt}
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.lg,
    color: colors.ink,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  closeButtonPressed: {
    opacity: 0.75,
  },
  list: {
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.divider,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  optionSelected: {
    borderColor: colors.cobalt,
    backgroundColor: "#E0E7FF",
  },
  optionPressed: {
    opacity: 0.85,
  },
  optionText: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  optionLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.md,
    color: colors.ink,
  },
  optionLabelSelected: {
    color: colors.cobalt,
  },
  optionDescription: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.slate,
    marginTop: 2,
  },
});
