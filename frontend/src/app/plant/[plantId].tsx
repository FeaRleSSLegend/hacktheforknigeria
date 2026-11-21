// What this plant is good for: the dishes it suits, ranked by the engine (dishesForPlant).
import { useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

import { BundleGate } from "../../components/BundleGate";
import { Screen } from "../../components/Screen";
import { Heading, Reveal, SectionTitle, Small, Tag } from "../../components/ui";
import { dishesForPlant } from "../../engine/plant";
import { Bundle } from "../../engine/types";
import { joinAnd, naira, plantLabel } from "../../lib/words";
import { toPlanInput, usePlan } from "../../state/PlanContext";
import { useAppTheme } from "../../theme";
import { radius, space, type } from "../../theme/tokens";

function PlantBody({ bundle, plantId }: { bundle: Bundle; plantId: string }) {
  const { custom: c } = useAppTheme();
  const { plan } = usePlan();
  const r = useMemo(() => dishesForPlant(plantId, toPlanInput(plan), bundle), [plantId, plan, bundle]);
  const people = `${plan.servings} ${plan.servings === 1 ? "person" : "people"}`;

  return (
    <Screen backLabel="Back">
      <Reveal>
        <Heading level="display">What this plant is good for</Heading>
        <Small>{plantLabel(bundle, plantId)}</Small>
      </Reveal>

      {r.dishes.length === 0 ? <Small muted={false}>No dish here has enough published data for this plant yet.</Small> : null}

      {r.dishes.map((d, i) => (
        <Reveal key={d.dishId} index={i + 1}>
          <View
            style={[styles.card, { backgroundColor: c.surface }]}
            accessible
            accessibilityLabel={`${d.name}. Ranked ${d.rankInDish} of ${d.candidatesRanked} plants for this dish. ${
              d.proteinCostNgn === null ? "Price needed" : `${naira(d.proteinCostNgn)} total for ${people}`
            }. ${d.proteinPerPlateG} grams protein per person.`}
          >
            <Text style={[type.title, { color: c.onBackground }]}>{d.name}</Text>
            <Small>{`Ranked ${d.rankInDish} of ${d.candidatesRanked} plants for this dish`}</Small>
            <Text style={[type.bodyStrong, { color: c.onBackground }]}>
              {d.proteinCostNgn === null || d.proteinCostPerPersonNgn === null
                ? "Price needed"
                : `${naira(d.proteinCostNgn)} total for ${people} (${naira(d.proteinCostPerPersonNgn)} each)`}
            </Text>
            <Text style={[type.label, { color: c.onSurfaceVariant }]}>protein ingredient only, no oil or spices</Text>
            <Text style={[type.bodyStrong, { color: c.onBackground }]}>{`${d.proteinPerPlateG} g protein per person`}</Text>
            <Small>{d.summaryLine}</Small>
            {d.priceSource === "user" ? <Tag icon="pencil-outline" label="your price" tone="good" /> : null}
          </View>
        </Reveal>
      ))}

      {r.notEnoughData.length ? (
        <View style={{ gap: space.xs }}>
          <SectionTitle title="Not enough data" />
          {r.notEnoughData.map((n) => (
            <Small key={n.dishId} muted={false}>
              {`${n.name}: no published value for ${joinAnd(n.missingNeeds.map((m) => m.replace(/_/g, " ")))}.`}
            </Small>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

export default function Plant() {
  const { plantId } = useLocalSearchParams<{ plantId: string }>();
  return <BundleGate>{(bundle) => <PlantBody bundle={bundle} plantId={String(plantId)} />}</BundleGate>;
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.block, padding: space.lg, gap: space.xs },
});
