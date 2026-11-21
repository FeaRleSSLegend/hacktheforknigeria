# Motion

Slow, eased, compositor-only. Motion should feel like paper sliding, not UI bouncing.

## Core values

- Easing (expo-out): `cubic-bezier(0.22, 1, 0.36, 1)`. Page curtain / in-out: `cubic-bezier(0.76, 0, 0.24, 1)`.
- Durations: reveal 0.9–1.0s, headline word rise 1.05s with 45ms stagger, hover underline 0.5s, image hover scale 1.2s, button label swap 0.5s, nav hide/show 0.7s.
- Animate only `opacity` and `transform` (and `clip-path` on media). Never animate `filter: blur`, width/height, or layout props on scroll.
- Spring for small physical things: `stiffness 220, damping 28, mass .6`.

## Patterns

1. **Reveal**: `opacity 0→1`, `y 32→0`, once, trigger when 12% inside the viewport.
2. **SplitText headline**: each word in an `overflow:hidden` mask, rises from `110%` with 3° rotation to 0.
3. **Media reveal**: `clip-path: inset(7% round 24px)` to `inset(0 round 24px)` over 1.3s, with the inner image parallaxing ±9% and scaled 1.2.
4. **Underline on hover**: a 1px line scales `scaleX(0→1)` from the left; for "see all" links it exits to the right.
5. **Button label swap**: label slides up and a duplicate rises from below; no layout shift.
6. **Sticky manifesto**: a `320vh` wrapper with a `sticky` 100svh stage; words fade `0.14→1` with scroll progress; signatures draw via `pathLength`.
7. **Sticky services panel**: `330vh` wrapper, scroll distance picks the slide; never hijack the wheel.
8. **Footer wordmark**: on scroll progress `y 38%→0`, `letter-spacing .04em→-.06em`, `opacity 0→1`.
9. **Nav**: hides when scrolling down past 140px, returns on scroll up.
10. **Preloader** (optional, once per session): logo fades in, thin blue line fills in 1.3s, curtain lifts by `clip-path`. Skip for content sites where speed matters.
11. **Smooth scroll**: Lenis driven by Framer's frame loop (a single rAF). Disable under reduced motion.

## Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; }
}
```
Also skip Lenis and parallax when it matches.

## Vanilla JS fallback

`IntersectionObserver` adds `.in` to `.reveal` elements; CSS handles the transition (see `assets/starter.html`). Footer wordmark uses a scroll listener with `requestAnimationFrame`.
