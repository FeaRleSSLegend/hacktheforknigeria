// Cook tab (start): two ways in, the kitchen checklist, budget, people, allergens, one main button.
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text, TextInput } from "react-native-paper";

import { BundleGate } from "../../components/BundleGate";
import { Screen } from "../../components/Screen";
import { Body, CheckRow, Expander, Glow, Heading, IconName, PrimaryButton, Reveal, SectionTitle, Small } from "../../components/ui";
import { Bundle } from "../../engine/types";
import { dishIcon } from "../../lib/icons";
import { plantName } from "../../lib/words";
import { usePlan } from "../../state/PlanContext";
import { useAppTheme } from "../../theme";
import { radius, space, type } from "../../theme/tokens";

const BUDGET_PRESETS = [1000, 1500, 2000, 3000];
const RIPPLE = { color: "rgba(255,255,255,0.12)" };

function Choice({ icon, title, hint, selected, onPress }: { icon: IconName; title: string; hint: string; selected: boolean; onPress: () => void }) {
  const { custom: c } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${title} ${hint}`}
      android_ripple={RIPPLE}
      style={({ pressed }) => [styles.choice, { backgroundColor: selected ? c.primaryContainer : c.surface, borderColor: selected ? c.primary : c.surface, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
    >
      {selected ? <Glow size={180} style={{ right: -60, top: -60 }} strength={1.5} /> : null}
      <MaterialCommunityIcons name={icon} size={28} color={c.primary} />
      <Text style={[type.heading, { color: c.onBackground }]}>{title}</Text>
      <Text style={[type.small, { color: selected ? c.onBackground : c.onSurfaceVariant }]}>{hint}</Text>
    </Pressable>
  );
}

function Stepper({ value, onChange, min, max, label, unit }: { value: number; onChange: (n: number) => void; min: number; max: number; label: string; unit: string }) {
  const { custom: c } = useAppTheme();
  const btn = (delta: number, icon: IconName, a11y: string) => {
    const off = value + delta < min || value + delta > max;
    return (
      <Pressable
        onPress={() => onChange(Math.max(min, Math.min(max, value + delta)))}
        disabled={off}
        accessibilityRole="button"
        accessibilityLabel={a11y}
        accessibilityState={{ disabled: off }}
        android_ripple={RIPPLE}
        style={({ pressed }) => [styles.stepBtn, { backgroundColor: delta > 0 ? c.primary : c.surfaceVariant, opacity: off ? 0.4 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
      >
        <MaterialCommunityIcons name={icon} size={24} color={delta > 0 ? c.onPrimary : c.onBackground} />
      </Pressable>
    );
  };
  return (
    <View style={styles.stepper}>
      {btn(-1, "minus", `Fewer ${label}`)}
      <View style={{ alignItems: "center", flex: 1 }} accessible accessibilityLabel={`${value} ${unit}`} accessibilityLiveRegion="polite">
        <Text style={[type.display, { color: c.onBackground }]}>{value}</Text>
        <Text style={[type.label, { color: c.onSurfaceVariant }]}>{unit}</Text>
      </View>
      {btn(1, "plus", `More ${label}`)}
    </View>
  );
}

function allergenOptions(bundle: Bundle): { tag: string; label: string }[] {
  const byTag = new Map<string, string[]>();
  for (const id of bundle.ingredientOrder) {
    for (const t of bundle.ingredients[id].allergen_tags) byTag.set(t, [...(byTag.get(t) ?? []), plantName(bundle, id).english]);
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
  const inputTheme = { colors: { background: c.surface, onSurfaceVariant: c.onSurfaceVariant, outline: c.outline, primary: c.primary } };
  const mainLabel = plan.mode === "pantry" ? "Show what I can make" : "Show me this dish";

  return (
    <Screen footer={<PrimaryButton label={mainLabel} onPress={() => router.push("/suggestions")} disabled={!canGo} a11yLabel={mainLabel} />}>
      <Reveal>
        <Heading level="hero">What can I cook with what I have?</Heading>
        <Body muted style={{ marginTop: space.sm }}>
          Tell us your budget and your people. We pick the beans that suit the dish.
        </Body>
      </Reveal>

      <Reveal index={1} style={styles.choices}>
        <Choice icon="basket-outline" title="What do I have?" hint="Tick what is in your kitchen" selected={plan.mode === "pantry"} onPress={() => update({ mode: "pantry" })} />
        <Choice icon="silverware-fork-knife" title="I want to make..." hint="Pick a dish" selected={plan.mode === "dish"} onPress={() => update({ mode: "dish" })} />
      </Reveal>

      <Reveal index={2}>
        {plan.mode === "pantry" ? (
          <>
            <SectionTitle title="In my kitchen" note={plan.pantryIds.length ? `${plan.pantryIds.length} ticked` : "Leave empty to buy all"} />
            <View style={styles.list}>
              {bundle.ingredientOrder.map((id) => {
                const n = plantName(bundle, id);
                return (
                  <CheckRow
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
            </View>
          </>
        ) : (
          <>
            <SectionTitle title="I want to make" />
            <View style={styles.list}>
              {bundle.dishes.map((d) => (
                <CheckRow key={d.id} role="radio" icon={dishIcon(d.id)} title={d.name} selected={plan.dishId === d.id} onPress={() => update({ dishId: d.id })} />
              ))}
            </View>
          </>
        )}
      </Reveal>

      <Reveal index={3}>
        <SectionTitle title="Budget for this meal" />
        <View style={styles.presets} accessibilityRole="radiogroup">
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
                android_ripple={RIPPLE}
                style={({ pressed }) => [styles.preset, { backgroundColor: on ? c.primary : c.surface, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
              >
                <Text style={[type.bodyStrong, { color: on ? c.onPrimary : c.onBackground }]}>₦{b.toLocaleString("en-NG")}</Text>
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
          textColor={c.onBackground}
          theme={inputTheme}
          accessibilityLabel="Budget in naira"
        />
      </Reveal>

      <Reveal index={4}>
        <View style={[styles.panel, { backgroundColor: c.surface }]}>
          <SectionTitle title="How many people?" />
          <Stepper value={plan.servings} onChange={(n) => update({ servings: n })} min={1} max={20} label="people" unit={plan.servings === 1 ? "person" : "people"} />
        </View>
      </Reveal>

      <Reveal index={5}>
        <SectionTitle title="Leave out" note="allergies" />
        <View style={styles.list}>
          {allergenOptions(bundle).map(({ tag, label }) => (
            <CheckRow
              key={tag}
              role="checkbox"
              icon="alert-circle-outline"
              title={`Leave out ${label.toLowerCase()}`}
              selected={plan.allergens.includes(tag)}
              onPress={() => update({ allergens: toggle(plan.allergens, tag) })}
            />
          ))}
        </View>
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
              textColor={c.onBackground}
              theme={inputTheme}
              accessibilityLabel="Body weight in kilograms, optional"
            />
            <Small>Stays on this phone. We use a general adult guide, not medical advice.</Small>
            {plan.bodyWeightKg ? null : (
              <View style={[styles.panel, { backgroundColor: c.surface }]}>
                <Body strong>Protein per person</Body>
                <Stepper value={plan.proteinPerPersonG} onChange={(n) => update({ proteinPerPersonG: n })} min={5} max={60} label="grams" unit="grams" />
              </View>
            )}
          </View>
        </Expander>
      </Reveal>
    </Screen>
  );
}

export default function Start() {
  return <BundleGate>{(bundle) => <StartBody bundle={bundle} />}</BundleGate>;
}

const styles = StyleSheet.create({
  choices: { flexDirection: "row", gap: space.md },
  choice: { flex: 1, borderWidth: 2, borderRadius: radius.card, padding: space.lg, gap: space.sm, overflow: "hidden" },
  list: { gap: space.sm },
  presets: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  preset: { borderRadius: radius.control, paddingHorizontal: space.lg, minHeight: 52, justifyContent: "center", flexGrow: 1, alignItems: "center", overflow: "hidden" },
  panel: { borderRadius: radius.card, padding: space.lg },
  stepper: { flexDirection: "row", alignItems: "center", gap: space.md, marginTop: space.xs },
  stepBtn: { width: 56, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center", overflow: "hidden" },
});
