import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'

/* ============================================================
   HEATT · HEAT SYSTEM
   Heat is the only reaction. One tap raises the temperature
   (1 → 2 → 3); tapping a fully heated item lets it cool.

   · tap        → spark burst, flame grows one step
   · intensity  → amber → ember → blaze (color, glow, size)
   · full + tap → cool-down puff (frost mist, flame settles)
   ============================================================ */

type Spark = { id: number; dx: number; dy: number; scale: number; delay: number; life: number }
type Puff = { id: number; dx: number; delay: number; scale: number }

let sparkSeq = 0

function SparkField({ intensity, cooling }: { intensity: number; cooling: boolean }) {
  const sparks = useMemo<Spark[]>(() => {
    const count = cooling ? 0 : 5 + intensity * 4
    return Array.from({ length: count }, () => ({
      id: sparkSeq++,
      dx: (Math.random() - 0.5) * 52,
      dy: -18 - Math.random() * 42,
      scale: 0.5 + Math.random() * 0.9,
      delay: Math.random() * 0.08,
      life: 0.6 + Math.random() * 0.35,
    }))
  }, [intensity, cooling])

  const puffs = useMemo<Puff[]>(() => {
    if (!cooling) return []
    return Array.from({ length: 6 }, () => ({
      id: sparkSeq++,
      dx: (Math.random() - 0.5) * 46,
      delay: Math.random() * 0.12,
      scale: 0.8 + Math.random() * 0.8,
    }))
  }, [cooling])

  return (
    <span className="heat-particles" aria-hidden="true">
      {sparks.map(spark => (
        <motion.span
          key={spark.id}
          className={`heat-spark i${Math.min(3, intensity)}`}
          initial={{ x: 0, y: 6, opacity: 0, scale: 0 }}
          animate={{ x: spark.dx, y: spark.dy, opacity: [0, 1, 1, 0], scale: [0, spark.scale, spark.scale * 0.4, 0] }}
          transition={{ duration: spark.life, delay: spark.delay, ease: 'easeOut' }}
        />
      ))}
      {puffs.map(puff => (
        <motion.span
          key={puff.id}
          className="heat-puff"
          initial={{ x: 0, y: 4, opacity: 0, scale: 0.4 }}
          animate={{ x: puff.dx, y: -34, opacity: [0, 0.9, 0], scale: [0.4, puff.scale, puff.scale * 1.9] }}
          transition={{ duration: 0.85, delay: puff.delay, ease: 'easeOut' }}
        />
      ))}
    </span>
  )
}

function FlameGlyph({ size, stroke }: { size: number; stroke: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12.3 21c4.1 0 7.2-2.8 7.2-6.9 0-3.8-2.5-6.1-4.5-8.7-.4 2.2-1.4 3.4-2.6 4.1.1-3.2-1.6-5.9-3.2-7.5.1 3.7-4.1 6.2-4.1 11.6C5.1 17.8 8.1 21 12.3 21Z" />
    </svg>
  )
}

export function HeatButton({ value, onChange, size = 'md', label }: { value: number; onChange: (next: number) => void; size?: 'sm' | 'md' | 'lg'; label?: string }) {
  const [burst, setBurst] = useState<{ key: number; from: number; to: number } | null>(null)
  const cooling = burst?.to === 0
  const displayIntensity = burst ? burst.to : value

  useEffect(() => {
    if (!burst) return
    const timer = window.setTimeout(() => setBurst(null), 950)
    return () => window.clearTimeout(timer)
  }, [burst])

  const advance = () => {
    const next = value >= 3 ? 0 : value + 1
    setBurst({ key: Date.now(), from: value, to: next })
    onChange(next)
  }

  const aria = `${label ? label + ' — ' : ''}heat: ${value === 0 ? 'not heated' : `${value} of 3`}. Activates to raise, cools when full.`

  return (
    <motion.button
      className={`heat-button h-${size} level-${displayIntensity} ${cooling ? 'cooling' : ''} ${value > 0 ? 'heated' : ''}`}
      onClick={advance}
      whileTap={{ scale: 0.86 }}
      animate={burst ? { scale: [1, 1.14, 1] } : { scale: 1 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      aria-label={aria}
      aria-pressed={value > 0}
      data-testid="heat-button"
    >
      <span className="heat-glow" aria-hidden="true" />
      <motion.span
        className="heat-flame"
        key={displayIntensity}
        initial={{ scale: 0.55, rotate: -8, opacity: 0.4 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 480, damping: 16 }}
      >
        <FlameGlyph size={size === 'lg' ? 22 : size === 'md' ? 18 : 15} stroke={1.9} />
      </motion.span>
      <span className="heat-pips" aria-hidden="true">
        {[1, 2, 3].map(step => (
          <motion.i
            key={step}
            className={`pip p${step} ${displayIntensity >= step ? 'lit' : ''}`}
            animate={displayIntensity >= step ? { scale: [0.6, 1.35, 1], opacity: 1 } : { scale: 1, opacity: 0.28 }}
            transition={{ duration: 0.32, ease: 'easeOut' }}
          />
        ))}
      </span>
      <AnimatePresence>{burst && <SparkField key={burst.key} intensity={burst.to} cooling={cooling} />}</AnimatePresence>
      <span className="heat-word">{value === 0 ? (cooling ? 'cooled' : 'heat') : value === 3 ? 'blazing' : value === 2 ? 'ember' : 'warm'}</span>
    </motion.button>
  )
}

/* ============================================================
   AVATAR HEAT RING
   When a profile picture changes, the new avatar arrives inside
   a ring that ignites: an ember sweep races around the circle,
   throws sparks off its edge, then settles into stillness.
   ============================================================ */

export function AvatarHeatRing({ src, initials, igniteKey, size = 92, tone = 'avatar-user', onImageClick }: { src?: string; initials: string; igniteKey?: string | number; size?: number; tone?: string; onImageClick?: () => void }) {
  const [phase, setPhase] = useState<'idle' | 'ignite'>('idle')
  const firstRun = useRef(true)

  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return }
    if (igniteKey === undefined) return
    setPhase('ignite')
    const timer = window.setTimeout(() => setPhase('idle'), 1600)
    return () => window.clearTimeout(timer)
  }, [igniteKey])

  return (
    <span className={`avatar-heat-ring ${phase === 'ignite' ? 'igniting' : ''}`} style={{ width: size, height: size }}>
      <span className="ring-track" aria-hidden="true" />
      <span className="ring-fire" aria-hidden="true" />
      <span className="ring-sparks" aria-hidden="true">
        {[0, 60, 120, 180, 240, 300].map((angle, index) => (
          <i key={angle} style={{ '--angle': `${angle}deg`, '--i': index } as React.CSSProperties} />
        ))}
      </span>
      <motion.button
        className={`avatar avatar-ring-avatar ${tone} ${src ? 'avatar-photo' : ''}`}
        style={{ width: '100%', height: '100%' }}
        onClick={onImageClick}
        whileHover={onImageClick ? { scale: 1.04 } : undefined}
        aria-label={onImageClick ? 'Change profile picture' : undefined}
      >
        {phase === 'ignite' ? (
          <motion.span
            key={`${igniteKey}-${src ? 'img' : 'txt'}`}
            className="avatar-arrival"
            initial={{ scale: 0.5, opacity: 0, filter: 'brightness(2.2) saturate(0.4)' }}
            animate={{ scale: 1, opacity: 1, filter: 'brightness(1) saturate(1)' }}
            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
            style={{ width: '100%', height: '100%', borderRadius: '50%', display: 'grid', placeItems: 'center', ...(src ? { backgroundImage: `url(${src})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}) }}
          >
            {!src && initials}
          </motion.span>
        ) : src ? (
          <span className="avatar-photo-fill" style={{ backgroundImage: `url(${src})` }} />
        ) : (
          initials
        )}
      </motion.button>
    </span>
  )
}

/* A tiny demo used on the landing page: press to feel the heat. */
export function HeatDemo() {
  const [value, setValue] = useState(0)
  return (
    <div className="heat-demo" data-testid="heat-demo">
      <span className="heat-demo-label">Try it — this is how a flare feels</span>
      <HeatButton value={value} onChange={setValue} size="lg" label="Demo flare" />
      <span className="heat-demo-caption">{value === 0 ? 'Not heated yet. Tap once.' : value === 3 ? 'Blazing. One more tap lets it cool.' : `Heat ${value} of 3 — keep going.`}</span>
    </div>
  )
}
