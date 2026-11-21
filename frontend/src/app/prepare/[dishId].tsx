// Prepare: up to 5 sourced steps, one caution banner, and the evidence behind a closed "How do we know?".
// Everything shown passed safetyGuard (src/lib/prepare.ts). Internal rule wording is never rendered:
// a rule is shown only through its plain user_text field.
import { useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

import { BundleGate } from "../../components/BundleGate";
import { Screen } from "../../components/Screen";
import { Body, Caution, Expander, Hairline, IconTile, Numeral, Reveal, SectionTitle, Small, StateView, Tag } from "../../components/ui";
import { Bundle, ProcessingOption } from "../../engine/types";
import { dishIcon } from "../../lib/icons";
import { Finding, preparePlan, userText } from "../../lib/prepare";
import { METRIC_WORDS, effectSentence, isCumulative, plantName, samplesText, studiesLabel } from "../../lib/words";
import { usePlan } from "../../state/PlanContext";
import { useAppTheme } from "../../theme";
import { radius, space, type } from "../../theme/tokens";

const FINAL_STEP = "Cook beans until fully soft.";
const MAX_STEPS = 5;

function sourceDetails(bundle: Bundle, o: ProcessingOption): string[] {
  if (o.kind === "playbook") return o.sources;
  return o.sources.map((paper) => {
    const pages = [...new Set(bundle.treatments.filter((r) => r.paper_id === paper && r.crop_id === o.cropId && r.treatment === o.treatment).map((r) => r.page))];
    return pages.length ? `${paper}, ${pages.join(", ")}` : paper;
  });
}

function FindingRow({ f, bundle, plantId }: { f: Finding; bundle: Bundle; plantId: string }) {
  const words = METRIC_WORDS[f.goal] ?? { name: f.goal.replace(/_/g, " "), plain: "" };
  const o = f.option;
  const other = o.cropId !== plantId;
  return (
    <View style={{ gap: space.sm }}>
      <Body strong>
        {effectSentence(words.name, o.effectRange)} in {samplesText(o, bundle)}.
      </Body>
      {words.plain ? <Small>{words.plain}</Small> : null}
      <View style={styles.tags}>
        <Tag icon="book-open-page-variant-outline" label={studiesLabel(o)} tone={other ? "warn" : "plain"} />
        {other ? <Tag icon="sprout-outline" label={`Measured on ${plantName(bundle, o.cropId).english.toLowerCase()}`} tone="warn" /> : null}
        {isCumulative(o) ? <Tag icon="layers-outline" label="Includes earlier steps" /> : null}
        {o.kind === "model" ? <Tag icon="chart-line" label="Predicted, with a range" tone="warn" /> : null}
      </View>
      <Small>Source: {sourceDetails(bundle, o).join("; ")}.</Small>
      {o.timeH !== null || o.tempC !== null ? (
        <Small>
          As done in the study: {o.timeH !== null ? `${o.timeH} h` : ""}
          {o.timeH !== null && o.tempC !== null ? " at " : ""}
          {o.tempC !== null ? `${o.tempC} °C` : ""}.
        </Small>
      ) : null}
    </View>
  );
}

function PrepareBody({ bundle }: { bundle: Bundle }) {
  const { custom: c } = useAppTheme();
  const { plan } = usePlan();
  const params = useLocalSearchParams<{ dishId: string; plant?: string }>();
  const dish = bundle.dishes.find((d) => d.id === params.dishId);
  const plantId = params.plant ?? dish?.protein_slot_ids[0] ?? "";
  const p = useMemo(() => preparePlan(bundle, dish, plantId, plan.allergens), [bundle, dish, plantId, plan.allergens]);

  if (!dish || !bundle.ingredients[plantId]) {
    return (
      <Screen backLabel="Back to results">
        <StateView kind="empty" title="We could not find that dish" message="Go back and pick a dish from the list." />
      </Screen>
    );
  }
  const plant = plantName(bundle, plantId);
  const breadcrumb = `${dish.name} · with ${plant.english.toLowerCase()}`;
  const ruleText = userText(p.firedRules[0]);

  return (
    <Screen backLabel="Back to results">
      <Reveal>
        <View style={styles.head}>
          <IconTile icon={dishIcon(dish.id)} size={64} />
          <View style={{ flex: 1 }}>
            <Text accessibilityRole="header" style={[type.display, { color: c.onBackground }]}>
              How to prepare
            </Text>
            <Text style={[type.bodyStrong, { color: c.primary }]}>{breadcrumb}</Text>
          </View>
        </View>
      </Reveal>

      {p.wholeBlocked.length ? (
        <Caution>This plant is on your leave-out list, so we do not show steps for it.</Caution>
      ) : (
        <>
          <Reveal index={1}>
            <SectionTitle title="Steps" />
            <View style={[styles.steps, { backgroundColor: c.surface }]}>
              {p.steps.slice(0, MAX_STEPS).map((s, i) => (
                <View key={s}>
                  {i > 0 ? <View style={[styles.divider, { backgroundColor: c.hairline }]} /> : null}
                  <View style={styles.step} accessible accessibilityLabel={`Step ${i + 1}. ${s}`}>
                    <Numeral n={i + 1} />
                    <Body style={{ flex: 1 }}>{s}</Body>
                  </View>
                </View>
              ))}
            </View>
          </Reveal>

          <Reveal index={2}>
            <Caution>
              {FINAL_STEP}
              {ruleText ? ` ${ruleText}` : ""}
            </Caution>
          </Reveal>

          <Reveal index={3}>
            <View style={[styles.evidence, { backgroundColor: c.surface }]}>
              <Expander title="How do we know?">
                <View style={{ gap: space.md, paddingTop: space.xs }}>
                  <Small muted={false}>We only show methods that are safe to follow at home.</Small>
                  {p.findings.length === 0 ? (
                    <Small muted={false}>No published results for this plant yet.</Small>
                  ) : (
                    p.findings.map((f, i) => (
                      <View key={f.goal}>
                        {i > 0 ? <Hairline /> : null}
                        <FindingRow f={f} bundle={bundle} plantId={plantId} />
                      </View>
                    ))
                  )}
                  {p.route?.conditions ? <Small>As done in the study: {p.route.conditions}</Small> : null}
                  <Small>
                    Changes are compared with raw seeds in the same study. {p.anyModel ? "Some values are predicted, with a range." : "Published results, not a prediction."}
                  </Small>
                </View>
              </Expander>
            </View>
          </Reveal>
        </>
      )}
    </Screen>
  );
}

export default function Prepare() {
  return <BundleGate>{(bundle) => <PrepareBody bundle={bundle} />}</BundleGate>;
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: space.md },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  steps: { borderRadius: radius.card, paddingHorizontal: space.lg, paddingVertical: space.sm },
  step: { flexDirection: "row", gap: space.md, alignItems: "center", paddingVertical: space.md },
  divider: { height: 1, marginLeft: 46 },
  evidence: { borderRadius: radius.card, paddingHorizontal: space.lg, paddingVertical: space.xs },
});
