// Dishes tab: what you can make from what you picked, then what one purchase would unlock, then dishes
// not available yet. Tap any row for the dish page.
import { router } from "expo-router";
import { useMemo } from "react";
import { View } from "react-native";

import { BundleGate } from "../../components/BundleGate";
import { Screen } from "../../components/Screen";
import { Body, Caption, Heading, PhotoRow, Reveal, SectionTitle } from "../../components/ui";
import { suggestDishes } from "../../engine/suggest";
import { Bundle, DishSuggestion } from "../../engine/types";
import { dishPhoto } from "../../lib/photos";
import { naira, plainReason, plantLabel } from "../../lib/words";
import { toPlanInput, usePlan } from "../../state/PlanContext";
import { space } from "../../theme/tokens";

const openDish = (id: string) => router.push({ pathname: "/dish/[dishId]", params: { dishId: id } });

function DishesBody({ bundle }: { bundle: Bundle }) {
  const { plan } = usePlan();
  const result = useMemo(() => suggestDishes({ ...toPlanInput(plan), mode: "pantry" }, bundle), [plan, bundle]);
  const name = (id: string) => (bundle.dishes.find((d) => d.id === id)?.name ?? id).split(" (")[0];
  const people = `${plan.servings} ${plan.servings === 1 ? "person" : "people"}`;
  const picked = plan.pantryIds.length > 0;
  const fromKitchen = result.dishes.filter((d) => plan.pantryIds.includes(d.protein.ingredientId));
  const buyOne = result.dishes.filter((d) => !plan.pantryIds.includes(d.protein.ingredientId));

  const row = (d: DishSuggestion, owned: boolean) => {
    const plant = plantLabel(bundle, d.protein.ingredientId);
    const sub = owned ? `with your ${plant.toLowerCase()} · ${d.proteinPerPlateG} g protein each` : `buy ${plant.toLowerCase()} · ${d.proteinPerPlateG} g protein each`;
    return (
      <PhotoRow
        key={d.dishId}
        source={dishPhoto(d.dishId)}
        title={name(d.dishId)}
        sub={sub}
        right={naira(d.totalCostNgn)}
        onPress={() => openDish(d.dishId)}
        a11yLabel={`${name(d.dishId)}, ${sub}, ${naira(d.totalCostNgn)} for ${people}. Open`}
      />
    );
  };

  return (
    <Screen>
      <Reveal>
        <Caption>{picked ? "BASED ON WHAT YOU PICKED" : `FOR ${people.toUpperCase()} · ${naira(plan.budgetNgn)}`}</Caption>
        <Heading level="display">{picked && fromKitchen.length ? "You can make" : result.dishes.length ? "Dishes for you" : "Nothing fits yet"}</Heading>
        {!picked ? <Body muted>Tick what you have on Home to see what you can make from it.</Body> : null}
        {picked && !fromKitchen.length ? <Body muted>Nothing uses only what you picked yet. These need one plant from the market.</Body> : null}
      </Reveal>

      {picked && fromKitchen.length ? (
        <Reveal index={1}>
          <View style={{ gap: space.xs }}>
            <SectionTitle title="From your kitchen" />
            {fromKitchen.map((d) => row(d, true))}
          </View>
        </Reveal>
      ) : null}

      {buyOne.length ? (
        <Reveal index={2}>
          <View style={{ gap: space.xs }}>
            {picked ? <SectionTitle title="Buy one plant" /> : null}
            {buyOne.map((d) => row(d, false))}
          </View>
        </Reveal>
      ) : null}

      {result.excluded.length ? (
        <Reveal index={3}>
          <View style={{ gap: space.xs }}>
            <SectionTitle title="Not available yet" />
            {result.excluded.map((e) => (
              <PhotoRow
                key={e.id}
                source={dishPhoto(e.id)}
                title={name(e.id)}
                sub={plainReason(bundle, e.reason)}
                onPress={() => openDish(e.id)}
                a11yLabel={`${name(e.id)}, not available yet. ${plainReason(bundle, e.reason)} Open`}
              />
            ))}
          </View>
        </Reveal>
      ) : null}
    </Screen>
  );
}

export default function Dishes() {
  return <BundleGate>{(bundle) => <DishesBody bundle={bundle} />}</BundleGate>;
}
