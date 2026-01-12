import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import {
  confirmResetPassword,
  getErrorMessage,
  requestResetPassword,
} from "../api";
import { AppHeader } from "../components/AppHeader";
import { GhostButton } from "../components/GhostButton";
import { InputField } from "../components/InputField";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import type { RootStackParamList } from "../navigation/types";
import { useAuth } from "../state/auth";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

type Props = NativeStackScreenProps<RootStackParamList, "ResetPassword">;
type Step = "request" | "verify" | "done";

export function ResetPasswordScreen({ navigation }: Props) {
  const { user, updateUser } = useAuth();
  const [step, setStep] = useState<Step>("request");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRequest = async () => {
    if (isSubmitting) {
      return;
    }
    setIsSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      await requestResetPassword();
      setStep("verify");
      setMessage("Code sent. Check your inbox.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirm = async () => {
    if (isSubmitting) {
      return;
    }
    if (!otp.trim()) {
      setError("Enter the verification code.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await confirmResetPassword({ otp: otp.trim(), new_password: password });
      updateUser({ has_password: true });
      setStep("done");
      setMessage("Password updated.");
      setOtp("");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen withGradient={false}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <AppHeader
          title={user?.has_password ? "Reset password" : "Set a password"}
          subtitle="We will email a verification code."
          showBack
        />

        <View style={styles.card}>
          {step === "request" ? (
            <>
              <Text style={styles.title}>Send a verification code</Text>
              <Text style={styles.subtitle}>
                We will email a code to {user?.email ?? "your inbox"}.
              </Text>
            </>
          ) : null}

          {step === "verify" ? (
            <>
              <Text style={styles.title}>Verify and update</Text>
              <Text style={styles.subtitle}>
                Code sent to {user?.email ?? "your inbox"}.
              </Text>
              <InputField
                value={otp}
                onChangeText={setOtp}
                placeholder="Verification code"
                keyboardType="number-pad"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="oneTimeCode"
                returnKeyType="next"
              />
              <InputField
                value={password}
                onChangeText={setPassword}
                placeholder="New password"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="newPassword"
                returnKeyType="next"
              />
              <InputField
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="newPassword"
                returnKeyType="done"
                onSubmitEditing={handleConfirm}
              />
            </>
          ) : null}

          {message ? <Text style={styles.message}>{message}</Text> : null}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {step === "request" ? (
            <PrimaryButton
              label={isSubmitting ? "Sending..." : "Send code"}
              onPress={handleRequest}
              disabled={isSubmitting}
            />
          ) : null}
          {step === "verify" ? (
            <PrimaryButton
              label={isSubmitting ? "Updating..." : "Update password"}
              onPress={handleConfirm}
              disabled={isSubmitting}
            />
          ) : null}
          {step === "done" ? (
            <PrimaryButton
              label="Back to settings"
              onPress={() => navigation.goBack()}
            />
          ) : null}

          <View style={styles.actions}>
            {step === "verify" ? (
              <GhostButton
                label="Resend code"
                onPress={handleRequest}
                disabled={isSubmitting}
              />
            ) : null}
            <GhostButton label="Cancel" onPress={() => navigation.goBack()} />
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxxl,
    gap: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    gap: spacing.sm,
  },
  title: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.lg,
    color: colors.ink,
  },
  subtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.slate,
  },
  message: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.cobalt,
  },
  actions: {
    gap: spacing.sm,
  },
  errorText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.danger,
  },
});
