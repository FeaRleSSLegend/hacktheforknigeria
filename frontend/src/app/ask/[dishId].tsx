// Ask Popo: a chat for follow-up questions about preparing one dish. Popo answers only from what the
// Prepare screen shows; the service checks every answer (see backend/service/popo.py). Offline, or
// without the service, Popo quotes the matching published steps instead.
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { ComponentRef, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BundleGate } from "../../components/BundleGate";
import { StateView } from "../../components/ui";
import { Bundle } from "../../engine/types";
import { LOGO_MARK } from "../../lib/brand";
import { PopoTurn, askPopo } from "../../lib/net";
import { offlineAnswer, popoContext } from "../../lib/popo";
import { preparePlan } from "../../lib/prepare";
import { usePlan } from "../../state/PlanContext";
import { useAppTheme } from "../../theme";
import { fonts, radius, space, type } from "../../theme/tokens";

type Origin = "llm" | "template" | "offline";
interface Message {
  role: "user" | "assistant";
  text: string;
  origin?: Origin;
}

const ORIGIN_LABEL: Record<Origin, string> = {
  llm: "Popo · AI, checked against the steps",
  template: "Popo · from the published steps",
  offline: "Popo · offline, from the steps",
};
const SUGGESTIONS = ["Why soak the beans twice?", "Can I skip removing the skins?", "How do I know it is cooked?"];

function Mark({ size, tint }: { size: number; tint?: string }) {
  return <Image source={LOGO_MARK} style={{ width: size, height: size, tintColor: tint }} resizeMode="contain" accessible={false} />;
}

function Bubble({ m }: { m: Message }) {
  const { custom: c } = useAppTheme();
  const mine = m.role === "user";
  return (
    <View style={[styles.bubbleRow, { justifyContent: mine ? "flex-end" : "flex-start" }]} accessible accessibilityLabel={`${mine ? "You" : "Popo"}: ${m.text}`}>
      {mine ? null : (
        <View style={[styles.avatar, { backgroundColor: c.onBackground }]}>
          <Mark size={18} />
        </View>
      )}
      <View style={{ maxWidth: "80%", gap: 4 }}>
        <View style={[styles.bubble, mine ? { backgroundColor: c.onBackground, borderBottomRightRadius: 6 } : { backgroundColor: c.raised, borderBottomLeftRadius: 6 }]}>
          <Text style={[type.body, { color: mine ? c.background : c.onBackground }]}>{m.text}</Text>
        </View>
        {m.origin ? <Text style={[type.small, { fontSize: 12, color: c.onSurfaceVariant }]}>{ORIGIN_LABEL[m.origin]}</Text> : null}
      </View>
    </View>
  );
}

function AskBody({ bundle }: { bundle: Bundle }) {
  const { custom: c } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { plan } = usePlan();
  const params = useLocalSearchParams<{ dishId: string; plant?: string }>();
  const dish = bundle.dishes.find((d) => d.id === params.dishId);
  const plantId = params.plant ?? dish?.protein_slot_ids[0] ?? "";
  const context = useMemo(() => (dish ? popoContext(bundle, dish, plantId, preparePlan(bundle, dish, plantId, plan.allergens)) : null), [bundle, dish, plantId, plan.allergens]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);

  if (!dish || !context) {
    return <StateView kind="empty" title="We could not find that dish" message="Go back and pick a dish." />;
  }

  const send = async (raw: string) => {
    const question = raw.trim().slice(0, 400);
    if (!question || busy) return;
    const history: PopoTurn[] = messages.map((m) => ({ role: m.role, text: m.text }));
    setMessages((ms) => [...ms, { role: "user", text: question }]);
    setDraft("");
    setBusy(true);
    const reply = await askPopo(context, history, question);
    const next: Message =
      reply.kind === "answer"
        ? { role: "assistant", text: reply.answer, origin: reply.source }
        : { role: "assistant", text: offlineAnswer(context, question), origin: "offline" };
    setMessages((ms) => [...ms, next]);
    setBusy(false);
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + space.sm, borderColor: c.hairline }]}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Close Popo" hitSlop={8} style={styles.close}>
          <MaterialCommunityIcons name="close" size={26} color={c.onBackground} />
        </Pressable>
        <View style={[styles.avatar, { backgroundColor: c.onBackground }]}>
          <Mark size={18} />
        </View>
        <View style={{ flex: 1 }}>
          <Text accessibilityRole="header" style={{ fontFamily: fonts.display, fontSize: 24, lineHeight: 28, color: c.onBackground }}>
            Ask Popo
          </Text>
          <Text style={[type.small, { fontSize: 12, color: c.onSurfaceVariant }]}>{context.dish} · with {context.plant}</Text>
        </View>
      </View>

      <ScrollView ref={scroll} contentContainerStyle={styles.thread} keyboardShouldPersistTaps="handled">
        <Bubble
          m={{
            role: "assistant",
            text: `Hi, I'm Popo. Ask me anything about preparing ${context.dish.toLowerCase()} with ${context.plant}. I only answer from the published steps, so I won't guess times or amounts.`,
          }}
        />
        {messages.length === 0 ? (
          <View style={styles.suggestions}>
            {SUGGESTIONS.map((s) => (
              <Pressable key={s} onPress={() => send(s)} accessibilityRole="button" accessibilityLabel={`Ask: ${s}`} style={({ pressed }) => [styles.suggestion, { borderColor: c.outline, opacity: pressed ? 0.7 : 1 }]}>
                <Text style={[type.label, { color: c.onBackground }]}>{s}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        {messages.map((m, i) => (
          <Bubble key={i} m={m} />
        ))}
        {busy ? (
          <View style={styles.bubbleRow} accessibilityLiveRegion="polite" accessibilityLabel="Popo is thinking">
            <ActivityIndicator color={c.onSurfaceVariant} />
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.composer, { borderColor: c.hairline, paddingBottom: insets.bottom + space.sm }]}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Ask about these steps"
          placeholderTextColor={c.onSurfaceVariant}
          maxLength={400}
          multiline
          accessibilityLabel="Your question for Popo"
          style={[type.body, styles.input, { color: c.onBackground, backgroundColor: c.raised }]}
        />
        <Pressable
          onPress={() => send(draft)}
          disabled={!draft.trim() || busy}
          accessibilityRole="button"
          accessibilityLabel="Send question"
          accessibilityState={{ disabled: !draft.trim() || busy }}
          style={({ pressed }) => [styles.send, { backgroundColor: c.onBackground, opacity: !draft.trim() || busy ? 0.35 : pressed ? 0.8 : 1 }]}
        >
          <MaterialCommunityIcons name="arrow-up" size={22} color={c.background} />
        </Pressable>
      </View>
      <Text style={[type.small, styles.note, { color: c.onSurfaceVariant, paddingBottom: insets.bottom ? 0 : space.sm }]}>
        Questions go to an online AI. Do not share personal details.
      </Text>
    </KeyboardAvoidingView>
  );
}

export default function AskPopo() {
  return <BundleGate>{(bundle) => <AskBody bundle={bundle} />}</BundleGate>;
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.lg, paddingBottom: space.md, borderBottomWidth: StyleSheet.hairlineWidth },
  close: { width: 48, height: 48, alignItems: "flex-start", justifyContent: "center" },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  thread: { padding: space.lg, gap: space.md },
  bubbleRow: { flexDirection: "row", alignItems: "flex-end", gap: space.sm },
  bubble: { borderRadius: radius.card, paddingHorizontal: space.lg, paddingVertical: space.md },
  suggestions: { gap: space.sm, paddingLeft: 40 },
  suggestion: { borderWidth: 1, borderRadius: radius.round, paddingHorizontal: space.lg, minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: space.sm, paddingHorizontal: space.lg, paddingTop: space.sm, borderTopWidth: StyleSheet.hairlineWidth },
  input: { flex: 1, minHeight: 48, maxHeight: 120, borderRadius: 24, paddingHorizontal: space.lg, paddingTop: 12, paddingBottom: 12 },
  send: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  note: { fontSize: 12, textAlign: "center", paddingHorizontal: space.lg },
});
