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

VERIFICATION_RESULTS

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
- **Design**: a warm MD3 theme for light and dark (`src/theme/`) with 48 dp targets, system font scaling and fade-and-slide reveals that switch off under reduced motion. The design linter from `jayvelski-skill` (`python jayvelski-skill/scripts/lint_design.py src`) reports 0 findings.

## Cut or not done

CUTS

## Deviations

See the frontend entries under Deviations in the root `AGENTS.md`.
