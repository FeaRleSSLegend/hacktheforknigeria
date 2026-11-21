import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import Lenis from 'lenis'
import { frame, cancelFrame } from 'framer-motion'

const Ctx = createContext<Lenis | null>(null)
export const useLenis = () => useContext(Ctx)

/**
 * One Lenis instance, driven by Framer Motion's own frame loop so there is a
 * single requestAnimationFrame per tick (two competing loops is the usual
 * cause of choppy scroll-linked animation).
 */
export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  const [lenis, setLenis] = useState<Lenis | null>(null)
  const ref = useRef<Lenis | null>(null)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return
    const l = new Lenis({
      lerp: 0.09,
      wheelMultiplier: 0.95,
      touchMultiplier: 1.4,
      smoothWheel: true,
      anchors: { offset: -80 } as any,
    })
    ref.current = l
    setLenis(l)
    const tick = ({ timestamp }: { timestamp: number }) => l.raf(timestamp)
    frame.update(tick, true)
    return () => {
      cancelFrame(tick)
      l.destroy()
      ref.current = null
    }
  }, [])

  return <Ctx.Provider value={lenis}>{children}</Ctx.Provider>
}
