// Which dishes to show: only those that use at least one plant the cook ticked.
import { Bundle } from "../engine/types";

export function dishIdsForPicks(bundle: Bundle, pantryIds: readonly string[]): Set<string> {
  const picked = new Set(pantryIds);
  return new Set(bundle.dishes.filter((d) => d.protein_slot_ids.some((id) => picked.has(id))).map((d) => d.id));
}
