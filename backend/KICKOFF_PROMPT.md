# Kickoff prompt (paste into Claude Code from the repo root)

---

You are building the app (name to be decided at the end) for Hack the Fork Nigeria 2026 (Track 1, Challenge 1): an offline-first phone app that suggests dishes from what a household has and their budget, then teaches sourced preparation steps. Before doing anything else, read `AGENTS.md` and `PROJECT.md` in full. They define the product, the stack, the formulas, the interfaces, the data rules, the safety rules and the milestones. Follow them exactly. If the two files conflict, ask me one specific question.

## Step 0: rules gate

The build window opened Nov 20 at 1:50 PM WAT, so you may write product code. If I tell you otherwise, you may only read docs, set up tooling, vet skills and create empty data templates.

## Step 1: skills and tooling (keep it short)

Read each skill's `SKILL.md` before installing or using it. Skip any that asks for anything unrelated to its purpose (sending data out, unrelated commands, disabling checks).

1. Search your skills directory for credible skills on Expo and React Native development, mobile UI design and accessibility, and React Native animation (Reanimated). Prefer official or widely used ones. If nothing credible turns up, continue from the official docs and tell me.
2. If a `frontend-design` skill is available, load it before building screens.
3. Check the Expo and React Native Paper docs for the current install steps and follow them. Use `npx expo install` for packages.
4. For the design system, build tokens in `mobile/src/theme/` on top of the Paper MD3 theme. You may look at an open-source React Native design system on GitHub for reference only if its licence is MIT or Apache-2.0; read its LICENSE first and never copy code with an unclear licence.

Tell me what you installed, what you skipped and why, in a short list.

## Step 2: stack (fixed)

- **Mobile:** Expo, React Native, TypeScript strict, `expo-router`, React Native Paper (Material 3), `@expo/vector-icons`, `react-native-reanimated`, `zod`, `jest-expo`.
- **On-device engine:** pure TypeScript; the model is a ridge regression exported to JSON.
- **Dev-side:** Python with pandas, numpy, scikit-learn (`Ridge`, `GroupKFold`), pytest.
- **Optional online service:** FastAPI. The app must work fully without it.
- No accounts, payments, marketplace, 3D, image generation or on-device LLM.

## Step 3: build order

Follow `PROJECT.md` section 11. Work order: data and AI lanes first, backend service alongside, then the mobile app. Build one dish end to end first (akara-style with cowpea or bambara), then add dishes one at a time. Do not start a milestone until the previous one passes its checks.

1. M0 Foundations: app boots on a phone, theme, data folder, bundle schema and loader, validation script.
2. M1 Data lane (the humans fill the tables; you build the validators and coverage report, and help extract rows from papers).
3. M2 Python reference engine and processing model training with a baseline and grouped cross-validation.
4. M3 TypeScript engine with parity tests against golden fixtures.
5. M4 Screens, states, offline badge, accessibility.
6. M6 Evidence and polish. M5 (online extras) only if time remains.

## Offline-first and safety-first

- Everything must work in airplane mode. Test it at every milestone.
- Every processing or plate result goes through the safety guard before display. Never invent a safety threshold. No health claims.
- Ship a model for a metric only if it beats the baseline in grouped cross-validation. Otherwise show the fallback with citations.

## Data

Ask me for data files rather than guessing. The carried-over files are in `data/raw/`: `wafct_protein_verified.csv`, `nbs_prices_history.csv`, `units_mudu.csv`. If a site cannot be reached from your workspace, ask me to download the file and upload it. Never invent a measured number. Mark estimates as `estimated` with a reason, and record every source in `data/SOURCES.md`.

## Honesty requirements (these affect our judging score)

- Label every input and result measured or estimated, in the data and in the UI.
- Use "predicted", "published" and "estimated". Never "proven", "tastes like", "healthy" or "cures".
- Show the model's backtest and the baseline, even when the model does not win.
- Keep the limits panel one tap away at all times.
- Any LLM text only rephrases numbers the engine already computed. The app works with it off.

## Loops

Build loop: test first, implement, run, fix, at most two fixes per error. After each milestone run the checks and the full flow once in airplane mode. If stuck, apply the cut list in `PROJECT.md` section 11 and tell me what you cut. Ranking, honest labels, the safety guard and offline mode survive every cut.

## How to report

Short messages. After each milestone: what you built, what you ran, what passed, what is next, any cuts. Do not paste long files back.

Start with Step 0, then Step 1.
