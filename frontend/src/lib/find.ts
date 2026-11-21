// "Find around you": links that hand a search to the phone's map app or a delivery app. ProteinPath sends
// only the dish name (and an area, if the cook types one). It never reads the phone's location; the map
// app uses its own location setting. Delivery sites were checked to load on 2026-11-21.
import { Platform } from "react-native";

export interface OrderSite {
  id: string;
  name: string;
  url: string;
  note: string;
}

export const ORDER_SITES: OrderSite[] = [
  { id: "chowdeck", name: "Chowdeck", url: "https://chowdeck.com/", note: "Restaurants and local kitchens" },
  { id: "glovo", name: "Glovo", url: "https://glovoapp.com/en/ng", note: "Restaurants in several Nigerian cities" },
  { id: "heyfood", name: "Heyfood", url: "https://heyfood.africa/", note: "Local food vendors" },
  { id: "foodcourt", name: "FoodCourt", url: "https://www.getfoodcourt.com/", note: "Its own kitchens, Lagos" },
];

/** Short dish name for a search, e.g. "Fio fio (pigeon pea porridge)" -> "Fio fio". */
export const searchName = (dishName: string): string => dishName.split(" (")[0].trim();

/** A map search for places selling the dish, near the phone or in the area typed. */
export function mapSearchUrl(dishName: string, area?: string, os: string = Platform.OS): string {
  const where = area?.trim() ? `in ${area.trim()}` : "near me";
  const q = encodeURIComponent(`${searchName(dishName)} ${where}`);
  return os === "ios" ? `https://maps.apple.com/?q=${q}` : `https://www.google.com/maps/search/?api=1&query=${q}`;
}
