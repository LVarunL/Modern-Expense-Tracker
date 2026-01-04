import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
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
import { InputField } from "../components/InputField";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import type { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useEntranceAnimation } from "../utils/animations";

const promptSuggestions = [
  "Dinner 600 and dessert 200, movie 350",
  "Split dinner 1200 with a friend",
  "Salary credited 52000",
  "Uber 320 to office",
];

export function CaptureScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [text, setText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [lastPreview, setLastPreview] = useState<ParseResponse | null>(null);
  const animation = useEntranceAnimation(18);

  const previewItems = useMemo(
    () => (lastPreview ? lastPreview.transactions.slice(0, 2) : []),
    [lastPreview]
  );

  const handlePreview = async () => {
    const trimmed = text.trim();
    if (!trimmed || isParsing) {
      return;
    }

    setIsParsing(true);
    setParseError(null);

    try {
      const preview = await parseEntry({ raw_text: trimmed });
      setLastPreview(preview);
      if (preview.status === "confirmed") {
        setText("");
        return;
      }
      navigation.navigate("PreviewModal", {
        preview,
        rawText: trimmed,
      });
    } catch (error) {
      setParseError(getErrorMessage(error));
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Capture</Text>
          <Text style={styles.subtitle}>
            Describe your spend in one line. We will parse and preview it.
          </Text>
        </View>

        <InputField
          value={text}
          onChangeText={setText}
          placeholder="e.g., Dinner 600 and dessert 200, movie 350"
          multiline
        />

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

        <PrimaryButton
          label={isParsing ? "Parsing..." : "Preview parsed transactions"}
          suffix="Preview"
          onPress={handlePreview}
          disabled={!text.trim() || isParsing}
        />
        {parseError ? <Text style={styles.errorText}>{parseError}</Text> : null}

        <Animated.View
          style={[
            styles.previewCard,
            {
              opacity: animation.opacity,
              transform: [{ translateY: animation.translateY }],
            },
          ]}
        >
          <Text style={styles.previewTitle}>
            {lastPreview?.status === "confirmed" ? "Logged" : "Recent preview"}
          </Text>
          <Text style={styles.previewSubtitle}>
            {lastPreview?.entry_summary
              ? `Parsed: ${lastPreview.entry_summary}`
              : "Parsed from: “Dinner 600…”"}
          </Text>
          {lastPreview
            ? lastPreview.transactions.slice(0, 2).map((item, index) => (
                <View
                  key={`${item.category}-${index}`}
                  style={styles.previewRow}
                >
                  <Text style={styles.previewRowLabel}>{item.category}</Text>
                  <Text style={styles.previewRowAmount}>₹{item.amount}</Text>
                </View>
              ))
            : previewItems.map((item) => (
                <View key={item.id} style={styles.previewRow}>
                  <Text style={styles.previewRowLabel}>{item.title}</Text>
                  <Text style={styles.previewRowAmount}>{item.amount}</Text>
                </View>
              ))}
        </Animated.View>
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
  header: {
    gap: spacing.sm,
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.display,
    color: colors.ink,
  },
  subtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.md,
    color: colors.slate,
    lineHeight: typography.lineHeight.relaxed,
  },
  suggestionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
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
