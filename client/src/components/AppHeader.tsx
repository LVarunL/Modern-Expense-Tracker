import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { RootStackParamList } from "../navigation/types";
import { useAuth } from "../state/auth";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  meta?: string;
  showAccount?: boolean;
}

export function AppHeader({
  title,
  subtitle,
  meta,
  showAccount = false,
}: AppHeaderProps) {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const initial = user?.email?.trim()?.[0]?.toUpperCase() ?? "";

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.textBlock}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          {meta ? <Text style={styles.meta}>{meta}</Text> : null}
        </View>
        {showAccount ? (
          <Pressable
            onPress={() => navigation.navigate("AccountSettings")}
            accessibilityLabel="Account settings"
            style={({ pressed }) => [
              styles.accountButton,
              pressed && styles.accountButtonPressed,
            ]}
          >
            {initial ? (
              <Text style={styles.accountInitial}>{initial}</Text>
            ) : (
              <Ionicons name="person" size={18} color={colors.ink} />
            )}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  textBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.xl,
    lineHeight: typography.lineHeight.relaxed,
    color: colors.ink,
  },
  subtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.normal,
    color: colors.slate,
  },
  meta: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.xs,
    color: colors.steel,
  },
  accountButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  accountButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  accountInitial: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.ink,
  },
});
