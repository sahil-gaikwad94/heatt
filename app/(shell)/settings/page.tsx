'use client';
/* ============================================================================
   /settings — the controls, and nothing else.

   Reading (type size, measure, serif), motion (how much of it you want), your
   own identity, and the two things a local-only app owes you: a copy of your
   data, and a confirmation before it is destroyed. No account, no plan, no
   connected apps.
   ==========================================================================*/

import * as React from 'react';
import { useApp } from '@/lib/app';
import { useStore } from '@/lib/store';
import { Avatar } from '@/components/ui/primitives';
import { PageHead, TopBar } from '@/components/shell/Shell';
import { ProfileEditor } from '@/components/profile/ProfileEditor';
import { cls } from '@/lib/util';
import { EASE_OUT } from '@/lib/motion';
import { motion } from 'framer-motion';

export default function SettingsPage() {
  const app = useApp();
  const p = app.prefs;
  const me = app.me;
  const [editing, setEditing] = React.useState(false);
  const [armed, setArmed] = React.useState(false);

  return (
    <>
      <TopBar />
      <div className="ht-stage pt-2 pb-16">
        <PageHead eyebrow="settings" title="How the room behaves" dek="Small, local preferences. Nothing here leaves your device." />

        {/* ------------------------------------------------------- identity */}
        <Section title="You" hint="minted locally — there is no sign-up">
          <div className="flex items-center gap-3.5">
            <Avatar name={me?.name ?? 'You'} handle={me?.handle ?? 'you'} src={me?.avatar} size={54} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold text-ink">{me?.name ?? 'You'}</p>
              <p className="truncate text-[12.5px] text-ink-faint">@{me?.handle ?? 'you'}</p>
            </div>
            <button onClick={() => setEditing(true)} className="ht-btn ht-btn--quiet">
              Edit
            </button>
          </div>
        </Section>

        {/* -------------------------------------------------------- reading */}
        <Section title="Reading" hint="these apply to every story immediately">
          <Row label="Text size" hint="how large long-form body copy is set">
            <Segmented
              value={p.density}
              onChange={(v) => app.setPrefs({ density: v })}
              options={[
                { key: 'dense', label: 'Compact' },
                { key: 'normal', label: 'Default' },
                { key: 'cozy', label: 'Large' },
              ]}
              label="Text size"
            />
          </Row>
          <Row label="Measure" hint="characters per line in the reader">
            <Segmented
              value={p.measure}
              onChange={(v) => app.setPrefs({ measure: v })}
              options={[
                { key: 'narrow', label: 'Narrow' },
                { key: 'normal', label: 'Normal' },
                { key: 'wide', label: 'Wide' },
              ]}
              label="Measure"
            />
          </Row>
          <Row label="Serif body" hint="Newsreader for prose, Inter for everything else">
            <Switch checked={p.serif} onChange={(v) => app.setPrefs({ serif: v })} label="Serif body" />
          </Row>
        </Section>

        {/* --------------------------------------------------------- motion */}
        <Section title="Motion" hint="the app has less animation than you think — this trims it further">
          <Row label="Reduce motion" hint="removes parallax, reveals and ambient drift">
            <Switch checked={p.reduceMotion} onChange={(v) => app.setPrefs({ reduceMotion: v })} label="Reduce motion" />
          </Row>
          <Row label="Ambient light" hint="the two slow glows behind the room">
            <Switch checked={p.ambient} onChange={(v) => app.setPrefs({ ambient: v })} label="Ambient light" />
          </Row>
          <Row label="Ignition burst" hint="the spark shower when a piece ignites">
            <Segmented
              value={p.ignitionFx}
              onChange={(v) => app.setPrefs({ ignitionFx: v })}
              options={[
                { key: 'full', label: 'Full' },
                { key: 'subtle', label: 'Subtle' },
                { key: 'off', label: 'Off' },
              ]}
              label="Ignition burst"
            />
          </Row>
          <Row label="Haptics" hint="a short pulse at each heat threshold, where supported">
            <Switch checked={p.haptics} onChange={(v) => app.setPrefs({ haptics: v })} label="Haptics" />
          </Row>
        </Section>

        {/* ----------------------------------------------------- the opening */}
        <Section title="The opening" hint="four seconds of intro, then four scenes of the tour">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                useStore.setState({ introSeen: false });
                app.go('/feed');
              }}
              className="ht-btn ht-btn--quiet"
            >
              Replay the intro
            </button>
            <button
              onClick={() => {
                useStore.setState({ introSeen: true, onboarded: false });
                app.go('/feed');
              }}
              className="ht-btn ht-btn--ghost"
            >
              Replay the tour
            </button>
            <span className="text-[12px] text-ink-4">
              A returning reader never sees either one unless they ask for it here.
            </span>
          </div>
        </Section>

        {/* -------------------------------------------------------- keyboard */}
        <Section title="Keyboard" hint="everything works by tapping; this is for the rest of us">
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => app.setShortcuts(true)} className="ht-btn ht-btn--quiet">
              Open the shortcut sheet
            </button>
            <span className="flex items-center gap-1.5 text-[12px] text-ink-4">
              or press <kbd className="ht-kbd">?</kbd> anywhere
            </span>
          </div>
        </Section>

        {/* ---------------------------------------------------------- local */}
        <Section title="This device" hint="heatt stores everything locally — this is the only copy">
          <Row label="Take your data with you" hint="one JSON file: your keeps, heat, replies, notes and preferences">
            <button onClick={exportEverything} className="ht-btn ht-btn--quiet">
              Download my data
            </button>
          </Row>

          <div className="pt-1">
            <button onClick={() => setArmed(true)} className="ht-btn ht-btn--quiet" disabled={armed}>
              Clear heat, keeps and drafts
            </button>
            <span className="ml-3 text-[12px] text-ink-4">Kept pieces and progress are removed. Your notes are not recoverable.</span>
          </div>

          {armed && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: EASE_OUT }}
              role="alert"
              className="rounded-[var(--r-md)] border border-[rgba(255,143,143,.34)] bg-[rgba(255,143,143,.06)] p-4"
            >
              <p className="text-[13.5px] font-semibold text-ink">Erase this device?</p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-2">
                Heat, keeps, reading progress, replies, your published notes, your handle and every preference are
                deleted from this browser. There is no copy on a server and no way to undo it.
              </p>
              <div className="mt-3.5 flex flex-wrap items-center gap-3">
                <button onClick={() => setArmed(false)} className="ht-btn ht-btn--quiet !h-9">
                  Keep everything
                </button>
                <button
                  onClick={() => {
                    useStore.getState().reset();
                    setArmed(false);
                    app.go('/');
                  }}
                  className="ht-btn !h-9 !bg-transparent !text-[var(--neg)]"
                  style={{ border: '1px solid rgba(255,143,143,.4)' }}
                >
                  Erase everything
                </button>
                <button onClick={exportEverything} className="ht-btn ht-btn--ghost !h-9">
                  Download a copy first
                </button>
              </div>
            </motion.div>
          )}
        </Section>

        <p className="mt-10 border-t border-line pt-6 text-[12px] text-ink-4">
          heatt · a room, not a feed. Everything in it is written by the house, syndicated from a real writer, or written by you.
        </p>
      </div>

      {editing && <ProfileEditor onClose={() => setEditing(false)} />}
    </>
  );
}

/* ------------------------------------------------------------------ parts */

/**
 * Everything heatt knows about you, as one file. No server copy exists, so
 * this is not a convenience — it is the only backup there can be.
 */
function exportEverything() {
  const st = useStore.getState();
  const dump = {
    app: 'heatt',
    version: 1,
    exportedAt: new Date().toISOString(),
    me: st.me,
    prefs: st.prefs,
    interests: st.interests,
    saved: st.saved,
    reads: st.reads,
    heat: st.heat,
    shares: st.shares,
    votes: st.votes,
    follows: st.follows,
    muted: st.muted,
    replies: st.replies,
    mySparks: st.mySparks,
    myArticles: st.myArticles,
  };
  try {
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `heatt-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    /* a blocked download must not throw into the page */
  }
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 first:mt-2">
      <div className="mb-3">
        <h2 className="ht-title text-[16px] text-ink">{title}</h2>
        {hint && <p className="mt-1 text-[12px] text-ink-4">{hint}</p>}
      </div>
      <div className="ht-card ht-card--pad space-y-4">{children}</div>
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4 last:border-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-[13.5px] font-medium text-ink">{label}</p>
        {hint && <p className="mt-0.5 max-w-[42ch] text-[12px] text-ink-4">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="ht-switch"
    />
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { key: T; label: string }[];
  label: string;
}) {
  return (
    <div className="ht-tabrail" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          aria-pressed={value === o.key}
          className={cls('ht-tab !px-3 !text-[12.5px]', value === o.key && 'bg-white/[.08] text-ink')}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
