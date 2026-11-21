import { useState } from 'react'
import { motion, useMotionValueEvent, useScroll } from 'framer-motion'
import { Logo } from './Logo'
import { Button } from './Button'
import { EASE } from './motion'

const links = [
  { to: '/about', label: 'About', n: '01' },
  { to: '/work', label: 'Work', n: '02' },
  { to: '/services', label: 'Services', n: '03' },
]

/** Flat nav, no glass effects. Hides on scroll down, returns on scroll up. Add a mobile menu per references/components.md. */
export function Nav({ current }: { current?: string }) {
  const { scrollY } = useScroll()
  const [hidden, setHidden] = useState(false)
  useMotionValueEvent(scrollY, 'change', (y) => setHidden(y > (scrollY.getPrevious() ?? 0) && y > 140))

  return (
    <motion.nav className="fixed inset-x-0 top-0 z-50" animate={{ y: hidden ? -140 : 0 }} transition={{ duration: 0.7, ease: EASE }}>
      <div className="wrap flex items-center justify-between py-5">
        <a href="/" aria-label="Home"><Logo /></a>
        <div className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a key={l.to} href={l.to} className="group relative flex items-baseline gap-2 text-[15px]">
              <span className="link-line">
                {l.label}
                <span className={`absolute -bottom-1 left-0 h-px w-full bg-ink ${current === l.to ? 'scale-x-100' : ''}`} />
              </span>
              <span className="numeral text-[13px]">{l.n}</span>
            </a>
          ))}
          <Button href="/contact">Book a call</Button>
        </div>
      </div>
    </motion.nav>
  )
}
