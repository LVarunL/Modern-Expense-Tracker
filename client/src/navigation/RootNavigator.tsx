import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useEffect } from "react";

import { AccountSettingsScreen } from "../screens/AccountSettingsScreen";
import { AnalyticsCashflowScreen } from "../screens/AnalyticsCashflowScreen";
import { AnalyticsCategoriesScreen } from "../screens/AnalyticsCategoriesScreen";
import { AnalyticsCategoryDetailScreen } from "../screens/AnalyticsCategoryDetailScreen";
import { AnalyticsTypesScreen } from "../screens/AnalyticsTypesScreen";
import { AuthScreen } from "../screens/AuthScreen";
import { EditTransactionScreen } from "../screens/EditTransactionScreen";
import { FilterModalScreen } from "../screens/FilterModalScreen";
import { ForgotPasswordScreen } from "../screens/ForgotPasswordScreen";
import { PreviewScreen } from "../screens/PreviewScreen";
import { ResetPasswordScreen } from "../screens/ResetPasswordScreen";
import { useAuth } from "../state/auth";
import {
  consumePendingVoiceCapture,
  subscribePendingVoiceCapture,
} from "../state/voiceIntent";
import { navigationRef } from "./navigationRef";
import { TabNavigator } from "./TabNavigator";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    const handlePendingVoice = () => {
      if (!isAuthenticated) {
        return;
      }
      if (!navigationRef.isReady()) {
        return;
      }
      if (!consumePendingVoiceCapture()) {
        return;
      }
      navigationRef.navigate("MainTabs", {
        screen: "Capture",
        params: { autoVoice: true },
      });
    };
    handlePendingVoice();
    return subscribePendingVoiceCapture(handlePendingVoice);
  }, [isAuthenticated]);

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
            name="AnalyticsCategories"
            component={AnalyticsCategoriesScreen}
          />
          <Stack.Screen
            name="AnalyticsCategoryDetail"
            component={AnalyticsCategoryDetailScreen}
          />
          <Stack.Screen
            name="AnalyticsTypes"
            component={AnalyticsTypesScreen}
          />
          <Stack.Screen
            name="AnalyticsCashflow"
            component={AnalyticsCashflowScreen}
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
