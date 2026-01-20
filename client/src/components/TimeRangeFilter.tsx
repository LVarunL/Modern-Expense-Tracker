import DateTimePicker from "@react-native-community/datetimepicker";
import { useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import {
  formatDateInput,
  parseDateInput,
  type TimeRangeFilter as TimeRangeValue,
} from "../utils/timeRange";
import { ChoiceChips } from "./ChoiceChips";

const PRESET_OPTIONS = [
  { id: "all", label: "All time" },
  { id: "today", label: "Today" },
  { id: "last7", label: "Last 7 days" },
  { id: "last30", label: "Last 30 days" },
  { id: "thisMonth", label: "This month" },
  { id: "lastMonth", label: "Last month" },
  { id: "custom", label: "Custom" },
] as const;

type Props = {
  value: TimeRangeValue;
  onChange: (next: TimeRangeValue) => void;
  compact?: boolean;
};

export function TimeRangeFilter({ value, onChange, compact }: Props) {
  const presets = useMemo(() => PRESET_OPTIONS.map((option) => option), []);
  const isCustom = value.preset === "custom";
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const startDate = parseDateInput(value.customStart);
  const endDate = parseDateInput(value.customEnd);

  const handleStartChange = (_event: unknown, selected?: Date) => {
    if (Platform.OS === "android") {
      setShowStartPicker(false);
    }
    if (!selected) {
      return;
    }
    onChange({ ...value, customStart: formatDateInput(selected) });
  };

  const handleEndChange = (_event: unknown, selected?: Date) => {
    if (Platform.OS === "android") {
      setShowEndPicker(false);
    }
    if (!selected) {
      return;
    }
    onChange({ ...value, customEnd: formatDateInput(selected) });
  };

  return (
    <View style={styles.container}>
      <ChoiceChips
        label="Time"
        items={presets}
        selectedId={value.preset}
        scrollable
        onSelect={(preset) =>
          onChange({
            ...value,
            preset,
          })
        }
      />
      {isCustom ? (
        <View style={[styles.customRow, compact && styles.customRowStacked]}>
          <View style={styles.customField}>
            <Text style={styles.customLabel}>Start date</Text>
            <Pressable
              onPress={() => {
                setShowStartPicker((prev) => !prev);
                setShowEndPicker(false);
              }}
              style={({ pressed }) => [
                styles.customInput,
                pressed && styles.customInputPressed,
              ]}
            >
              <Text
                style={[
                  styles.customValue,
                  !value.customStart && styles.customPlaceholder,
                ]}
              >
                {value.customStart || "YYYY-MM-DD"}
              </Text>
            </Pressable>
            {showStartPicker ? (
              <View style={styles.pickerWrapper}>
                <DateTimePicker
                  value={startDate ?? new Date()}
                  mode="date"
                  display={Platform.OS === "ios" ? "compact" : "default"}
                  onChange={handleStartChange}
                />
                {Platform.OS === "ios" ? (
                  <Pressable
                    onPress={() => setShowStartPicker(false)}
                    style={styles.doneButton}
                  >
                    <Text style={styles.doneButtonText}>Done</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>
          <View style={styles.customField}>
            <Text style={styles.customLabel}>End date</Text>
            <Pressable
              onPress={() => {
                setShowEndPicker((prev) => !prev);
                setShowStartPicker(false);
              }}
              style={({ pressed }) => [
                styles.customInput,
                pressed && styles.customInputPressed,
              ]}
            >
              <Text
                style={[
                  styles.customValue,
                  !value.customEnd && styles.customPlaceholder,
                ]}
              >
                {value.customEnd || "YYYY-MM-DD"}
              </Text>
            </Pressable>
            {showEndPicker ? (
              <View style={styles.pickerWrapper}>
                <DateTimePicker
                  value={endDate ?? new Date()}
                  mode="date"
                  display={Platform.OS === "ios" ? "compact" : "default"}
                  onChange={handleEndChange}
                />
                {Platform.OS === "ios" ? (
                  <Pressable
                    onPress={() => setShowEndPicker(false)}
                    style={styles.doneButton}
                  >
                    <Text style={styles.doneButtonText}>Done</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>
        </View>
      ) : null}
      {isCustom ? (
        <Text style={styles.helperText}>Uses your local time zone.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  customRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  customRowStacked: {
    flexDirection: "column",
  },
  customField: {
    flex: 1,
  },
  customLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.xs,
    color: colors.steel,
    marginBottom: spacing.xs,
  },
  customInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  customInputPressed: {
    borderColor: colors.cobalt,
  },
  customValue: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  customPlaceholder: {
    color: colors.steel,
  },
  pickerWrapper: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  doneButton: {
    alignSelf: "flex-end",
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  doneButtonText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.xs,
    color: colors.cobalt,
  },
  helperText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.steel,
  },
});
