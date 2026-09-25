'use client';
/* ============================================================================
   components/profile/ProfileEditor — name, handle, avatar, cover, bio, topics.

   This is where an identity is created — deliberately *not* during onboarding.
   Uploads are downscaled on a canvas (avatar 512², cover 1280×420) so the
   persisted store stays small, and everything is validated before it is saved.
   ==========================================================================*/

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '@/lib/store';
import { useApp } from '@/lib/app';
import { avatarDataUri, cls, coverDataUri } from '@/lib/util';
import { Modal } from '@/components/ui/primitives';

const COVERS = [
  '/art/nocturne-ui.jpg',
  '/art/obsidian-atelier.jpg',
  '/art/graphite-lattice.jpg',
  '/art/quiet-type.jpg',
  '/art/deep-read.jpg',
  '/art/signal-grid.jpg',
  '/art/shader-flames.jpg',
  '/art/story-canvas.jpg',
  '/art/ember-signal.jpg',
  '/art/aurora-drift.jpg',
];

const TAGS = [
  'design',
  'interface',
  'typography',
  'engineering',
  'ai',
  'frontend',
  'reading',
  'craft',
  'product',
  'motion',
  'colour',
  'writing',
  'attention',
  'research',
];

export function ProfileEditor({ onClose }: { onClose: () => void }) {
  const s = useStore();
  const app = useApp();
  const me = s.me ?? { handle: 'you', name: 'You', bio: '', joined: new Date().toISOString().slice(0, 10) };

  const [handle, setHandle] = React.useState(me.handle);
  const [name, setName] = React.useState(me.name);
  const [bio, setBio] = React.useState(me.bio ?? '');
  const [location, setLocation] = React.useState(me.location ?? '');
  const [site, setSite] = React.useState(me.site ?? '');
  const [avatar, setAvatar] = React.useState(me.avatar);
  const [cover, setCover] = React.useState(me.cover ?? COVERS[0]);
  const [traits, setTraits] = React.useState<string[]>(me.traits ?? s.interests ?? []);
  const [drag, setDrag] = React.useState<'avatar' | 'cover' | null>(null);

  const handleOk = /^[a-z0-9_.-]{2,20}$/.test(handle);
  const dirty =
    handle !== me.handle ||
    name !== me.name ||
    bio !== (me.bio ?? '') ||
    location !== (me.location ?? '') ||
    site !== (me.site ?? '') ||
    avatar !== me.avatar ||
    cover !== me.cover ||
    traits.join() !== (me.traits ?? []).join();

  const save = () => {
    if (!handleOk) {
      app.toast('Handle: 2–20 characters, a–z 0–9 . _ -', 'cool');
      return;
    }
    s.updateMe({ handle, name: name || handle, bio, location: location || undefined, site: site || undefined, avatar, cover, traits });
    useStore.setState({ interests: traits });
    app.toast('Profile updated', 'heat');
    onClose();
  };

  const readFile = (file: File, kind: 'avatar' | 'cover') => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const w = kind === 'avatar' ? 512 : 1280;
      const h = kind === 'avatar' ? 512 : 420;
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d');
      if (ctx) {
        const sr = img.width / img.height;
        const dr = w / h;
        let dw = w;
        let dh = h;
        let dx = 0;
        let dy = 0;
        if (sr > dr) {
          dw = h * sr;
          dx = -(dw - w) / 2;
        } else {
          dh = w / sr;
          dy = -(dh - h) / 2;
        }
        ctx.drawImage(img, dx, dy, dw, dh);
        const out = c.toDataURL('image/jpeg', kind === 'avatar' ? 0.82 : 0.74);
        if (kind === 'avatar') setAvatar(out);
        else setCover(out);
      }
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      app.toast('That image could not be read', 'cool');
    };
    img.src = url;
  };

  const drop = (kind: 'avatar' | 'cover') => (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(null);
    const f = e.dataTransfer.files?.[0];
    if (f) readFile(f, kind);
  };

  return (
    <Modal open onClose={onClose} label="Edit profile">
      <div className="flex max-h-[min(88dvh,820px)] flex-col">
        <header className="flex items-center gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0 flex-1">
            <span className="ht-eyebrow ht-eyebrow--plain">identity</span>
            <h2 className="ht-title text-[17px] text-ink">Edit your profile</h2>
          </div>
          <button onClick={onClose} className="ht-icon-btn !h-8 !w-8" aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        <div className="ht-no-scrollbar flex-1 overflow-y-auto">
          {/* cover with animated transition */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDrag('cover');
            }}
            onDragLeave={() => setDrag(null)}
            onDrop={drop('cover')}
            className="relative h-[150px] overflow-hidden bg-black/40"
            style={{ outline: drag === 'cover' ? '2px dashed var(--champ)' : 'none', outlineOffset: -6 }}
          >
            <AnimatePresence mode="wait">
              <motion.img
                key={cover}
                src={cover}
                alt=""
                initial={{ opacity: 0, scale: 1.08, filter: 'blur(8px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="h-full w-full object-cover"
              />
            </AnimatePresence>
            <span aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(0,0,0,.15),rgba(0,0,0,.9))' }} />
            <div className="absolute inset-x-4 bottom-3 z-10 flex flex-wrap items-center gap-2">
              {COVERS.slice(0, 4).map((c) => (
                <button
                  key={c}
                  onClick={() => setCover(c)}
                  className={cls('h-9 w-12 overflow-hidden rounded-[8px] border transition-all', cover === c ? 'border-[var(--champ)] ring-2 ring-amber-400/40 scale-105' : 'border-line-2 hover:border-line-3')}
                  aria-label="Use this cover"
                >
                  <img src={c} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
              <label className="ht-btn ht-btn--glass !h-8 !cursor-pointer !px-3 !text-[11.5px]">
                Upload
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0], 'cover')} />
              </label>
              <button onClick={() => setCover(coverDataUri(handle + Date.now()))} className="ht-btn ht-btn--glass !h-8 !px-3 !text-[11.5px]">
                Generate
              </button>
            </div>
          </div>

          <div className="space-y-4 p-5">
            <div className="flex items-start gap-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDrag('avatar');
                }}
                onDragLeave={() => setDrag(null)}
                onDrop={drop('avatar')}
                className="relative shrink-0"
                style={{ outline: drag === 'avatar' ? '2px dashed var(--champ)' : 'none', outlineOffset: 4, borderRadius: 999 }}
              >
                <div className="relative h-[76px] w-[76px] overflow-hidden rounded-full border border-line bg-surface shadow-xl">
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={avatar ?? handle}
                      src={avatar ?? avatarDataUri(name || 'you', handle)}
                      alt=""
                      initial={{ scale: 0.72, rotate: -20, opacity: 0, filter: 'brightness(1.5)' }}
                      animate={{ scale: 1, rotate: 0, opacity: 1, filter: 'brightness(1)' }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 360, damping: 22 }}
                      className="h-full w-full rounded-full object-cover"
                    />
                  </AnimatePresence>
                </div>
                <label className="absolute inset-x-0 -bottom-1 z-10 mx-auto w-max cursor-pointer rounded-full border border-line-2 bg-elev px-2.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.1em] text-ink-2 hover:text-ink hover:border-[var(--acc-line)] shadow-md">
                  photo
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0], 'avatar')} />
                </label>
              </div>

              <div className="min-w-0 flex-1 space-y-3">
                <Field label="Display name">
                  <input value={name} maxLength={26} onChange={(e) => setName(e.target.value)} className="ht-input" />
                </Field>
                <Field label="Handle" hint={handleOk ? 'available' : 'invalid'} tone={handleOk ? 'ok' : 'bad'}>
                  <div className="flex items-center overflow-hidden rounded-[var(--r-md)] border border-line bg-white/[.025] focus-within:border-[var(--acc-line)]">
                    <span className="pl-3 text-[14px] font-semibold text-ember-300">@</span>
                    <input
                      value={handle}
                      onChange={(e) => setHandle(e.target.value.replace(/[^a-zA-Z0-9_.-]/g, '').toLowerCase())}
                      className="ht-input !border-0 !bg-transparent focus:!border-0 focus:!bg-transparent"
                    />
                  </div>
                </Field>
              </div>
            </div>

            <Field label="Bio" hint={`${bio.length}/160`}>
              <textarea
                value={bio}
                maxLength={160}
                rows={3}
                onChange={(e) => setBio(e.target.value)}
                className="ht-input !h-auto resize-none py-2.5"
                placeholder="One line. Verbs beat adjectives."
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Location">
                <input value={location} maxLength={30} onChange={(e) => setLocation(e.target.value)} className="ht-input" placeholder="Pune · GMT+5:30" />
              </Field>
              <Field label="Site">
                <input value={site} maxLength={44} onChange={(e) => setSite(e.target.value)} className="ht-input" placeholder="you.dev" />
              </Field>
            </div>

            <Field label="Topics" hint={`${traits.length} chosen — they tune what the board shows you`}>
              <div className="flex flex-wrap gap-1.5">
                {TAGS.map((t) => {
                  const on = traits.includes(t);
                  return (
                    <button
                      key={t}
                      onClick={() => setTraits((p) => (on ? p.filter((x) => x !== t) : [...p, t]))}
                      aria-pressed={on}
                      className={cls('ht-chip', on && 'ht-chip--heat')}
                    >
                      #{t}
                    </button>
                  );
                })}
              </div>
            </Field>
          </div>
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-line px-5 py-3.5">
          <span className="text-[11.5px] text-ink-4">{dirty ? 'Unsaved changes' : 'Stored locally · nothing leaves this device'}</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="ht-btn ht-btn--ghost">
              Cancel
            </button>
            <button onClick={save} disabled={!dirty} className="ht-btn ht-btn--heat">
              Save profile
            </button>
          </div>
        </footer>
      </div>
    </Modal>
  );
}

function Field({
  label,
  hint,
  tone,
  children,
}: {
  label: string;
  hint?: string;
  tone?: 'ok' | 'bad';
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between">
        <span className="ht-label">{label}</span>
        {hint && (
          <span className={cls('text-[11px] font-semibold', tone === 'bad' ? 'text-neg' : tone === 'ok' ? 'text-pos' : 'text-ink-4')}>{hint}</span>
        )}
      </span>
      {children}
    </label>
  );
}

export { motion };
