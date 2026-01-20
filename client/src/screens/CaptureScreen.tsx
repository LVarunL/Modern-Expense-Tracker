import { Ionicons } from "@expo/vector-icons";
import Voice from "@react-native-voice/voice";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { RouteProp } from "@react-navigation/native";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { getErrorMessage, parseEntry } from "../api";
import type { ParseResponse } from "../api/types";
import { AppHeader } from "../components/AppHeader";
import { InputField } from "../components/InputField";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { useToast } from "../components/ToastProvider";
import { TutorialTooltip } from "../components/TutorialTooltip";
import { featureFlags } from "../config/featureFlags";
import { useTutorial } from "../hooks/useTutorial";
import { useUserCurrency } from "../hooks/useUserCurrency";
import type { RootStackParamList, TabParamList } from "../navigation/types";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useEntranceAnimation } from "../utils/animations";
import { formatCurrencyValue } from "../utils/format";

const promptSuggestions = [
  "Dinner 600 and dessert 200, movie 350",
  "Split dinner 1200 with a friend",
  "Salary credited 52000",
  "Uber 320 to office",
];

export function CaptureScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const tabNavigation = useNavigation<BottomTabNavigationProp<TabParamList>>();
  const route = useRoute<RouteProp<TabParamList, "Capture">>();
  const queryClient = useQueryClient();
  const toast = useToast();
  const currency = useUserCurrency();
  const [text, setText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [lastPreview, setLastPreview] = useState<ParseResponse | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [partialTranscript, setPartialTranscript] = useState("");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const baseTextRef = useRef("");
  const animation = useEntranceAnimation(18);
  const canClear = text.length > 0 || partialTranscript.length > 0;
  const micIcon = isListening ? "stop" : "mic";
  const tutorial = useTutorial("capture", 3);

  const previewItems = useMemo(
    () => (lastPreview ? lastPreview.transactions.slice(0, 2) : []),
    [lastPreview]
  );

  useEffect(() => {
    Voice.onSpeechStart = () => {
      setIsListening(true);
      setVoiceError(null);
    };

    Voice.onSpeechEnd = () => {
      setIsListening(false);
      setPartialTranscript("");
    };

    Voice.onSpeechResults = (event) => {
      const result = event.value?.[0] ?? "";
      if (result) {
        const base = baseTextRef.current;
        setText(base ? `${base} ${result}` : result);
      }
      setPartialTranscript("");
    };

    Voice.onSpeechPartialResults = (event) => {
      setPartialTranscript(event.value?.[0] ?? "");
    };

    Voice.onSpeechError = (event) => {
      setIsListening(false);
      setPartialTranscript("");
      const message = event.error?.message ?? "Voice input failed.";
      setVoiceError(message);
      toast.error("Voice input failed", message);
    };

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, [toast]);

  const startListening = useCallback(async () => {
    if (isListening) {
      return;
    }
    setVoiceError(null);
    setParseError(null);
    baseTextRef.current = text.trim();
    try {
      await Voice.start("en-IN");
    } catch (error) {
      setVoiceError(getErrorMessage(error));
      setIsListening(false);
    }
  }, [isListening, text]);

  const stopListening = useCallback(async () => {
    if (!isListening) {
      return;
    }
    try {
      await Voice.stop();
    } catch (error) {
      setVoiceError(getErrorMessage(error));
    }
  }, [isListening]);

  const handleClear = () => {
    if (isListening) {
      void stopListening();
    }
    setText("");
    setParseError(null);
    setVoiceError(null);
    setPartialTranscript("");
    baseTextRef.current = "";
  };

  const handleVoiceToggle = () => {
    if (isListening) {
      void stopListening();
    } else {
      void startListening();
    }
  };

  const handlePreview = async () => {
    const trimmed = text.trim();
    if (!trimmed || isParsing) {
      return;
    }

    setIsParsing(true);
    setParseError(null);

    try {
      const preview = await parseEntry({ raw_text: trimmed });
      if (preview.status === "confirmed") {
        await queryClient.invalidateQueries({ queryKey: ["transactions"] });
        await queryClient.invalidateQueries({ queryKey: ["summary"] });
        setLastPreview(preview);
        handleClear();
        toast.success("Logged", "Transactions saved.");
        return;
      }
      handleClear();
      navigation.navigate("PreviewModal", {
        preview,
        rawText: trimmed,
      });
    } catch (error) {
      const message = getErrorMessage(error);
      setParseError(message);
      toast.error("Could not parse", message);
    } finally {
      setIsParsing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (!route.params?.autoVoice) {
        return;
      }
      tabNavigation.setParams({ autoVoice: undefined });
      void startListening();
    }, [route.params?.autoVoice, startListening, tabNavigation])
  );

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <AppHeader
          title="Add transaction"
          subtitle="We'll extract amounts, categories, and transactions."
          showAccount
        />

        <TutorialTooltip
          visible={tutorial.isVisible && tutorial.stepIndex === 0}
          step={1}
          total={3}
          title="Type a quick note"
          body="Add a short sentence and we'll parse it into transactions."
          placement="bottom"
          onNext={tutorial.next}
          onSkip={tutorial.skip}
        >
          <InputField
            value={text}
            onChangeText={setText}
            placeholder="e.g., Dinner 600 and dessert 200, movie 350"
            multiline
          >
            <View style={styles.inputActions}>
              <Pressable
                onPress={handleClear}
                accessibilityLabel="Clear input"
                disabled={!canClear}
                style={({ pressed }) => [
                  styles.clearIconButton,
                  pressed && canClear && styles.clearIconButtonPressed,
                  !canClear && styles.clearIconButtonDisabled,
                ]}
              >
                <Ionicons name="close" size={18} color={colors.slate} />
              </Pressable>
            </View>
          </InputField>
        </TutorialTooltip>

        <View style={styles.voiceMeta}>
          <TutorialTooltip
            visible={tutorial.isVisible && tutorial.stepIndex === 1}
            step={2}
            total={3}
            title="Use voice input"
            body="Tap the mic to capture expenses hands-free."
            placement="bottom"
            onNext={tutorial.next}
            onSkip={tutorial.skip}
          >
            <Pressable
              onPress={handleVoiceToggle}
              accessibilityLabel={
                isListening ? "Stop voice input" : "Start voice input"
              }
              style={({ pressed }) => [
                styles.micButton,
                isListening && styles.micButtonActive,
                pressed && styles.micButtonPressed,
              ]}
            >
              <Ionicons
                name={micIcon}
                size={22}
                color={isListening ? colors.surface : colors.cobalt}
              />
            </Pressable>
          </TutorialTooltip>
          <View style={styles.voiceStatus}>
            <View
              style={[
                styles.voiceStatusDot,
                isListening && styles.voiceStatusDotActive,
              ]}
            />
            <Text style={styles.voiceStatusText}>
              {isListening ? "Listening..." : "Tap the mic to speak"}
            </Text>
          </View>
          {partialTranscript ? (
            <Text style={styles.voicePartial}>{partialTranscript}</Text>
          ) : null}
          {voiceError ? (
            <Text style={styles.errorText}>{voiceError}</Text>
          ) : null}
        </View>

        {featureFlags.capturePromptSuggestions ? (
          <View style={styles.suggestionRow}>
            {promptSuggestions.map((suggestion) => (
              <Pressable
                key={suggestion}
                onPress={() => setText(suggestion)}
                style={({ pressed }) => [
                  styles.suggestion,
                  pressed && styles.suggestionPressed,
                ]}
              >
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <View style={styles.previewActions}>
          <TutorialTooltip
            visible={tutorial.isVisible && tutorial.stepIndex === 2}
            step={3}
            total={3}
            title="Review before saving"
            body="We extract transactions and you can confirm or edit."
            placement="top"
            nextLabel="Got it"
            onNext={tutorial.next}
            onSkip={tutorial.skip}
          >
            <PrimaryButton
              label={
                isParsing ? "Preparing breakdown..." : "Review transactions"
              }
              onPress={handlePreview}
              disabled={!text.trim() || isParsing}
            />
          </TutorialTooltip>
          <Text style={styles.previewHint}>
            Review the breakdown before saving.
          </Text>
          {parseError ? (
            <Text style={styles.errorText}>{parseError}</Text>
          ) : null}
        </View>

        {featureFlags.captureRecentPreview && lastPreview ? (
          <Animated.View
            style={[
              styles.previewCard,
              {
                opacity: animation.opacity,
                transform: [{ translateY: animation.translateY }],
              },
            ]}
          >
            <>
              <Text style={styles.previewTitle}>
                {lastPreview?.status === "confirmed"
                  ? "Logged"
                  : "Recent draft"}
              </Text>
              <Text style={styles.previewSubtitle}>
                {lastPreview?.entry_summary
                  ? `Summary: ${lastPreview.entry_summary}`
                  : null}
              </Text>
            </>

            {lastPreview
              ? lastPreview.transactions.slice(0, 2).map((item, index) => (
                  <View
                    key={`${item.category}-${index}`}
                    style={styles.previewRow}
                  >
                    <Text style={styles.previewRowLabel}>{item.category}</Text>
                    <Text style={styles.previewRowAmount}>
                      {formatCurrencyValue(Number(item.amount), currency)}
                    </Text>
                  </View>
                ))
              : previewItems.map((item) => (
                  <View key={item.id} style={styles.previewRow}>
                    <Text style={styles.previewRowLabel}>{item.title}</Text>
                    <Text style={styles.previewRowAmount}>{item.amount}</Text>
                  </View>
                ))}
          </Animated.View>
        ) : null}
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
  suggestionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  inputActions: {
    paddingTop: 2,
  },
  clearIconButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.divider,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  clearIconButtonPressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.9,
  },
  clearIconButtonDisabled: {
    opacity: 0.35,
  },
  voiceMeta: {
    gap: spacing.xs,
  },
  micButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: colors.cobalt,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    alignSelf: "center",
    shadowColor: colors.ink,
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  micButtonActive: {
    backgroundColor: colors.cobalt,
    borderColor: colors.citrus,
  },
  micButtonPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.95,
  },
  voiceStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    justifyContent: "center",
  },
  voiceStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.divider,
  },
  voiceStatusDotActive: {
    backgroundColor: colors.citrus,
  },
  voiceStatusText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.slate,
  },
  voicePartial: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.ink,
  },
  suggestion: {
    backgroundColor: colors.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.divider,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  suggestionPressed: {
    backgroundColor: "#EEF2FF",
  },
  suggestionText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.cobalt,
  },
  previewCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    gap: spacing.sm,
  },
  previewActions: {
    gap: spacing.xs,
  },
  previewHint: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.slate,
    textAlign: "center",
  },
  previewTitle: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.lg,
    color: colors.ink,
  },
  previewSubtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.slate,
  },
  previewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  previewRowLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.md,
    color: colors.ink,
  },
  previewRowAmount: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.md,
    color: colors.ink,
  },
  errorText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.danger,
  },
});
