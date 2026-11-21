# Components and sections

React/Tailwind versions live in `assets/react/`; the vanilla HTML equivalents are in `assets/starter.html`. Class names assume `assets/tailwind.config.js` and `assets/index.css`.

## Container

`.wrap` = `mx-auto w-full max-w-[1530px] px-6 md:px-10 lg:px-16`.

## Nav

Flat, no glass. Fixed top, transparent over the hero. Logo left (`microdose` 600 + `.studio` 300 pattern: brand in semibold, suffix in light). Links right in 15px; the active/hovered link gets a 1px underline that scales in, with the italic serif numeral (`01`) in `muted` after the label. Primary button last. Hides on scroll down, returns on scroll up. Mobile: a 44px square button with two 1.5px lines morphing to an X, full-screen white menu revealed with `clip-path`, links at 40px/500 separated by hairlines, numerals on the right.

## Buttons

- **Primary**: blue gradient (`from-blue-start to-blue-end`), `shadow-blue-inset`, 1px `blue-border` ring, white 15px/500 text, `rounded-[10px]`, padding `px-5 py-3` (large: `px-7 py-4 text-[17px]`). Label-swap hover. Optional magnetic pull (strength .18, fine pointers only).
- **Ghost**: `bg-[rgba(62,44,62,.08)]`, ink text, same radius.
- **Text link**: ink text with the 1px scale-in underline.

## Hero

`min-h-[100svh]`, content bottom-aligned, `pt-36 pb-10`. Gradient band image behind, top 75%, 60% opacity, parallax down 28%, eased scale 1.12→1 over 2.2s. Order: serif italic kicker line (muted, 20–24px) → H1 (display scale, SplitText) → two-column row: 17px paragraph (first sentence `muted`, second `ink`) and the primary large button → hairline `border-t` → cycling logo row (5 slots, one swaps every 1.1s). No badge above the kicker.

## Logo wall

Statement with two-tone words, then a 2/3/4/6-column grid of grayscale logos at 55% opacity, 26px max height, full opacity and scale 1.05 on hover. Stagger reveal 35ms.

## Work cards

Image in `rounded-xl bg-card shadow-photo` with clip-path reveal and parallax inside; below: muted label (14px), title (20–28px/500, underline-on-hover via background-size), optional tag as **plain muted text at the right**, not a chip. Layout: one full-width card, then `1.62fr / 1fr` pair with the second card offset 80px and 4/5 aspect, then a testimonial, then a final card at max 1250px.

## Testimonial

Centered, max 760px, quote at `clamp(22px,2.4vw,34px)`/500, then 48px round avatar + name (15px/500) + role (muted). No label above the quote.

## Sticky manifesto / sticky services

See `motion.md`. Services panel: `bg-night text-white rounded-[28px]`, two columns, left text, right crossfading video/image with `clip-path` swap, progress as a 1px line with italic serif `01 / 04`. Feature items are plain text rows (no check glyph; use an en dash `–` in `white/50` or nothing).

## Pricing

Two or three cards, `rounded-xl p-8`. Light plans `bg-card`; featured plan `bg-night text-white` with **no ribbon**. Name 24px/500, feature list in 15px with hairline separators, price `text-5xl` tracking `-0.04em` with `USD` in small 50% opacity, button at the bottom. Hover lifts 8px with a soft spring.

## FAQ

`divide-y divide-black/10 border-y border-black/10`. Row: italic numeral, question 18–22px/500, `+` rotating 45° when open; answer height-animates, max 760px, muted.

## Forms

Underline fields, not boxes: floating label that scales to .8 and moves up on focus/fill, 1px `black/15` baseline with a 1px `ink` line scaling in on focus. Submit uses the primary button. Success state: heading "Message sent." and one muted line; no big check circle.

## CTA

Centered section, `py-32 md:py-48`, gradient band flipped (`rotate-180`) at 50% opacity with parallax. SplitText H2, one muted sentence (max 460px), large primary button, one muted line beneath (`25 min intro call. No pressure.`).

## Footer (signature, keep)

1. Hairline `border-t` row: left small block (studio name 500 + one muted line); right: the email at `clamp(22px,3vw,40px)` with scale-in underline.
2. Row: brand name + tagline left; social links right separated by 4px dots in `ink/30`; hover `opacity-50`.
3. Hairline row: "Get in touch", "Privacy Policy" left; `© year brand. All rights reserved.` right, `text-muted`.
4. The wordmark: brand name in lowercase, `font-semibold`, `clamp(110px,21.5vw,330px)`, `bg-gradient-to-b from-ink via-ink/70 to-transparent bg-clip-text text-transparent`, centered, bottom cropped (`bottom-[-0.12em]`) inside an `overflow-hidden` box `h-[clamp(120px,22vw,340px)]`. On scroll it rises (38%→0), tightens tracking and fades in.

Removed from the original footer: the "Explore AI Summary" row and "Designed by human, accelerated by AI".
