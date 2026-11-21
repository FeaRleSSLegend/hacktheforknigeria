// Start: two ways in (what I have / what I want to make), budget, people, allergens.
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Button, Text, TextInput } from "react-native-paper";

import { BundleGate } from "../components/BundleGate";
import { LimitsLink, Screen } from "../components/Screen";
import { Body, Card, Expander, Heading, IconName, Reveal, Small } from "../components/ui";
import { Bundle } from "../engine/types";
import { dishIcon } from "../lib/icons";
import { plantName } from "../lib/words";
import { usePlan } from "../state/PlanContext";
import { useAppTheme } from "../theme";
import { radius, space, type } from "../theme/tokens";

const BUDGET_PRESETS = [1000, 1500, 2000, 3000];

function Choice({ icon, title, hint, selected, onPress }: { icon: IconName; title: string; hint: string; selected: boolean; onPress: () => void }) {
  const { custom: c } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${title}. ${hint}`}
      style={({ pressed }) => [
        styles.choice,
        { backgroundColor: selected ? c.primaryContainer : c.surface, borderColor: selected ? c.primary : c.hairline, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <MaterialCommunityIcons name={icon} size={32} color={selected ? c.onPrimaryContainer : c.accent} />
      <Text style={[type.heading, { color: selected ? c.onPrimaryContainer : c.onBackground }]}>{title}</Text>
      <Text style={[type.small, { color: selected ? c.onPrimaryContainer : c.onSurfaceVariant }]}>{hint}</Text>
    </Pressable>
  );
}

function Row({ icon, title, sub, selected, onPress, role }: { icon: IconName; title: string; sub?: string; selected: boolean; onPress: () => void; role: "checkbox" | "radio" }) {
  const { custom: c } = useAppTheme();
  const mark: IconName = role === "checkbox" ? (selected ? "checkbox-marked" : "checkbox-blank-outline") : selected ? "radiobox-marked" : "radiobox-blank";
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={role}
      accessibilityState={{ checked: selected }}
      accessibilityLabel={sub ? `${title}, ${sub}` : title}
      style={({ pressed }) => [styles.row, { borderBottomColor: c.hairline, opacity: pressed ? 0.7 : 1 }]}
    >
      <MaterialCommunityIcons name={icon} size={26} color={c.accent} />
      <View style={{ flex: 1 }}>
        <Text style={[type.bodyStrong, { color: c.onBackground }]}>{title}</Text>
        {sub ? <Text style={[type.small, { color: c.onSurfaceVariant }]}>{sub}</Text> : null}
      </View>
      <MaterialCommunityIcons name={mark} size={28} color={selected ? c.primary : c.outline} />
    </Pressable>
  );
}

function Stepper({ value, onChange, min, max, label, unit }: { value: number; onChange: (n: number) => void; min: number; max: number; label: string; unit: string }) {
  const { custom: c } = useAppTheme();
  const btn = (delta: number, icon: IconName, a11y: string) => (
    <Pressable
      onPress={() => onChange(Math.max(min, Math.min(max, value + delta)))}
      disabled={value + delta < min || value + delta > max}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      style={({ pressed }) => [styles.stepBtn, { borderColor: c.hairline, backgroundColor: c.surface, opacity: pressed ? 0.7 : 1 }]}
    >
      <MaterialCommunityIcons name={icon} size={24} color={c.primary} />
    </Pressable>
  );
  return (
    <View style={styles.stepper} accessible={false}>
      {btn(-1, "minus", `Fewer ${label}`)}
      <Text style={[type.title, { color: c.onBackground, minWidth: 72, textAlign: "center" }]} accessibilityLabel={`${value} ${unit}`}>
        {value}
      </Text>
      {btn(1, "plus", `More ${label}`)}
      <Text style={[type.body, { color: c.onSurfaceVariant }]}>{unit}</Text>
    </View>
  );
}

function allergenOptions(bundle: Bundle): { tag: string; label: string }[] {
  const byTag = new Map<string, string[]>();
  for (const id of bundle.ingredientOrder) {
    for (const t of bundle.ingredients[id].allergen_tags) {
      byTag.set(t, [...(byTag.get(t) ?? []), plantName(bundle, id).english]);
    }
  }
  return [...byTag].map(([tag, names]) => ({ tag, label: names.join(", ") }));
}

function StartBody({ bundle }: { bundle: Bundle }) {
  const { custom: c } = useAppTheme();
  const { plan, update } = usePlan();
  const [budgetText, setBudgetText] = useState(String(plan.budgetNgn));
  const [weightText, setWeightText] = useState(plan.bodyWeightKg ? String(plan.bodyWeightKg) : "");

  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  const canGo = plan.mode === "pantry" || !!plan.dishId;

  return (
    <Screen
      showBack={false}
      footer={
        <Button
          mode="contained"
          onPress={() => router.push("/suggestions")}
          disabled={!canGo}
          contentStyle={{ minHeight: 56 }}
          labelStyle={type.bodyStrong}
          style={{ borderRadius: radius.control }}
          icon="arrow-right"
        >
          {plan.mode === "pantry" ? "Show what I can make" : "Show me this dish"}
        </Button>
      }
    >
      <Reveal>
        <Heading level="display">What can I cook with what I have?</Heading>
        <Body muted style={{ marginTop: space.sm }}>
          Tell us your budget and how many people you are feeding. We suggest beans and seeds that suit the dish, and how to prepare them.
        </Body>
      </Reveal>

      <Reveal index={1} style={styles.choices}>
        <Choice icon="basket-outline" title="What do I have?" hint="Tick what is in your kitchen" selected={plan.mode === "pantry"} onPress={() => update({ mode: "pantry" })} />
        <Choice icon="silverware-fork-knife" title="I want to make..." hint="Pick a dish" selected={plan.mode === "dish"} onPress={() => update({ mode: "dish" })} />
      </Reveal>

      <Reveal index={2}>
        <Card>
          {plan.mode === "pantry" ? (
            <>
              <Heading level="heading">In my kitchen</Heading>
              <Small style={{ marginTop: space.xs }}>Leave empty if you will buy everything.</Small>
              {bundle.ingredientOrder.map((id) => {
                const n = plantName(bundle, id);
                return (
                  <Row
                    key={id}
                    role="checkbox"
                    icon="seed-outline"
                    title={n.local ?? n.english}
                    sub={n.local ? n.english : undefined}
                    selected={plan.pantryIds.includes(id)}
                    onPress={() => update({ pantryIds: toggle(plan.pantryIds, id) })}
                  />
                );
              })}
            </>
          ) : (
            <>
              <Heading level="heading">I want to make</Heading>
              {bundle.dishes.map((d) => (
                <Row
                  key={d.id}
                  role="radio"
                  icon={dishIcon(d.id)}
                  title={d.name}
                  sub={bundle.applications[d.application_id]?.name}
                  selected={plan.dishId === d.id}
                  onPress={() => update({ dishId: d.id })}
                />
              ))}
            </>
          )}
        </Card>
      </Reveal>

      <Reveal index={3}>
        <Card>
          <Heading level="heading">Budget for this meal</Heading>
          <View style={styles.presets}>
            {BUDGET_PRESETS.map((b) => {
              const on = plan.budgetNgn === b;
              return (
                <Pressable
                  key={b}
                  onPress={() => {
                    update({ budgetNgn: b });
                    setBudgetText(String(b));
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`${b} naira`}
                  style={[styles.preset, { borderColor: on ? c.primary : c.hairline, backgroundColor: on ? c.primaryContainer : c.surface }]}
                >
                  <Text style={[type.bodyStrong, { color: on ? c.onPrimaryContainer : c.onBackground }]}>₦{b.toLocaleString("en-NG")}</Text>
                </Pressable>
              );
            })}
          </View>
          <TextInput
            mode="outlined"
            label="Or type an amount in naira"
            keyboardType="number-pad"
            value={budgetText}
            onChangeText={(t) => {
              const clean = t.replace(/[^0-9]/g, "");
              setBudgetText(clean);
              if (clean) update({ budgetNgn: Number(clean) });
            }}
            left={<TextInput.Affix text="₦" />}
            style={{ marginTop: space.md, backgroundColor: c.surface }}
            outlineStyle={{ borderRadius: radius.control }}
          />
        </Card>
      </Reveal>

      <Reveal index={4}>
        <Card>
          <Heading level="heading">How many people?</Heading>
          <Stepper value={plan.servings} onChange={(n) => update({ servings: n })} min={1} max={20} label="people" unit={plan.servings === 1 ? "person" : "people"} />
        </Card>
      </Reveal>

      <Reveal index={5}>
        <Card>
          <Heading level="heading">Leave out</Heading>
          <Small style={{ marginTop: space.xs }}>Tick anything someone at the table must not eat.</Small>
          {allergenOptions(bundle).map(({ tag, label }) => (
            <Row
              key={tag}
              role="checkbox"
              icon="alert-circle-outline"
              title={label}
              selected={plan.allergens.includes(tag)}
              onPress={() => update({ allergens: toggle(plan.allergens, tag) })}
            />
          ))}
          <Expander title="More options" icon="tune-variant">
            <View style={{ gap: space.md, paddingTop: space.sm }}>
              <TextInput
                mode="outlined"
                label="Body weight in kg (optional)"
                keyboardType="number-pad"
                value={weightText}
                onChangeText={(t) => {
                  const clean = t.replace(/[^0-9]/g, "");
                  setWeightText(clean);
                  update({ bodyWeightKg: clean ? Number(clean) : null });
                }}
                right={<TextInput.Affix text="kg" />}
                style={{ backgroundColor: c.surface }}
                outlineStyle={{ borderRadius: radius.control }}
              />
              <Small>Stays on this phone. With a weight we use a general adult guideline (0.8 g protein per kg a day, over 3 meals). It is an estimate, not medical advice.</Small>
              {plan.bodyWeightKg ? null : (
                <>
                  <Body strong>Protein per person for this meal</Body>
                  <Stepper
                    value={plan.proteinPerPersonG}
                    onChange={(n) => update({ proteinPerPersonG: n })}
                    min={5}
                    max={60}
                    label="grams"
                    unit="g"
                  />
                  <Small>Your choice. 20 g is our starting value.</Small>
                </>
              )}
            </View>
          </Expander>
        </Card>
      </Reveal>

      <LimitsLink />
    </Screen>
  );
}

export default function Start() {
  return <BundleGate>{(bundle) => <StartBody bundle={bundle} />}</BundleGate>;
}

const styles = StyleSheet.create({
  choices: { flexDirection: "row", gap: space.md },
  choice: { flex: 1, borderWidth: 1.5, borderRadius: radius.block, padding: space.lg, gap: space.sm, minHeight: 140 },
  row: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 56, paddingVertical: space.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  presets: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginTop: space.md },
  preset: { borderWidth: 1.5, borderRadius: radius.control, paddingHorizontal: space.lg, minHeight: 48, justifyContent: "center" },
  stepper: { flexDirection: "row", alignItems: "center", gap: space.md, marginTop: space.md },
  stepBtn: { width: 52, height: 52, borderRadius: radius.control, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
});
