// About and limits: what is measured, calculated or estimated; model card; sources; bundle version.
import { useMemo } from "react";
import { View } from "react-native";

import { BundleGate } from "../components/BundleGate";
import { Screen } from "../components/Screen";
import { Body, Card, Expander, Heading, Note, Reveal, Small } from "../components/ui";
import { WEIGHTS } from "../engine/config";
import { Bundle } from "../engine/types";
import { joinAnd, plantName } from "../lib/words";
import { space } from "../theme/tokens";

function count<T>(rows: T[], key: (r: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) out[key(r)] = (out[key(r)] ?? 0) + 1;
  return out;
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

function AboutBody({ bundle }: { bundle: Bundle }) {
  const facts = useMemo(() => {
    const ings = bundle.ingredientOrder.map((id) => bundle.ingredients[id]);
    const priced = ings.filter((i) => i.price_ngn_per_kg !== null);
    const fq = count(bundle.properties, (r) => r.quality);
    const tq = count(bundle.treatments, (r) => r.quality);
    const papers = new Set([...bundle.properties.map((r) => r.paper_id), ...bundle.treatments.map((r) => r.paper_id)]);
    const shipped = Object.entries(bundle.model.metrics ?? {}).filter(([, m]) => m.ships === true);
    const unreviewed = bundle.safetyRules.filter((r) => !r.reviewed).length;
    const compSources = [...new Set(ings.map((i) => i.source))];
    const priceSources = [...new Set(priced.map((i) => `${i.price_source} (${i.price_month})`))];
    return { ings, priced, fq, tq, papers, shipped, unreviewed, compSources, priceSources };
  }, [bundle]);

  const versionDate = bundle.version.slice(0, 10);
  const qualityLine = (q: Record<string, number>) =>
    Object.entries(q)
      .map(([k, n]) => `${n} ${k.replace(/_/g, " ")}`)
      .join(", ");

  return (
    <Screen>
      <Reveal>
        <Heading level="display">About and limits</Heading>
        <Body muted style={{ marginTop: space.sm }}>
          What this app knows, how sure it is, and what it cannot tell you.
        </Body>
      </Reveal>

      <Reveal index={1}>
        <Note icon="flask-empty-off-outline" title="Nothing here was tested in a lab by us" tone="primary">
          Every number comes from published papers, food tables or market price surveys. Published values come from different labs using different methods, so
          compare them with care.
        </Note>
      </Reveal>

      <Reveal index={2}>
        <Card style={{ gap: space.sm }}>
          <Heading level="heading">Measured, calculated, estimated</Heading>
          <Body>
            Plant properties: {qualityLine(facts.fq)} values from published papers.
          </Body>
          <Body>Preparation results: {qualityLine(facts.tq)} rows from published experiments.</Body>
          <Body>
            Plant composition: {facts.ings.filter((i) => i.quality === "measured").length} of {facts.ings.length} plants measured in the food table, the rest have some
            values the table itself estimated.
          </Body>
          <Body>
            Prices: {facts.priced.length} of {facts.ings.length} plants have a market price ({joinAnd(facts.priced.map((i) => plantName(bundle, i.ingredient_id).english.toLowerCase()))}).
            The others show “price needed”.
          </Body>
          <Body>
            Estimated by our team: how much each property matters for each dish, and the score weights (fit {pct(WEIGHTS.fit)}, cost {pct(WEIGHTS.cost)}, protein{" "}
            {pct(WEIGHTS.density)}). Portions are estimates too.
          </Body>
          <Body>Cost covers the plant protein only and excludes oil and spices.</Body>
        </Card>
      </Reveal>

      <Reveal index={3}>
        <Card style={{ gap: space.sm }}>
          <Heading level="heading">Safety rules</Heading>
          <Body>
            {facts.unreviewed} of {bundle.safetyRules.length} safety rules are not yet reviewed by an expert. Each safety message in the app says so.
          </Body>
          <Body>We never give boiling or fermenting times as safety advice. Study conditions are shown only as “as done in the study”. Cook beans until fully soft.</Body>
          <Body>This app makes no health claims. It shows published numbers and sourced steps only.</Body>
        </Card>
      </Reveal>

      <Reveal index={4}>
        <Card style={{ gap: space.sm }}>
          <Heading level="heading">Model card</Heading>
          {bundle.manifest.modelIsStub || facts.shipped.length === 0 ? (
            <Body>Preparation advice comes from published experiments, not a prediction. No prediction model ships in this version of the data.</Body>
          ) : (
            facts.shipped.map(([metric, m]) => (
              <Body key={metric}>
                {metric.replace(/_/g, " ")}: small linear model, tested on papers it had not seen
                {m.cv_mae !== undefined && m.baseline_mae !== undefined ? ` (error ${m.cv_mae} against ${m.baseline_mae} for the simple baseline)` : ""}.
              </Body>
            ))
          )}
          <Body>
            The ranking compares published functional properties (foaming, water and oil holding, gelling, emulsifying) of each plant for each dish, plus cost per
            gram of protein and protein per 100 g.
          </Body>
          <Body muted>Plate balance (energy, iron, fat with sides) is coming once sourced reference values are added.</Body>
        </Card>
      </Reveal>

      <Reveal index={5}>
        <Card style={{ gap: space.sm }}>
          <Heading level="heading">Data and sources</Heading>
          <Body>
            {facts.papers.size} published papers, data version {bundle.version} (built {versionDate}).
          </Body>
          <Expander title="Where the numbers come from">
            <View style={{ gap: space.sm, paddingTop: space.xs }}>
              {facts.compSources.map((s) => (
                <Small key={s} muted={false}>
                  Composition: {s}
                </Small>
              ))}
              {facts.priceSources.map((s) => (
                <Small key={s} muted={false}>
                  Price: {s}
                </Small>
              ))}
              <Small muted={false}>Papers: {[...facts.papers].sort().join(", ")}</Small>
              {bundle.manifest.notes.map((n) => (
                <Small key={n}>{n}</Small>
              ))}
            </View>
          </Expander>
          <Small>No accounts and no tracking. Your budget, body weight and choices stay on this phone.</Small>
        </Card>
      </Reveal>
    </Screen>
  );
}

export default function About() {
  return <BundleGate>{(bundle) => <AboutBody bundle={bundle} />}</BundleGate>;
}
