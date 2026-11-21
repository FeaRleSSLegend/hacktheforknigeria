// Results: one card per dish (name, plant, price, protein, one line of why), then dishes not available yet.
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

import { BundleGate } from "../components/BundleGate";
import { PriceEntry } from "../components/PriceEntry";
import { Screen } from "../components/Screen";
import { Bar, Body, Expander, Heading, IconTile, PrimaryButton, Reveal, SectionTitle, Small, StateView, Tag } from "../components/ui";
import { suggestDishes } from "../engine/suggest";
import { Bundle, DishSuggestion, RankedItem } from "../engine/types";
import { dishIcon } from "../lib/icons";
import { joinAnd, naira, plainReason, plantLabel, plantName } from "../lib/words";
import { toPlanInput, usePlan } from "../state/PlanContext";
import { useAppTheme } from "../theme";
import { radius, space, type } from "../theme/tokens";

function shortWhy(d: DishSuggestion): string {
  if (d.protein.drivers.length) return d.protein.drivers[0][0].toUpperCase() + d.protein.drivers[0].slice(1) + ".";
  if (d.alternatives.length && d.alternatives.every((a) => a.score === null)) return "The only plant here with a price so far.";
  return "The only plant listed for this dish.";
}

const noDataProps = (i: RankedItem) => i.flags.filter((f) => f.startsWith("no data: ")).map((f) => f.slice(9).replace(/_/g, " "));

function DishCard({ d, bundle, index, servings, allergens }: { d: DishSuggestion; bundle: Bundle; index: number; servings: number; allergens: string[] }) {
  const { custom: c } = useAppTheme();
  const plant = plantName(bundle, d.protein.ingredientId);
  const missingData = noDataProps(d.protein);
  const unpriced = d.alternatives.filter((a) => a.score === null);
  const dish = bundle.dishes.find((x) => x.id === d.dishId);
  const leftOut = (dish?.protein_slot_ids ?? []).filter((id) => bundle.ingredients[id]?.allergen_tags.some((t) => allergens.includes(t)));
  const owned = d.missingItems.length === 0;
  const people = `${servings} ${servings === 1 ? "person" : "people"}`;
  const total = d.proteinCostNgn === null ? "Price needed" : naira(d.proteinCostNgn);
  const each = d.proteinCostPerPersonNgn === null ? "price needed" : naira(d.proteinCostPerPersonNgn);
  const why = dish?.summary_line ?? shortWhy(d);
  const open = () => router.push({ pathname: "/prepare/[dishId]", params: { dishId: d.dishId, plant: d.protein.ingredientId } });
  const summary = `${d.name}, with ${plantLabel(bundle, d.protein.ingredientId)}. ${total} total for ${people}, ${each} each. ${d.proteinPerPlateG} grams protein per person.`;

  return (
    <Reveal index={index}>
      <View style={[styles.card, { backgroundColor: c.surface }]}>
        <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={summary} accessibilityHint="Opens how to prepare" android_ripple={{ color: "rgba(255,255,255,0.08)" }} style={{ gap: space.md }}>
          <View style={styles.head}>
            <IconTile icon={dishIcon(d.dishId)} size={60} tone={index === 1 ? "green" : "dark"} />
            <View style={{ flex: 1 }}>
              <Text style={[type.title, { color: c.onBackground }]}>{d.name}</Text>
              <Small>with {plantLabel(bundle, d.protein.ingredientId)}</Small>
            </View>
          </View>

          <View style={styles.numbers}>
            <View style={{ flex: 3 }}>
              <Text style={[type.display, { color: c.primary }]}>{total}</Text>
              <Text style={[type.bodyStrong, { color: c.onBackground }]}>
                {`total for ${people} (${each} each)`}
              </Text>
              <Text style={[type.label, { color: c.onSurfaceVariant }]}>protein ingredient only, no oil or spices</Text>
              {d.protein.priceSource === "user" ? <Tag icon="pencil-outline" label="your price" tone="good" /> : null}
            </View>
            <View style={{ flex: 2 }}>
              <Text style={[type.display, { color: c.onBackground }]}>{d.proteinPerPlateG} g</Text>
              <Text style={[type.bodyStrong, { color: c.onBackground }]}>protein per person</Text>
            </View>
          </View>

          <Body>
            <Text style={{ color: c.primary }}>Why: </Text>
            {why}
          </Body>

          <View style={{ gap: space.xs }}>
            <Text style={[type.label, { color: c.onSurfaceVariant }]}>Fit for this dish</Text>
            <Bar value={d.protein.fit} label={`Fit for this dish, compared with the other plants listed`} />
          </View>

          {missingData.length ? <Tag icon="help-circle-outline" label="Some data missing" tone="warn" /> : null}
        </Pressable>

        <Expander title="How do we know?">
          <View style={{ gap: space.sm, paddingTop: space.xs }}>
            <View style={styles.tags}>
              <Tag icon="book-check-outline" label="Published values" tone="good" />
              {owned ? <Tag icon="basket-check-outline" label="Already in your kitchen" tone="good" /> : null}
              {unpriced.length ? <Tag icon="tag-off-outline" label={`Price needed for ${unpriced.length} other plant${unpriced.length === 1 ? "" : "s"}`} tone="warn" /> : null}
              {d.protein.quality.composition === "estimated" ? <Tag icon="approximately-equal" label="Some values estimated" /> : null}
            </View>
            <Small muted={false}>
              Fit compares published values of each plant for this dish, like how well it foams and holds water. The weights are our team estimate.
            </Small>
            {missingData.length ? <Small muted={false}>No published value yet for: {missingData.join(", ")}.</Small> : null}
            {d.protein.costPerGProtein !== null ? (
              <Small muted={false}>
                {d.protein.asSoldG} g of dry {plant.english.toLowerCase()} for your group. Price {d.protein.quality.price}.
              </Small>
            ) : null}
            {d.alternatives.map((a) => (
              <Small key={a.ingredientId} muted={false}>
                Also suits it: {plantLabel(bundle, a.ingredientId)} ({a.score === null ? "price needed" : naira(a.costNgn ?? 0)})
              </Small>
            ))}
            {leftOut.length ? <Small muted={false}>Left out for your allergies: {joinAnd(leftOut.map((id) => plantName(bundle, id).english.toLowerCase()))}.</Small> : null}
          </View>
        </Expander>

        <Pressable
          onPress={() => router.push({ pathname: "/plant/[plantId]", params: { plantId: d.protein.ingredientId } })}
          accessibilityRole="link"
          accessibilityLabel={`What ${plantLabel(bundle, d.protein.ingredientId)} is good for`}
          style={{ minHeight: 48, justifyContent: "center" }}
        >
          <Text style={[type.bodyStrong, { color: c.primary }]}>{`What ${plantLabel(bundle, d.protein.ingredientId)} is good for`}</Text>
        </Pressable>
        <PrimaryButton label="See how to prepare" onPress={open} icon="chef-hat" a11yLabel={`See how to prepare ${d.name}`} />
      </View>
    </Reveal>
  );
}

function SuggestionsBody({ bundle }: { bundle: Bundle }) {
  const { custom: c } = useAppTheme();
  const { plan } = usePlan();
  const result = useMemo(() => suggestDishes(toPlanInput(plan), bundle), [plan, bundle]);
  const dishName = (id: string) => bundle.dishes.find((d) => d.id === id)?.name ?? id;

  return (
    <Screen backLabel="Back to your choices">
      <Reveal>
        <Heading level="display">{result.dishes.length ? "You can make" : "Nothing fits yet"}</Heading>
      </Reveal>

      {result.dishes.length === 0 ? (
        <StateView
          kind="empty"
          title="No dish fits these choices"
          message="Try a bigger budget or fewer people."
          action={<PrimaryButton label="Change my choices" onPress={() => router.back()} icon="pencil" />}
        />
      ) : (
        result.dishes.map((d, i) => <DishCard key={d.dishId} d={d} bundle={bundle} index={i + 1} servings={plan.servings} allergens={plan.allergens} />)
      )}

      <PriceEntry bundle={bundle} />

      {result.excluded.length ? (
        <Reveal index={Math.min(result.dishes.length + 1, 6)}>
          <SectionTitle title="Not available yet" />
          <View style={{ gap: space.sm }}>
            {result.excluded.map((e) => (
              <View key={e.id} style={[styles.excluded, { backgroundColor: c.muted }]} accessible accessibilityLabel={`${dishName(e.id)}, not available yet. ${plainReason(bundle, e.reason)}`}>
                <MaterialCommunityIcons name={dishIcon(e.id)} size={24} color={c.onSurfaceVariant} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[type.bodyStrong, { color: c.onMuted }]}>{dishName(e.id)}</Text>
                  <Small>{plainReason(bundle, e.reason)}</Small>
                </View>
              </View>
            ))}
          </View>
        </Reveal>
      ) : null}
    </Screen>
  );
}

export default function Suggestions() {
  return <BundleGate>{(bundle) => <SuggestionsBody bundle={bundle} />}</BundleGate>;
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.block, padding: space.lg, gap: space.md, overflow: "hidden" },
  head: { flexDirection: "row", alignItems: "center", gap: space.md },
  numbers: { flexDirection: "row", flexWrap: "wrap", gap: space.lg },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  excluded: { flexDirection: "row", gap: space.md, borderRadius: radius.card, padding: space.md, alignItems: "center" },
});
