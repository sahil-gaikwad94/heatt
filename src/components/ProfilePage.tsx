import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, Bell, Bookmark, Check, Flame, Lock, PenLine, Plus, Sparkles, Users } from 'lucide-react'
import type { Preferences, ProfileData } from '../types'
import type { Buddy, BuddyWarmth } from '../data/buddies'
import { AvatarHeatRing } from './Heat'
import { BuddyCard } from './Buddy'
import { Dialog, DialogContent, DialogFooter, DialogHeader } from './ui/Dialog'
import { cn } from '../lib/cn'

/* ============================================================
   HEATT · PROFILE (Tailwind + Radix + motion)
   A detailed, animated profile: hero with the avatar heat ring,
   stateful stat tiles, the companion interaction card, shelf
   preferences, and quiet privacy controls.
   ============================================================ */

const topics = ['Creative practice', 'Books & ideas', 'Poetry & language', 'Relationships', 'Health & attention', 'Leadership', 'Strategy & decisions', 'Innovation & technology', 'Work & careers', 'Culture & society', 'Philosophy', 'Making & craft', 'Money & meaning']
const styles = ['Practical', 'Reflective', 'Funny', 'Poetic', 'Curious']
const intents = ['Reflect', 'Learn', 'Connect', 'Explore']

export type ProfileStats = { flares: number; heatGiven: number; saved: number; rooms: number; shelves: number }

function initialsFor(name: string) {
  return name.split(/\s+/).filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase() || 'GR'
}

function StatTile({ icon: Glyph, value, label, detail, heatLevel, index }: {
  icon: typeof Flame
  value: number
  label: string
  detail: string
  heatLevel?: number
  index: number
}) {
  return (
    <motion.article
      className="group relative overflow-hidden rounded-3xl border border-line bg-card p-[18px] shadow-soft transition-colors hover:border-ember/45"
      initial={{ opacity: 0, y: 18, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.06 * index, type: 'spring', stiffness: 320, damping: 24 }}
      whileHover={{ y: -4 }}
    >
      <div aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full bg-ember-soft opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
      <div className="relative flex items-center justify-between">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-ember-soft text-ember">
          <Glyph size={16} strokeWidth={2} />
        </span>
        {heatLevel !== undefined && (
          <span className="flex items-center gap-[3px]" aria-hidden>
            {[1, 2, 3].map(step => (
              <i key={step} className={cn('h-[7px] w-[7px] rounded-full transition-all duration-500', step <= heatLevel ? 'shadow-[0_0_7px_rgba(243,114,26,.6)]' : 'bg-line', heatLevel === 0 && 'bg-line')} style={step <= heatLevel ? { background: step === 1 ? 'var(--heat-1)' : step === 2 ? 'var(--heat-2)' : 'var(--heat-3)' } : undefined} />
            ))}
          </span>
        )}
      </div>
      <motion.strong
        key={value}
        className="relative mt-3.5 block font-display text-[27px] font-bold leading-none tracking-[-0.03em] text-ink"
        initial={{ scale: 0.7, opacity: 0.4 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 20 }}
      >
        {value}
      </motion.strong>
      <span className="relative mt-1.5 block font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">{label}</span>
      <p className="relative mt-1.5 text-[10.5px] leading-snug text-muted">{detail}</p>
    </motion.article>
  )
}

function PillGroup({ title, items, selected, onToggle }: { title: string; items: string[]; selected: string[]; onToggle: (item: string) => void }) {
  return (
    <div className="grid gap-2.5">
      <strong className="font-display text-[13px] font-bold text-ink">{title}</strong>
      <div className="flex flex-wrap gap-2">
        {items.map(item => {
          const active = selected.includes(item)
          return (
            <button
              key={item}
              aria-pressed={active}
              onClick={() => onToggle(item)}
              className={cn(
                'inline-flex min-h-[34px] items-center gap-1.5 rounded-full border px-3.5 text-[11.5px] font-semibold transition-all',
                active
                  ? 'border-ember bg-ember text-on-ember shadow-[0_6px_16px_var(--accent-glow)]'
                  : 'border-line bg-card-soft text-ink-soft hover:border-ember/60 hover:text-ink',
              )}
            >
              {active && <Check size={12} strokeWidth={3} />}
              {item}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function ProfilePage({ profile, preferences, stats, buddy, warmth, signedIn, onOpenChat, onSwapBuddy, onSavePreferences, onSaveProfile, onOpenAbout }: {
  profile: ProfileData
  preferences: Preferences
  stats: ProfileStats
  buddy: Buddy
  warmth: BuddyWarmth
  signedIn: boolean
  onOpenChat: () => void
  onSwapBuddy: () => void
  onSavePreferences: (preferences: Preferences) => void
  onSaveProfile: (profile: ProfileData) => void
  onOpenAbout: () => void
}) {
  const [topicsSelected, setTopicsSelected] = useState(preferences.topics)
  const [stylesSelected, setStylesSelected] = useState(preferences.styles)
  const [intent, setIntent] = useState(preferences.intent)
  const [savedFlash, setSavedFlash] = useState(false)
  const [editing, setEditing] = useState(false)

  const savePreferences = () => {
    onSavePreferences({ ...preferences, topics: topicsSelected, styles: stylesSelected, intent })
    setSavedFlash(true)
    window.setTimeout(() => setSavedFlash(false), 2200)
  }

  return (
    <div className="page-content profile-page grid gap-6">
      {/* ---------- hero ---------- */}
      <motion.section
        className="relative overflow-hidden rounded-[26px] border border-line bg-card p-7 shadow-soft sm:p-8"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <div aria-hidden className="pointer-events-none absolute -right-28 -top-36 h-80 w-80 rounded-full bg-ember-soft blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-gold-soft blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-6">
          <AvatarHeatRing
            src={profile.avatarData}
            initials={initialsFor(profile.name)}
            igniteKey={profile.avatarData ?? 'initial'}
            size={104}
            onImageClick={() => setEditing(true)}
          />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-muted">
              Your profile
              <span className="inline-flex items-center gap-1 rounded-full border border-line bg-card-soft px-2 py-[3px] text-[8.5px] text-ink-soft">
                {signedIn ? <><Check size={9} strokeWidth={3} /> synced</> : <><Lock size={9} /> this device</>}
              </span>
            </p>
            <h1 className="mt-1 truncate font-display text-[clamp(28px,5vw,36px)] font-bold leading-none tracking-[-0.04em] text-ink">{profile.name}</h1>
            <span className="mt-1.5 block font-mono text-[11px] text-muted">@{profile.handle}</span>
            <p className="mt-2.5 max-w-[48ch] text-[13px] leading-relaxed text-ink-soft">{profile.bio || 'A quiet reader making room for good ideas.'}</p>
          </div>
          <button
            onClick={() => setEditing(true)}
            className="inline-flex h-11 items-center gap-2 self-start rounded-full border border-line-strong bg-card px-5 text-[12px] font-bold text-ink transition hover:border-ember hover:text-ember"
          >
            <PenLine size={14} /> Edit profile
          </button>
        </div>
      </motion.section>

      {/* ---------- stat tiles ---------- */}
      <section aria-label="Your activity" className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile icon={Sparkles} value={stats.flares} label="Flares" detail="Your thoughts, out in the world." index={0} />
        <StatTile icon={Flame} value={stats.heatGiven} label="Heat given" detail={stats.heatGiven ? 'You warm the good ones.' : 'Heat a flare to begin.'} heatLevel={stats.heatGiven === 0 ? 0 : stats.heatGiven < 4 ? 1 : stats.heatGiven < 10 ? 2 : 3} index={1} />
        <StatTile icon={Bookmark} value={stats.saved} label="Saved" detail="Kept close on your shelf." index={2} />
        <StatTile icon={Users} value={stats.rooms} label="Rooms" detail={stats.rooms ? 'Small places you belong to.' : 'Rooms are waiting to be joined.'} index={3} />
        <StatTile icon={ArrowRight} value={stats.shelves} label="Shelves" detail="Topics that lead your feed." index={4} />
      </section>

      {/* ---------- companion ---------- */}
      <BuddyCard buddy={buddy} warmth={warmth} onChat={onOpenChat} onSwap={onSwapBuddy} />

      {/* ---------- shelf preferences ---------- */}
      <section className="grid gap-6 rounded-[26px] border border-line bg-card p-7 shadow-soft">
        <header className="grid gap-1.5">
          <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-ember">Your shelf</span>
          <h2 className="font-display text-[24px] font-bold tracking-[-0.03em] text-ink">Shape what leads your feed.</h2>
          <p className="max-w-[62ch] text-[12.5px] leading-relaxed text-ink-soft">These explicit choices guide discovery — nothing here is a score, an ad target, or a streak.</p>
        </header>
        <PillGroup title="Topics" items={topics} selected={topicsSelected} onToggle={item => setTopicsSelected(current => current.includes(item) ? current.filter(value => value !== item) : [...current, item])} />
        <PillGroup title="Writing styles" items={styles} selected={stylesSelected} onToggle={item => setStylesSelected(current => current.includes(item) ? current.filter(value => value !== item) : [...current, item])} />
        <div className="grid gap-2.5">
          <strong className="font-display text-[13px] font-bold text-ink">When you open Heatt</strong>
          <div className="flex flex-wrap gap-2">
            {intents.map(item => (
              <button
                key={item}
                aria-pressed={intent === item}
                onClick={() => setIntent(item)}
                className={cn(
                  'inline-flex min-h-[34px] items-center rounded-full border px-4 text-[11.5px] font-semibold transition-all',
                  intent === item
                    ? 'border-ink bg-ink text-card'
                    : 'border-line bg-card-soft text-ink-soft hover:border-ember/60 hover:text-ink',
                )}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <button className="inline-flex h-11 items-center gap-2 rounded-full bg-ember px-6 text-[12.5px] font-bold text-on-ember shadow-[0_10px_24px_var(--accent-glow)] transition hover:bg-ember-deep" onClick={savePreferences}>
            Save preferences <ArrowRight size={14} />
          </button>
          <AnimatePresence>
            {savedFlash && (
              <motion.span
                className="inline-flex items-center gap-1.5 rounded-full border border-good/45 bg-good/10 px-3 py-1.5 text-[10.5px] font-bold text-good"
                initial={{ opacity: 0, scale: 0.8, x: -8 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <Check size={12} strokeWidth={3} /> Saved
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* ---------- privacy ---------- */}
      <section className="grid gap-4 rounded-[26px] border border-line bg-card p-7 shadow-soft">
        <header className="grid gap-1.5">
          <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-ember">Privacy and control</span>
          <h2 className="font-display text-[24px] font-bold tracking-[-0.03em] text-ink">Quiet by construction.</h2>
        </header>
        <div className="grid gap-2.5">
          {[
            { icon: Lock, title: 'Journal & time capsules', description: 'Stored on this device, never used for recommendations.', value: 'Always private' },
            { icon: Flame, title: 'Heat reactions', description: 'One fire per flare, intensity 1–3, yours to cool.', value: 'Yours only' },
            { icon: Bell, title: 'Thoughtful notifications', description: 'Replies, invitations, and things you ask for. Nothing else.', value: 'On' },
          ].map(row => (
            <div key={row.title} className="flex items-center gap-4 rounded-2xl border border-line bg-card-soft px-5 py-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ember-soft text-ember"><row.icon size={16} /></span>
              <div className="min-w-0 flex-1">
                <strong className="block text-[12.5px] text-ink">{row.title}</strong>
                <span className="block text-[11px] leading-relaxed text-muted">{row.description}</span>
              </div>
              <span className="shrink-0 rounded-full border border-good/40 bg-good/10 px-3 py-1.5 font-mono text-[9.5px] font-bold text-good">{row.value}</span>
            </div>
          ))}
        </div>
      </section>

      <footer className="flex flex-wrap gap-5 pb-2 text-[10.5px] text-muted">
        <button className="transition hover:text-ember" onClick={onOpenAbout}>About Heatt</button>
        <a className="transition hover:text-ember" href="/privacy">Privacy policy</a>
        <a className="transition hover:text-ember" href="/terms">Terms of use</a>
      </footer>

      {editing && (
        <ProfileEditModal
          profile={profile}
          onClose={() => setEditing(false)}
          onSave={next => { onSaveProfile(next); setEditing(false) }}
        />
      )}
    </div>
  )
}

/* ---------- profile edit (Radix dialog, avatar heat-ring preview) ---------- */

function ProfileEditModal({ profile, onClose, onSave }: { profile: ProfileData; onClose: () => void; onSave: (profile: ProfileData) => void }) {
  const [draft, setDraft] = useState<ProfileData>(profile)

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent aria-label="Edit your profile">
        <DialogHeader
          eyebrow="YOUR PUBLIC SPACE"
          title="Edit your profile."
          note="Let people know what you care about, without making it perform. Choose a new picture and watch the ring catch fire."
        />
        <div className="grid gap-5 overflow-y-auto px-7 pb-2">
          <div className="flex flex-wrap items-center gap-6 rounded-3xl border border-line bg-card-soft p-5">
            <AvatarHeatRing
              src={draft.avatarData}
              initials={initialsFor(draft.name)}
              igniteKey={draft.avatarData ?? 'draft-initial'}
              size={92}
            />
            <div className="grid flex-1 gap-2.5">
              <span className="text-[11.5px] font-semibold text-ink">Profile picture</span>
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full bg-ember px-4 text-[11.5px] font-bold text-on-ember transition hover:bg-ember-deep">
                  <Plus size={14} /> Choose picture
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={event => {
                      const file = event.target.files?.[0]
                      if (!file) return
                      if (file.size > 2_000_000) return
                      const reader = new FileReader()
                      reader.onload = () => setDraft(current => ({ ...current, avatarData: String(reader.result) }))
                      reader.readAsDataURL(file)
                    }}
                  />
                </label>
                {draft.avatarData && (
                  <button className="text-[11px] font-semibold text-muted underline-offset-4 transition hover:text-ember hover:underline" onClick={() => setDraft(current => ({ ...current, avatarData: undefined }))}>
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          <label className="grid gap-1.5">
            <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-muted">Name</span>
            <input
              value={draft.name}
              maxLength={40}
              onChange={event => setDraft({ ...draft, name: event.target.value })}
              className="h-11 rounded-2xl border border-line bg-card px-4 text-[13px] text-ink outline-none transition focus:border-ember"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-muted">Handle</span>
            <input
              value={draft.handle}
              maxLength={24}
              onChange={event => setDraft({ ...draft, handle: event.target.value.replace(/[^a-zA-Z0-9_.]/g, '') })}
              className="h-11 rounded-2xl border border-line bg-card px-4 font-mono text-[13px] text-ink outline-none transition focus:border-ember"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-muted">Bio <em className="not-italic text-muted/70">· {draft.bio.length}/160</em></span>
            <textarea
              value={draft.bio}
              maxLength={160}
              rows={3}
              onChange={event => setDraft({ ...draft, bio: event.target.value })}
              className="resize-none rounded-2xl border border-line bg-card px-4 py-3 text-[13px] leading-relaxed text-ink outline-none transition focus:border-ember"
            />
          </label>
        </div>
        <DialogFooter className="mt-4">
          <button className="px-4 py-2.5 text-[12px] font-semibold text-muted transition hover:text-ink" onClick={onClose}>Cancel</button>
          <button
            className="inline-flex h-11 items-center gap-2 rounded-full bg-ember px-6 text-[12.5px] font-bold text-on-ember shadow-[0_10px_24px_var(--accent-glow)] transition hover:bg-ember-deep disabled:opacity-40"
            disabled={!draft.name.trim() || !draft.handle.trim()}
            onClick={() => onSave({ ...draft, name: draft.name.trim(), handle: draft.handle.trim(), bio: draft.bio.trim() })}
          >
            Save profile <Check size={14} strokeWidth={2.6} />
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
