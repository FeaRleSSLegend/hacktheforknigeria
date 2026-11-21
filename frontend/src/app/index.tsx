// Start: two ways in (what I have / what I want to make), budget, people, allergens.
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text, TextInput } from "react-native-paper";

import { BundleGate } from "../components/BundleGate";
import { LimitsLink, Screen } from "../components/Screen";
import { Body, CircleTile, Expander, Glow, Heading, HeroTile, IconName, Meta, PrimaryButton, Reveal, SectionTitle, Small } from "../components/ui";
import { suggestDishes } from "../engine/suggest";
import { Bundle } from "../engine/types";
import { dishIcon } from "../lib/icons";
import { naira, plantLabel, plantName } from "../lib/words";
import { toPlanInput, usePlan } from "../state/PlanContext";
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
      style={({ pressed }) => [styles.choice, { backgroundColor: selected ? c.primaryContainer : c.surface, borderColor: selected ? c.primary : c.surface, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
    >
      {selected ? <Glow size={180} style={{ right: -60, top: -60 }} strength={1.5} /> : null}
      <View style={[styles.choiceIcon, { backgroundColor: selected ? "rgba(10,11,13,0.35)" : c.surfaceVariant }]}>
        <MaterialCommunityIcons name={icon} size={26} color={c.primary} />
      </View>
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
        style={({ pressed }) => [styles.stepBtn, { backgroundColor: delta > 0 ? c.primary : c.surfaceVariant, opacity: off ? 0.4 : pressed ? 0.75 : 1 }]}
      >
        <MaterialCommunityIcons name={icon} size={24} color={delta > 0 ? c.onPrimary : c.onBackground} />
      </Pressable>
    );
  };
  return (
    <View style={styles.stepper}>
      {btn(-1, "minus", `Fewer ${label}`)}
      <View style={{ alignItems: "center", minWidth: 84 }}>
        <Text style={[type.display, { color: c.onBackground }]} accessibilityLabel={`${value} ${unit}`}>
          {value}
        </Text>
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

function TopPick({ bundle }: { bundle: Bundle }) {
  const { custom: c } = useAppTheme();
  const { plan } = usePlan();
  const top = useMemo(() => suggestDishes(toPlanInput(plan), bundle).dishes[0], [plan, bundle]);
  if (!top) return null;
  return (
    <Pressable onPress={() => router.push("/suggestions")} accessibilityRole="button" accessibilityLabel={`Top pick: ${top.name} with ${plantLabel(bundle, top.protein.ingredientId)}, ${naira(top.totalCostNgn)}`}>
      <HeroTile icon={dishIcon(top.dishId)} height={200} />
      <View style={styles.pickRow}>
        <View style={{ flex: 1 }}>
          <Meta icon="star-four-points" label="Top pick for your choices" />
          <Text style={[type.title, { color: c.onBackground, marginTop: 2 }]}>{top.name}</Text>
          <Small>with {plantLabel(bundle, top.protein.ingredientId)}</Small>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={[type.title, { color: c.primary }]}>{naira(top.totalCostNgn)}</Text>
          <Small>protein only</Small>
        </View>
      </View>
    </Pressable>
  );
}

function StartBody({ bundle }: { bundle: Bundle }) {
  const { custom: c } = useAppTheme();
  const { plan, update } = usePlan();
  const [budgetText, setBudgetText] = useState(String(plan.budgetNgn));
  const [weightText, setWeightText] = useState(plan.bodyWeightKg ? String(plan.bodyWeightKg) : "");
  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  const canGo = plan.mode === "pantry" || !!plan.dishId;
  const inputTheme = { colors: { background: c.surface, onSurfaceVariant: c.onSurfaceVariant, outline: c.hairline, primary: c.primary } };

  return (
    <Screen
      showBack={false}
      showStatus
      footer={<PrimaryButton label={plan.mode === "pantry" ? "Show what I can make" : "Show me this dish"} onPress={() => router.push("/suggestions")} disabled={!canGo} />}
    >
      <Reveal>
        <Heading level="hero">What can I cook with what I have?</Heading>
        <Body muted style={{ marginTop: space.sm }}>
          Your budget, your people. We pick the beans and seeds that suit the dish, and show how to prepare them.
        </Body>
      </Reveal>

      <Reveal index={1}>
        <TopPick bundle={bundle} />
      </Reveal>

      <Reveal index={2} style={styles.choices}>
        <Choice icon="basket-outline" title="What do I have?" hint="Tick what is in your kitchen" selected={plan.mode === "pantry"} onPress={() => update({ mode: "pantry" })} />
        <Choice icon="silverware-fork-knife" title="I want to make..." hint="Pick a dish" selected={plan.mode === "dish"} onPress={() => update({ mode: "dish" })} />
      </Reveal>

      <Reveal index={3}>
        {plan.mode === "pantry" ? (
          <>
            <SectionTitle title="In my kitchen" note={plan.pantryIds.length ? `${plan.pantryIds.length} ticked` : "Leave empty to buy all"} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
              {bundle.ingredientOrder.map((id) => {
                const n = plantName(bundle, id);
                return (
                  <CircleTile
                    key={id}
                    role="checkbox"
                    icon="seed-outline"
                    label={n.local ?? n.english}
                    sub={n.local ? n.english : undefined}
                    selected={plan.pantryIds.includes(id)}
                    onPress={() => update({ pantryIds: toggle(plan.pantryIds, id) })}
                  />
                );
              })}
            </ScrollView>
          </>
        ) : (
          <>
            <SectionTitle title="I want to make" note={`${bundle.dishes.length} dishes`} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
              {bundle.dishes.map((d) => (
                <CircleTile key={d.id} icon={dishIcon(d.id)} label={d.name.split(" (")[0]} selected={plan.dishId === d.id} onPress={() => update({ dishId: d.id })} />
              ))}
            </ScrollView>
          </>
        )}
      </Reveal>

      <Reveal index={4}>
        <SectionTitle title="Budget for this meal" note="naira" />
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
                style={({ pressed }) => [styles.preset, { backgroundColor: on ? c.primary : c.surface, transform: [{ scale: pressed ? 0.96 : 1 }] }]}
              >
                <Text style={[type.bodyStrong, { color: on ? c.onPrimary : c.onBackground }]}>₦{b.toLocaleString("en-NG")}</Text>
              </Pressable>
            );
          })}
        </View>
        <TextInput
          mode="outlined"
          label="Or type an amount"
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
        />
      </Reveal>

      <Reveal index={5}>
        <View style={[styles.panel, { backgroundColor: c.surface }]}>
          <SectionTitle title="How many people?" />
          <Stepper value={plan.servings} onChange={(n) => update({ servings: n })} min={1} max={20} label="people" unit={plan.servings === 1 ? "person" : "people"} />
        </View>
      </Reveal>

      <Reveal index={6}>
        <SectionTitle title="Leave out" note="allergies" />
        <View style={styles.presets}>
          {allergenOptions(bundle).map(({ tag, label }) => {
            const on = plan.allergens.includes(tag);
            return (
              <Pressable
                key={tag}
                onPress={() => update({ allergens: toggle(plan.allergens, tag) })}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={`Leave out ${label}`}
                style={[styles.allergen, { backgroundColor: on ? c.accentContainer : c.surface, borderColor: on ? c.accent : c.surface }]}
              >
                <MaterialCommunityIcons name={on ? "close-circle" : "alert-circle-outline"} size={20} color={on ? c.accent : c.onSurfaceVariant} />
                <Text style={[type.bodyStrong, { color: on ? c.onAccentContainer : c.onBackground }]}>{label}</Text>
              </Pressable>
            );
          })}
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
            />
            <Small>Stays on this phone. With a weight we use a general adult guideline (0.8 g protein per kg a day, over 3 meals). It is an estimate, not medical advice.</Small>
            {plan.bodyWeightKg ? null : (
              <View style={[styles.panel, { backgroundColor: c.surface }]}>
                <Body strong>Protein per person for this meal</Body>
                <Stepper value={plan.proteinPerPersonG} onChange={(n) => update({ proteinPerPersonG: n })} min={5} max={60} label="grams" unit="grams" />
                <Small>Your choice. 20 g is our starting value.</Small>
              </View>
            )}
          </View>
        </Expander>
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
  choice: { flex: 1, borderWidth: 2, borderRadius: radius.card, padding: space.lg, gap: space.sm, minHeight: 156, overflow: "hidden" },
  choiceIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: space.xs },
  pickRow: { flexDirection: "row", alignItems: "flex-end", gap: space.md, marginTop: space.md },
  row: { gap: space.sm, paddingRight: space.lg },
  presets: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  preset: { borderRadius: radius.control, paddingHorizontal: space.lg, minHeight: 52, justifyContent: "center", flexGrow: 1, alignItems: "center" },
  allergen: { flexDirection: "row", alignItems: "center", gap: space.sm, borderRadius: radius.control, borderWidth: 1.5, paddingHorizontal: space.lg, minHeight: 52 },
  panel: { borderRadius: radius.card, padding: space.lg },
  stepper: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: space.xs },
  stepBtn: { width: 56, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center" },
});
