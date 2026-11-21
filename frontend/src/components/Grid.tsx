// Simple fixed-column grid. Pads the last row so every cell keeps the same width.
import { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { space } from "../theme/tokens";

export function Grid({ columns, children, gap = space.md }: { columns: number; children: ReactNode[]; gap?: number }) {
  const rows: ReactNode[][] = [];
  for (let i = 0; i < children.length; i += columns) rows.push(children.slice(i, i + columns));
  return (
    <View style={{ gap: gap + space.xs }}>
      {rows.map((row, r) => (
        <View key={r} style={[styles.row, { gap }]}>
          {row}
          {Array.from({ length: columns - row.length }, (_, k) => (
            <View key={`pad${k}`} style={styles.pad} />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start" },
  pad: { flex: 1 },
});
