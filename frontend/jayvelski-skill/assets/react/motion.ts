import type { Transition, Variants } from 'framer-motion'

export const EASE = [0.22, 1, 0.36, 1] as const
export const EASE_IN_OUT = [0.76, 0, 0.24, 1] as const

export const spring: Transition = { type: 'spring', stiffness: 220, damping: 28, mass: 0.6 }
export const softSpring: Transition = { type: 'spring', stiffness: 120, damping: 20, mass: 0.8 }

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: (d: number = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.9, ease: EASE, delay: d } }),
}

export const stagger = (s = 0.08, delayChildren = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: s, delayChildren } },
})
