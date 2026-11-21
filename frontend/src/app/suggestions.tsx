// Suggestions: ranked dish cards from suggestDishes, then dishes that are not available yet.
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

import { BundleGate } from "../components/BundleGate";
import { LimitsLink, Screen } from "../components/Screen";
import { Bar, Body, Expander, Heading, HeroTile, Meta, PrimaryButton, Reveal, SectionTitle, Small, StateView, Tag } from "../components/ui";
import { suggestDishes } from "../engine/suggest";
import { Bundle, DishSuggestion, RankedItem } from "../engine/types";
import { dishIcon } from "../lib/icons";
import { joinAnd, naira, plainReason, plantLabel, plantName } from "../lib/words";
import { toPlanInput, usePlan } from "../state/PlanContext";
import { useAppTheme } from "../theme";
import { radius, space, type } from "../theme/tokens";

function whyLine(d: DishSuggestion): string {
  if (d.protein.drivers.length) return d.protein.drivers.join(" and ");
  if (d.alternatives.length && d.alternatives.every((a) => a.score === null)) return "the only plant listed for this dish with a market price so far";
  return "the only plant listed for this dish";
}

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
  const ranked = [d.protein, ...d.alternatives].sort((a, b) => b.fit - a.fit);
  const fitRank = ranked.findIndex((i) => i.ingredientId === d.protein.ingredientId) + 1;
  const fitLabel = ranked.length === 1 ? "Only plant listed" : fitRank === 1 ? `Best fit of ${ranked.length} plants` : `Fit #${fitRank} of ${ranked.length} plants`;
  const open = () => router.push({ pathname: "/prepare/[dishId]", params: { dishId: d.dishId, plant: d.protein.ingredientId } });

  return (
    <Reveal index={index}>
      <View style={[styles.card, { backgroundColor: c.surface }]}>
        <Pressable
          onPress={open}
          accessibilityRole="button"
          accessibilityLabel={`${d.name} with ${plantLabel(bundle, d.protein.ingredientId)}, about ${naira(d.totalCostNgn)} for ${servings}. Open preparation steps.`}
          style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
        >
          <HeroTile icon={dishIcon(d.dishId)} height={index === 1 ? 190 : 150} tone={index === 1 ? "green" : "dark"}>
            <View style={[styles.rank, { backgroundColor: c.background }]}>
              <Text style={[type.label, { color: c.primary }]}>#{index}</Text>
            </View>
            {owned ? (
              <View style={[styles.owned, { backgroundColor: c.primary }]}>
                <MaterialCommunityIcons name="basket-check" size={18} color={c.onPrimary} />
              </View>
            ) : null}
          </HeroTile>

          <View style={styles.cardBody}>
            <View style={styles.titleRow}>
              <View style={{ flex: 1 }}>
                <Text style={[type.title, { color: c.onBackground }]}>{d.name}</Text>
                <Small>with {plantLabel(bundle, d.protein.ingredientId)}</Small>
              </View>
              <Text style={[type.title, { color: c.primary }]}>{naira(d.totalCostNgn)}</Text>
            </View>

            <View style={styles.metaRow}>
              <Meta icon="account-group" label={`${servings} ${servings === 1 ? "person" : "people"}`} />
              <Meta icon="weight-gram" label={`${d.proteinPerPlateG} g protein per plate`} />
              <Meta icon="leaf" label={fitLabel} />
            </View>
            <Small>Protein only, excludes oil and spices</Small>
          </View>
        </Pressable>

        <View style={{ gap: space.md }}>
          <View style={{ gap: space.xs }}>
            <Bar value={d.protein.fit} label={`How well ${plantShort} suits ${d.name}, compared with the other plants listed`} />
            <Small>How well {plantShort} suits this dish, compared with the other plants listed</Small>
          </View>

          <Body>
            <Text style={{ color: c.primary }}>Why: </Text>
            {whyLine(d)}.
          </Body>

          <View style={styles.tags}>
            {missingData.length ? <Tag icon="help-circle-outline" label="Some data missing" tone="warn" /> : <Tag icon="book-check-outline" label="Published values" tone="good" />}
            {d.protein.quality.composition === "estimated" ? <Tag icon="approximately-equal" label="Some values estimated" /> : null}
            {owned ? <Tag icon="basket-check-outline" label="Already in your kitchen" tone="good" /> : null}
            {unpriced.length ? <Tag icon="tag-off-outline" label={`Price needed for ${unpriced.length} other plant${unpriced.length === 1 ? "" : "s"}`} tone="warn" /> : null}
          </View>

          {leftOut.length ? <Small>Left out because of your allergen list: {joinAnd(leftOut.map((id) => plantName(bundle, id).english.toLowerCase()))}.</Small> : null}

          <Expander title="How do we know?">
            <View style={{ gap: space.sm, paddingTop: space.xs }}>
              <Small muted={false}>
                Fit compares published values (foaming, water and oil holding and others) of each plant for this dish. Score from {d.protein.fitRange[0].toFixed(2)} to{" "}
                {d.protein.fitRange[1].toFixed(2)} across the published samples. The weights for each property are our team estimate.
              </Small>
              {missingData.length ? <Small muted={false}>No published value yet for: {missingData.join(", ")}.</Small> : null}
              {d.protein.costPerGProtein !== null ? (
                <Small muted={false}>
                  {d.protein.asSoldG} g of dry {plant.english.toLowerCase()} for your group. About {naira(d.protein.costPerGProtein)} per gram of protein. Price {d.protein.quality.price}.
                </Small>
              ) : null}
              {d.alternatives.map((a) => {
                const nd = noDataProps(a);
                const bits = [a.score === null ? "price needed" : naira(a.costNgn ?? 0), nd.length ? `no data for ${nd.join(", ")}` : null].filter(Boolean);
                return (
                  <Small key={a.ingredientId} muted={false}>
                    Also suits it: {plantLabel(bundle, a.ingredientId)}, fit {a.fit.toFixed(2)} ({bits.join("; ")})
                  </Small>
                );
              })}
            </View>
          </Expander>

          <PrimaryButton label="See how to prepare" onPress={open} icon="chef-hat" />
        </View>
      </View>
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
        <View style={[styles.metaRow, { marginTop: space.sm }]}>
          <Meta icon="account-group" label={`${plan.servings} ${plan.servings === 1 ? "person" : "people"}`} />
          <Meta icon="wallet-outline" label={`Budget ${naira(plan.budgetNgn)}`} />
          <Meta icon="food-variant" label={`about ${input.targetProteinG} g protein each`} />
        </View>
      </Reveal>

      {result.dishes.length === 0 ? (
        <StateView
          kind="empty"
          title="No dish fits these choices"
          message="Try a bigger budget or fewer people. The reasons for each dish are below."
          action={<PrimaryButton label="Change my choices" onPress={() => router.back()} icon="pencil" />}
        />
      ) : (
        result.dishes.map((d, i) => <DishCard key={d.dishId} d={d} bundle={bundle} index={i + 1} servings={plan.servings} allergens={plan.allergens} />)
      )}

      {result.excluded.length ? (
        <Reveal index={result.dishes.length + 1}>
          <SectionTitle title="Not available yet" note={`${result.excluded.length} dishes`} />
          <View style={{ gap: space.sm }}>
            {result.excluded.map((e) => (
              <View key={e.id} style={[styles.excluded, { backgroundColor: c.muted }]}>
                <View style={[styles.excludedIcon, { backgroundColor: c.surfaceVariant }]}>
                  <MaterialCommunityIcons name={dishIcon(e.id)} size={24} color={c.onSurfaceVariant} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[type.bodyStrong, { color: c.onMuted }]}>{dishName(e.id)}</Text>
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
  card: { borderRadius: radius.block, padding: space.md, gap: space.md },
  cardBody: { paddingHorizontal: space.xs, paddingTop: space.md, gap: space.sm },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: space.md },
  rank: { position: "absolute", top: 14, left: 14, borderRadius: radius.round, paddingHorizontal: 12, paddingVertical: 6 },
  owned: { position: "absolute", top: 14, right: 14, width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: space.md },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  excluded: { flexDirection: "row", gap: space.md, borderRadius: radius.card, padding: space.md, alignItems: "center" },
  excludedIcon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
});
