import { ComponentProps } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

// Bold food icons on glowing tiles stand in for photos.
export const DISH_ICONS: Record<string, IconName> = {
  akara: "circle-multiple",
  moin_moin: "leaf-circle",
  ekuru: "pot-steam",
  okpa: "leaf-circle-outline",
  gbegiri: "bowl-mix",
  egusi_soup: "pot-mix",
};

export const dishIcon = (id: string): IconName => DISH_ICONS[id] ?? "silverware-fork-knife";
