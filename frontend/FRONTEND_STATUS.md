# Frontend status: Sat Nov 21 2026

Branch `frontend-lane`. The Expo app is in `frontend/`.

## Run it

```
cd frontend
npm install
node scripts/sync-bundle.js     # copy backend/mobile/assets/bundle here after checking every sha256
npx tsc --noEmit
npx jest
npx expo start                  # scan the QR code with Expo Go
```

## What works

Checks run on Nov 21 at about 09:40 WAT:

| Check | Result |
|---|---|
| `npx tsc --noEmit` | clean |
| `npx jest` | 28 of 28 pass across 4 suites: parity (all 15 golden cases plus the index check), engine, prepare logic, and screen smoke tests |
| `npx expo-doctor` | 20 of 20 checks pass |
| `npx expo export --platform android` | bundles (5.3 MB Hermes bundle), so every import and route resolves |
| visual check | every screen rendered with `expo start --web` and captured in headless Edge at phone width |
| **Expo Go on a phone, airplane mode** | **NOT DONE YET.** It needs a human with a phone: run `npx expo start`, scan the QR code, load once, then turn airplane mode on and go through Start, Suggestions, Akara, Prepare and About. |


- **Engine (`src/engine/`)**: a pure TypeScript port of `suggestDishes`, `rankIngredients`, `recommendProcessing` and `safetyGuard`. Constants are in `config.ts`. Python's rounding (exact value, ties to even, negative zero) is reproduced in `num.ts`, so the outputs match the fixtures exactly.
- **Parity**: `__tests__/parity.test.ts` loads every file in `backend/tests/golden/` (15 cases) and requires identical output.
- **Bundle**: the shipped copy is in `assets/bundle/`. `src/bundle/schema.ts` defines strict zod schemas (unknown keys fail) and the loader also checks that the files match the manifest. A bad bundle shows a calm error screen, never a crash.
- **Start**: two ways in ("What do I have?" with local names, or "I want to make..."), budget presets plus a typed amount, a people stepper, and allergen ticks built from the bundle's allergen tags. Under "More options" there is an optional body weight (stored on the phone only) or protein per person.
- **Suggestions**:
  - Each dish card shows: the plant by local name; the cost for the group with "Protein only, excludes oil and spices"; grams of protein per plate; an animated bar for how well the plant suits the dish; a "Why" line from the engine's drivers; labels ("Published values" / "Some data missing", "Some values estimated", "Price needed for N other plants", "Already in your kitchen"); and an allergen note.
  - "How do we know?" opens the fit range, the missing properties, the price source and the other plants that also suit the dish.
  - Okpa and egusi soup appear under "Not available yet" with the reason in plain words.
- **Prepare**:
  - Numbered steps from the dish's sourced playbook route, used only after it passes `safetyGuard`, and always ending with "Cook beans until fully soft". Study conditions appear only under "As done in the study".
  - "What the papers found" gives each anti-nutrient a plain explanation, an effect sentence (for example "Phytate was 85 to 89% lower in 4 published cowpea samples"), the evidence ("One study", "Other crops", "Includes earlier steps"), and the paper and table behind an expander.
  - Blocked methods are not shown, and one line says why. Warnings appear as friendly cards. Every safety message ends with "(safety rule not yet reviewed by an expert)". A plant on the user's allergen list is withheld entirely.
- **About and limits**: one tap from every screen and also linked from a banner. It covers counts of measured, calculated and estimated values (from the bundle); not lab-tested by us; differing methods; estimated weights and portions; unreviewed safety rules; no health claims; a model card ("Preparation advice comes from published experiments, not a prediction" when the model is a stub); "plate balance coming"; sources; and the bundle version and date.
- **Offline**: all data is bundled. The only network-related code is `src/lib/net.ts`, which listens to NetInfo with reachability probing turned off, so it sends no requests. The top bar shows "Works offline" or "Online".
- **Design (redesigned 11:00, food-app style)**: dark-first look modelled on a reference vegan food-app design (style only; no name, logo or artwork copied). Near-black base, vivid green #1ED561, deep green #0B6B44 blocks, warm yellow #F4C756 for cautions. Chunky display type (Baloo 2) with Outfit body text, both bundled in the app (OFL licence) so nothing downloads. Glowing icon tiles stand in for food photos, with round category tiles, a promo-style "Honest numbers" banner, green full-width actions and numbered step circles. A live "Top pick for your choices" card on Start is computed by the engine. 48 dp targets, reduced motion respected. Checked by rendering every screen in headless Edge (screenshots, not a phone).

## Cut or not done

- **Not run on a real phone yet.** The screens are covered by Jest smoke tests that render each real screen with the bundled data. That is not a device test.
- **The smoke tests mock navigation** (`expo-router`) and use a small stand-in for Reanimated. Reanimated 4.7's own Jest mock fails to load in this setup, and expo-router's testing library then falls back to an empty mock. So the screen-to-screen navigation is tested as "the right route is pushed with the right params", not as a full router run.
- **Bundle updates** (stretch) were not built, as instructed. `src/lib/net.ts` only listens to the connection state.
- **No Plate screen**, because `reference_values.json` is empty. About and limits says plate balance is coming.
- **Light theme dropped**: the app is dark-only, following the reference design. Text contrast was chosen for at least 4.5:1, but readability in direct sunlight has not been checked on a phone.
- **Backend note:** property `ph` is carried as raw text in the bundle (the backend validates it as a number but does not convert it). The app schema accepts it as shipped. Worth fixing in `build_bundle.py` at the next rebuild (then rerun `make_fixtures.py` and `node scripts/sync-bundle.js`).

## Deviations

See the frontend entries under Deviations in the root `AGENTS.md`.
