'use client';
/* ============================================================================
   components/onboarding/Onboarding — a five-beat cinematic setup sequence.

   Not a form in a modal. Each step is a full-bleed scene: the heat field
   surges on every transition, the copy reveals line by line, and the right
   column shows a *live* preview of the identity you are building, so the first
   thing a new user sees is their own profile already looking good.

   Everything writes into the persisted store; nothing is required to skip.
   ==========================================================================*/

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useStore } from '@/lib/store';
import { avatarDataUri, cls, coverDataUri, initialsOf } from '@/lib/util';

const HeatField = dynamic(() => import('@/components/gl/HeatField').then((m) => m.HeatField), { ssr: false });

const INTERESTS = [
  { tag: 'design', label: 'Design', heat: 1 },
  { tag: 'typography', label: 'Typography', heat: 0.7 },
  { tag: 'webgl', label: 'WebGL / shaders', heat: 0.9 },
  { tag: 'engineering', label: 'Engineering', heat: 1 },
  { tag: 'ai', label: 'AI & models', heat: 1 },
  { tag: 'frontend', label: 'Frontend', heat: 0.8 },
  { tag: 'reading', label: 'Long-form reading', heat: 0.6 },
  { tag: 'habits', label: 'Habits & focus', heat: 0.5 },
  { tag: 'postgres', label: 'Databases', heat: 0.8 },
  { tag: 'product', label: 'Product', heat: 0.7 },
  { tag: 'motion', label: 'Motion design', heat: 0.9 },
  { tag: 'career', label: 'Career', heat: 0.4 },
];

const COVERS = ['/art/hero-forge.jpg', '/art/molten-ui.jpg', '/art/graphite-lattice.jpg', '/art/cold-type.jpg', '/art/deep-read.jpg', '/art/ember-signal.jpg'];

const STEPS = [
  { key: 'identity', kicker: 'Beat 01', title: 'Choose the name people will heat', sub: 'Your handle is permanent-looking on purpose — it is the thing your heat history is attached to.' },
  { key: 'face', kicker: 'Beat 02', title: 'Give it a face and a skyline', sub: 'Avatar and cover. If you skip, we generate a molten one from your handle. It will still be yours.' },
  { key: 'voice', kicker: 'Beat 03', title: 'One line people read before they trust you', sub: '140 characters. Verbs beat adjectives.' },
  { key: 'fuel', kicker: 'Beat 04', title: 'Load the furnace with what you care about', sub: 'Tags become ranking weights — pick three or more and the For-You board changes immediately.' },
  { key: 'calibrate', kicker: 'Beat 05', title: 'How should your feed burn?', sub: 'Freshness versus depth. This is the only algorithmic setting you will ever need.' },
];

export function Onboarding({ onDone }: { onDone: () => void }) {
  const store = useStore();
  const [i, setI] = React.useState(0);
  const [surge, setSurge] = React.useState(0.2);
  const [dir, setDir] = React.useState(1);
  const [igniting, setIgniting] = React.useState(false);

  // form state
  const [handle, setHandle] = React.useState('');
  const [name, setName] = React.useState('');
  const [bio, setBio] = React.useState('');
  const [avatar, setAvatar] = React.useState<string | undefined>();
  const [cover, setCover] = React.useState<string>(COVERS[0]);
  const [picked, setPicked] = React.useState<string[]>(['design', 'engineering', 'reading']);
  const [dial, setDial] = React.useState(0.5); // 0 = fresh sparks, 1 = deep forges
  const [fx, setFx] = React.useState<'full' | 'subtle'>('full');
  const [location, setLocation] = React.useState('');

  const step = STEPS[i];
  const next = () => {
    setDir(1);
    setSurge(1);
    window.setTimeout(() => setSurge(0.2), 620);
    if (i < STEPS.length - 1) setI(i + 1);
    else commit();
  };
  const back = () => {
    if (i === 0) return;
    setDir(-1);
    setI(i - 1);
  };

  const commit = () => {
    setIgniting(true);
    const h = (handle || name || 'new-forger').toLowerCase().replace(/[^a-z0-9_.-]/g, '').replace(/^@/, '') || 'new-forger';
    const s = useStore.getState();
    s.completeOnboarding(
      {
        handle: h,
        name: name || h.replace(/[-_.]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        bio: bio || 'New voice on heatt. Reading first.',
        avatar,
        cover,
        location: location || undefined,
      },
      picked
    );
    // calibration: depth → default rank mode + interest weighting
    useStore.setState((st) => ({
      prefs: { ...st.prefs, ignitionFx: fx, ambient: true },
      interests: picked,
    }));
    // pre-warm today's activity so the heatmap starts lit
    useStore.getState().logActivity('reads');
    window.setTimeout(() => {
      setIgniting(false);
      onDone();
    }, 1500);
  };

  const displayName = name || (handle ? handle.replace(/[-_.]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Your name');
  const shownHandle = (handle || 'new-forger').replace(/^@/, '');

  const variants = {
    in: (d: number) => ({ opacity: 0, x: d * 46, filter: 'blur(14px)' }),
    vis: { opacity: 1, x: 0, filter: 'blur(0px)' },
    out: (d: number) => ({ opacity: 0, x: d * -46, filter: 'blur(14px)' }),
  };

  return (
    <div className="fixed inset-0 z-[190] overflow-hidden bg-[#07070a]">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <HeatField intensity={0.34 + surge * 0.5} surge={surge} flow={1.1} vignette={0.55} interactive={false} scale={0.55} cool={Math.max(0, 0.5 - dial)} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 90% at 50% 50%, transparent 30%, rgba(5,5,7,.78) 100%)' }} />
      </div>

      {/* ignition takeover on finish */}
      <AnimatePresence>
        {igniting && (
          <motion.div key="ignite" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-40 grid place-items-center bg-[#060607]">
            <div className="text-center">
              <motion.h2
                initial={{ scale: 0.8, opacity: 0, filter: 'blur(20px)' }}
                animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
                transition={{ duration: 0.9, ease: [0.16, 0.9, 0.2, 1] }}
                className="ht-title ht-heat-text text-[clamp(2.6rem,1.4rem+7vw,7rem)]"
              >
                Feed ignited
              </motion.h2>
              <p className="mt-3 text-[14px] text-ink-dim">
                {picked.length} interests weighted · {dial < 0.35 ? 'velocity-first' : dial > 0.7 ? 'depth-first' : 'balanced'} ranking · heat FX {fx}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 mx-auto flex h-full w-full max-w-[1180px] flex-col px-5 py-6 sm:px-8">
        {/* header */}
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="ht-title ht-heat-text text-[22px] leading-none">heatt</span>
            <span className="hidden h-4 w-px bg-white/10 sm:block" />
            <span className="ht-label hidden sm:block">onboarding</span>
          </div>
          <div className="flex flex-1 items-center gap-2 sm:max-w-[320px]">
            {STEPS.map((s, idx) => (
              <button
                key={s.key}
                onClick={() => setI(idx)}
                className="group relative h-[3px] flex-1 overflow-hidden rounded-full bg-white/[.08]"
                aria-label={`Go to ${s.key}`}
              >
                <motion.span
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    background: idx <= i ? 'linear-gradient(90deg,var(--ht-magma),var(--ht-flare))' : 'transparent',
                    width: idx < i ? '100%' : idx === i ? 'var(--w, 0%)' : '0%',
                    boxShadow: idx <= i ? '0 0 14px rgba(255,92,10,.8)' : undefined,
                  }}
                  animate={{ width: idx < i ? '100%' : idx === i ? ['0%', '100%'] : '0%' }}
                  transition={{ duration: idx === i ? 6 : 0.4, ease: 'linear' }}
                />
              </button>
            ))}
          </div>
          <button onClick={commit} className="ht-btn ht-btn--ghost !text-[12px]">
            Skip
          </button>
        </header>

        {/* body: scene + live preview */}
        <div className="grid min-h-0 flex-1 items-center gap-10 py-6 lg:grid-cols-[1.15fr_.85fr]">
          <div className="relative min-h-[340px]">
            <AnimatePresence mode="wait" custom={dir}>
              <motion.div
                key={step.key}
                custom={dir}
                variants={variants}
                initial="in"
                animate="vis"
                exit="out"
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              >
                <p className="ht-label mb-3 text-ember-300">{step.kicker}</p>
                <h1 className="ht-title text-[clamp(1.9rem,1.2rem+3.2vw,3.5rem)] text-ink" style={{ textWrap: 'balance' as any }}>
                  {splitWords(step.title).map((w, idx) => (
                    <motion.span
                      key={`${w}-${idx}`}
                      initial={{ opacity: 0, y: 18, filter: 'blur(8px)' }}
                      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                      transition={{ delay: 0.1 + idx * 0.055, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                      className="mr-[0.28em] inline-block"
                    >
                      {w}
                    </motion.span>
                  ))}
                </h1>
                <motion.p
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.42, duration: 0.7 }}
                  className="mt-4 max-w-[54ch] text-[15px] leading-relaxed text-ink-dim"
                >
                  {step.sub}
                </motion.p>

                <div className="mt-7">{renderStep()}</div>
              </motion.div>
            </AnimatePresence>
          </div>

          <LivePreview name={displayName} handle={shownHandle} avatar={avatar} cover={cover} bio={bio} interests={picked} />
        </div>

        {/* footer */}
        <footer className="flex items-center justify-between gap-4 pb-1">
          <button onClick={back} className="ht-btn ht-btn--ghost" disabled={i === 0} style={{ opacity: i === 0 ? 0.35 : 1 }}>
            ← Back
          </button>
          <div className="hidden items-center gap-2 text-[11px] text-ink-faint sm:flex">
            <kbd className="rounded border border-white/10 px-1.5 py-0.5 font-sans">↵</kbd> continue
            <span className="mx-1">·</span>
            <kbd className="rounded border border-white/10 px-1.5 py-0.5 font-sans">esc</kbd> skip
          </div>
          <button
            onClick={next}
            className="ht-btn ht-btn--heat"
            style={{ minWidth: 132, justifyContent: 'center' }}
            disabled={i === 0 && !handle && !name}
          >
            {i === STEPS.length - 1 ? 'Ignite feed' : 'Continue'} →
          </button>
        </footer>
      </div>

      <KeyNav onNext={next} onBack={back} onSkip={commit} />
      <style>{`
        input::placeholder { color: var(--ht-ink-faint); }
      `}</style>
    </div>
  );

  /* -------------------------------------------------------------- steps UI */

  function renderStep() {
    switch (step.key) {
      case 'identity':
        return (
          <div className="max-w-[520px] space-y-4">
            <Field label="Display name" hint={`${name.length}/24`}>
              <input
                autoFocus
                value={name}
                maxLength={24}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ada Kalu"
                className="ht-input !text-[17px]"
              />
            </Field>
            <Field label="Handle" hint="@ is implied">
              <div className="flex items-center overflow-hidden rounded-[14px] border border-white/[.09] bg-white/[.035] transition-colors focus-within:border-ember-500/55">
                <span className="pl-4 text-[17px] font-bold text-ember-400">@</span>
                <input
                  value={handle}
                  maxLength={20}
                  onChange={(e) => setHandle(e.target.value.replace(/[^a-zA-Z0-9_.-]/g, '').toLowerCase())}
                  placeholder="ada"
                  className="ht-input !border-0 !bg-transparent !text-[17px] focus:!shadow-none"
                />
                <span className="pr-4 text-[12px] text-ink-faint">heatt.app/u/{handle || 'ada'}</span>
              </div>
            </Field>
            <Field label="Where are you (optional)">
              <input value={location} maxLength={28} onChange={(e) => setLocation(e.target.value)} placeholder="Lagos · GMT+1" className="ht-input" />
            </Field>
          </div>
        );

      case 'face':
        return (
          <div className="max-w-[560px] space-y-5">
            <UploadRow label="Avatar" hint="PNG/JPG · 512² ideal" onFile={(d) => setAvatar(d)} onClear={() => setAvatar(undefined)} has={!!avatar}>
              <img src={avatar ?? avatarDataUri(displayName, shownHandle)} alt="" className="h-14 w-14 rounded-full object-cover" />
            </UploadRow>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="ht-label">Cover — pick a skyline</span>
                <button onClick={() => setCover(coverDataUri(shownHandle) as unknown as string)} className="ht-btn ht-btn--ghost !py-1 !text-[11px]">
                  Generate molten
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {COVERS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCover(c)}
                    className={cls('relative overflow-hidden rounded-[12px] border transition-all', cover === c ? 'border-ember-400 shadow-heat' : 'border-white/[.07] hover:border-white/20')}
                  >
                    <img src={c} alt="" className="h-14 w-full object-cover" />
                    {cover === c && <span className="absolute inset-0" style={{ background: 'linear-gradient(180deg,transparent,rgba(255,92,10,.32))' }} />}
                  </button>
                ))}
              </div>
              {cover.startsWith('data:') && (
                <div className="mt-2 h-14 rounded-[12px] border border-white/[.07]" style={{ backgroundImage: `url(${cover})`, backgroundSize: 'cover' }} />
              )}
            </div>
          </div>
        );

      case 'voice':
        return (
          <div className="max-w-[560px]">
            <Field label="Bio" hint={`${bio.length}/140`}>
              <textarea
                autoFocus
                value={bio}
                maxLength={140}
                rows={3}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Writes about interfaces that behave like materials."
                className="ht-input resize-none !text-[16px]"
              />
            </Field>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {['Designs interfaces that behave like materials.', 'Frontend, physics, and 4am refactors.', 'Reader first, writer second.', 'I make dark things glow.'].map((s) => (
                <button key={s} onClick={() => setBio(s)} className="ht-chip !normal-case !tracking-normal !text-[11px]">
                  “{s.slice(0, 34)}{s.length > 34 ? '…' : ''}”
                </button>
              ))}
            </div>
          </div>
        );

      case 'fuel':
        return (
          <div className="max-w-[600px]">
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map(({ tag, label }) => {
                const on = picked.includes(tag);
                return (
                  <motion.button
                    key={tag}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => setPicked((p) => (on ? p.filter((x) => x !== tag) : [...p, tag]))}
                    className="relative overflow-hidden rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-all"
                    style={{
                      borderColor: on ? 'rgba(255,138,31,.55)' : 'var(--ht-line)',
                      color: on ? 'var(--ht-whitehot)' : 'var(--ht-ink-dim)',
                      background: on ? 'linear-gradient(120deg,rgba(255,45,18,.28),rgba(255,181,49,.12))' : 'rgba(255,255,255,.03)',
                      boxShadow: on ? '0 10px 30px -12px rgba(255,92,10,.8)' : undefined,
                    }}
                  >
                    {on && <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-ember-400 align-middle shadow-[0_0_10px_rgba(255,92,10,1)]" />}
                    {label}
                  </motion.button>
                );
              })}
            </div>
            <p className="mt-4 text-[13px] text-ink-mute">
              {picked.length < 3 ? `Pick ${3 - picked.length} more to light the board` : `${picked.length} fuels loaded — each is a multiplier in your Heat Diffusion ranking`}
            </p>
          </div>
        );

      case 'calibrate':
        return (
          <div className="max-w-[560px] space-y-6">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="ht-label">Fresh sparks</span>
                <span className="ht-label">Deep forges</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(dial * 100)}
                onChange={(e) => setDial(Number(e.target.value) / 100)}
                className="ht-range"
                style={{ ['--v' as string]: `${dial * 100}%` }}
              />
              <p className="mt-3 text-[13.5px] leading-relaxed text-ink-dim">
                {dial < 0.3
                  ? 'Velocity-heavy: the board favours posts whose temperature is still rising, even if small.'
                  : dial > 0.7
                    ? 'Depth-heavy: read-through and saves outvote raw reactions, so long-form survives.'
                    : 'Balanced: heat, velocity and depth weighted evenly — the default for most readers.'}
              </p>
            </div>
            <div>
              <span className="ht-label mb-2 block">Ignition spectacle</span>
              <div className="flex gap-2">
                {(['full', 'subtle'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFx(f)}
                    className={cls('flex-1 rounded-[14px] border px-4 py-3 text-left transition-all', fx === f ? 'border-ember-500/60 bg-ember-500/[.08]' : 'border-white/[.07] hover:border-white/20')}
                  >
                    <span className="block text-[14px] font-bold text-ink">{f === 'full' ? 'Full burn' : 'Subtle'}</span>
                    <span className="block text-[12px] text-ink-mute">{f === 'full' ? 'flames, embers, shake, haptics' : 'border glow + soft bloom'}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  }
}

/* ------------------------------------------------------------------- bits */

function splitWords(s: string) {
  return s.split(' ');
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between">
        <span className="ht-label">{label}</span>
        {hint && <span className="ht-num text-[11px] text-ink-faint">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function UploadRow({
  label,
  hint,
  onFile,
  onClear,
  has,
  children,
}: {
  label: string;
  hint: string;
  onFile: (dataUrl: string) => void;
  onClear: () => void;
  has: boolean;
  children: React.ReactNode;
}) {
  const input = React.useRef<HTMLInputElement | null>(null);
  return (
    <div className="flex items-center gap-4">
      <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full border border-white/10">{children}</div>
      <div className="flex-1">
        <span className="ht-label">{label}</span>
        <p className="mt-1 text-[12px] text-ink-mute">{hint}</p>
      </div>
      <div className="flex gap-2">
        <button onClick={() => input.current?.click()} className="ht-btn !py-2 !text-[12px]">
          Upload
        </button>
        {has && (
          <button onClick={onClear} className="ht-btn ht-btn--ghost !py-2 !text-[12px]">
            Procedural
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const r = new FileReader();
          // downscale to 512² so localStorage never explodes
          const url = URL.createObjectURL(f);
          const img = new Image();
          img.onload = () => {
            const size = 512;
            const c = document.createElement('canvas');
            c.width = size;
            c.height = size;
            const ctx = c.getContext('2d');
            if (ctx) {
              const m = Math.min(img.width, img.height);
              ctx.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, size, size);
              onFile(c.toDataURL('image/jpeg', 0.86));
            }
            URL.revokeObjectURL(url);
          };
          img.src = url;
          r.readAsDataURL(f);
        }}
      />
    </div>
  );
}

function LivePreview({
  name,
  handle,
  avatar,
  cover,
  bio,
  interests,
}: {
  name: string;
  handle: string;
  avatar?: string;
  cover: string;
  bio: string;
  interests: string[];
}) {
  return (
    <motion.div layout className="relative">
      <div className="pointer-events-none absolute -inset-8 -z-10 blur-3xl" style={{ background: 'radial-gradient(60% 60% at 50% 50%, rgba(255,92,10,.22), transparent 70%)' }} />
      <div className="ht-panel overflow-hidden rounded-[24px]">
        <div className="relative h-[132px]">
          <img src={cover} alt="" className="h-full w-full object-cover" />
          <span className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(6,6,8,.15),rgba(6,6,8,.85))' }} />
          <span className="ht-label absolute left-4 top-3 !tracking-[0.28em] text-white/70">live preview</span>
        </div>
        <div className="relative -mt-9 px-5 pb-5">
          <div className="flex items-end justify-between">
            <div className="rounded-full p-[3px]" style={{ background: 'linear-gradient(140deg,rgba(255,181,49,.9),rgba(255,45,18,.75))', boxShadow: '0 10px 30px -8px rgba(255,92,10,.8)' }}>
              <img src={avatar ?? avatarDataUri(name, handle)} alt="" className="h-[62px] w-[62px] rounded-full bg-[#0b0b0d] object-cover" />
            </div>
            <button className="ht-btn ht-btn--heat !px-4 !py-1.5 !text-[12px]">Follow</button>
          </div>
          <h3 className="mt-3 text-[19px] font-bold tracking-tight text-ink">{name}</h3>
          <p className="text-[13px] text-ink-mute">
            @{handle}
            {interests.length > 0 && <span className="text-ink-faint"> · {initialsOf(name).toUpperCase()}</span>}
          </p>
          <p className="mt-2 line-clamp-2 text-[13.5px] leading-relaxed text-ink-dim">{bio || 'Your bio will appear here as you type it.'}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {interests.slice(0, 5).map((t) => (
              <span key={t} className="ht-chip !normal-case !text-[10.5px]">
                #{t}
              </span>
            ))}
            {interests.length === 0 && <span className="text-[12px] text-ink-faint">no interests yet</span>}
          </div>
          <div className="mt-4 flex items-center gap-5 border-t border-white/[.06] pt-3 text-[12.5px] text-ink-mute">
            <span>
              <b className="ht-num text-ink">0</b> forges
            </span>
            <span>
              <b className="ht-num text-ink">0</b> sparks
            </span>
            <span>
              <b className="ht-num text-ember-300">1.00</b> thermal mass
            </span>
          </div>
        </div>
      </div>
      <style>{`
        .ht-range{-webkit-appearance:none;appearance:none;width:100%;height:4px;border-radius:99px;
          background:linear-gradient(90deg,var(--ht-magma) var(--v,50%),rgba(255,255,255,.09) var(--v,50%));outline:none}
        .ht-range::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;border-radius:50%;
          background:radial-gradient(circle at 35% 30%,#fff6de,#ff8a1f 55%,#b92806);border:2px solid #0b0b0d;
          box-shadow:0 0 20px rgba(255,92,10,.9);cursor:grab}
        .ht-range::-moz-range-thumb{width:20px;height:20px;border-radius:50%;background:#ff8a1f;border:2px solid #0b0b0d}
      `}</style>
    </motion.div>
  );
}

function KeyNav({ onNext, onBack, onSkip }: { onNext: () => void; onBack: () => void; onSkip: () => void }) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName);
      if (e.key === 'Enter' && !e.shiftKey) {
        if (typing && (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
        e.preventDefault();
        onNext();
      }
      if (!typing && e.key === 'Escape') onSkip();
      if (!typing && e.key === 'ArrowLeft') onBack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onNext, onBack, onSkip]);
  return null;
}

