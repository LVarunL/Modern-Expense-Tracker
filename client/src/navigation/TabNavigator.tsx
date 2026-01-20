import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import { AnalyticsHomeScreen } from "../screens/AnalyticsHomeScreen";
import { CaptureScreen } from "../screens/CaptureScreen";
import { FeedScreen } from "../screens/FeedScreen";
import { TabBar } from "./TabBar";
import type { TabParamList } from "./types";

const Tab = createBottomTabNavigator<TabParamList>();

export function TabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Feed"
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={() => ({
        headerShown: false,
      })}
    >
      <Tab.Screen name="Feed" component={FeedScreen} />
      <Tab.Screen name="Capture" component={CaptureScreen} />
      <Tab.Screen
        name="Summary"
        component={AnalyticsHomeScreen}
        options={{ tabBarLabel: "Analytics" }}
      />
    </Tab.Navigator>
  );
}
