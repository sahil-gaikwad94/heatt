import { motion } from 'motion/react'

type HeattAtmosphereProps = {
  firstName: string
  onWrite: () => void
  onTune: () => void
}

export function HeattAtmosphere({ firstName, onWrite, onTune }: HeattAtmosphereProps) {
  return (
    <motion.section
      className="heatt-atmosphere"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      aria-labelledby="moment-title"
    >
      <div className="moment-glow" aria-hidden="true" />
      <div className="moment-copy">
        <span>For {firstName}, today</span>
        <h2 id="moment-title">What would you like to <em>make room for?</em></h2>
        <p>A private reflection is enough. Nothing here is timed, scored, or shared unless you choose.</p>
      </div>
      <div className="moment-actions">
        <button className="moment-primary" onClick={onWrite}>Write a reflection</button>
        <button className="moment-secondary" onClick={onTune}>Tune this shelf</button>
      </div>
    </motion.section>
  )
}
