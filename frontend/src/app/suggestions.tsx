// Suggestions: ranked dish cards from suggestDishes, then dishes that are not available yet.
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";

import { BundleGate } from "../components/BundleGate";
import { LimitsLink, Screen } from "../components/Screen";
import { Bar, Body, Card, Expander, Heading, Reveal, Small, StateView, Tag } from "../components/ui";
import { suggestDishes } from "../engine/suggest";
import { Bundle, DishSuggestion, RankedItem } from "../engine/types";
import { dishIcon } from "../lib/icons";
import { joinAnd, naira, plainReason, plantLabel, plantName } from "../lib/words";
import { toPlanInput, usePlan } from "../state/PlanContext";
import { useAppTheme } from "../theme";
import { radius, space, type } from "../theme/tokens";

const noDataProps = (i: RankedItem) => i.flags.filter((f) => f.startsWith("no data: ")).map((f) => f.slice(9).replace(/_/g, " "));

function DishCard({ d, bundle, index, servings, allergens }: { d: DishSuggestion; bundle: Bundle; index: number; servings: number; allergens: string[] }) {
  const { custom: c } = useAppTheme();
  const plant = plantName(bundle, d.protein.ingredientId);
  const plantShort = (plant.local ?? plant.english).toLowerCase();
  const missingData = noDataProps(d.protein);
  const unpriced = d.alternatives.filter((a) => a.score === null);
  const dish = bundle.dishes.find((x) => x.id === d.dishId);
  const leftOut = (dish?.protein_slot_ids ?? []).filter((id) => bundle.ingredients[id]?.allergen_tags.some((t) => allergens.includes(t)));
  const owned = d.missingItems.length === 0;

  return (
    <Reveal index={index}>
      <Pressable
        onPress={() => router.push({ pathname: "/prepare/[dishId]", params: { dishId: d.dishId, plant: d.protein.ingredientId } })}
        accessibilityRole="button"
        accessibilityLabel={`${d.name} with ${plantLabel(bundle, d.protein.ingredientId)}, about ${naira(d.proteinCostNgn ?? 0)} for ${servings}. Open preparation steps.`}
        style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] })}
      >
        <Card style={{ gap: space.md }}>
          <View style={styles.head}>
            <View style={[styles.block, { backgroundColor: index === 0 ? c.accentContainer : c.primaryContainer }]}>
              <MaterialCommunityIcons name={dishIcon(d.dishId)} size={30} color={index === 0 ? c.onAccentContainer : c.onPrimaryContainer} />
            </View>
            <View style={{ flex: 1 }}>
              <Heading level="title">{d.name}</Heading>
              <Body muted>with {plantLabel(bundle, d.protein.ingredientId)}</Body>
            </View>
          </View>

          <View style={styles.numbers}>
            <View style={{ flex: 1 }}>
              <Text style={[type.title, { color: c.onBackground }]}>{naira(d.proteinCostNgn ?? 0)}</Text>
              <Small>
                for {servings} {servings === 1 ? "person" : "people"} ({naira(d.proteinCostPerPersonNgn ?? 0)} each). Protein ingredient only, no oil or spices
              </Small>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[type.title, { color: c.onBackground }]}>{d.proteinPerPlateG} g</Text>
              <Small>
                protein per plate, from {d.dryGPerServing} g dry {plantShort} each (typical portion, estimate)
              </Small>
            </View>
          </View>

          <View style={{ gap: space.xs }}>
            <Bar value={d.protein.fit} label={`How well ${plantShort} suits ${d.name}, compared with the other plants listed`} />
            <Small>How well {plantShort} suits this dish, compared with the other plants listed</Small>
          </View>

          <Body>
            <Text style={{ fontWeight: "600" }}>Why: </Text>
            {d.summaryLine}
          </Body>

          <View style={styles.tags}>
            {missingData.length ? <Tag icon="help-circle-outline" label="Some data missing" tone="warn" /> : <Tag icon="book-check-outline" label="Published values" tone="good" />}
            {d.protein.quality.composition === "estimated" ? <Tag icon="approximately-equal" label="Some values estimated" /> : null}
            {owned ? <Tag icon="basket-check-outline" label="Already in your kitchen" tone="good" /> : null}
            {unpriced.length ? <Tag icon="tag-off-outline" label={`Price needed for ${unpriced.length} other plant${unpriced.length === 1 ? "" : "s"}`} /> : null}
          </View>

          {leftOut.length ? (
            <Small>
              Left out because of your allergen list: {joinAnd(leftOut.map((id) => plantName(bundle, id).english.toLowerCase()))}.
            </Small>
          ) : null}

          <Expander title="How do we know?">
            <View style={{ gap: space.sm, paddingTop: space.xs }}>
              <Small muted={false}>
                Fit compares published values (foaming, water and oil holding and others) of each plant for this dish. Score from {d.protein.fitRange[0].toFixed(2)} to{" "}
                {d.protein.fitRange[1].toFixed(2)} across the published samples. The weights for each property are our team estimate.
              </Small>
              {missingData.length ? <Small muted={false}>No published value yet for: {missingData.join(", ")}.</Small> : null}
              {d.protein.costPerGProtein !== null ? (
                <Small muted={false}>
                  {d.protein.asSoldG} g of dry {plant.english.toLowerCase()} for your group ({d.proteinTotalG} g protein). About {naira(d.protein.costPerGProtein)} per gram of
                  protein. Price {d.protein.quality.price}. With the sides, about {naira(d.totalCostNgn)} for the group.
                </Small>
              ) : null}
              {d.alternatives.map((a) => {
                const nd = noDataProps(a);
                const bits = [a.score === null ? "price needed" : `${naira(a.costNgn ?? 0)}`, nd.length ? `no data for ${nd.join(", ")}` : null].filter(Boolean);
                return (
                  <Small key={a.ingredientId} muted={false}>
                    Also suits it: {plantLabel(bundle, a.ingredientId)}, fit {a.fit.toFixed(2)} ({bits.join("; ")})
                  </Small>
                );
              })}
            </View>
          </Expander>

          <View style={styles.cta}>
            <Text style={[type.bodyStrong, { color: c.primary }]}>See how to prepare</Text>
            <MaterialCommunityIcons name="chevron-right" size={24} color={c.primary} />
          </View>
        </Card>
      </Pressable>
    </Reveal>
  );
}

function SuggestionsBody({ bundle }: { bundle: Bundle }) {
  const { custom: c } = useAppTheme();
  const { plan } = usePlan();
  const input = toPlanInput(plan);
  const result = useMemo(() => suggestDishes(toPlanInput(plan), bundle), [plan, bundle]);
  const dishName = (id: string) => bundle.dishes.find((d) => d.id === id)?.name ?? id;

  return (
    <Screen>
      <Reveal>
        <Heading level="display">{result.dishes.length ? "You can make" : "Nothing fits yet"}</Heading>
        <Body muted style={{ marginTop: space.sm }}>
          For {plan.servings} {plan.servings === 1 ? "person" : "people"}, budget {naira(plan.budgetNgn)}, about {input.targetProteinG} g protein each.
        </Body>
      </Reveal>

      {result.dishes.length === 0 ? (
        <StateView
          kind="empty"
          title="No dish fits these choices"
          message="Try a bigger budget or fewer people. The reasons for each dish are below."
          action={
            <Button mode="outlined" onPress={() => router.back()} style={{ borderRadius: radius.control }} contentStyle={{ minHeight: 48 }}>
              Change my choices
            </Button>
          }
        />
      ) : (
        result.dishes.map((d, i) => <DishCard key={d.dishId} d={d} bundle={bundle} index={i + 1} servings={plan.servings} allergens={plan.allergens} />)
      )}

      {result.excluded.length ? (
        <Reveal index={result.dishes.length + 1}>
          <View style={{ gap: space.sm }}>
            <Heading level="heading">Not available yet</Heading>
            {result.excluded.map((e) => (
              <View key={e.id} style={[styles.excluded, { borderColor: c.hairline }]}>
                <MaterialCommunityIcons name={dishIcon(e.id)} size={24} color={c.onSurfaceVariant} />
                <View style={{ flex: 1 }}>
                  <Text style={[type.bodyStrong, { color: c.onSurfaceVariant }]}>{dishName(e.id)}</Text>
                  <Small>{plainReason(bundle, e.reason)}</Small>
                </View>
              </View>
            ))}
          </View>
        </Reveal>
      ) : null}

      <LimitsLink />
    </Screen>
  );
}

export default function Suggestions() {
  return <BundleGate>{(bundle) => <SuggestionsBody bundle={bundle} />}</BundleGate>;
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", gap: space.md, alignItems: "center" },
  block: { width: 60, height: 60, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  numbers: { flexDirection: "row", gap: space.lg },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  cta: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", minHeight: 48 },
  excluded: { flexDirection: "row", gap: space.md, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: space.md, alignItems: "flex-start" },
});
