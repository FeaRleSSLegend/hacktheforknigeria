// About: what the app is, its limits (including safety-rule review status and the connection state),
// the model card, sources and photo credits.
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { BundleGate } from "../../components/BundleGate";
import { Screen } from "../../components/Screen";
import { Body, Caption, Expander, Heading, Poster, Reveal, Small } from "../../components/ui";
import { WEIGHTS } from "../../engine/config";
import { Bundle } from "../../engine/types";
import { watchConnection } from "../../lib/net";
import { HERO_PHOTO, PHOTO_CREDITS } from "../../lib/photos";
import { joinAnd, plantName } from "../../lib/words";
import { useAppTheme } from "../../theme";
import { space } from "../../theme/tokens";

const pct = (x: number) => `${Math.round(x * 100)}%`;

function Line({ children }: { children: string }) {
  const { custom: c } = useAppTheme();
  return (
    <View style={[styles.line, { borderColor: c.hairline }]} accessible accessibilityLabel={children}>
      <Body>{children}</Body>
    </View>
  );
}

function AboutBody({ bundle }: { bundle: Bundle }) {
  const [online, setOnline] = useState<boolean | null>(null);
  useEffect(() => watchConnection(setOnline), []);
  const f = useMemo(() => {
    const ings = bundle.ingredientOrder.map((id) => bundle.ingredients[id]);
    const priced = ings.filter((i) => i.price_ngn_per_kg !== null);
    const papers = [...new Set([...bundle.properties.map((r) => r.paper_id), ...bundle.treatments.map((r) => r.paper_id)])].sort();
    const card = Object.entries(bundle.modelCard?.metrics ?? {});
    const unreviewed = bundle.safetyRules.filter((r) => !r.reviewed).length;
    const compSources = [...new Set(ings.map((i) => i.source))];
    const priceSources = [...new Set(priced.map((i) => `${i.price_source} (${i.price_month})`))];
    return { ings, priced, papers, card, unreviewed, compSources, priceSources };
  }, [bundle]);

  return (
    <Screen>
      <Reveal>
        <Poster source={HERO_PHOTO} height={260}>
          <Caption>ABOUT</Caption>
          <Heading level="display">Honest numbers</Heading>
        </Poster>
      </Reveal>

      <Reveal index={1}>
        <Body muted>
          ProteinPath suggests local beans and seeds for a dish within your budget, and shows how to prepare them. Everything runs on this phone.
        </Body>
        <Small style={{ marginTop: space.sm }}>{online ? "Online now. The app does not need the internet." : "Offline now. Everything still works."}</Small>
      </Reveal>

      <Reveal index={2}>
        <Caption>LIMITS</Caption>
        <View style={{ marginTop: space.sm }}>
          <Line>{`Only ${f.priced.length} of ${f.ings.length} plants have a market price so far (${joinAnd(f.priced.map((i) => plantName(bundle, i.ingredient_id).english.toLowerCase()))}). You can add prices you know.`}</Line>
          <Line>Rows from papers are not yet checked against the original PDFs.</Line>
          <Line>{`${f.unreviewed} of ${bundle.safetyRules.length} safety rules are waiting for an expert to review them.`}</Line>
          <Line>Nothing here was tested in a lab by us. Published values come from different labs and methods.</Line>
          <Line>{`How much each property matters for a dish, the score weights (fit ${pct(WEIGHTS.fit)}, cost ${pct(WEIGHTS.cost)}, protein ${pct(WEIGHTS.density)}) and the portions are our estimates.`}</Line>
          <Line>
            {f.card.length === 0
              ? "Preparation advice comes from published experiments, not a prediction."
              : `${f.card.length} small models ship. They are only used where they beat a simple "no change" guess on papers they had not seen; otherwise we show published results.`}
          </Line>
          <Line>No health claims. Plate balance (energy, iron, fat with sides) is coming once sourced reference values are added.</Line>
        </View>
      </Reveal>

      <Reveal index={3}>
        {f.card.length ? (
          <Expander title="Model backtest">
            <Small muted={false}>{bundle.modelCard?.validation}</Small>
            {f.card.map(([metric, m]) => (
              <Small key={metric} muted={false}>
                {`${metric.replace(/_/g, " ")}: error ${m.maeModel.toFixed(1)} vs ${m.maeNoChange.toFixed(1)} for "no change" (${m.nRows} rows, ${m.nPapers} papers). Shown as "${m.displayLabel}".`}
              </Small>
            ))}
          </Expander>
        ) : null}
        <Expander title="Data sources">
          <Small muted={false}>{`${f.papers.length} published papers, data version ${bundle.version}.`}</Small>
          {f.compSources.map((s) => (
            <Small key={s} muted={false}>
              Food composition: {s}
            </Small>
          ))}
          {f.priceSources.map((s) => (
            <Small key={s} muted={false}>
              Price: {s}
            </Small>
          ))}
          <Small muted={false}>Papers: {f.papers.join(", ")}</Small>
        </Expander>
        <Expander title="Photo credits">
          <Small muted={false}>Photos are illustrative: each shows a dish or plant as commonly seen, not the exact recipe the app works out.</Small>
          {PHOTO_CREDITS.map((p) => (
            <Small key={p.file} muted={false}>
              {p.subject}: {p.author}, {p.licence}, {p.source}
            </Small>
          ))}
        </Expander>
        <Small style={{ marginTop: space.lg }}>No accounts and no tracking. Your plan stays on this phone.</Small>
      </Reveal>
    </Screen>
  );
}

export default function About() {
  return <BundleGate>{(bundle) => <AboutBody bundle={bundle} />}</BundleGate>;
}

const styles = StyleSheet.create({
  line: { borderTopWidth: 1, paddingVertical: space.md },
});
