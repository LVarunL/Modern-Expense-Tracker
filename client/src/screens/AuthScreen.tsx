import { Ionicons } from "@expo/vector-icons";
import * as AuthSession from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  GOOGLE_ANDROID_CLIENT_ID,
  GOOGLE_IOS_CLIENT_ID,
  GOOGLE_REDIRECT_SCHEME,
  GOOGLE_WEB_CLIENT_ID,
} from "../api/config";
import { InputField } from "../components/InputField";
import { PageHeader } from "../components/PageHeader";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { featureFlags } from "../config/featureFlags";
import type { RootStackParamList } from "../navigation/types";
import { useAuth } from "../state/auth";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

WebBrowser.maybeCompleteAuthSession();

type AuthMode = "login" | "register";

export function AuthScreen() {
  const { loginWithPassword, registerWithPassword, loginWithGoogleToken } =
    useAuth();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectUri = useMemo(() => {
    const androidClientId = GOOGLE_ANDROID_CLIENT_ID;
    const androidClientIdBase = androidClientId
      ? androidClientId.replace(".apps.googleusercontent.com", "")
      : "";
    const androidRedirect = androidClientIdBase
      ? `com.googleusercontent.apps.${androidClientIdBase}:/oauthredirect`
      : undefined;
    return AuthSession.makeRedirectUri({
      scheme: GOOGLE_REDIRECT_SCHEME,
      native: Platform.OS === "android" ? androidRedirect : undefined,
    });
  }, []);

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    webClientId: GOOGLE_WEB_CLIENT_ID,
    redirectUri,
  });

  useEffect(() => {
    if (!response) {
      return;
    }
    if (response.type === "success") {
      const idToken = response.params?.id_token;
      if (!idToken) {
        setError("Google sign-in did not return an ID token.");
        setIsSubmitting(false);
        return;
      }
      setError(null);
      setIsSubmitting(true);
      loginWithGoogleToken(idToken)
        .catch((err) => {
          setError(
            err instanceof Error ? err.message : "Google sign-in failed."
          );
        })
        .finally(() => {
          setIsSubmitting(false);
        });
      return;
    }
    if (response.type === "error") {
      setError("Google sign-in failed.");
    } else if (response.type === "dismiss") {
      setError(null);
    }
    setIsSubmitting(false);
  }, [response, loginWithGoogleToken]);

  const handleSubmit = async () => {
    if (isSubmitting) {
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      if (mode === "login") {
        await loginWithPassword(email.trim(), password);
      } else {
        await registerWithPassword(email.trim(), password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = () => {
    navigation.navigate("ForgotPassword", {
      email: email.trim() ? email.trim() : undefined,
    });
  };

  const handleGoogle = async () => {
    if (!request || isSubmitting) {
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await promptAsync({ useProxy: false });
    } catch {
      setError("Google sign-in failed.");
      setIsSubmitting(false);
    }
  };

  const canSubmit =
    email.trim().length > 0 && password.length >= 8 && !isSubmitting;
  const googleReady =
    GOOGLE_IOS_CLIENT_ID || GOOGLE_ANDROID_CLIENT_ID || GOOGLE_WEB_CLIENT_ID;

  return (
    <Screen withGradient>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
      >
        <View style={styles.header}>
          <PageHeader
            title={mode === "login" ? "Welcome back" : "Create your account"}
            subtitle="Sign in to sync your expenses securely."
          />
        </View>

        <View style={styles.form}>
          <InputField
            value={email}
            onChangeText={setEmail}
            placeholder="Email address"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="emailAddress"
            returnKeyType="next"
          />
          <InputField
            value={password}
            onChangeText={setPassword}
            placeholder="Password (8+ characters)"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={handleSubmit}
          >
            <Pressable
              onPress={() => setShowPassword((prev) => !prev)}
              accessibilityLabel={
                showPassword ? "Hide password" : "Show password"
              }
              style={({ pressed }) => [
                styles.passwordToggle,
                pressed && styles.passwordTogglePressed,
              ]}
            >
              <Ionicons
                name={showPassword ? "eye-off" : "eye"}
                size={18}
                color={colors.slate}
              />
            </Pressable>
          </InputField>
          {mode === "login" && featureFlags.authForgotPassword ? (
            <Pressable
              onPress={handleForgotPassword}
              style={({ pressed }) => [
                styles.forgotLink,
                pressed && styles.forgotLinkPressed,
              ]}
            >
              <Text style={styles.forgotLinkText}>Forgot password?</Text>
            </Pressable>
          ) : null}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <PrimaryButton
            label={
              isSubmitting
                ? "Please wait..."
                : mode === "login"
                ? "Sign in"
                : "Create account"
            }
            onPress={handleSubmit}
            disabled={!canSubmit}
          />
        </View>

        <View style={styles.altActions}>
          <Text style={styles.altText}>
            {mode === "login" ? "New here?" : "Already have an account?"}
          </Text>
          <Pressable
            onPress={() => setMode(mode === "login" ? "register" : "login")}
          >
            <Text style={styles.altLink}>
              {mode === "login" ? "Create one" : "Sign in instead"}
            </Text>
          </Pressable>
        </View>

        {googleReady ? (
          <Pressable
            onPress={handleGoogle}
            disabled={!request || isSubmitting}
            style={({ pressed }) => [
              styles.googleButton,
              pressed && styles.googleButtonPressed,
              (!request || isSubmitting) && styles.googleButtonDisabled,
            ]}
          >
            <Ionicons name="logo-google" size={18} color={colors.ink} />
            <Text style={styles.googleText}>Continue with Google</Text>
          </Pressable>
        ) : null}
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxxl,
    gap: spacing.xl,
  },
  header: {
    gap: spacing.md,
  },
  form: {
    gap: spacing.md,
  },
  altActions: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  altText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.slate,
  },
  altLink: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.cobalt,
  },
  forgotLink: {
    alignSelf: "flex-end",
  },
  forgotLinkPressed: {
    opacity: 0.7,
  },
  forgotLinkText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.cobalt,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
  },
  googleButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  googleButtonDisabled: {
    opacity: 0.5,
  },
  googleText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.md,
    color: colors.ink,
  },
  passwordToggle: {
    alignSelf: "center",
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  passwordTogglePressed: {
    opacity: 0.7,
  },
  errorText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.danger,
  },
});
