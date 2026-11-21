// About tab: what the app is, its limits (including safety-rule review status) and the data sources.
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

import { BundleGate } from "../../components/BundleGate";
import { Screen } from "../../components/Screen";
import { Body, Card, Expander, Heading, IconName, Reveal, SectionTitle, Small } from "../../components/ui";
import { Bundle } from "../../engine/types";
import { joinAnd, plantName } from "../../lib/words";
import { useAppTheme } from "../../theme";
import { space, type } from "../../theme/tokens";

function LimitRow({ icon, text }: { icon: IconName; text: string }) {
  const { custom: c } = useAppTheme();
  return (
    <View style={styles.limit} accessible accessibilityLabel={text}>
      <MaterialCommunityIcons name={icon} size={22} color={c.accent} />
      <Text style={[type.body, { color: c.onBackground, flex: 1 }]}>{text}</Text>
    </View>
  );
}

function AboutBody({ bundle }: { bundle: Bundle }) {
  const facts = useMemo(() => {
    const ings = bundle.ingredientOrder.map((id) => bundle.ingredients[id]);
    const priced = ings.filter((i) => i.price_ngn_per_kg !== null).map((i) => plantName(bundle, i.ingredient_id).english.toLowerCase());
    const papers = [...new Set([...bundle.properties.map((r) => r.paper_id), ...bundle.treatments.map((r) => r.paper_id)])].sort();
    const unreviewed = bundle.safetyRules.filter((r) => !r.reviewed).length;
    const shipped = Object.keys(bundle.model.models ?? {}).length;
    const compSources = [...new Set(ings.map((i) => i.source))];
    const priceSources = [...new Set(ings.filter((i) => i.price_ngn_per_kg !== null).map((i) => `${i.price_source} (${i.price_month})`))];
    return { ings, priced, papers, unreviewed, shipped, compSources, priceSources };
  }, [bundle]);

  return (
    <Screen>
      <Reveal>
        <Heading level="display">About</Heading>
        <Body muted style={{ marginTop: space.sm }}>
          ProteinPath helps you pick local beans and seeds for a dish, within your budget, and shows how to prepare them. It works without internet.
        </Body>
      </Reveal>

      <Reveal index={1}>
        <SectionTitle title="Limits" />
        <Card style={{ gap: space.md }}>
          <LimitRow
            icon="tag-off-outline"
            text={`Only ${facts.priced.length} of ${facts.ings.length} plants have a market price so far (${joinAnd(facts.priced)}).`}
          />
          <LimitRow icon="file-search-outline" text="Rows from papers are not yet checked against the original PDFs." />
          <LimitRow icon="shield-alert-outline" text={`${facts.unreviewed} of ${bundle.safetyRules.length} safety rules are waiting for an expert to review them.`} />
          <LimitRow icon="flask-empty-off-outline" text="Nothing here was tested in a lab by us. Published values come from different labs and methods." />
          <LimitRow icon="approximately-equal" text="How much each property matters for a dish, and the portions, are our estimates." />
          <LimitRow
            icon="chart-line"
            text={
              bundle.manifest.modelIsStub || facts.shipped === 0
                ? "Preparation advice comes from published experiments, not a prediction."
                : `${facts.shipped} small prediction model(s) ship; other advice comes from published experiments.`
            }
          />
          <LimitRow icon="scale-unbalanced" text="Plate balance (energy, iron, fat with sides) is coming once sourced reference values are added." />
        </Card>
      </Reveal>

      <Reveal index={2}>
        <SectionTitle title="Data sources" />
        <Card style={{ gap: space.sm }}>
          <Body>
            {facts.papers.length} published papers, data version {bundle.version}.
          </Body>
          <Expander title="See all sources" icon="book-open-variant">
            <View style={{ gap: space.sm, paddingTop: space.xs }}>
              {facts.compSources.map((s) => (
                <Small key={s} muted={false}>
                  Food composition: {s}
                </Small>
              ))}
              {facts.priceSources.map((s) => (
                <Small key={s} muted={false}>
                  Price: {s}
                </Small>
              ))}
              <Small muted={false}>Papers: {facts.papers.join(", ")}</Small>
            </View>
          </Expander>
          <Small>No accounts and no tracking. Your choices stay on this phone.</Small>
        </Card>
      </Reveal>
    </Screen>
  );
}

export default function About() {
  return <BundleGate>{(bundle) => <AboutBody bundle={bundle} />}</BundleGate>;
}

const styles = StyleSheet.create({
  limit: { flexDirection: "row", gap: space.md, alignItems: "flex-start" },
});
