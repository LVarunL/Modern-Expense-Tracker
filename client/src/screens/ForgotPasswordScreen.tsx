import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { confirmForgotPassword, forgotPassword, getErrorMessage } from "../api";
import { AppHeader } from "../components/AppHeader";
import { GhostButton } from "../components/GhostButton";
import { InputField } from "../components/InputField";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import type { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

type Props = NativeStackScreenProps<RootStackParamList, "ForgotPassword">;
type Step = "request" | "verify" | "done";

export function ForgotPasswordScreen({ route, navigation }: Props) {
  const [email, setEmail] = useState(route.params?.email ?? "");
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
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Enter your email to receive a reset code.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      await forgotPassword({ email: trimmedEmail });
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
      await confirmForgotPassword({
        email: email.trim(),
        otp: otp.trim(),
        new_password: password,
      });
      setStep("done");
      setMessage("Password updated. You can sign in now.");
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
    <Screen withGradient>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <AppHeader
          title="Forgot password"
          subtitle="We will email a verification code."
          showBack
        />

        <View style={styles.card}>
          {step === "request" ? (
            <>
              <Text style={styles.title}>Enter your email</Text>
              <Text style={styles.subtitle}>
                We will send a code to reset your password.
              </Text>
              <InputField
                value={email}
                onChangeText={setEmail}
                placeholder="Email address"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="emailAddress"
                returnKeyType="done"
                onSubmitEditing={handleRequest}
              />
            </>
          ) : null}

          {step === "verify" ? (
            <>
              <Text style={styles.title}>Verify and reset</Text>
              <Text style={styles.subtitle}>
                Code sent to {email.trim() || "your inbox"}.
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
              label="Back to sign in"
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
