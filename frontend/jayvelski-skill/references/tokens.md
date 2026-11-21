# Tokens

All values come from the source site's Tailwind config and stylesheet. Use them verbatim.

## Color

| Token | Value | Use |
|---|---|---|
| `white` | `#ffffff` | Page background |
| `ink` | `#19171b` | Text, solid buttons, footer wordmark |
| `navy` | `#0c152a` | Rare deep-blue panels |
| `muted` | `#6b6c71` | Secondary text, captions |
| `cool` | `#818a94` | Tertiary text, icons |
| `card` | `#e8e8ec` | Card and image placeholder surface |
| `render` | `#edeced` | Product render backdrops |
| `night` | `#121113` | Dark feature panel (services, featured plan) |
| `blue-start` | `#1935d9` | Accent, gradient start |
| `blue-end` | `#2f2be2` | Gradient end |
| `blue-border` | `#1f34c9` | 1px ring on blue button |
| `hairline` | `rgba(116,84,84,.15)` | Section dividers |
| `tint` | `rgba(62,44,62,.08–.10)` | Subtle fills (hover, ghost button) |

Rules: one accent only (blue). Text on white is `ink` or `muted`. Never put `muted` on `card` for body text under 16px without checking contrast (6b6c71 on e8e8ec is ~4.2:1, use `ink`). Selection color is the accent with white text.

Gradients that are allowed: (1) the hero/CTA gradient band image behind content at 50–60% opacity, (2) the blue button, (3) the footer wordmark (ink to transparent), (4) the thin scroll-progress bar. Everything else is flat.

## Spacing

Base 4px. Section padding `py-24 md:py-36` (96/144). Large editorial gaps `mt-14 md:mt-20`. Container `.wrap`: max 1530px, side padding 24 / 40 / 64 at base / md / lg.

## Radius

`10px` buttons and inputs, `16px` small cards, `24px` media and large cards, `28px` the dark services panel. Avatars alone may be `9999px`.

## Shadow

```
card:  0 1px 2px rgba(14,15,43,.08), 0 43px 80px rgba(66,39,92,.02)
photo: 0 70px 109px -10px rgba(88,92,95,.08), 0 0 0 1px rgba(51,51,51,.04),
       0 1px 1px 1px rgba(51,51,51,.04), 0 15px 15px -7px rgba(51,51,51,.04),
       0 60px 60px -30px rgba(51,51,51,.04)
blue-inset: inset 0 1px 4px #2a3edc, inset 0 4px 16px rgba(255,255,255,.2)
```

## Breakpoints

Tailwind defaults (sm 640, md 768, lg 1024). Design mobile first; the big type scales with `clamp()` so few overrides are needed.

## Layout

Generous: hero fills `100svh`, content bottom-aligned. Asymmetric two-column grids (`1.62fr 1fr`) with a vertical offset on the second item. Single-column centered text blocks max 460–760px. Hairline `border-t` rows instead of boxed panels.
