import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom, spacing.sm) },
      ]}
    >
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const { options } = descriptors[route.key];
          const label =
            options.tabBarLabel ?? options.title ?? (route.name as string);

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: "tabLongPress",
              target: route.key,
            });
          };

          if (route.name === "Capture") {
            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                onLongPress={onLongPress}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                style={styles.centerWrapper}
              >
                <View
                  style={[
                    styles.centerButton,
                    isFocused && styles.centerButtonActive,
                  ]}
                >
                  <Ionicons name="add" size={28} color={colors.ink} />
                </View>
                <Text
                  style={[
                    styles.centerLabel,
                    isFocused && styles.tabLabelActive,
                  ]}
                >
                  Add
                </Text>
              </Pressable>
            );
          }

          const iconName =
            route.name === "Feed" ? "list-outline" : "pie-chart-outline";
          const color = isFocused ? colors.cobalt : colors.steel;

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              onLongPress={onLongPress}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              style={styles.tabItem}
            >
              <Ionicons name={iconName} size={20} color={color} />
              <Text
                style={[styles.tabLabel, isFocused && styles.tabLabelActive]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  bar: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  tabLabel: {
    marginTop: 4,
    fontFamily: typography.fontFamily.medium,
    fontSize: 12,
    color: colors.steel,
  },
  tabLabelActive: {
    color: colors.cobalt,
  },
  centerWrapper: {
    alignItems: "center",
    width: 90,
    marginTop: -spacing.lg,
  },
  centerButton: {
    width: 60,
    height: 60,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.citrus,
    borderWidth: 2,
    borderColor: colors.surface,
    shadowColor: colors.ink,
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  centerButtonActive: {
    borderColor: colors.cobalt,
  },
  centerLabel: {
    marginTop: 6,
    fontFamily: typography.fontFamily.medium,
    fontSize: 12,
    color: colors.steel,
  },
});
