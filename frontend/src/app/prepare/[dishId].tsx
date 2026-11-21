// Prepare: sourced steps for the chosen plant, what the papers found, and safety notes.
// Everything shown here passed safetyGuard (see src/lib/prepare.ts).
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

import { BundleGate } from "../../components/BundleGate";
import { LimitsLink, Screen } from "../../components/Screen";
import { Body, Card, Expander, Glow, Hairline, HeroTile, Meta, Note, Numeral, Reveal, SectionTitle, Small, StateView, Tag } from "../../components/ui";
import { UNREVIEWED_LABEL } from "../../engine/safety";
import { Bundle, ProcessingOption } from "../../engine/types";
import { dishIcon } from "../../lib/icons";
import { Finding, preparePlan } from "../../lib/prepare";
import { METRIC_WORDS, effectSentence, isCumulative, plantLabel, plantName, samplesText, studiesLabel } from "../../lib/words";
import { usePlan } from "../../state/PlanContext";
import { useAppTheme } from "../../theme";
import { radius, space, type } from "../../theme/tokens";

const FINAL_STEP = "Cook beans until fully soft";

function sourceDetails(bundle: Bundle, o: ProcessingOption): string[] {
  if (o.kind === "playbook") return o.sources;
  return o.sources.map((paper) => {
    const pages = [...new Set(bundle.treatments.filter((r) => r.paper_id === paper && r.crop_id === o.cropId && r.treatment === o.treatment).map((r) => r.page))];
    return pages.length ? `${paper}, ${pages.join(", ")}` : paper;
  });
}

function FindingRow({ f, bundle, plantId }: { f: Finding; bundle: Bundle; plantId: string }) {
  const { custom: c } = useAppTheme();
  const words = METRIC_WORDS[f.goal] ?? { name: f.goal.replace(/_/g, " "), plain: "" };
  const o = f.option;
  const other = o.cropId !== plantId;
  return (
    <View style={{ gap: space.sm }}>
      <View style={styles.findingHead}>
        <View style={[styles.findingIcon, { backgroundColor: c.primaryContainer }]}>
          <MaterialCommunityIcons name={o.effectRange[1] <= 0 ? "trending-down" : o.effectRange[0] >= 0 ? "trending-up" : "swap-vertical"} size={22} color={c.primary} />
        </View>
        <Body strong style={{ flex: 1 }}>
          {effectSentence(words.name, o.effectRange)} in {samplesText(o, bundle)}.
        </Body>
      </View>
      {words.plain ? <Small>{words.plain}</Small> : null}
      <View style={styles.tags}>
        <Tag icon="book-open-page-variant-outline" label={studiesLabel(o)} tone={other ? "warn" : "plain"} />
        {other ? <Tag icon="sprout-outline" label={`Measured on ${plantName(bundle, o.cropId).english.toLowerCase()}`} tone="warn" /> : null}
        {isCumulative(o) ? <Tag icon="layers-outline" label="Includes earlier steps" /> : null}
      </View>
      <Expander title="Paper and table" icon="file-document-outline">
        <View style={{ gap: space.xs, paddingTop: space.xs }}>
          {sourceDetails(bundle, o).map((s) => (
            <Small key={s} muted={false}>
              {s}
            </Small>
          ))}
          <Small>
            {o.effect}. Range {o.effectRange[0]}% to {o.effectRange[1]}%.
          </Small>
          <Small>Evidence: {o.evidence}.</Small>
          {o.timeH !== null || o.tempC !== null ? (
            <Small>
              As done in the study: {o.timeH !== null ? `${o.timeH} h` : ""}
              {o.timeH !== null && o.tempC !== null ? " at " : ""}
              {o.tempC !== null ? `${o.tempC} °C` : ""}. Study conditions, not safety advice.
            </Small>
          ) : null}
        </View>
      </Expander>
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
      <Screen>
        <StateView kind="empty" title="We could not find that dish" message="Go back and pick a dish from the list." />
      </Screen>
    );
  }

  return (
    <Screen>
      <Reveal>
        <HeroTile icon={dishIcon(dish.id)} height={230} />
      </Reveal>

      <Reveal index={1}>
        <Text style={[type.label, { color: c.onSurfaceVariant }]}>Step by step</Text>
        <Text accessibilityRole="header" style={[type.display, { color: c.onBackground }]}>
          {dish.name}
        </Text>
        <Text style={[type.bodyStrong, { color: c.primary }]}>How to prepare {plantLabel(bundle, plantId)}</Text>
        <View style={[styles.metaRow, { marginTop: space.sm }]}>
          <Meta icon="format-list-numbered" label={`${p.steps.length + 1} steps`} />
          <Meta icon="book-open-variant" label={`${p.findings.length} published results`} />
          <Meta icon="shield-check-outline" label="Safety rules applied" />
        </View>
      </Reveal>

      {p.wholeBlocked.length ? (
        <Note icon="hand-back-left-outline" title="Not shown for safety">
          {p.wholeBlocked.join(" ")}
          {UNREVIEWED_LABEL}
        </Note>
      ) : (
        <>
          <Reveal index={2}>
            <View style={styles.stepsHead}>
              <SectionTitle title="Steps" />
              {p.anyModel ? <Tag icon="chart-line" label="Includes predicted values" tone="warn" /> : <Tag icon="book-check-outline" label="Published results, not a prediction" tone="good" />}
            </View>
            <View style={[styles.steps, { backgroundColor: c.surface }]}>
              {p.steps.map((s, i) => (
                <View key={s}>
                  {i > 0 ? <View style={[styles.divider, { backgroundColor: c.hairline }]} /> : null}
                  <View style={styles.step}>
                    <Numeral n={i + 1} />
                    <Body style={{ flex: 1 }}>{s}</Body>
                  </View>
                </View>
              ))}
            </View>
          </Reveal>

          <Reveal index={3}>
            <View style={[styles.final, { backgroundColor: c.primaryContainer }]} accessible accessibilityLabel={FINAL_STEP}>
              <Glow size={260} style={{ right: -90, top: -110 }} strength={1.6} />
              <View style={[styles.finalIcon, { backgroundColor: "rgba(10,11,13,0.35)" }]}>
                <MaterialCommunityIcons name="pot-steam" size={30} color={c.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[type.label, { color: c.onPrimaryContainer }]}>Always finish with</Text>
                <Text style={[type.title, { color: c.onPrimaryContainer }]}>{FINAL_STEP}</Text>
              </View>
            </View>
            {p.route?.conditions ? (
              <Expander title="As done in the study" icon="flask-outline">
                <Small muted={false} style={{ paddingTop: space.xs }}>
                  {p.route.conditions} These are study conditions, not safety advice.
                </Small>
              </Expander>
            ) : null}
          </Reveal>

          {p.hiddenCount ? (
            <Reveal index={4}>
              <View style={[styles.hidden, { backgroundColor: c.muted }]}>
                <View style={styles.findingHead}>
                  <MaterialCommunityIcons name="shield-alert-outline" size={22} color={c.accent} />
                  <Small muted={false} style={{ flex: 1 }}>
                    {p.hiddenCount} other published method{p.hiddenCount === 1 ? " is" : "s are"} not shown because of a safety rule
                    {UNREVIEWED_LABEL}.
                  </Small>
                </View>
                <Expander title="Why some methods are hidden" icon="information-outline">
                  <View style={{ gap: space.xs, paddingTop: space.xs }}>
                    {p.hiddenReasons.map((r) => (
                      <Small key={r} muted={false}>
                        {r}
                      </Small>
                    ))}
                  </View>
                </Expander>
              </View>
            </Reveal>
          ) : null}

          {p.warnings.map((w, i) => (
            <Reveal key={w} index={5 + i}>
              <Note icon="hand-heart-outline" title="Good to know">
                {w}
              </Note>
            </Reveal>
          ))}

          <Reveal index={6 + p.warnings.length}>
            <Card style={{ gap: space.md, overflow: "hidden" }}>
              <Glow size={240} style={{ left: -120, top: -120 }} strength={0.8} />
              <Text accessibilityRole="header" style={[type.title, { color: c.onBackground }]}>
                What the papers found
              </Text>
              {p.findings.length === 0 ? (
                <Body muted>No published results for this plant yet. Follow the steps and cook until fully soft.</Body>
              ) : (
                p.findings.map((f, i) => (
                  <View key={f.goal}>
                    {i > 0 ? <Hairline /> : null}
                    <FindingRow f={f} bundle={bundle} plantId={plantId} />
                  </View>
                ))
              )}
              <Small>
                Changes are against the raw, untreated seeds in the same study.{" "}
                {p.anyModel ? "Some values are predicted by a small model, with a range." : "Published results, not a prediction."}
              </Small>
            </Card>
          </Reveal>
        </>
      )}

      <LimitsLink />
    </Screen>
  );
}

export default function Prepare() {
  return <BundleGate>{(bundle) => <PrepareBody bundle={bundle} />}</BundleGate>;
}

const styles = StyleSheet.create({
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: space.md },
  stepsHead: { flexDirection: "row", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", gap: space.sm },
  steps: { borderRadius: radius.card, paddingHorizontal: space.lg, paddingVertical: space.sm },
  step: { flexDirection: "row", gap: space.md, alignItems: "center", paddingVertical: space.md },
  divider: { height: 1, marginLeft: 46 },
  final: { borderRadius: radius.card, padding: space.lg, flexDirection: "row", alignItems: "center", gap: space.md, overflow: "hidden" },
  finalIcon: { width: 56, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  hidden: { borderRadius: radius.card, padding: space.lg, gap: space.xs },
  findingHead: { flexDirection: "row", gap: space.md, alignItems: "center" },
  findingIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
});
