# Typography

## Primary pair (default)

**Geist** (sans, 300/400/500/600) + **Instrument Serif** (italic only).

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600&family=Instrument+Serif:ital@1&display=swap" rel="stylesheet">
```

Stack: `Geist, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` and `"Instrument Serif", serif`.

Why it works: Geist is a neutral, slightly technical grotesque that holds tight tracking at large sizes. The italic serif adds a human, editorial note without competing, because it is only ever small.

### Roles

| Role | Font | Size | Weight | Leading | Tracking |
|---|---|---|---|---|---|
| Display / H1 | Geist | `clamp(38px, 6.6vw, 104px)` | 500 | 0.98 | -0.045em |
| Section heading `.h-section` | Geist | `clamp(34px, 5vw, 72px)` | 500 | 1.02 | -0.035em |
| H3 / card title | Geist | `clamp(20px, 2vw, 28px)` | 500 | 1.15 | -0.02em |
| Manifesto / statement | Geist | `clamp(20px, 2.6vw, 38px)` | 500 | 1.18 | -0.025em |
| Body | Geist | 17px | 400 | 1.6 | 0 |
| Small / caption | Geist | 14–15px | 400 | 1.5 | 0 |
| Kicker line above H1 | Instrument Serif italic | 20–24px | 400 | 1.3 | 0 |
| Numerals (01, 02, counters) | Instrument Serif italic | 13–20px | 400 | 1 | 0 |
| Footer wordmark | Geist | `clamp(110px, 21.5vw, 330px)` | 600 | 1 | -0.06em (animated from 0.04em) |
| Logo | Geist | 20px | 600 / 300 mix | | -0.4px |

Two tone trick: inside one sentence, set the supporting words in `muted` and the key words in `ink` ("We worked for over **100 companies** in a past **10 years**."). This replaces bold and highlight chips.

Never: serif for body or headings, all-caps eyebrow with wide tracking above every heading, more than two weights per view (400 and 500 do almost everything), centered long paragraphs.

## Alternate pairs

Pick one only if the brand needs a different temperature. Keep the same role structure (sans for everything, serif italic for tiny accents).

| Pair | Mood | Google Fonts query |
|---|---|---|
| **Geist + Geist Mono** | Developer tools, docs, technical SaaS. Mono for labels, numbers, code | `family=Geist:wght@300;400;500;600&family=Geist+Mono:wght@400;500` |
| **Inter Tight + Newsreader italic** | Fintech, consulting, calm and trustworthy | `family=Inter+Tight:wght@300;400;500;600&family=Newsreader:ital,wght@1,400` |
| **Hanken Grotesk + Instrument Serif italic** | Friendlier, consumer, wellness | `family=Hanken+Grotesk:wght@300;400;500;600&family=Instrument+Serif:ital@1` |
| **Bricolage Grotesque + Fraunces italic** | Creative studios, food, culture; more personality | `family=Bricolage+Grotesque:wght@400;500;600&family=Fraunces:ital,wght@1,400` |

Fallbacks: if Google Fonts is unreachable (offline artifacts), the system sans stack still looks acceptable because the layout relies on size, tracking and whitespace, not on the font.

## Loading

Preconnect both font hosts, `display=swap`, request only the weights above. In Tailwind map `fontFamily.sans` and `fontFamily.serif`. Turn on `-webkit-font-smoothing: antialiased`.
