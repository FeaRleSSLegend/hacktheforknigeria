// Plant page: what this plant is good for (dishesForPlant), whether it is in your kitchen, its protein
// and price. Unpriced plants get a price field so every cost can be worked out.
import { router, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { BundleGate } from "../../components/BundleGate";
import { PriceRow } from "../../components/PriceEntry";
import { Screen } from "../../components/Screen";
import { Body, Caption, Expander, Heading, OutlineButton, PhotoRow, Poster, Reveal, SectionTitle, Small, Stat, StateView } from "../../components/ui";
import { dishesForPlant } from "../../engine/plant";
import { Bundle } from "../../engine/types";
import { dishPhoto, plantPhoto } from "../../lib/photos";
import { joinAnd, naira, plainReason, plantName } from "../../lib/words";
import { toPlanInput, usePlan } from "../../state/PlanContext";
import { space } from "../../theme/tokens";

function PlantBody({ bundle }: { bundle: Bundle }) {
  const { plan, update } = usePlan();
  const { plantId } = useLocalSearchParams<{ plantId: string }>();
  const ing = bundle.ingredients[plantId];
  const pd = useMemo(() => (ing ? dishesForPlant(plantId, toPlanInput(plan), bundle) : null), [plan, bundle, plantId, ing]);

  if (!ing || !pd) {
    return (
      <Screen backLabel="Back">
        <StateView kind="empty" title="We could not find that plant" message="Go back and pick a plant." />
      </Screen>
    );
  }
  const n = plantName(bundle, plantId);
  const have = plan.pantryIds.includes(plantId);
  const userPrice = plan.userPrices[plantId];
  const price = userPrice ?? ing.price_ngn_per_kg;
  const toggle = () => update({ pantryIds: have ? plan.pantryIds.filter((x) => x !== plantId) : [...plan.pantryIds, plantId] });
  const skipped = [...pd.notEnoughData.map((x) => `${x.name}: not enough published data`), ...pd.excluded.map((x) => `${x.name}: ${plainReason(bundle, x.reason)}`)];

  return (
    <Screen backLabel="Back">
      <Reveal>
        <Poster source={plantPhoto(plantId)} height={400}>
          <Caption>PLANT</Caption>
          <Heading level="display">{n.local ?? n.english}</Heading>
          {n.local ? <Body muted>{n.english}</Body> : null}
        </Poster>
      </Reveal>

      <Reveal index={1}>
        <OutlineButton
          label={have ? "In my kitchen" : "Add to my kitchen"}
          on={have}
          onPress={toggle}
          a11yLabel={have ? `${n.english} is in your kitchen. Remove` : `Add ${n.english} to your kitchen`}
        />
      </Reveal>

      <Reveal index={2}>
        <View style={styles.stats}>
          <Stat value={ing.protein_g_per_100g !== null ? `${ing.protein_g_per_100g} g` : "No data"} label="protein per 100 g" sub={ing.quality === "estimated" ? "food table, some values estimated" : "published food table"} />
          <Stat
            value={price !== null ? naira(price) : "Price needed"}
            label={price !== null ? "per kg" : "no market price yet"}
            sub={userPrice !== undefined ? "your price" : price !== null ? `market price, ${ing.price_month}` : undefined}
          />
        </View>
        {ing.allergen_tags.length ? <Small style={{ marginTop: space.md }}>Contains {joinAnd(ing.allergen_tags)}. You can leave it out on your plan.</Small> : null}
      </Reveal>

      {price === null || userPrice !== undefined ? (
        <Reveal index={3}>
          <PriceRow id={plantId} bundle={bundle} />
        </Reveal>
      ) : null}

      <Reveal index={4}>
        <SectionTitle title="Good for" />
        {pd.dishes.length === 0 ? <Body muted>No dish in our data uses this plant yet.</Body> : null}
        {pd.dishes.map((d) => (
          <PhotoRow
            key={d.dishId}
            source={dishPhoto(d.dishId)}
            title={d.name.split(" (")[0]}
            sub={d.rankInDish === 1 ? `Best fit of ${d.candidatesRanked}` : `Fit ${d.rankInDish} of ${d.candidatesRanked}`}
            right={d.proteinCostPerPersonNgn !== null ? `${naira(d.proteinCostPerPersonNgn)} each` : undefined}
            onPress={() => router.push({ pathname: "/dish/[dishId]", params: { dishId: d.dishId } })}
            a11yLabel={`${d.name}. ${d.rankInDish === 1 ? "Best fit" : `Fit ${d.rankInDish} of ${d.candidatesRanked}`}. Open dish`}
          />
        ))}
      </Reveal>

      {skipped.length ? (
        <Reveal index={5}>
          <Expander title="Where we cannot say yet">
            {skipped.map((s) => (
              <Small key={s} muted={false}>
                {s}
              </Small>
            ))}
          </Expander>
        </Reveal>
      ) : null}
    </Screen>
  );
}

export default function PlantPage() {
  return <BundleGate>{(bundle) => <PlantBody bundle={bundle} />}</BundleGate>;
}

const styles = StyleSheet.create({
  stats: { flexDirection: "row", flexWrap: "wrap", gap: space.xl },
});
