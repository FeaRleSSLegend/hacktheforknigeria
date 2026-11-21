// Social (coming soon): a faded preview of a feed where cooks share what they made, under a
// "Coming soon" message. The posts are made-up examples, hidden from screen readers and not tappable.
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ImageSourcePropType, Image, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { dishPhoto, plantPhoto } from "../../lib/photos";
import { useAppTheme } from "../../theme";
import { fonts, radius, space, type } from "../../theme/tokens";

interface SamplePost {
  name: string;
  when: string;
  text: string;
  photo?: ImageSourcePropType;
  likes: number;
  replies: { name: string; text: string }[];
}

const SAMPLE_POSTS: SamplePost[] = [
  {
    name: "Ada",
    when: "2h",
    text: "Tried akara with half cowpea, half bambara. Lighter than I expected.",
    photo: dishPhoto("akara"),
    likes: 24,
    replies: [{ name: "Tunde", text: "Did you soak the bambara longer?" }],
  },
  {
    name: "Musa",
    when: "5h",
    text: "Miyan gyada for six people tonight. Groundnut from the market by the mudu.",
    photo: dishPhoto("miyan_gyada"),
    likes: 41,
    replies: [{ name: "Ngozi", text: "What did you eat it with?" }],
  },
  {
    name: "Chioma",
    when: "1d",
    text: "First time making fio fio. Took patience but my family loved it.",
    photo: plantPhoto("pigeon_pea"),
    likes: 18,
    replies: [],
  },
  {
    name: "Bisi",
    when: "2d",
    text: "Moin-moin with leftover beans. Steamed in leaves like my mum does.",
    photo: dishPhoto("moin_moin"),
    likes: 33,
    replies: [{ name: "Emeka", text: "Leaves or tins, which is better?" }],
  },
];

function Post({ p }: { p: SamplePost }) {
  const { custom: c } = useAppTheme();
  return (
    <View style={[styles.post, { borderColor: c.hairline }]}>
      <View style={styles.head}>
        <View style={[styles.avatar, { backgroundColor: c.raised }]}>
          <Text style={[type.bodyStrong, { color: c.onBackground }]}>{p.name[0]}</Text>
        </View>
        <Text style={[type.bodyStrong, { color: c.onBackground, flex: 1 }]}>{p.name}</Text>
        <Text style={[type.small, { color: c.onSurfaceVariant }]}>{p.when}</Text>
      </View>
      <Text style={[type.body, { color: c.onBackground }]}>{p.text}</Text>
      {p.photo ? <Image source={p.photo} style={styles.photo} resizeMode="cover" /> : null}
      <View style={styles.actions}>
        <MaterialCommunityIcons name="heart-outline" size={20} color={c.onBackground} />
        <Text style={[type.small, { color: c.onBackground }]}>{p.likes}</Text>
        <MaterialCommunityIcons name="comment-outline" size={20} color={c.onBackground} style={{ marginLeft: space.md }} />
        <Text style={[type.small, { color: c.onBackground }]}>{p.replies.length}</Text>
      </View>
      {p.replies.map((r) => (
        <View key={r.name} style={[styles.reply, { backgroundColor: c.raised }]}>
          <Text style={[type.small, { color: c.onBackground }]}>
            <Text style={{ fontWeight: "600" }}>{r.name}</Text> {r.text}
          </Text>
        </View>
      ))}
    </View>
  );
}

export default function Social() {
  const { custom: c } = useAppTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.fill, { backgroundColor: c.background }]}>
      <View style={[styles.fill, styles.feed]} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <ScrollView scrollEnabled={false} contentContainerStyle={{ paddingTop: insets.top + space.lg, paddingHorizontal: space.lg, gap: space.lg }}>
          {SAMPLE_POSTS.map((p) => (
            <Post key={p.name} p={p} />
          ))}
        </ScrollView>
      </View>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Text style={[type.label, { color: c.onSurfaceVariant, letterSpacing: 2 }]}>SOCIAL</Text>
        <Text accessibilityRole="header" style={[styles.soon, { color: c.onBackground }]}>
          COMING SOON
        </Text>
        <Text style={[type.body, { color: c.onSurfaceVariant, textAlign: "center", maxWidth: 300 }]}>
          Share the dishes you make and see what other cooks are trying.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  feed: { opacity: 0.18 },
  post: { gap: space.md, paddingBottom: space.lg, borderBottomWidth: 1 },
  head: { flexDirection: "row", alignItems: "center", gap: space.md },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  photo: { width: "100%", height: 220, borderRadius: radius.card },
  actions: { flexDirection: "row", alignItems: "center", gap: space.xs },
  reply: { borderRadius: radius.card, paddingHorizontal: space.md, paddingVertical: space.sm },
  center: { alignItems: "center", justifyContent: "center", gap: space.md, padding: space.xl },
  soon: { fontFamily: fonts.display, fontSize: 48, lineHeight: 52, textAlign: "center" },
});
