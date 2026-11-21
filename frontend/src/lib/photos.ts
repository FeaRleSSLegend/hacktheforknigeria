// Photos bundled in the app (offline). Illustrative only: they show each dish or plant as commonly
// seen, not the exact recipe the engine computes. Licences require the credits below (About screen).
import { ImageSourcePropType } from "react-native";

export interface PhotoCredit {
  file: string;
  subject: string;
  author: string;
  licence: string;
  source: string;
}

/* eslint-disable @typescript-eslint/no-require-imports */
const AKARA = require("../../assets/photos/akara.jpg");
const MOIN = require("../../assets/photos/moin-moin.jpg");
const GBEGIRI = require("../../assets/photos/gbegiri.jpg");
const EGUSI = require("../../assets/photos/egusi.jpg");
const OKPA = require("../../assets/photos/okpa.jpg");
const EKURU = require("../../assets/photos/ekuru.png");
const EKURU_RAW = require("../../assets/photos/ekuru-raw.png");
const EKURU_COOKED = require("../../assets/photos/ekuru-cooked.png");
const COWPEA = require("../../assets/photos/cowpea.jpg");
const GROUNDNUT_SOUP = require("../../assets/photos/groundnut-soup.jpg");
const PIGEON_PEA = require("../../assets/photos/plants/pigeon_pea.jpg");

export const HERO_PHOTO: ImageSourcePropType = COWPEA;
/** Dehulled beans: the raw starting point for bean pastes, used as a background on Dishes. */
export const BEANS_PREP_PHOTO: ImageSourcePropType = EKURU_RAW;

const DISH_PHOTOS: Record<string, ImageSourcePropType> = {
  akara: AKARA,
  moin_moin: MOIN,
  gbegiri: GBEGIRI,
  egusi_soup: EGUSI,
  okpa: OKPA,
  ekuru: EKURU,
  miyan_gyada: GROUNDNUT_SOUP,
  // No free dish photo downloaded yet: these show the plant they are made from.
  ewa_agoyin: COWPEA,
  ewa_riro: COWPEA,
  fio_fio: PIGEON_PEA,
};

const PLANT_PHOTOS: Record<string, ImageSourcePropType> = {
  cowpea: COWPEA,
  bambara: require("../../assets/photos/plants/bambara.jpg"),
  pigeon_pea: PIGEON_PEA,
  african_yam_bean: require("../../assets/photos/plants/african_yam_bean.jpg"),
  jack_bean: require("../../assets/photos/plants/jack_bean.jpg"),
  soybean: require("../../assets/photos/plants/soybean.jpg"),
  groundnut: require("../../assets/photos/plants/groundnut.jpg"),
  melon_seed: require("../../assets/photos/plants/melon_seed.jpg"),
  african_locust_bean: require("../../assets/photos/plants/african_locust_bean.jpg"),
};

/** "Before and after" pairs where a dish has its own preparation photos. */
const BEFORE_AFTER: Record<string, { before: ImageSourcePropType; after: ImageSourcePropType }> = {
  ekuru: { before: EKURU_RAW, after: EKURU_COOKED },
};

/** The dish photo, or undefined when there is none (the UI then shows a glow field, not a stand-in photo). */
export const dishPhoto = (id: string): ImageSourcePropType | undefined => DISH_PHOTOS[id];
export const plantPhoto = (id: string): ImageSourcePropType | undefined => PLANT_PHOTOS[id];

/** Raw plant (or the dish's own raw photo) and the finished dish, for the "from raw to ready" strip. */
export function rawToReady(dishId: string, plantId: string): { before?: ImageSourcePropType; after?: ImageSourcePropType } {
  const own = BEFORE_AFTER[dishId];
  return { before: own?.before ?? plantPhoto(plantId), after: own?.after ?? dishPhoto(dishId) };
}

const commons = (file: string) => `commons.wikimedia.org/wiki/File:${file}`;

export const PHOTO_CREDITS: PhotoCredit[] = [
  { file: "akara.jpg", subject: "Akara", author: "Ceentia", licence: "CC BY-SA 4.0", source: commons("Bean_cake_(Akara).jpg") },
  { file: "moin-moin.jpg", subject: "Moin-moin", author: "MOIBARDE", licence: "CC BY-SA 4.0", source: commons("Moi-moi_with_stew.jpg") },
  { file: "gbegiri.jpg", subject: "Gbegiri", author: "Ebiojo", licence: "CC BY-SA 4.0", source: commons("Amala_and_gbegiri.jpg") },
  { file: "egusi.jpg", subject: "Egusi soup", author: "Tesleemah", licence: "CC BY-SA 4.0", source: commons("Egusi_soup_in_a_plate.jpg") },
  { file: "okpa.jpg", subject: "Okpa", author: "Confidence24", licence: "CC BY-SA 4.0", source: commons("Okpa_(A_traditional_Igbo_steamed_delicacy).jpg") },
  { file: "groundnut-soup.jpg", subject: "Groundnut soup", author: "Blackmapapa", licence: "CC BY-SA 4.0", source: commons("Groundnut_Soup.JPG") },
  { file: "ekuru*.png", subject: "Ekuru (raw beans, wrapped and served)", author: "Provided by the ProteinPath team", licence: "used with the team's permission", source: "team photos" },
  { file: "cowpea.jpg", subject: "Cowpea", author: "Fumikas Sagisavas", licence: "CC0", source: commons("Patterned_cowpea_(20240714).jpg") },
  { file: "bambara.jpg", subject: "Bambara groundnut", author: "Ton Rulkens", licence: "CC BY-SA 2.0", source: commons("Vigna_subterranea_(4350578751).jpg") },
  { file: "pigeon_pea.jpg", subject: "Pigeon pea", author: "Forest and Kim Starr", licence: "CC BY 3.0 US", source: commons("Starr-090602-8776-Cajanus_cajan-seedpod_and_seeds-Wailuku-Maui_(24666508170).jpg") },
  { file: "african_yam_bean.jpg", subject: "African yam bean", author: "Tracey Slotta, USDA-NRCS PLANTS Database", licence: "Public domain", source: commons("Sphenostylis_stenocarpa_seeds.jpg") },
  { file: "jack_bean.jpg", subject: "Jack bean", author: "Roger Culos", licence: "CC BY-SA 3.0", source: commons("Canavalia_ensiformis_MHNT.BOT.2013.22.55.jpg") },
  { file: "soybean.jpg", subject: "Soya bean", author: "USDA", licence: "Public domain", source: commons("Soybean.USDA.jpg") },
  { file: "groundnut.jpg", subject: "Groundnut", author: "NIAID", licence: "CC BY 2.0", source: commons("Shelled_Peanuts_in_a_Bowl_(32910711266).jpg") },
  { file: "melon_seed.jpg", subject: "Melon seed (egusi)", author: "Judethedeus", licence: "CC0", source: commons("Egusi_seeds.jpg") },
  { file: "african_locust_bean.jpg", subject: "African locust bean (iru)", author: "Marco Schmidt", licence: "CC BY-SA 2.5", source: commons("Parkia_biglobosa_Soumbala.JPG") },
];
