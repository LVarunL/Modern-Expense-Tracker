import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { OnboardingCurrencyScreen } from "../screens/OnboardingCurrencyScreen";
import type { OnboardingStackParamList } from "./types";

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export function OnboardingNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="OnboardingCurrency"
        component={OnboardingCurrencyScreen}
      />
    </Stack.Navigator>
  );
}
