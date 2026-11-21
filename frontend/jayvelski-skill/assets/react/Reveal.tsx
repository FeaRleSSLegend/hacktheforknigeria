import { motion, type HTMLMotionProps } from 'framer-motion'
import { EASE } from './motion'

type Props = HTMLMotionProps<'div'> & { delay?: number; y?: number; once?: boolean }

/** Fade + rise on enter. Opacity/transform only, so it stays on the compositor. */
export function Reveal({ delay = 0, y = 32, once = true, children, ...rest }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: '0px 0px -12% 0px' }}
      transition={{ duration: 1, ease: EASE, delay }}
      {...rest}
    >
      {children}
    </motion.div>
  )
}
