import { motion } from 'motion/react'
import type { ThemeId } from '../types'
import type { Preferences } from '../types'
import { BuddyPicker } from './Buddy'

/* ============================================================
   HEATT · SETTINGS
   One page for the things that shape the whole app:
   atmosphere (three complete themes, applied everywhere),
   your companion, your reading taste, and privacy.
   ============================================================ */

export const themeCatalog: { id: ThemeId; name: string; note: string; description: string; swatches: [string, string, string] }[] = [
  {
    id: 'ember',
    name: 'Ember',
    note: 'Golden hour, every hour',
    description: 'Warm porcelain daylight, heat-orange energy, soft gold. The default Heatt — bright, warm, quietly confident.',
    swatches: ['#f8f2ea', '#c2410c', '#b89030'],
  },
  {
    id: 'midnight',
    name: 'Midnight',
    note: 'Deep focus after dark',
    description: 'True black, a quiet lime glow, soft cream text. For late reading and long attention.',
    swatches: ['#07080a', '#d8f25b', '#f2f4ee'],
  },
  {
    id: 'ink',
    name: 'Ink',
    note: 'Paper minimalism',
    description: 'Warm white, black ink, a whisper of khaki. Nothing louder than the words themselves.',
    swatches: ['#f7f6f3', '#1b1b18', '#8e825c'],
  },
]

function ThemePreviewCard({ id, name, note, description, swatches, active, onChoose }: { id: ThemeId; name: string; note: string; description: string; swatches: [string, string, string]; active: boolean; onChoose: () => void }) {
  return (
    <motion.button
      className={`theme-card ${active ? 'active' : ''}`}
      onClick={onChoose}
      role="radio"
      aria-checked={active}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
      data-testid={`theme-${id}`}
    >
      <span className={`theme-card-preview preview-${id}`}>
        <span className="tp-rail"><i /><i /><i /></span>
        <span className="tp-body">
          <span className="tp-hero" style={{ background: `linear-gradient(120deg, ${swatches[1]}, ${swatches[2] ?? swatches[1]})` }} />
          <span className="tp-line long" />
          <span className="tp-line short" />
          <span className="tp-row">
            <span className="tp-chip" />
            <span className="tp-chip alt" />
          </span>
          <span className="tp-button" style={{ background: swatches[1] }} />
        </span>
        <span className="tp-glow" style={{ background: `radial-gradient(circle at 78% 18%, ${swatches[1]}30, transparent 62%)` }} />
      </span>
      <span className="theme-card-info">
        <strong>{name}{active && <em className="theme-active-flag"> · active</em>}</strong>
        <small>{note}</small>
        <p>{description}</p>
      </span>
      <span className="theme-card-swatches" aria-hidden="true">
        {swatches.map(color => <i key={color} style={{ background: color }} />)}
      </span>
    </motion.button>
  )
}

export function SettingsPage({ theme, onThemeChange, buddyId, onBuddyChange, preferences, onPreferencesChange, signedIn, onSignIn, onOpenProfile }: {
  theme: ThemeId
  onThemeChange: (theme: ThemeId) => void
  buddyId: string
  onBuddyChange: (id: string) => void
  preferences: Preferences
  onPreferencesChange: (preferences: Preferences) => void
  signedIn: boolean
  onSignIn: () => void
  onOpenProfile: () => void
}) {
  return (
    <div className="page-content settings-page">
      <div className="page-heading">
        <div>
          <p className="kicker">MAKE HEATT YOURS</p>
          <h1>Settings.</h1>
          <p className="lede">Atmosphere, companion, reading taste, and privacy — all in one warm room.</p>
        </div>
      </div>

      <section className="settings-section" aria-label="Appearance">
        <header className="settings-section-head">
          <div>
            <span className="eyebrow">APPEARANCE</span>
            <h2>Choose your atmosphere.</h2>
            <p>Three complete themes for the entire app — feed, reader, profile, landing, and every room in between. The whole app changes, not just one page.</p>
          </div>
        </header>
        <div className="theme-grid" role="radiogroup" aria-label="App theme">
          {themeCatalog.map(item => (
            <ThemePreviewCard
              key={item.id}
              id={item.id}
              name={item.name}
              note={item.note}
              description={item.description}
              swatches={item.swatches}
              active={theme === item.id}
              onChoose={() => onThemeChange(item.id)}
            />
          ))}
        </div>
      </section>

      <section className="settings-section" aria-label="Companion">
        <header className="settings-section-head">
          <div>
            <span className="eyebrow">COMPANION</span>
            <h2>Who keeps your fire company?</h2>
            <p>Your companion lives in the corner of Home, chats with you privately on this device, and keeps a warmth meter fed by the attention you give.</p>
          </div>
        </header>
        <BuddyPicker selectedId={buddyId} onSelect={onBuddyChange} />
      </section>

      <section className="settings-section" aria-label="Reading taste">
        <header className="settings-section-head">
          <div>
            <span className="eyebrow">READING TASTE</span>
            <h2>Shape your shelves.</h2>
            <p>The topics you keep lead your feed. Removing one here is honest and instant — the Feed Tuner handles the finer adjustments from Home.</p>
          </div>
        </header>
        <div className="settings-topics">
          <div className="preference-group">
            <div><strong>Shelves you lean toward</strong></div>
            <div className="preference-pills">
              {preferences.topics.map(topic => (
                <button key={topic} className="selected" aria-pressed="true" onClick={() => onPreferencesChange({ ...preferences, topics: preferences.topics.filter(item => item !== topic) })}>
                  {topic}
                </button>
              ))}
              {preferences.topics.length === 0 && <span className="settings-hint-inline">All shelves removed — your feed will show everything, unordered.</span>}
            </div>
          </div>
          <p className="settings-hint">Add more shelves from your Profile. Choices shape the open-web shelf only — never ads, never tracking.</p>
        </div>
      </section>

      <section className="settings-section" aria-label="Privacy and account">
        <header className="settings-section-head">
          <div>
            <span className="eyebrow">PRIVACY &amp; ACCOUNT</span>
            <h2>Quiet by construction.</h2>
            <p>Journals, capsules, and companion chats stay on this device. Sync only happens when you sign in.</p>
          </div>
        </header>
        <div className="settings-privacy-rows">
          <div className="privacy-row"><div className="privacy-row-icon">Journal</div><div><strong>Journal &amp; time capsules</strong><span>Stored locally, never used for recommendations.</span></div><span className="privacy-value">Private</span></div>
          <div className="privacy-row"><div className="privacy-row-icon">Chat</div><div><strong>Companion chat</strong><span>Rule-based replies, processed entirely on-device.</span></div><span className="privacy-value">On-device</span></div>
          <div className="privacy-row"><div className="privacy-row-icon">Account</div><div><strong>Account</strong><span>{signedIn ? 'You are signed in — profile and preferences sync.' : 'Guest mode — everything lives in this browser.'}</span></div>{signedIn ? <span className="privacy-value">Synced</span> : <button className="outline-button" onClick={onSignIn}>Sign in</button>}</div>
        </div>
        <button className="text-button settings-profile-link" onClick={onOpenProfile}>Edit name, handle, and bio in Profile →</button>
      </section>
    </div>
  )
}
