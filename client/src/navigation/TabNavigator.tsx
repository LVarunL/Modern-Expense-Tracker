import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import { CaptureScreen } from "../screens/CaptureScreen";
import { FeedScreen } from "../screens/FeedScreen";
import { SummaryScreen } from "../screens/SummaryScreen";
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
      <Tab.Screen name="Summary" component={SummaryScreen} />
    </Tab.Navigator>
  );
}
