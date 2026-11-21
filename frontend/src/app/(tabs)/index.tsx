// Home: start with what is in your kitchen (tap photos to tick), then browse dishes underneath.
// Once something is ticked, a small Done button takes you to the dishes you can make.
import { router } from "expo-router";
import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

import { BundleGate } from "../../components/BundleGate";
import { Grid } from "../../components/Grid";
import { Screen } from "../../components/Screen";
import { Caption, Heading, PhotoCard, Poster, PrimaryButton, Reveal, SectionTitle, Small } from "../../components/ui";
import { suggestDishes } from "../../engine/suggest";
import { Bundle } from "../../engine/types";
import { HERO_PHOTO, dishPhoto, plantPhoto } from "../../lib/photos";
import { naira, plantName } from "../../lib/words";
import { toPlanInput, usePlan } from "../../state/PlanContext";
import { useAppTheme } from "../../theme";
import { space, type } from "../../theme/tokens";

function HomeBody({ bundle }: { bundle: Bundle }) {
  const { custom: c } = useAppTheme();
  const { plan, update } = usePlan();
  const result = useMemo(() => suggestDishes({ ...toPlanInput(plan), mode: "pantry" }, bundle), [plan, bundle]);
  const priceOf = new Map(result.dishes.map((d) => [d.dishId, d.totalCostNgn]));
  const people = `${plan.servings} ${plan.servings === 1 ? "person" : "people"}`;
  const picked = plan.pantryIds.length;
  const toggle = (id: string) => update({ pantryIds: plan.pantryIds.includes(id) ? plan.pantryIds.filter((x) => x !== id) : [...plan.pantryIds, id] });

  return (
    <Screen
      footer={
        picked ? (
          <PrimaryButton compact label={`Done · ${picked} picked`} onPress={() => router.navigate("/suggestions")} a11yLabel={`Done, ${picked} picked. See the dishes you can make`} />
        ) : undefined
      }
    >
      <Reveal>
        <Poster source={HERO_PHOTO} height={300}>
          <Caption>STEP 1</Caption>
          <Heading level="hero">What's in your kitchen?</Heading>
        </Poster>
      </Reveal>

      <Reveal index={1}>
        <SectionTitle title="Tap what you have" note={picked ? `${picked} picked` : undefined} />
        <Grid columns={3}>
          {bundle.ingredientOrder.map((id) => {
            const n = plantName(bundle, id);
            const have = plan.pantryIds.includes(id);
            return (
              <PhotoCard
                key={id}
                checkbox
                source={plantPhoto(id)}
                title={n.local ?? n.english}
                sub={n.local ? n.english : undefined}
                selected={have}
                onPress={() => toggle(id)}
                onLongPress={() => router.push({ pathname: "/plant/[plantId]", params: { plantId: id } })}
                longPressHint="Long press to see what this plant is good for"
                a11yLabel={`${n.local ?? n.english}${n.local ? `, ${n.english}` : ""}`}
              />
            );
          })}
        </Grid>
        <Small style={{ marginTop: space.md }}>Long press a photo to learn about that plant.</Small>
      </Reveal>

      <Reveal index={2}>
        <Pressable
          onPress={() => router.push("/plan")}
          accessibilityRole="button"
          accessibilityLabel={`Your plan: ${people}, budget ${naira(plan.budgetNgn)}. Change`}
          style={({ pressed }) => [styles.plan, { borderColor: c.hairline, opacity: pressed ? 0.7 : 1 }]}
        >
          <View style={{ flex: 1 }}>
            <Caption>YOUR PLAN</Caption>
            <Text style={[type.heading, { color: c.onBackground }]}>
              {people} · {naira(plan.budgetNgn)}
            </Text>
          </View>
          <Text style={[type.label, { color: c.onBackground, textDecorationLine: "underline" }]}>Change</Text>
        </Pressable>
      </Reveal>

      <Reveal index={3}>
        <SectionTitle title="Dishes" action={{ label: "See all", onPress: () => router.navigate("/suggestions") }} />
        <Grid columns={2}>
          {bundle.dishes.map((d) => {
            const price = priceOf.get(d.id);
            const sub = price !== undefined ? naira(price) : "Not available yet";
            return (
              <PhotoCard
                key={d.id}
                source={dishPhoto(d.id)}
                title={d.name.split(" (")[0]}
                sub={sub}
                aspect={0.82}
                onPress={() => router.push({ pathname: "/dish/[dishId]", params: { dishId: d.id } })}
                a11yLabel={`${d.name}, ${sub}. Open`}
              />
            );
          })}
        </Grid>
      </Reveal>
    </Screen>
  );
}

export default function Home() {
  return <BundleGate>{(bundle) => <HomeBody bundle={bundle} />}</BundleGate>;
}

const styles = StyleSheet.create({
  plan: { flexDirection: "row", alignItems: "center", gap: space.md, borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: space.lg, minHeight: 72 },
});
