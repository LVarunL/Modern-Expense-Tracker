import { LinearGradient } from "expo-linear-gradient";
import type { PropsWithChildren } from "react";
import { SafeAreaView, StyleSheet, View } from "react-native";

import { colors } from "../theme/colors";

interface ScreenProps {
  withGradient?: boolean;
}

export function Screen({
  children,
  withGradient = true,
}: PropsWithChildren<ScreenProps>) {
  return (
    <SafeAreaView style={styles.safeArea}>
      {withGradient ? (
        <LinearGradient
          colors={[colors.background, "#EEF2FF"]}
          style={styles.gradient}
        >
          <View style={styles.container}>{children}</View>
        </LinearGradient>
      ) : (
        <View style={styles.container}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
});
