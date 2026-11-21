# Remove the AI tells

These patterns make a page look templated and machine-made. The source site contained several; this skill replaces each one. The linter (`scripts/lint_design.py`) flags the mechanical ones.

| Remove | Why it reads as AI | Use instead |
|---|---|---|
| Pill badge / eyebrow chip above headings (`rounded-full px-3 py-1 text-xs`) e.g. "Testimonials", "Services", "FAQ" | The single most common generated-page tic | Plain text label in `muted`, or the italic serif numeral (`01`), or nothing. The heading is enough |
| Pulsing green dot + "Accepting new projects" | Fake liveness | One plain sentence in the footer or contact block: "Taking on projects from January." Only if true |
| Floating glass pill nav (`backdrop-blur`, `rounded-full`, ring, shadow) | Glassmorphism cliché | Flat bar: logo left, text links right, 1px underline on active, solid button at the end. Hide on scroll down, show on scroll up |
| Pill-shaped list rows (tag-like items in a column) | Chip overload | Hairline-separated rows: text left, italic numeral right |
| "Most popular" ribbon on pricing | Conversion template | Make the featured plan the dark `night` card. No label |
| Pill buttons | Default AI look | 10–12px radius. Keep the blue gradient + ring for the primary |
| Round "View / Drag" label cursor | Gimmick | Drop it, use hover underline and image scale |
| Sparkle / wand / stars icons, "AI-powered", "Explore AI summary" row, "Designed by human, accelerated by AI" | Announces the tooling | Remove. Footer line: `© 2026 Brand. All rights reserved.` |
| Checkmark-bullet feature lists (`✓`) | Template feature grid | Plain list with an en dash or no marker, hairline separators, or numbered `01 02 03` in italic serif |
| Three equal icon cards in a row | Generic "features" section | Asymmetric grid, a big statement, or a list with hairlines |
| Glow blobs, mesh gradients, purple-to-pink gradients, gradient text on headings | Generic AI gradient | Flat color; the single soft gradient band image; footer wordmark gradient (the one exception) |
| Emoji as icons | | Real SVG icons at 1.5px stroke, or no icon |
| Rounded card + shadow + icon + title + blurb, repeated | | Content-first layouts: image, title, one line, hairline |
| Scroll bounce, confetti, shimmering skeletons everywhere | | Slow eased reveals only |
| Hype copy: unlock, elevate, seamless, supercharge, revolutionize, "in today's fast-paced world" | | Specific, plain statements |
| Em dashes in UI copy, "not just X, but Y" constructions | | Commas, periods, short sentences |

## What stays (it is the brand, not a tell)

The soft gradient band, the blue gradient primary button, italic serif numerals, underline-on-hover, sticky dark services panel, split-text headline rise, hairline rules, and the giant gradient wordmark footer.

## Final pass

Squint at the page. If any element exists only to look "designed" (a chip, a glow, a badge, an icon), delete it and see whether anything is lost. Usually nothing is.
