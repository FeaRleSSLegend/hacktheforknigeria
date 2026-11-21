// Find around you: open a map search for places that sell this dish, or a delivery app to order it.
// All links go through src/lib/net.ts. Nothing here is checked by ProteinPath, and we say so.
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Text } from "react-native-paper";

import { BundleGate } from "../../components/BundleGate";
import { Screen } from "../../components/Screen";
import { Body, Caption, Heading, Poster, PrimaryButton, Reveal, SectionTitle, Small, StateView } from "../../components/ui";
import { Bundle } from "../../engine/types";
import { ORDER_SITES, mapSearchUrl, searchName } from "../../lib/find";
import { openExternal } from "../../lib/net";
import { dishPhoto } from "../../lib/photos";
import { useAppTheme } from "../../theme";
import { radius, space, type } from "../../theme/tokens";

function FindBody({ bundle }: { bundle: Bundle }) {
  const { custom: c } = useAppTheme();
  const { dishId } = useLocalSearchParams<{ dishId: string }>();
  const dish = bundle.dishes.find((d) => d.id === dishId);
  const [area, setArea] = useState("");
  const [failed, setFailed] = useState(false);

  if (!dish) {
    return (
      <Screen backLabel="Back to dish">
        <StateView kind="empty" title="We could not find that dish" message="Go back and pick a dish." />
      </Screen>
    );
  }
  const name = searchName(dish.name);
  const place = area.trim();
  const open = async (url: string) => setFailed(!(await openExternal(url)));
  const openMap = () => open(mapSearchUrl(dish.name, place));

  return (
    <Screen backLabel="Back to dish">
      <Reveal>
        <Poster source={dishPhoto(dish.id)} height={280}>
          <Caption>{name.toUpperCase()}</Caption>
          <Heading level="display">Find around you</Heading>
        </Poster>
      </Reveal>

      <Reveal index={1}>
        <View style={{ gap: space.md }}>
          <SectionTitle title="On the map" />
          <Body muted>See places that sell {name.toLowerCase()} near you, or in an area you type.</Body>
          <TextInput
            value={area}
            onChangeText={setArea}
            placeholder="Area, e.g. Yaba, Lagos (optional)"
            placeholderTextColor={c.onSurfaceVariant}
            maxLength={60}
            returnKeyType="search"
            onSubmitEditing={openMap}
            accessibilityLabel="Area to search, optional"
            style={[type.body, styles.input, { color: c.onBackground, borderColor: c.outline }]}
          />
          <PrimaryButton
            label={place ? `Open map: ${place}` : "Open map near me"}
            onPress={openMap}
            a11yLabel={`Open the map to find ${name} ${place ? `in ${place}` : "near you"}`}
          />
        </View>
      </Reveal>

      <Reveal index={2}>
        <View>
          <SectionTitle title="Order online" note={`search "${name}" in the app`} />
          {ORDER_SITES.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => open(s.url)}
              accessibilityRole="link"
              accessibilityLabel={`Open ${s.name}. ${s.note}`}
              style={({ pressed }) => [styles.site, { borderColor: c.hairline, opacity: pressed ? 0.7 : 1 }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[type.heading, { color: c.onBackground }]}>{s.name}</Text>
                <Small>{s.note}</Small>
              </View>
              <MaterialCommunityIcons name="arrow-top-right" size={22} color={c.onBackground} />
            </Pressable>
          ))}
        </View>
      </Reveal>

      <Reveal index={3}>
        <View style={{ gap: space.sm }}>
          {failed ? <Body strong>We could not open that link. Check your connection and try again.</Body> : null}
          <Small>Needs internet. ProteinPath does not check these sellers, their prices or food safety, and is not paid by them.</Small>
          <Small>We do not read your location. The map app uses its own location setting; only the dish name and any area you type go to it.</Small>
        </View>
      </Reveal>
    </Screen>
  );
}

export default function Find() {
  return <BundleGate>{(bundle) => <FindBody bundle={bundle} />}</BundleGate>;
}

const styles = StyleSheet.create({
  input: { minHeight: 48, borderWidth: 1, borderRadius: radius.round, paddingHorizontal: space.lg },
  site: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 64, paddingVertical: space.md, borderTopWidth: 1 },
});
