// Dish page: everything about one dish for the current plan. Photo, the two numbers that matter,
// the plant to use, one action (how to prepare). Reasons and evidence sit behind collapsed sections.
import { router, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

import { BundleGate } from "../../components/BundleGate";
import { PriceRow } from "../../components/PriceEntry";
import { Screen } from "../../components/Screen";
import { Bar, Body, Caption, Expander, Heading, OutlineButton, PhotoRow, Poster, PrimaryButton, Reveal, Small, Stat, StateView, Tag, Thumb } from "../../components/ui";
import { suggestDishes } from "../../engine/suggest";
import { Bundle, DishSuggestion } from "../../engine/types";
import { dishPhoto, plantPhoto } from "../../lib/photos";
import { naira, plainReason, plantLabel } from "../../lib/words";
import { toPlanInput, usePlan } from "../../state/PlanContext";
import { useAppTheme } from "../../theme";
import { space, type } from "../../theme/tokens";

function why(d: DishSuggestion): string {
  if (d.protein.drivers.length) return d.protein.drivers[0][0].toUpperCase() + d.protein.drivers[0].slice(1) + ".";
  if (d.alternatives.length && d.alternatives.every((a) => a.score === null)) return "The only plant here with a price so far.";
  return "The only plant listed for this dish.";
}

const openPlant = (id: string) => router.push({ pathname: "/plant/[plantId]", params: { plantId: id } });

function FindButton({ dishId, name }: { dishId: string; name: string }) {
  return <OutlineButton label="Find around you" onPress={() => router.push({ pathname: "/find/[dishId]", params: { dishId } })} a11yLabel={`Find ${name} around you, on a map or a delivery app`} />;
}

function Available({ d, bundle, servings }: { d: DishSuggestion; bundle: Bundle; servings: number }) {
  const { custom: c } = useAppTheme();
  const plantId = d.protein.ingredientId;
  const people = `${servings} ${servings === 1 ? "person" : "people"}`;
  const noData = d.protein.flags.filter((f) => f.startsWith("no data: ")).map((f) => f.slice(9).replace(/_/g, " "));
  return (
    <>
      <Reveal index={1}>
        <View style={styles.stats}>
          <Stat value={naira(d.totalCostNgn)} label={`for ${people}`} sub={`${naira(d.totalCostPerPersonNgn)} each`} />
          <Stat value={`${d.proteinPerPlateG} g`} label="protein each" />
        </View>
        <Small style={{ marginTop: space.sm }}>{d.costLabel}</Small>
      </Reveal>

      <Reveal index={2}>
        <Pressable
          onPress={() => openPlant(plantId)}
          accessibilityRole="button"
          accessibilityLabel={`Made with ${plantLabel(bundle, plantId)}. Open plant`}
          style={({ pressed }) => [styles.uses, { borderColor: c.hairline, opacity: pressed ? 0.7 : 1 }]}
        >
          <Thumb image={plantPhoto(plantId)} size={52} />
          <View style={{ flex: 1 }}>
            <Caption>MADE WITH</Caption>
            <Text style={[type.heading, { color: c.onBackground }]}>{plantLabel(bundle, plantId)}</Text>
          </View>
          <Text style={[type.label, { color: c.onBackground, textDecorationLine: "underline" }]}>View</Text>
        </Pressable>
      </Reveal>

      <Reveal index={3}>
        <PrimaryButton
          label="How to prepare"
          onPress={() => router.push({ pathname: "/prepare/[dishId]", params: { dishId: d.dishId, plant: plantId } })}
          a11yLabel={`How to prepare ${d.name}`}
        />
        <View style={{ height: space.sm }} />
        <FindButton dishId={d.dishId} name={d.name} />
      </Reveal>

      <Reveal index={4}>
        <Expander title="Why this plant">
          <Body>{why(d)}</Body>
          <Small>Fit for this dish, compared with the other plants listed</Small>
          <Bar value={d.protein.fit} label="Fit for this dish" />
          {d.alternatives.length ? <Caption>ALSO SUITS THIS DISH</Caption> : null}
          {d.alternatives.map((a) => (
            <PhotoRow
              key={a.ingredientId}
              source={plantPhoto(a.ingredientId)}
              title={plantLabel(bundle, a.ingredientId)}
              sub={a.score === null ? "Price needed" : `${naira(a.costPerPersonNgn ?? 0)} each`}
              onPress={() => openPlant(a.ingredientId)}
              a11yLabel={`${plantLabel(bundle, a.ingredientId)}. Open plant`}
            />
          ))}
        </Expander>
        <Expander title="How do we know?">
          <View style={styles.tags}>
            <Tag label="Published values" />
            {d.protein.priceSource === "user" ? <Tag label="Your price" /> : <Tag label={`Price ${d.protein.quality.price}`} />}
            {d.protein.quality.composition === "estimated" ? <Tag label="Some values estimated" /> : null}
            <Tag label={`Portion ${d.portionQuality}`} />
          </View>
          <Small muted={false}>
            Fit compares published values of each plant for this dish, like how well it foams and holds water. How much each property matters is our team estimate.
          </Small>
          <Small muted={false}>
            {d.protein.asSoldG} g of dry {plantLabel(bundle, plantId).toLowerCase()} for your group, about {d.dryGPerServing} g each.
          </Small>
          {noData.length ? <Small muted={false}>No published value yet for: {noData.join(", ")}.</Small> : null}
          {d.notEnoughData.length ? (
            <Small muted={false}>Not ranked, not enough published data: {d.notEnoughData.map((n) => plantLabel(bundle, n.id)).join(", ")}.</Small>
          ) : null}
        </Expander>
      </Reveal>
    </>
  );
}

function DishBody({ bundle }: { bundle: Bundle }) {
  const { plan } = usePlan();
  const { dishId } = useLocalSearchParams<{ dishId: string }>();
  const dish = bundle.dishes.find((d) => d.id === dishId);
  const result = useMemo(() => (dish ? suggestDishes({ ...toPlanInput(plan), mode: "dish", dishId: dish.id }, bundle) : null), [plan, bundle, dish]);

  if (!dish || !result) {
    return (
      <Screen backLabel="Back">
        <StateView kind="empty" title="We could not find that dish" message="Go back and pick a dish." />
      </Screen>
    );
  }
  const d = result.dishes[0];
  const ex = result.excluded[0];
  const unpriced = dish.protein_slot_ids.filter((id) => bundle.ingredients[id]?.price_ngn_per_kg === null && plan.userPrices[id] === undefined);

  return (
    <Screen backLabel="Back">
      <Reveal>
        <Poster source={dishPhoto(dish.id)} height={420}>
          <Caption>DISH</Caption>
          <Heading level="display">{dish.name.split(" (")[0]}</Heading>
          {dish.summary_line ? <Body muted>{dish.summary_line}</Body> : null}
        </Poster>
      </Reveal>

      {d ? (
        <Available d={d} bundle={bundle} servings={plan.servings} />
      ) : (
        <Reveal index={1}>
          <View style={{ gap: space.md }}>
            <Heading level="title">Not available yet</Heading>
            <Body muted>{ex ? plainReason(bundle, ex.reason) : "We cannot suggest this dish with your plan."}</Body>
            {unpriced.length ? <Body>If you know the price, add it and we will work it out.</Body> : null}
            {unpriced.map((id) => (
              <PriceRow key={id} id={id} bundle={bundle} />
            ))}
            <FindButton dishId={dish.id} name={dish.name} />
          </View>
        </Reveal>
      )}
    </Screen>
  );
}

export default function DishPage() {
  return <BundleGate>{(bundle) => <DishBody bundle={bundle} />}</BundleGate>;
}

const styles = StyleSheet.create({
  stats: { flexDirection: "row", flexWrap: "wrap", gap: space.xl },
  uses: { flexDirection: "row", alignItems: "center", gap: space.md, borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: space.md, minHeight: 72 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
});
