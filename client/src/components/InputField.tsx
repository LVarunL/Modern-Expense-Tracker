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
  children,
}: PropsWithChildren<InputFieldProps>) {
  const hasActions = Boolean(children);

  return (
    <View style={[styles.wrapper, hasActions && styles.wrapperWithActions]}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.steel}
        style={[styles.input, multiline && styles.multiline]}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
      />
      {children ? <View style={styles.actions}>{children}</View> : null}
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
  wrapperWithActions: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  input: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.md,
    color: colors.ink,
    minHeight: 24,
    flex: 1,
  },
  multiline: {
    minHeight: 120,
  },
  actions: {
    alignItems: "center",
    justifyContent: "flex-start",
  },
});
