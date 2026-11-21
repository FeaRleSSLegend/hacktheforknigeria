// Plan: budget (one amount field), people, allergies, optional body weight and prices you know.
// Everything stays on this phone.
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { Text } from "react-native-paper";

import { BundleGate } from "../components/BundleGate";
import { PriceEntry } from "../components/PriceEntry";
import { Screen } from "../components/Screen";
import { Caption, Expander, Heading, OutlineButton, PrimaryButton, Reveal, Small, Stepper } from "../components/ui";
import { Bundle } from "../engine/types";
import { plantName } from "../lib/words";
import { usePlan } from "../state/PlanContext";
import { useAppTheme } from "../theme";
import { space, type } from "../theme/tokens";

function allergenOptions(bundle: Bundle): { tag: string; label: string }[] {
  const byTag = new Map<string, string[]>();
  for (const id of bundle.ingredientOrder) {
    for (const t of bundle.ingredients[id].allergen_tags) byTag.set(t, [...(byTag.get(t) ?? []), plantName(bundle, id).english]);
  }
  return [...byTag].map(([tag, names]) => ({ tag, label: names.join(", ") }));
}

function Field({ label, value, onChange, prefix, suffix, a11y }: { label: string; value: string; onChange: (t: string) => void; prefix?: string; suffix?: string; a11y: string }) {
  const { custom: c } = useAppTheme();
  return (
    <View style={{ gap: space.sm }}>
      <Caption>{label}</Caption>
      <View style={[styles.field, { borderColor: c.outline }]}>
        {prefix ? <Text style={[type.display, { color: c.onSurfaceVariant }]}>{prefix}</Text> : null}
        <TextInput
          value={value}
          onChangeText={(t) => onChange(t.replace(/[^0-9]/g, ""))}
          keyboardType="number-pad"
          accessibilityLabel={a11y}
          placeholder="0"
          placeholderTextColor={c.outline}
          style={[type.display, styles.input, { color: c.onBackground }]}
        />
        {suffix ? <Text style={[type.body, { color: c.onSurfaceVariant }]}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

function PlanBody({ bundle }: { bundle: Bundle }) {
  const { plan, update } = usePlan();
  const [budget, setBudget] = useState(String(plan.budgetNgn));
  const [weight, setWeight] = useState(plan.bodyWeightKg ? String(plan.bodyWeightKg) : "");

  return (
    <Screen backLabel="Back" footer={<PrimaryButton label="Done" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} />}>
      <Reveal>
        <Heading level="display">Your plan</Heading>
      </Reveal>

      <Reveal index={1}>
        <Field
          label="BUDGET FOR THIS MEAL"
          prefix="₦"
          value={budget}
          onChange={(t) => {
            setBudget(t);
            if (t) update({ budgetNgn: Number(t) });
          }}
          a11y="Budget for this meal, in naira"
        />
      </Reveal>

      <Reveal index={2}>
        <View style={{ gap: space.sm }}>
          <Caption>HOW MANY PEOPLE</Caption>
          <Stepper value={plan.servings} onChange={(n) => update({ servings: n })} min={1} max={20} label="people" unit={plan.servings === 1 ? "person" : "people"} />
        </View>
      </Reveal>

      <Reveal index={3}>
        <View style={{ gap: space.sm }}>
          <Caption>LEAVE OUT</Caption>
          <View style={styles.row}>
            {allergenOptions(bundle).map(({ tag, label }) => (
              <OutlineButton
                key={tag}
                label={label}
                on={plan.allergens.includes(tag)}
                onPress={() => update({ allergens: plan.allergens.includes(tag) ? plan.allergens.filter((x) => x !== tag) : [...plan.allergens, tag] })}
                a11yLabel={`Leave out ${label}`}
              />
            ))}
          </View>
        </View>
      </Reveal>

      <Reveal index={4}>
        <Expander title="Body weight and protein">
          <Field
            label="BODY WEIGHT (OPTIONAL)"
            suffix="kg"
            value={weight}
            onChange={(t) => {
              setWeight(t);
              update({ bodyWeightKg: t ? Number(t) : null });
            }}
            a11y="Body weight in kilograms, optional"
          />
          <Small>Stays on this phone. We use a general adult guide (0.8 g protein per kg a day, over 3 meals), not medical advice.</Small>
          {plan.bodyWeightKg ? null : (
            <View style={{ gap: space.sm, marginTop: space.md }}>
              <Caption>PROTEIN PER PERSON</Caption>
              <Stepper value={plan.proteinPerPersonG} onChange={(n) => update({ proteinPerPersonG: n })} min={5} max={60} label="grams" unit="grams" />
            </View>
          )}
        </Expander>
        <Expander title="Prices you know">
          <PriceEntry bundle={bundle} />
        </Expander>
      </Reveal>
    </Screen>
  );
}

export default function PlanPage() {
  return <BundleGate>{(bundle) => <PlanBody bundle={bundle} />}</BundleGate>;
}

const styles = StyleSheet.create({
  field: { flexDirection: "row", alignItems: "center", gap: space.sm, borderBottomWidth: 1, minHeight: 64 },
  input: { flex: 1, minHeight: 56, paddingVertical: 0 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
});
