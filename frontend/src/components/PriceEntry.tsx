// Lets the cook type a price (naira per kg) for a plant we have no market price for. Prices stay in
// memory for this session and go to the engine as userPricesNgnPerKg, so every cost recomputes.
import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Text } from "react-native-paper";

import { Bundle } from "../engine/types";
import { naira, plantLabel } from "../lib/words";
import { usePlan } from "../state/PlanContext";
import { useAppTheme } from "../theme";
import { radius, space, type } from "../theme/tokens";
import { SectionTitle, Small } from "./ui";

export function parsePrice(raw: string): number | null {
  const t = raw.replace(/[,\s₦]/g, "");
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  const n = Number(t);
  return n > 0 ? n : null;
}

function PriceRow({ id, bundle }: { id: string; bundle: Bundle }) {
  const { custom: c } = useAppTheme();
  const { plan, update } = usePlan();
  const current = plan.userPrices[id];
  const [text, setText] = useState(current ? String(current) : "");
  const [error, setError] = useState(false);
  const label = plantLabel(bundle, id);

  const save = () => {
    const n = parsePrice(text);
    if (n === null) {
      setError(true);
      return;
    }
    setError(false);
    update({ userPrices: { ...plan.userPrices, [id]: n } });
  };
  const clear = () => {
    const next = { ...plan.userPrices };
    delete next[id];
    setText("");
    setError(false);
    update({ userPrices: next });
  };

  return (
    <View style={[styles.row, { backgroundColor: c.surface }]}>
      <Text style={[type.bodyStrong, { color: c.onBackground }]}>{label}</Text>
      <Small>{current ? `Your price: ${naira(current)} per kg` : "Price needed"}</Small>
      <View style={styles.inputRow}>
        <TextInput
          value={text}
          onChangeText={(t) => {
            setText(t);
            setError(false);
          }}
          keyboardType="numeric"
          placeholder="Naira per kg"
          placeholderTextColor={c.onSurfaceVariant}
          accessibilityLabel={`Price for ${label}, naira per kilogram`}
          style={[styles.input, type.body, { color: c.onBackground, borderColor: error ? c.error : c.onSurfaceVariant }]}
          onSubmitEditing={save}
          returnKeyType="done"
        />
        <Pressable onPress={save} accessibilityRole="button" accessibilityLabel={`Use this price for ${label}`} style={[styles.btn, { backgroundColor: c.primary }]}>
          <Text style={[type.bodyStrong, { color: c.onPrimary }]}>Use</Text>
        </Pressable>
        {current ? (
          <Pressable onPress={clear} accessibilityRole="button" accessibilityLabel={`Remove your price for ${label}`} style={[styles.btn, { backgroundColor: c.muted }]}>
            <Text style={[type.bodyStrong, { color: c.onMuted }]}>Clear</Text>
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={[type.label, { color: c.error }]}>Type numbers only, for example 1500.</Text> : null}
    </View>
  );
}

export function PriceEntry({ bundle }: { bundle: Bundle }) {
  const { plan } = usePlan();
  const ids = bundle.ingredientOrder.filter((id) => bundle.ingredients[id].price_ngn_per_kg === null || plan.userPrices[id] !== undefined);
  if (!ids.length) return null;
  return (
    <View style={{ gap: space.sm }}>
      <SectionTitle title="Add a price you know" note="Naira per kg, as you buy it. Kept until you close the app." />
      {ids.map((id) => (
        <PriceRow key={id} id={id} bundle={bundle} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { borderRadius: radius.card, padding: space.md, gap: space.xs },
  inputRow: { flexDirection: "row", gap: space.sm, alignItems: "center" },
  input: { flex: 1, minHeight: 48, borderWidth: 1, borderRadius: radius.card, paddingHorizontal: space.md },
  btn: { minHeight: 48, minWidth: 64, borderRadius: radius.card, alignItems: "center", justifyContent: "center", paddingHorizontal: space.md },
});
