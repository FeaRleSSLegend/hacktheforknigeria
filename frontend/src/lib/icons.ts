import { ComponentProps } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

// Colour blocks and food icons stand in for photos.
export const DISH_ICONS: Record<string, IconName> = {
  akara: "circle-multiple",
  moin_moin: "cake-variant-outline",
  ekuru: "food-variant",
  okpa: "food-croissant",
  gbegiri: "bowl-mix-outline",
  egusi_soup: "pot-mix-outline",
};

export const dishIcon = (id: string): IconName => DISH_ICONS[id] ?? "silverware-fork-knife";
