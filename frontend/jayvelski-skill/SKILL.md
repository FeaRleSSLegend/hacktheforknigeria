---
name: jayvelski-skill
description: Jayvelski-skill is a design system and taste guide for building clean, editorial, premium websites and UIs (landing pages, agency/studio sites, SaaS marketing pages, portfolios, dashboards, decks). It defines the font pairing (Geist + Instrument Serif italic), color tokens, type scale, spacing, radii, shadows, motion, the signature gradient wordmark footer, and a strict list of "AI-looking" elements to avoid (pill badges, pulsing status dots, glass pills, sparkle icons, glow blobs, icon-card grids). Use this skill whenever the user asks to design, build, restyle or polish any web page, component, React/Tailwind/HTML UI, landing page, or artifact, or asks for fonts, font pairs, color palette, footer, hero, nav, buttons, or "make it look less AI / more professional", even if they do not name the skill.
---

# Jayvelski-skill

A design language for sites that look hand-made by a good studio, not generated. It was extracted from a real production site (Geist + Instrument Serif, cool off-white and ink palette, electric-blue accent, giant gradient wordmark footer) and cleaned of the visual tics that make a page read as AI output.

The idea behind every rule: **restraint carries the design.** One sans, one serif accent, one accent color, big confident type, lots of whitespace, hairline rules instead of boxes, and motion that is slow and eased. When unsure, remove something.

## Workflow

1. **Read the brief, then pick the stack.** Plain HTML/CSS (artifacts, static pages) → start from `assets/starter.html` and `assets/tokens.css`. React + Tailwind → copy `assets/tailwind.config.js`, `assets/index.css` and the components in `assets/react/`. Do not re-invent tokens; reuse them so every project built with this skill matches.
2. **Set up the foundation before any section:** fonts (see `references/typography.md`), tokens (`references/tokens.md`), the `.wrap` container, and the type scale.
3. **Compose sections from the patterns in `references/components.md`** (nav, hero, logo wall, work cards, sticky services, FAQ, CTA, footer). Adapt copy and content to the user's brand. Keep the structure and spacing.
4. **Add motion only where it earns its place** (`references/motion.md`). Reveal on scroll, one hero entrance, hover underlines. Respect `prefers-reduced-motion`.
5. **Run the AI-tell pass** (`references/anti-ai.md`), then the linter: `python scripts/lint_design.py <project-dir>`. Fix everything it flags unless there is a deliberate reason.
6. **Check at 390px and 1440px.** Nothing scrolls sideways, headings do not orphan a single word, tap targets are at least 44px.

## The system in one screen

- **Fonts:** Geist (300/400/500/600) for everything; Instrument Serif *italic only* for small accents (section numbers `01`, kicker lines, counters, pull-quote marks). Never set body or headings in the serif.
- **Color:** page `#ffffff`, ink `#19171b`, muted `#6b6c71`, card `#e8e8ec`, night `#121113` for dark panels, one accent: electric blue `#1935d9 → #2f2be2`. Hairlines are `rgba(116,84,84,.15)` or `rgba(0,0,0,.10)`.
- **Headings:** weight 500, tight leading (0.98–1.05), tracking `-0.035em` to `-0.045em`. Sizes with `clamp()`, display up to ~104px.
- **Shape:** radius `16px` / `24px` for media and cards, `10–12px` for buttons and inputs. No fully-rounded pills except real avatars.
- **Depth:** barely-there shadows (`shadow-card`, `shadow-photo` in tokens). Separation comes from whitespace and hairlines.
- **Signature elements to keep:** the soft gradient band behind the hero and CTA, the blue gradient primary button, the italic-serif numerals, underline-on-hover links (a 1px line that scales in), the sticky dark services panel, and the **giant gradient wordmark footer** (ink fading to transparent, rises and tightens on scroll). The footer is the brand's stamp; always include it unless the user says otherwise.

## What this skill removes on purpose

Pill badges and eyebrow chips, pulsing "available now" dots, floating glass nav pills, "Most popular" ribbons, sparkle/wand icons, "AI-powered" copy and AI-summary footer rows, checkmark-bullet feature grids, glow blobs, and gradient headline text (the footer wordmark is the single allowed exception). Full list with replacements in `references/anti-ai.md`.

## Reference map

| Need | Read |
|---|---|
| Colors, spacing, radii, shadows, breakpoints | `references/tokens.md` |
| Font pairs, scale, loading, alternates | `references/typography.md` |
| Section and component recipes with code | `references/components.md` |
| Easing, durations, scroll patterns | `references/motion.md` |
| Banned elements and what to use instead | `references/anti-ai.md` |
| Ready-to-copy files | `assets/` (`starter.html`, `tokens.css`, `tailwind.config.js`, `index.css`, `react/*`) |
| Automated check | `scripts/lint_design.py` |

## Copy and content voice

Short, plain, specific. Sentence case. No hype verbs (unlock, elevate, supercharge, seamless, revolutionize), no em dashes in UI copy, no rule-of-three slogans. Say what the thing is and what happens next ("25 min intro call. No pressure."). Real numbers beat adjectives.
