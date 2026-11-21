# Design prompt: ProteinPath

**Current direction (21 Nov, 13:30): black and white, minimal, photo-led.** The interface is near-black (#0A0A0A) with white type and grey (#A3A3A3) secondary text. There's no accent colour, no coloured blocks, no glows and no decorative icons; the photos carry all the colour. The landing page shows one question, the plan in one line, and dish and plant photo grids. Tapping a photo opens its page with everything you need. Budget is a single amount field with no presets. The "Kitchen at dusk" palette below is superseded; the typography (Instrument Serif and Outfit), photo scrims, motion and honesty rules still apply.


Use this prompt to restyle or extend any screen. It describes an original look. Nothing here is copied from another product; it distils patterns common to award-winning editorial and food interfaces (sources at the end).

## The prompt

> Restyle the ProteinPath Expo app as a cinematic, minimal food app. The mood is a warm kitchen at dusk: deep warm blacks, real food photographed in low light, one golden accent like lamp light, and big quiet editorial type. The food is the interface. Chrome stays out of the way.
>
> **Canvas.** The background is warm black (#0B0A09), never pure #000. Surfaces step up in small warm increments (#141210, #1C1916, #24201C). Separate things with space and a thin warm hairline (#2A2622), not boxes or heavy shadows.
>
> **One accent.** Use golden amber (#E8B86B) for the single primary action, the active tab, progress and key numbers. Use terracotta (#E0896A) only for cautions. Everything else is warm white text (#F3EEE7) or muted taupe (#A39A90). No other hues.
>
> **Type.** Headlines are a high-contrast display serif (Instrument Serif) at large sizes with tight leading, like film titles; italic for one emphasised word. UI text is a clean geometric sans (Outfit). Small labels can be uppercase with wide letter-spacing, like credits. Keep sizes generous: body 16, labels 13 or more.
>
> **Imagery.** Dish photos are full-bleed and cropped to fill. Every photo sits under a gradient scrim that fades to the canvas colour, so text on it reads at 4.5:1 and the image melts into the page, like a film still. Add a faint warm light leak in one corner. Where a dish has no photo of its own, use a dark field with a soft amber glow and the dish icon. Never reuse another dish's photo, and never use a flat coloured box.
>
> **Layout.** Lead each screen with one poster moment (a photo with its serif title on top), then a calm column of content with lots of negative space. Number things like chapters (01, 02, 03). One primary action per screen, as a full-width amber pill with dark text.
>
> **Motion.** Slow and eased (cubic-bezier 0.22, 1, 0.36, 1), 300 to 600 ms. Things fade and rise into place with a small stagger. Bars grow once. No bouncing, no looping, nothing decorative that moves forever. Respect reduced motion.
>
> **Honesty stays.** Keep every honest label, "published", "estimated", "price needed", the safety caution and the limits page. Photos are illustrative and credited. They show the dish as commonly served, not the exact recipe the app computes.

## Tokens (implemented in `src/theme/tokens.ts`)

| Role | Value |
|---|---|
| Canvas | #0B0A09 |
| Surface / raised / variant | #141210 / #1C1916 / #24201C |
| Text / muted text | #F3EEE7 / #A39A90 |
| Hairline / outline | #2A2622 / #4A443E |
| Accent (amber) / on accent | #E8B86B / #1A1208 |
| Caution (terracotta) | #E0896A |
| Display font | Instrument Serif 400, regular and italic |
| UI font | Outfit 400 / 500 / 600 |
| Radius | controls 14, cards 22, posters 28 |

## Photo credits

The photos are bundled in `assets/photos/` so the app stays offline, and are credited on the About screen as the licences require.

| File | Author | Licence | Source |
|---|---|---|---|
| akara.jpg | Ceentia | CC BY-SA 4.0 | commons.wikimedia.org/wiki/File:Bean_cake_(Akara).jpg |
| moin-moin.jpg | MOIBARDE | CC BY-SA 4.0 | commons.wikimedia.org/wiki/File:Moi-moi_with_stew.jpg |
| gbegiri.jpg | Ebiojo | CC BY-SA 4.0 | commons.wikimedia.org/wiki/File:Amala_and_gbegiri.jpg |
| egusi.jpg | Tesleemah | CC BY-SA 4.0 | commons.wikimedia.org/wiki/File:Egusi_soup_in_a_plate.jpg |
| okpa.jpg | Confidence24 | CC BY-SA 4.0 | commons.wikimedia.org/wiki/File:Okpa_(A_traditional_Igbo_steamed_delicacy).jpg |
| cowpea.jpg | Fumikas Sagisavas | CC0 | commons.wikimedia.org/wiki/File:Patterned_cowpea_(20240714).jpg |

## References consulted (patterns only, nothing copied)

- DesignRush cooking-app roundups (Kitchen Stories, SideChef): https://www.designrush.com/best-designs/apps/trends/best-cooking-app-designs
- Awwwards food and drink category: https://awwwards.com/websites/food-drink
- UX Planet, "The Art of Minimalism in Mobile App UI Design": https://uxplanet.org/the-art-of-minimalism-in-mobile-app-ui-design-b21aa671dd7f
- UX Planet, "15 Interface Designs Based on the Elegance of Darkness": https://uxplanet.org/ui-inspiration-15-interface-designs-based-on-the-elegance-of-darkness-22444315572b

### Plant photos and team photos

Plant tiles use photos from Wikimedia Commons: bambara (Ton Rulkens, CC BY-SA 2.0), pigeon pea (Forest and Kim Starr, CC BY 3.0 US), African yam bean (USDA-NRCS, public domain), jack bean (Roger Culos, CC BY-SA 3.0), soya bean (USDA, public domain), groundnut (NIAID, CC BY 2.0), melon seed (Judethedeus, CC0), African locust bean (Marco Schmidt, CC BY-SA 2.5). The three Ekuru photos (raw, wrapped and served) were provided by the team; confirm the rights before public use. Full credits are in `src/lib/photos.ts` and on the About screen.
