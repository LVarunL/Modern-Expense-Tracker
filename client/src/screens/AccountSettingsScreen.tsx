import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { getErrorMessage } from "../api";
import { AppHeader } from "../components/AppHeader";
import { GhostButton } from "../components/GhostButton";
import { InputField } from "../components/InputField";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { useAuth } from "../state/auth";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

export function AccountSettingsScreen() {
  const { user, logout, deleteAccount } = useAuth();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const requiresPassword = Boolean(user?.has_password);

  const handleResetPassword = () => {
    Alert.alert(
      "Password reset",
      "We will add email reset links soon. For now, sign in with Google or contact support."
    );
  };

  const handleDeleteAccount = () => {
    setIsDeleteOpen(true);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (isDeleting) {
      return;
    }
    if (requiresPassword && !deletePassword.trim()) {
      setDeleteError("Password is required to delete your account.");
      return;
    }
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccount(deletePassword.trim() ? deletePassword : undefined);
    } catch (err) {
      setDeleteError(getErrorMessage(err));
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setIsDeleteOpen(false);
    setDeletePassword("");
    setDeleteError(null);
  };

  return (
    <Screen withGradient={false}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <AppHeader
          title="Account settings"
          subtitle="Manage your sign-in and security."
        />

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Signed in as</Text>
          <Text style={styles.cardValue}>{user?.email ?? "Unknown"}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          <Pressable
            onPress={handleResetPassword}
            style={({ pressed }) => [
              styles.actionRow,
              pressed && styles.actionRowPressed,
            ]}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="key-outline" size={18} color={colors.cobalt} />
            </View>
            <View style={styles.actionBody}>
              <Text style={styles.actionTitle}>Reset password</Text>
              <Text style={styles.actionSubtitle}>
                Send a reset link to your email.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.steel} />
          </Pressable>

          <Pressable
            onPress={handleDeleteAccount}
            style={({ pressed }) => [
              styles.actionRow,
              pressed && styles.actionRowPressed,
            ]}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </View>
            <View style={styles.actionBody}>
              <Text style={styles.actionTitle}>Delete account</Text>
              <Text style={styles.actionSubtitle}>
                Permanently remove all your data.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.steel} />
          </Pressable>
        </View>

        {isDeleteOpen ? (
          <View style={styles.deleteCard}>
            <Text style={styles.deleteTitle}>Delete account</Text>
            <Text style={styles.deleteText}>
              This disables your account and signs you out.
              {requiresPassword ? " Enter your password to continue." : null}
            </Text>
            {requiresPassword ? (
              <InputField
                value={deletePassword}
                onChangeText={setDeletePassword}
                placeholder="Password"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="password"
                returnKeyType="done"
                onSubmitEditing={handleConfirmDelete}
              />
            ) : null}
            {deleteError ? (
              <Text style={styles.errorText}>{deleteError}</Text>
            ) : null}
            <View style={styles.deleteActions}>
              <GhostButton label="Cancel" onPress={handleCancelDelete} />
              <PrimaryButton
                label={isDeleting ? "Deleting..." : "Delete account"}
                onPress={handleConfirmDelete}
                disabled={isDeleting}
                tone="danger"
              />
            </View>
          </View>
        ) : null}

        <GhostButton label="Sign out" onPress={logout} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    gap: spacing.xs,
  },
  cardLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.slate,
  },
  cardValue: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.md,
    color: colors.ink,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.md,
    color: colors.ink,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
  },
  actionRowPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBody: {
    flex: 1,
    gap: 2,
  },
  actionTitle: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.ink,
  },
  actionSubtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.slate,
  },
  deleteCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    gap: spacing.sm,
  },
  deleteTitle: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.md,
    color: colors.danger,
  },
  deleteText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.slate,
  },
  deleteActions: {
    gap: spacing.sm,
  },
  errorText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.danger,
  },
});
