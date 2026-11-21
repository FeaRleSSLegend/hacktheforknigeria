// Bottom tabs: Home, Dishes, Social (coming soon) and About. Dish, plant, plan and prepare pages open above the tabs.
import { Tabs } from "expo-router";

import { TabBarInsetProvider, TabMeta, makeTabBar } from "../../components/TabBar";
import { useAppTheme } from "../../theme";

const TABS: Record<string, TabMeta> = {
  index: { label: "Home", icon: "home-outline", activeIcon: "home" },
  suggestions: { label: "Dishes", icon: "silverware-fork-knife", activeIcon: "silverware-fork-knife" },
  social: { label: "Social", icon: "account-group-outline", activeIcon: "account-group" },
  about: { label: "About", icon: "information-outline", activeIcon: "information" },
};

const TabBar = makeTabBar(TABS);

export default function TabsLayout() {
  const { custom: c } = useAppTheme();
  return (
    <TabBarInsetProvider>
      <Tabs
        tabBar={(props) => <TabBar {...props} />}
        screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.background } }}
      >
        <Tabs.Screen name="index" options={{ title: TABS.index.label }} />
        <Tabs.Screen name="suggestions" options={{ title: TABS.suggestions.label }} />
        <Tabs.Screen name="social" options={{ title: TABS.social.label }} />
        <Tabs.Screen name="about" options={{ title: TABS.about.label }} />
      </Tabs>
    </TabBarInsetProvider>
  );
}
