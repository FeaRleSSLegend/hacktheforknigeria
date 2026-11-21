// Dishes tab: browse every dish in the data. Tapping one shows the best plant for it.
import { router } from "expo-router";
import { View } from "react-native";

import { BundleGate } from "../../components/BundleGate";
import { Screen } from "../../components/Screen";
import { Body, CheckRow, Heading, Reveal } from "../../components/ui";
import { Bundle } from "../../engine/types";
import { dishIcon } from "../../lib/icons";
import { usePlan } from "../../state/PlanContext";
import { space } from "../../theme/tokens";

function DishesBody({ bundle }: { bundle: Bundle }) {
  const { plan, update } = usePlan();
  return (
    <Screen>
      <Reveal>
        <Heading level="display">Dishes</Heading>
        <Body muted style={{ marginTop: space.sm }}>
          Pick a dish to see which plant suits it and what it costs.
        </Body>
      </Reveal>
      <View style={{ gap: space.sm }}>
        {bundle.dishes.map((d, i) => (
          <Reveal key={d.id} index={i + 1}>
            <CheckRow
              role="radio"
              icon={dishIcon(d.id)}
              title={d.name}
              sub={bundle.applications[d.application_id]?.name}
              selected={plan.mode === "dish" && plan.dishId === d.id}
              onPress={() => {
                update({ mode: "dish", dishId: d.id });
                router.push("/suggestions");
              }}
            />
          </Reveal>
        ))}
      </View>
    </Screen>
  );
}

export default function Dishes() {
  return <BundleGate>{(bundle) => <DishesBody bundle={bundle} />}</BundleGate>;
}
