import { motion } from 'framer-motion'
import { EASE } from './motion'

type Props = {
  text: string
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span'
  className?: string
  delay?: number
  stagger?: number
  /** animate on mount instead of when scrolled into view */
  immediate?: boolean
}

/** Word-by-word masked rise. Line breaks via "\n". */
export function SplitText({ text, as = 'h2', className, delay = 0, stagger = 0.045, immediate }: Props) {
  const Tag = motion[as] as any
  const lines = text.split('\n')
  let i = 0
  return (
    <Tag
      className={className}
      initial="hidden"
      {...(immediate ? { animate: 'show' } : { whileInView: 'show', viewport: { once: true, margin: '0px 0px -10% 0px' } })}
      variants={{ hidden: {}, show: { transition: { staggerChildren: stagger, delayChildren: delay } } }}
      aria-label={text.replace('\n', ' ')}
    >
      {lines.map((line, li) => (
        <span key={li} className="block" aria-hidden>
          {line.split(' ').map((w, wi) => (
            <span key={`${li}-${wi}`} className="inline-block overflow-hidden align-bottom pb-[0.12em] -mb-[0.12em]">
              <motion.span
                key={i++}
                className="inline-block will-change-transform"
                variants={{
                  hidden: { y: '110%', rotate: 3 },
                  show: { y: 0, rotate: 0, transition: { duration: 1.05, ease: EASE } },
                }}
              >
                {w}
                {'\u00A0'}
              </motion.span>
            </span>
          ))}
        </span>
      ))}
    </Tag>
  )
}
