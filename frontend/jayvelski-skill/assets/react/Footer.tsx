import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Reveal } from './Reveal'

// Replace with the real brand. Keep the wordmark lowercase and semibold.
const BRAND = 'brand'
const EMAIL = 'hello@brand.com'
const TAGLINE = 'One plain sentence about what you do.'
const social: [string, string][] = [
  ['Dribbble', '#'],
  ['LinkedIn', '#'],
  ['Instagram', '#'],
]

/** Signature footer: hairline rows, then a giant gradient wordmark that rises and tightens on scroll. */
export function Footer() {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end end'] })
  const y = useTransform(scrollYProgress, [0, 1], ['38%', '0%'])
  const letterSpacing = useTransform(scrollYProgress, [0, 1], ['0.04em', '-0.06em'])
  const opacity = useTransform(scrollYProgress, [0, 0.5], [0, 1])

  return (
    <footer ref={ref} className="relative overflow-hidden bg-white pt-24">
      <div className="wrap">
        <Reveal className="flex flex-col justify-between gap-10 border-t border-[rgba(116,84,84,.15)] pt-10 md:flex-row">
          <div>
            <p className="text-sm font-medium">{BRAND}</p>
            <p className="mt-2 text-sm text-muted">{TAGLINE}</p>
          </div>
          <a href={`mailto:${EMAIL}`} className="group relative self-start text-[clamp(22px,3vw,40px)] font-medium tracking-[-0.03em]">
            {EMAIL}
            <span className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-ink transition-transform duration-500 ease-expo group-hover:scale-x-100" />
          </a>
        </Reveal>

        <Reveal delay={0.1} className="mt-14 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="flex items-center gap-3 text-sm">
            {social.map(([n, h], i) => (
              <span key={n} className="flex items-center gap-3">
                {i > 0 && <span className="h-1 w-1 rounded-full bg-ink/30" />}
                <a href={h} target="_blank" rel="noopener" className="transition-opacity hover:opacity-50">{n}</a>
              </span>
            ))}
          </div>
        </Reveal>

        <div className="mt-8 flex flex-col justify-between gap-3 border-t border-[rgba(116,84,84,.15)] pt-6 text-sm text-muted md:flex-row">
          <div className="flex gap-6">
            <a href="/contact" className="hover:text-ink">Get in touch</a>
            <a href="/privacy" className="hover:text-ink">Privacy Policy</a>
          </div>
          <p>© {new Date().getFullYear()} {BRAND}. All rights reserved.</p>
        </div>
      </div>

      <div className="relative mt-6 h-[clamp(120px,22vw,340px)] select-none overflow-hidden" aria-hidden>
        <motion.div
          style={{ y, opacity, letterSpacing }}
          className="absolute inset-x-0 bottom-[-0.12em] whitespace-nowrap bg-gradient-to-b from-ink via-ink/70 to-transparent bg-clip-text text-center text-[clamp(110px,21.5vw,330px)] font-semibold leading-none text-transparent"
        >
          {BRAND}
        </motion.div>
      </div>
    </footer>
  )
}
