// Prepare: sourced steps for the chosen plant, what the papers found, and safety notes.
// Everything shown here passed safetyGuard (see src/lib/prepare.ts).
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

import { BundleGate } from "../../components/BundleGate";
import { LimitsLink, Screen } from "../../components/Screen";
import { Body, Card, Expander, Hairline, Heading, Note, Numeral, Reveal, Small, StateView, Tag } from "../../components/ui";
import { UNREVIEWED_LABEL } from "../../engine/safety";
import { Bundle, ProcessingOption } from "../../engine/types";
import { dishIcon } from "../../lib/icons";
import { Finding, preparePlan } from "../../lib/prepare";
import { METRIC_WORDS, effectSentence, isCumulative, plantLabel, plantName, samplesText, studiesLabel } from "../../lib/words";
import { usePlan } from "../../state/PlanContext";
import { useAppTheme } from "../../theme";
import { space, type } from "../../theme/tokens";

const FINAL_STEP = "Cook beans until fully soft";

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
  const other = o.cropId !== plantId || !!o.pooledFrom;
  return (
    <View style={{ gap: space.sm }}>
      <Body strong>
        {effectSentence(words.name, o.effectRange)} in {samplesText(o, bundle)}.
      </Body>
      {words.plain ? <Small>{words.plain}</Small> : null}
      <View style={styles.tags}>
        <Tag icon="book-open-page-variant-outline" label={studiesLabel(o)} tone={other ? "warn" : "plain"} />
        {other ? (
          <Tag
            icon="sprout-outline"
            label={o.pooledFrom ? `Not measured on ${plantName(bundle, plantId).english.toLowerCase()}` : `Measured on ${plantName(bundle, o.cropId).english.toLowerCase()}`}
            tone="warn"
          />
        ) : null}
        {isCumulative(o) ? <Tag icon="layers-outline" label="Includes earlier steps" /> : null}
      </View>
      <Expander title="Paper and table" icon="file-document-outline">
        <View style={{ gap: space.xs, paddingTop: space.xs }}>
          {sourceDetails(bundle, o).map((s) => (
            <Small key={s} muted={false}>
              {s}
            </Small>
          ))}
          <Small>{o.effect}. Range {o.effectRange[0]}% to {o.effectRange[1]}%.</Small>
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
  const plantText = plantLabel(bundle, plantId);

  return (
    <Screen>
      <Reveal>
        <View style={styles.head}>
          <View style={[styles.block, { backgroundColor: c.accentContainer }]}>
            <MaterialCommunityIcons name={dishIcon(dish.id)} size={30} color={c.onAccentContainer} />
          </View>
          <View style={{ flex: 1 }}>
            <Heading level="display">{dish.name}</Heading>
            <Body muted>How to prepare {plantText}</Body>
          </View>
        </View>
      </Reveal>

      {p.wholeBlocked.length ? (
        <Note icon="hand-back-left-outline" title="Not shown for safety">
          {p.wholeBlocked.join(" ")}
          {UNREVIEWED_LABEL}
        </Note>
      ) : (
        <>
          <Reveal index={1}>
            <Card style={{ gap: space.md }}>
              <View style={styles.between}>
                <Heading level="heading">Steps</Heading>
                {p.anyModel ? <Tag icon="chart-line" label="Includes predicted values" tone="warn" /> : <Tag icon="book-check-outline" label="Published results, not a prediction" tone="good" />}
              </View>
              {p.steps.map((s, i) => (
                <View key={s} style={styles.step}>
                  <Numeral n={i + 1} />
                  <Body style={{ flex: 1 }}>{s}</Body>
                </View>
              ))}
              <Hairline />
              <View style={styles.step} accessibilityRole="text">
                <MaterialCommunityIcons name="pot-steam-outline" size={26} color={c.primary} />
                <Text style={[type.heading, { color: c.primary, flex: 1 }]}>{FINAL_STEP}</Text>
              </View>
              {p.route?.conditions ? (
                <Expander title="As done in the study" icon="flask-outline">
                  <Small muted={false} style={{ paddingTop: space.xs }}>
                    {p.route.conditions} These are study conditions, not safety advice.
                  </Small>
                </Expander>
              ) : null}
            </Card>
          </Reveal>

          {p.hiddenCount ? (
            <Reveal index={2}>
              <View style={{ gap: space.xs }}>
                <Small muted={false}>
                  {p.hiddenCount} other published method{p.hiddenCount === 1 ? " is" : "s are"} not shown because of a safety rule
                  {UNREVIEWED_LABEL}.
                </Small>
                <Expander title="Why some methods are hidden" icon="shield-alert-outline">
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
            <Reveal key={w} index={3 + i}>
              <Note icon="hand-heart-outline" title="Good to know">
                {w}
              </Note>
            </Reveal>
          ))}

          <Reveal index={4 + p.warnings.length}>
            <Card style={{ gap: space.md }}>
              <Heading level="heading">What the papers found</Heading>
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
  head: { flexDirection: "row", gap: space.md, alignItems: "center" },
  block: { width: 64, height: 64, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  between: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: space.sm },
  step: { flexDirection: "row", gap: space.md, alignItems: "flex-start" },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
});
