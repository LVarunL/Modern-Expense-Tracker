import type { PropsWithChildren } from "react";
import { StyleSheet, TextInput, View } from "react-native";

import { colors } from "../theme/colors";
import { typography } from "../theme/typography";

interface InputFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
}

export function InputField({
  value,
  onChangeText,
  placeholder,
  multiline,
}: PropsWithChildren<InputFieldProps>) {
  return (
    <View style={styles.wrapper}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.steel}
        style={[styles.input, multiline && styles.multiline]}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.divider,
    shadowColor: colors.ink,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  input: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.md,
    color: colors.ink,
    minHeight: 24,
  },
  multiline: {
    minHeight: 120,
  },
});
