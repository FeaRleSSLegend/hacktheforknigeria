// Bottom navigation: Material 3 navigation bar (Paper) with icon plus label on every tab.
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Href, Tabs, router } from "expo-router";
import { BottomNavigation } from "react-native-paper";

import { useAppTheme } from "../../theme";

const TABS = [
  { name: "index", href: "/" as Href, title: "Cook", icon: "pot-steam" as const, iconOff: "pot-steam-outline" as const },
  { name: "dishes", href: "/dishes" as Href, title: "Dishes", icon: "silverware-fork-knife" as const, iconOff: "silverware-fork-knife" as const },
  { name: "about", href: "/about" as Href, title: "About", icon: "information" as const, iconOff: "information-outline" as const },
];

export default function TabsLayout() {
  const { custom: c } = useAppTheme();
  return (
    <Tabs
      screenOptions={{ headerShown: false, animation: "fade" }}
      tabBar={({ state, insets }) => (
        <BottomNavigation.Bar
          navigationState={{ index: state.index, routes: state.routes.map((r) => ({ key: r.key, title: TABS.find((t) => t.name === r.name)?.title ?? r.name })) }}
          safeAreaInsets={insets}
          labeled
          activeColor={c.onBackground}
          inactiveColor={c.onSurfaceVariant}
          activeIndicatorStyle={{ backgroundColor: c.primaryContainer }}
          style={{ backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.hairline }}
          onTabPress={({ route }) => {
            const name = state.routes.find((r) => r.key === route.key)?.name;
            const tab = TABS.find((t) => t.name === name);
            if (tab) router.navigate(tab.href);
          }}
          renderIcon={({ route, focused, color }) => {
            const name = state.routes.find((r) => r.key === route.key)?.name;
            const tab = TABS.find((t) => t.name === name);
            return <MaterialCommunityIcons name={focused ? (tab?.icon ?? "circle") : (tab?.iconOff ?? "circle-outline")} size={24} color={color} />;
          }}
          getAccessibilityLabel={({ route }) => `${route.title} tab`}
        />
      )}
    >
      {TABS.map((t) => (
        <Tabs.Screen key={t.name} name={t.name} options={{ title: t.title }} />
      ))}
    </Tabs>
  );
}
