import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { buddies as buddyRegistry, buddyById, buddyQuickChips, buddyWarmth, type Buddy, type BuddyMessage } from '../data/buddies'

/* ============================================================
   HEATT · COMPANION COMPONENTS
   The buddy appears in three sizes of life:
   · BuddySprite  — the animated character itself (float, wiggle,
                    hover bounce, tap jiggle)
   · BuddyDock    — small corner companion on Home, opens chat
   · BuddyChat    — a private, local, rule-based conversation
   · BuddyCard    — the profile card with warmth state
   · BuddyPicker  — choose your companion (settings / landing)
   ============================================================ */

export function BuddySprite({ buddy, size = 120, animated = true, onClick, className = '' }: { buddy: Buddy; size?: number; animated?: boolean; onClick?: () => void; className?: string }) {
  const [excited, setExcited] = useState(0)
  const wiggleAt = useRef(0)

  useEffect(() => {
    if (!animated) return
    const timer = window.setInterval(() => {
      if (Date.now() - wiggleAt.current < 2600) return
      setExcited(value => value + 1)
      wiggleAt.current = Date.now()
    }, 4200 + Math.random() * 3000)
    return () => window.clearInterval(timer)
  }, [animated])

  const handleClick = () => {
    setExcited(value => value + 1)
    onClick?.()
  }

  return (
    <motion.span
      className={`buddy-sprite ${className}`}
      style={{ width: size, height: size }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <span className="buddy-aura" aria-hidden="true" style={{ background: `radial-gradient(circle, ${buddy.aura}, transparent 68%)` }} />
      <motion.img
        src={buddy.image}
        alt={`${buddy.name} — ${buddy.species}`}
        draggable={false}
        animate={
          excited
            ? { y: [0, -size * 0.16, 0, -size * 0.07, 0], rotate: [0, -4, 4, -2, 0], scale: [1, 1.07, 1] }
            : { y: [0, -size * 0.05, 0], rotate: 0, scale: 1 }
        }
        transition={excited ? { duration: 0.75, ease: 'easeOut' } : { duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        whileHover={{ scale: 1.08, rotate: 3 }}
        onClick={handleClick}
        style={{ width: '100%', height: '100%', objectFit: 'contain', cursor: onClick ? 'pointer' : 'default' }}
      />
      <span className="buddy-embers" aria-hidden="true">
        <i style={{ '--d': '0s' } as React.CSSProperties} />
        <i style={{ '--d': '1.1s' } as React.CSSProperties} />
        <i style={{ '--d': '2.2s' } as React.CSSProperties} />
      </span>
    </motion.span>
  )
}

/* ---------- home corner dock ---------- */

export function BuddyDock({ buddy, unreadLine, onOpen }: { buddy: Buddy; unreadLine?: string; onOpen: () => void }) {
  const [showTease, setShowTease] = useState(false)
  useEffect(() => {
    if (!unreadLine) return
    const timer = window.setTimeout(() => setShowTease(true), 1400)
    const hide = window.setTimeout(() => setShowTease(false), 7600)
    return () => { window.clearTimeout(timer); window.clearTimeout(hide) }
  }, [unreadLine])

  return (
    <motion.div
      className="buddy-dock"
      initial={{ opacity: 0, y: 24, scale: 0.85 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.6, type: 'spring', stiffness: 260, damping: 20 }}
    >
      <AnimatePresence>
        {showTease && unreadLine && (
          <motion.button
            className="buddy-tease"
            onClick={onOpen}
            initial={{ opacity: 0, x: 12, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 8, scale: 0.95 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {unreadLine}
          </motion.button>
        )}
      </AnimatePresence>
      <motion.button
        className="buddy-dock-button"
        onClick={onOpen}
        aria-label={`Chat with ${buddy.name}, your companion`}
        whileHover={{ scale: 1.07 }}
        whileTap={{ scale: 0.92 }}
      >
        <span className="buddy-dock-halo" aria-hidden="true" style={{ background: `radial-gradient(circle, ${buddy.aura}, transparent 70%)` }} />
        <img src={buddy.image} alt="" draggable={false} />
        <span className="buddy-dock-status" aria-hidden="true" />
      </motion.button>
    </motion.div>
  )
}

/* ---------- chat ---------- */

export function BuddyChat({ buddy, messages, onSend, onClose, warmthLabel }: { buddy: Buddy; messages: BuddyMessage[]; onSend: (text: string) => void; onClose: () => void; warmthLabel: string }) {
  const [draft, setDraft] = useState('')
  const [thinking, setThinking] = useState(false)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const node = scrollRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [messages, thinking])

  const send = (text: string) => {
    const value = text.trim()
    if (!value) return
    onSend(value)
    setDraft('')
    setThinking(true)
    window.setTimeout(() => setThinking(false), 700 + Math.random() * 500)
  }

  return (
    <div className="buddy-chat-backdrop" onClick={event => { if (event.target === event.currentTarget) onClose() }}>
      <motion.div
        className="buddy-chat"
        role="dialog"
        aria-label={`Chat with ${buddy.name}`}
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      >
        <header className="buddy-chat-head" style={{ ['--buddy-hue' as string]: buddy.hue }}>
          <BuddySprite buddy={buddy} size={54} />
          <div>
            <strong>{buddy.name}</strong>
            <span>{buddy.species} · {warmthLabel.toLowerCase()}</span>
          </div>
          <span className="buddy-chat-private"><LockGlyph /> local &amp; private</span>
          <button className="icon-button" onClick={onClose} aria-label="Close chat"><XGlyph /></button>
        </header>

        <div className="buddy-chat-scroll" ref={scrollRef}>
          {messages.length === 0 && (
            <div className="buddy-chat-intro">
              <p>{buddy.tagline}</p>
              <p className="buddy-chat-hint">Ask for a read, a joke, or a nudge — {buddy.name} keeps everything on this device.</p>
            </div>
          )}
          <AnimatePresence initial={false}>
            {messages.map(message => (
              <motion.div
                key={message.id}
                className={`chat-bubble ${message.from === 'you' ? 'from-you' : 'from-buddy'}`}
                initial={{ opacity: 0, y: 10, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                {message.from === 'buddy' && <img className="chat-bubble-avatar" src={buddy.image} alt="" />}
                <p>{message.text}</p>
              </motion.div>
            ))}
          </AnimatePresence>
          {thinking && (
            <div className="chat-bubble from-buddy thinking">
              <img className="chat-bubble-avatar" src={buddy.image} alt="" />
              <p><span className="dot" /><span className="dot" /><span className="dot" /></p>
            </div>
          )}
        </div>

        <div className="buddy-chat-chips" role="toolbar" aria-label="Quick things to ask">
          {buddyQuickChips.map(chip => <button key={chip} onClick={() => send(chip)}>{chip}</button>)}
        </div>

        <form className="buddy-chat-form" onSubmit={event => { event.preventDefault(); send(draft) }}>
          <input
            value={draft}
            onChange={event => setDraft(event.target.value)}
            placeholder={`Say something to ${buddy.name}…`}
            aria-label={`Message ${buddy.name}`}
            maxLength={280}
          />
          <button type="submit" className="buddy-chat-send" disabled={!draft.trim()} aria-label="Send message">
            <SendGlyph />
          </button>
        </form>
      </motion.div>
    </div>
  )
}

/* ---------- profile card ---------- */

export function BuddyCard({ buddy, warmth, onChat, onSwap }: { buddy: Buddy; warmth: ReturnType<typeof buddyWarmth>; onChat: () => void; onSwap: () => void }) {
  const [boop, setBoop] = useState(0)
  const [line, setLine] = useState('')
  const lines = useMemo(() => [...buddy.greetings, ...buddy.cheers, ...buddy.reads], [buddy])

  const doBoop = () => {
    setLine(lines[boop % lines.length])
    setBoop(value => value + 1)
  }

  return (
    <motion.section
      className="buddy-card"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="buddy-card-stage" style={{ ['--buddy-hue' as string]: buddy.hue }}>
        <div className="buddy-card-glow" aria-hidden="true" style={{ background: `radial-gradient(circle at 50% 80%, ${buddy.aura}, transparent 70%)` }} />
        <motion.div
          key={boop}
          animate={boop ? { scale: [1, 1.12, 0.97, 1.05, 1], rotate: [0, -4, 4, -2, 0] } : { scale: 1 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="buddy-card-sprite"
        >
          <BuddySprite buddy={buddy} size={170} onClick={doBoop} />
        </motion.div>
        <AnimatePresence>
          {line && (
            <motion.button
              className="buddy-card-say"
              onClick={doBoop}
              initial={{ opacity: 0, y: 10, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.3 }}
            >
              “{line}”
            </motion.button>
          )}
        </AnimatePresence>
        <span className="buddy-card-tap-hint">{line ? 'tap again' : 'tap to boop'}</span>
      </div>

      <div className="buddy-card-body">
        <header>
          <div>
            <span className="eyebrow">YOUR COMPANION</span>
            <h3>{buddy.name} <em>· {buddy.species.toLowerCase()}</em></h3>
          </div>
          <span className={`buddy-warmth w${warmth.level}`}>
            <WarmthFlame />
            {warmth.label}
          </span>
        </header>
        <p className="buddy-card-tagline">{buddy.tagline}</p>

        <div className="buddy-warmth-meter" role="img" aria-label={`Warmth: ${warmth.label}`}>
          <span className="warmth-track">
            <motion.span className="warmth-fill" initial={{ width: 0 }} animate={{ width: `${Math.min(100, warmth.progress)}%` }} transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }} />
          </span>
          <span className="warmth-steps">
            {[0, 1, 2, 3].map(level => <i key={level} className={warmth.level >= level ? 'on' : ''} />)}
          </span>
        </div>
        <p className="buddy-warmth-note">{warmth.note}</p>

        <div className="buddy-card-actions">
          <button className="primary-button" onClick={onChat}><ChatGlyph /> Talk to {buddy.name}</button>
          <button className="outline-button" onClick={onSwap}>Swap companion</button>
        </div>
      </div>
    </motion.section>
  )
}

/* ---------- picker ---------- */

export function BuddyPicker({ selectedId, onSelect, compact = false }: { selectedId: string; onSelect: (id: string) => void; compact?: boolean }) {
  return (
    <div className={`buddy-picker ${compact ? 'compact' : ''}`} role="radiogroup" aria-label="Choose your companion">
      {buddyRegistry.map(buddy => (
        <motion.button
          key={buddy.id}
          className={`buddy-option ${selectedId === buddy.id ? 'selected' : ''}`}
          onClick={() => onSelect(buddy.id)}
          role="radio"
          aria-checked={selectedId === buddy.id}
          whileHover={{ y: -4 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 400, damping: 24 }}
        >
          <span className="buddy-option-art" style={{ background: `radial-gradient(circle at 50% 70%, ${buddy.aura}, transparent 72%)` }}>
            <BuddySprite buddy={buddy} size={compact ? 74 : 104} />
            {selectedId === buddy.id && <motion.span layoutId="buddy-selected-ring" className="buddy-selected-ring" transition={{ type: 'spring', stiffness: 380, damping: 30 }} />}
          </span>
          <strong>{buddy.name}</strong>
          <span className="buddy-option-species">{buddy.species}</span>
          <span className="buddy-option-personality">{buddy.personality}</span>
          {selectedId === buddy.id && <span className="buddy-option-active"><CheckGlyph /> Your companion</span>}
        </motion.button>
      ))}
    </div>
  )
}

/* ---------- landing showcase ---------- */

export function BuddyShowcase({ onChoose }: { onChoose?: (id: string) => void }) {
  return (
    <div className="buddy-showcase">
      {buddyRegistry.map((buddy, index) => (
        <motion.article
          key={buddy.id}
          className="buddy-show-card"
          initial={{ opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.55, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="buddy-show-art" style={{ background: `radial-gradient(circle at 50% 75%, ${buddy.aura}, transparent 72%)` }}>
            <BuddySprite buddy={buddy} size={122} />
          </div>
          <h4>{buddy.name}</h4>
          <span className="buddy-show-species">{buddy.role}</span>
          <p>{buddy.tagline}</p>
          {onChoose && <button className="text-button" onClick={() => onChoose(buddy.id)}>Choose {buddy.name} <span aria-hidden="true">→</span></button>}
        </motion.article>
      ))}
    </div>
  )
}

/* ---------- small glyphs ---------- */

function XGlyph() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true"><path d="m5 5 14 14M19 5 5 19" /></svg>
}
function SendGlyph() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m21 3-7.4 18-3.5-7.1L3 10.4 21 3Z" /><path d="M10.1 13.9 21 3" /></svg>
}
function ChatGlyph() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 11.5a7 7 0 0 1-7.4 7H8l-4 2 1.2-4A7.1 7.1 0 1 1 20 11.5Z" /></svg>
}
function CheckGlyph() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 4.5 4.5L19 7" /></svg>
}
function LockGlyph() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
}
function WarmthFlame() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.3 21c4.1 0 7.2-2.8 7.2-6.9 0-3.8-2.5-6.1-4.5-8.7-.4 2.2-1.4 3.4-2.6 4.1.1-3.2-1.6-5.9-3.2-7.5.1 3.7-4.1 6.2-4.1 11.6C5.1 17.8 8.1 21 12.3 21Z" /></svg>
}

/* ---------- helpers ---------- */

export function useBuddy(buddyId: string | undefined) {
  return useMemo(() => buddyById(buddyId), [buddyId])
}

export function buddyTeaser(buddy: Buddy, firstName: string): string {
  const options = [
    `psst ${firstName} — found something warm to read`,
    `${buddy.name} kept your shelf warm`,
    'one good read away from a better day?',
  ]
  return options[Math.floor(Math.random() * options.length)]
}
