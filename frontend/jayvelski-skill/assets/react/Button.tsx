import { motion } from 'framer-motion'
import { Magnetic } from './Magnetic'

type Props = {
  href: string
  children: string
  size?: 'md' | 'lg'
  variant?: 'primary' | 'ghost'
  className?: string
}

/** Label slides up and a duplicate replaces it on hover: no layout shift. 10px radius. */
export function Button({ href, children, size = 'md', variant = 'primary', className = '' }: Props) {
  const base = variant === 'primary' ? 'btn-primary' : 'btn-ghost'
  const pad = size === 'lg' ? '!px-7 !py-4 !text-[17px]' : ''
  const t = { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const }
  return (
    <Magnetic strength={0.18}>
      <a href={href} className={`${base} ${pad} ${className}`}>
        <motion.span className="relative block overflow-hidden" initial="rest" whileHover="hover" whileFocus="hover" animate="rest">
          <motion.span className="block" variants={{ rest: { y: 0 }, hover: { y: '-110%' } }} transition={t}>{children}</motion.span>
          <motion.span className="absolute inset-0 block" variants={{ rest: { y: '110%' }, hover: { y: 0 } }} transition={t} aria-hidden>{children}</motion.span>
        </motion.span>
      </a>
    </Magnetic>
  )
}
