// Prepare: photos, up to 5 sourced steps, one caution, and the evidence behind "How do we know?".
// Everything shown passed safetyGuard (src/lib/prepare.ts). Rules are shown only through their plain
// user_text; review status lives on the About page.
import { router, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

import { BundleGate } from "../../components/BundleGate";
import { Screen } from "../../components/Screen";
import { Body, Caption, Caution, Expander, Hairline, Heading, PhotoStrip, Poster, Reveal, Small, StateView, Tag } from "../../components/ui";
import { Bundle, ProcessingOption } from "../../engine/types";
import { LOGO_MARK } from "../../lib/brand";
import { dishPhoto, rawToReady } from "../../lib/photos";
import { Finding, preparePlan, userText } from "../../lib/prepare";
import { METRIC_WORDS, effectSentence, isCumulative, plantName, samplesText, studiesLabel } from "../../lib/words";
import { usePlan } from "../../state/PlanContext";
import { useAppTheme } from "../../theme";
import { fonts, radius, space, type } from "../../theme/tokens";

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
        <Tag label={studiesLabel(o)} />
        {other ? <Tag label={`Measured on ${plantName(bundle, o.cropId).english.toLowerCase()}`} /> : null}
        {isCumulative(o) ? <Tag label="Includes earlier steps" /> : null}
        {o.kind === "model" ? <Tag label="Predicted, with a range" /> : null}
      </View>
      <Small>Source: {sourceDetails(bundle, o).join("; ")}.</Small>
    </View>
  );
}

function AskPopoButton({ dishId, plantId }: { dishId: string; plantId: string }) {
  const { custom: c } = useAppTheme();
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/ask/[dishId]", params: { dishId, plant: plantId } })}
      accessibilityRole="button"
      accessibilityLabel="Ask Popo, the cooking helper, a question about these steps"
      style={({ pressed }) => [styles.popo, { backgroundColor: c.onBackground, transform: [{ scale: pressed ? 0.96 : 1 }] }]}
    >
      <Image source={LOGO_MARK} style={styles.popoMark} resizeMode="contain" accessible={false} />
      <Text style={[type.bodyStrong, { color: c.background }]}>Ask Popo</Text>
    </Pressable>
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
      <Screen backLabel="Back to dish">
        <StateView kind="empty" title="We could not find that dish" message="Go back and pick a dish." />
      </Screen>
    );
  }
  const plant = plantName(bundle, plantId);
  const cautions = [FINAL_STEP, ...p.firedRules.map(userText).filter((t): t is string => !!t)];

  return (
    <Screen backLabel="Back to dish" floating={p.wholeBlocked.length ? undefined : <AskPopoButton dishId={dish.id} plantId={plantId} />}>
      <Reveal>
        <Poster source={dishPhoto(dish.id)} height={320}>
          <Caption>
            {dish.name.split(" (")[0].toUpperCase()} · WITH {plant.english.toUpperCase()}
          </Caption>
          <Heading level="display">How to prepare</Heading>
        </Poster>
      </Reveal>

      {p.wholeBlocked.length ? (
        <Caution lines={["This plant is on your leave-out list, so we do not show steps for it."]} />
      ) : (
        <>
          <Reveal index={1}>
            <PhotoStrip {...rawToReady(dish.id, plantId)} beforeLabel="RAW" afterLabel="READY" />
          </Reveal>

          <Reveal index={2}>
            <View>
              {p.steps.slice(0, MAX_STEPS).map((s, i) => (
                <View key={s} style={[styles.step, { borderColor: c.hairline }]} accessible accessibilityLabel={`Step ${i + 1}. ${s}`}>
                  <Text style={[styles.num, { color: c.onBackground }]}>{String(i + 1).padStart(2, "0")}</Text>
                  <Body style={{ flex: 1 }}>{s}</Body>
                </View>
              ))}
            </View>
          </Reveal>

          <Reveal index={3}>
            <Caution lines={cautions} />
          </Reveal>

          <Reveal index={4}>
            <Expander title="How do we know?">
              <Small muted={false}>We only show methods that are safe to follow at home.</Small>
              {p.findings.length === 0 ? <Small muted={false}>No published results for this plant yet.</Small> : null}
              {p.findings.map((f, i) => (
                <View key={f.goal}>
                  {i > 0 ? <Hairline /> : null}
                  <FindingRow f={f} bundle={bundle} plantId={plantId} />
                </View>
              ))}
              {p.route?.conditions ? <Small>As done in the study: {p.route.conditions}</Small> : null}
              <Small>Changes are compared with raw seeds in the same study. {p.anyModel ? "Some values are predicted, with a range." : "Published results, not a prediction."}</Small>
            </Expander>
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
  step: { flexDirection: "row", gap: space.lg, alignItems: "flex-start", paddingVertical: space.lg, borderTopWidth: 1 },
  num: { fontFamily: fonts.display, fontSize: 28, lineHeight: 30, minWidth: 36 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  popo: { flexDirection: "row", alignItems: "center", gap: space.sm, minHeight: 52, borderRadius: radius.round, paddingLeft: space.sm, paddingRight: space.lg },
  popoMark: { width: 36, height: 36 },
});
