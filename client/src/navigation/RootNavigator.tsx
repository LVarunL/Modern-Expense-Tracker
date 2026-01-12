import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { AccountSettingsScreen } from "../screens/AccountSettingsScreen";
import { AuthScreen } from "../screens/AuthScreen";
import { EditTransactionScreen } from "../screens/EditTransactionScreen";
import { FilterModalScreen } from "../screens/FilterModalScreen";
import { ForgotPasswordScreen } from "../screens/ForgotPasswordScreen";
import { PreviewScreen } from "../screens/PreviewScreen";
import { ResetPasswordScreen } from "../screens/ResetPasswordScreen";
import { useAuth } from "../state/auth";
import { TabNavigator } from "./TabNavigator";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <>
          <Stack.Screen name="MainTabs" component={TabNavigator} />
          <Stack.Screen
            name="PreviewModal"
            component={PreviewScreen}
            options={{ presentation: "modal", animation: "slide_from_bottom" }}
          />
          <Stack.Screen
            name="EditTransactionModal"
            component={EditTransactionScreen}
            options={{ presentation: "modal", animation: "slide_from_bottom" }}
          />
          <Stack.Screen
            name="FilterModal"
            component={FilterModalScreen}
            options={{ presentation: "modal", animation: "slide_from_bottom" }}
          />
          <Stack.Screen
            name="AccountSettings"
            component={AccountSettingsScreen}
          />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Auth" component={AuthScreen} />
          <Stack.Screen
            name="ForgotPassword"
            component={ForgotPasswordScreen}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
