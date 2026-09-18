import { motion } from 'motion/react'

type HeattAtmosphereProps = {
  firstName: string
  onWrite: () => void
  onTune: () => void
}

const easing = [0.22, 1, 0.36, 1] as const

export function HeattAtmosphere({ firstName, onWrite, onTune }: HeattAtmosphereProps) {
  return (
    <motion.section
      className="heatt-atmosphere"
      initial={{ opacity: 0, y: 16, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, ease: easing }}
      aria-labelledby="atmosphere-title"
    >
      <div className="atmosphere-noise" aria-hidden="true" />
      <div className="atmosphere-copy">
        <div className="atmosphere-kicker"><span className="pulse-dot" /> YOUR ATTENTION, TODAY</div>
        <h2 id="atmosphere-title">Good to have you,<br /><em>{firstName}.</em></h2>
        <p>Fifty-three free-reading doors are open. Follow one good idea back to its original home.</p>
        <div className="atmosphere-actions">
          <button className="atmosphere-primary" onClick={onWrite}>Leave a thought <span>↗</span></button>
          <button className="atmosphere-quiet" onClick={onTune}>Tune your day <span>⌁</span></button>
        </div>
        <div className="atmosphere-proof"><span className="avatar-stack" aria-label="A few original publishers in your library"><i className="avatar avatar-coral">AK</i><i className="avatar avatar-sage">PF</i><i className="avatar avatar-lilac">CF</i><b>+50</b></span><span>curated by category<br /><strong>fresh reads load as you move</strong></span></div>
      </div>
      <div className="atmosphere-art" aria-hidden="true">
        <motion.div className="atmosphere-orbit orbit-a" animate={{ rotate: 360 }} transition={{ duration: 34, repeat: Infinity, ease: 'linear' }} />
        <motion.div className="atmosphere-orbit orbit-b" animate={{ rotate: -360 }} transition={{ duration: 46, repeat: Infinity, ease: 'linear' }} />
        <motion.div className="atmosphere-glow" animate={{ scale: [1, 1.08, 1], opacity: [0.6, 0.82, 0.6] }} transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.div className="atmosphere-core" initial={{ scale: 0.7, rotate: -12 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.2, duration: 0.85, ease: easing }}><span>heatt</span><small>make room</small></motion.div>
        <motion.div className="atmosphere-float float-one" animate={{ y: [0, -9, 0], rotate: [-3, 0, -3] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}><span className="float-icon">✦</span><span><b>one good question</b><small>is enough to begin</small></span></motion.div>
        <motion.div className="atmosphere-float float-two" animate={{ y: [0, 8, 0], rotate: [4, 1, 4] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 0.7 }}><span className="float-icon leaf">◒</span><span><b>quiet reading</b><small>12 min · no pressure</small></span></motion.div>
        <span className="atmosphere-spark spark-one">✦</span><span className="atmosphere-spark spark-two">·</span><span className="atmosphere-spark spark-three">✧</span>
      </div>
    </motion.section>
  )
}
