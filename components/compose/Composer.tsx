'use client';
/* ============================================================================
   components/compose/Composer — write a note, or a story.

   One sheet, two modes. A note is a paragraph. A story is a title, a
   standfirst and a markdown body with a live preview of how it will read.
   Publishing mints your identity the first time — never during onboarding.

   Nothing you type is thrown away by accident:
     · every keystroke is kept in a local draft, and restored next time
     · ⌘/Ctrl + ↵ publishes
     · closing with unsaved work asks before discarding
   ==========================================================================*/

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '@/lib/app';
import { useStore } from '@/lib/store';
import { Modal } from '@/components/ui/primitives';
import { Markdown, parseMarkdown, type ParsedDoc } from '@/lib/markdown';
import { cls, coverDataUri, leadSentence, plain, timeAgo } from '@/lib/util';
import { EASE_OUT } from '@/lib/motion';

type Mode = 'note' | 'story';

type Draft = {
  mode: Mode;
  body: string;
  title: string;
  dek: string;
  tags: string;
  cover?: string;
  at: number;
};

/* Six artworks and three generated fields. A published story should look
   deliberate in the grid, and this is the whole choice: no upload, nothing
   to crop, no broken image if the file moves. */
const COVERS = ['/art/obsidian-atelier.jpg', '/art/signal-grid.jpg', '/art/story-canvas.jpg', '/art/graphite-lattice.jpg'];
const COVER_LABELS = ['Obsidian Atelier', 'Signal Grid', 'Story Canvas', 'Graphite Lattice'];

const DRAFT_KEY = 'heatt-draft-v1';

function readDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Draft;
    if (!d || typeof d.body !== 'string') return null;
    if (!d.body.trim() && !d.title?.trim()) return null;
    return d;
  } catch {
    return null;
  }
}

function writeDraft(d: Draft | null) {
  try {
    if (d) localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    else localStorage.removeItem(DRAFT_KEY);
  } catch {/* storage can be full or blocked — writing still works */}
}

export function Composer() {
  const app = useApp();
  const s = useStore();
  const open = app.composerOpen;
  const [mode, setMode] = React.useState<Mode>('note');
  const [body, setBody] = React.useState('');
  const [title, setTitle] = React.useState('');
  const [dek, setDek] = React.useState('');
  const [tags, setTags] = React.useState('');
  const [cover, setCover] = React.useState<string | undefined>(undefined);
  const [preview, setPreview] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [restoredAt, setRestoredAt] = React.useState<number | null>(null);
  const [confirmDiscard, setConfirmDiscard] = React.useState(false);

  const words = body.trim() ? body.trim().split(/\s+/).length : 0;
  const minutes = Math.max(1, Math.round(words / 225));
  const dirty = !!(body.trim() || title.trim() || dek.trim() || tags.trim());

  /* ------------------------------------------------------------- open / seed */
  React.useEffect(() => {
    if (!open) return;
    const seed = app.composerSeed;
    const seeded =
      !!seed.quote || !!seed.article || seed.kind === 'spark' || seed.kind === 'forge';
    const draft = seeded ? null : readDraft();
    if (draft) {
      setMode(draft.mode === 'story' ? 'story' : 'note');
      setBody(draft.body ?? '');
      setTitle(draft.title ?? '');
      setDek(draft.dek ?? '');
      setTags(draft.tags ?? '');
      setCover(draft.cover);
      setRestoredAt(draft.at ?? null);
    } else {
      setMode(seed.kind === 'forge' ? 'story' : seed.kind === 'spark' ? 'note' : seed.article ? 'story' : 'note');
      setBody(seed.quote ?? seed.article?.markdown ?? '');
      setTitle(seed.article?.title ?? '');
      setDek(seed.article?.dek ?? '');
      setTags((seed.article?.tags ?? []).join(', '));
      setCover(seed.article?.cover);
      setRestoredAt(null);
    }
    setPreview(false);
    setConfirmDiscard(false);
    setBusy(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /* ------------------------------------------------------------ autosave */
  React.useEffect(() => {
    if (!open || !dirty) return;
    const id = window.setTimeout(
      () => writeDraft({ mode, body, title, dek, tags, cover, at: Date.now() }),
      400
    );
    return () => window.clearTimeout(id);
  }, [open, dirty, mode, body, title, dek, tags, cover]);

  const doc: ParsedDoc | null = React.useMemo(
    () => (preview && mode === 'story' ? parseMarkdown(body) : null),
    [preview, mode, body]
  );
  const valid = mode === 'note' ? body.trim().length > 0 : title.trim().length > 0 && body.trim().length > 0;

  /* ------------------------------------------------------------- publish */
  const publish = React.useCallback(() => {
    if (!valid) return;
    setBusy(true);
    const store = useStore.getState();
    store.ensureMe();
    const tagList = tags
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean)
      .slice(0, 5);
    if (mode === 'note') {
      store.addSpark({ author: store.me?.handle ?? 'you', text: body.trim(), tags: tagList, reactions: 0, comments: 0 });
      app.toast('Note published — it is the first card on Fresh', 'heat');
    } else {
      store.addArticle({
        title: title.trim(),
        dek: dek.trim() || leadSentence(body, 140),
        author: store.me?.handle ?? 'you',
        tags: tagList,
        cover,
        markdown: body.trim(),
      });
      app.toast('Story published — it is the first card on Fresh', 'heat');
    }
    writeDraft(null);
    setBusy(false);
    setConfirmDiscard(false);
    app.setComposer(false);
    /* a new piece has no heat yet, so put the reader where it is on top:
       the board, sorted newest first */
    app.setTab('all');
    app.setMode('fresh');
    app.push('/feed');
  }, [valid, tags, mode, body, title, dek, cover, app]);

  /* --------------------------------------------------------------- close */
  const close = React.useCallback(() => {
    if (dirty) {
      setConfirmDiscard(true);
      return;
    }
    app.setComposer(false);
  }, [dirty, app]);

  const discard = () => {
    writeDraft(null);
    setConfirmDiscard(false);
    setRestoredAt(null);
    app.setComposer(false);
  };

  /* ⌘/Ctrl + ↵ publishes from anywhere in the sheet */
  const onKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      if (valid) publish();
    }
  };

  const chars = body.length;

  return (
    <AnimatePresence>
      {open && (
        <Modal open={open} onClose={close} label="Write">
          <div className="flex max-h-[min(88dvh,820px)] flex-col" onKeyDown={onKeyDown}>
            <header className="flex items-center gap-3 border-b border-line px-5 py-4">
              <div className="ht-tabrail !p-1">
                {(['note', 'story'] as Mode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    aria-pressed={mode === m}
                    className={cls('ht-tab !px-3.5 !text-[12.5px]', mode === m && 'bg-white/[.08] text-ink')}
                  >
                    {m === 'note' ? 'Note' : 'Story'}
                  </button>
                ))}
              </div>
              <span className="flex-1" />
              {mode === 'story' && (
                <button onClick={() => setPreview((v) => !v)} className="ht-chip" aria-pressed={preview}>
                  {preview ? 'Editing' : 'Preview'}
                </button>
              )}
              <button onClick={close} className="ht-icon-btn !h-8 !w-8" aria-label="Close composer">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </header>

            {restoredAt && !confirmDiscard && (
              <div className="flex items-center gap-3 border-b border-line bg-white/[.015] px-5 py-2.5">
                <span className="ht-eyebrow ht-eyebrow--plain !text-[9.5px]">draft restored</span>
                <span className="text-[12px] text-ink-mute">
                  saved {timeAgo(new Date(restoredAt).toISOString())} ago on this device
                </span>
                <span className="flex-1" />
                <button
                  onClick={() => {
                    writeDraft(null);
                    setBody('');
                    setTitle('');
                    setDek('');
                    setTags('');
                    setCover(undefined);
                    setRestoredAt(null);
                  }}
                  className="ht-chip"
                >
                  Start fresh
                </button>
              </div>
            )}

            <div className="ht-no-scrollbar flex-1 overflow-y-auto px-5 py-4">
              {mode === 'story' && (
                <div className="space-y-3">
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value.slice(0, 120))}
                    placeholder="Title"
                    aria-label="Story title"
                    data-autofocus={!title ? '' : undefined}
                    className="ht-input !h-auto border-0 !bg-transparent px-0 font-display text-[clamp(1.3rem,1.1rem+1vw,1.9rem)] font-semibold tracking-[-0.04em] focus:!bg-transparent"
                  />
                  <input
                    value={dek}
                    onChange={(e) => setDek(e.target.value.slice(0, 220))}
                    placeholder="Standfirst — one line that earns the read"
                    aria-label="Story standfirst"
                    className="ht-input !h-auto border-0 !bg-transparent px-0 text-[14px] text-ink-2 focus:!bg-transparent"
                  />
                  <div className="ht-hairline" />
                  <div>
                    <span className="ht-label block !text-[9.5px] text-ink-4">cover</span>
                    <div className="ht-no-scrollbar mt-2 flex items-center gap-2 overflow-x-auto pb-1">
                      <button
                        onClick={() => setCover(undefined)}
                        aria-pressed={!cover}
                        className={cls('ht-coverpick', !cover && 'ht-coverpick--on')}
                        aria-label="No cover"
                      >
                        <span className="text-[10px] font-semibold tracking-tight text-ink-4">none</span>
                      </button>
                      <button
                        onClick={() => setCover(coverDataUri(title + Date.now()))}
                        aria-pressed={!!cover && cover.startsWith('data:')}
                        className={cls('ht-coverpick', !!cover && cover.startsWith('data:') && 'ht-coverpick--on')}
                        aria-label="Generated cover"
                      >
                        <span
                          className="block h-full w-full"
                          style={{ background: 'linear-gradient(135deg, #6BA2FF 0%, #1B2A45 46%, #E8D3A4 100%)' }}
                        />
                      </button>
                      {COVERS.map((c, i) => (
                        <button
                          key={c}
                          onClick={() => setCover(c)}
                          aria-pressed={cover === c}
                          className={cls('ht-coverpick', cover === c && 'ht-coverpick--on')}
                          aria-label={`Cover: ${COVER_LABELS[i]}`}
                          title={COVER_LABELS[i]}
                        >
                          <img src={c} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
                        </button>
                      ))}
                    </div>
                    <p className="mt-1.5 text-[11px] text-ink-4">
                      {cover
                        ? 'This artwork heads the card on the board and the reader.'
                        : 'A story without artwork still reads fine — it just sits lower on the board.'}
                    </p>
                  </div>
                </div>
              )}

              {!preview ? (
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={
                    mode === 'note'
                      ? 'What stayed with you…'
                      : 'Write the piece. Markdown works: ## headings, **bold**, > quotes, ```code```.'
                  }
                  aria-label={mode === 'note' ? 'Note body' : 'Story body'}
                  data-autofocus={mode === 'note' || title ? '' : undefined}
                  className="ht-input !h-auto min-h-[220px] w-full resize-none border-0 !bg-transparent px-0 text-[15px] leading-[1.68] focus:!bg-transparent"
                />
              ) : doc ? (
                <div className="ht-prose">
                  <Markdown doc={doc} />
                </div>
              ) : null}

              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="topics, comma separated (design, reading)"
                aria-label="Topics"
                className="ht-input mt-4 !h-10 !text-[13px]"
              />
            </div>

            {confirmDiscard ? (
              <div className="flex flex-wrap items-center gap-3 border-t border-line bg-white/[.015] px-5 py-3.5" role="alert">
                <span className="text-[13px] text-ink-2">Discard this draft? It is saved on this device until you do.</span>
                <span className="flex-1" />
                <button onClick={() => setConfirmDiscard(false)} className="ht-btn ht-btn--quiet !h-9">
                  Keep writing
                </button>
                <button onClick={discard} className="ht-btn ht-btn--heat !h-9 !bg-transparent !text-[var(--neg)] !shadow-none">
                  Discard
                </button>
              </div>
            ) : (
              <footer className="flex flex-wrap items-center gap-3 border-t border-line px-5 py-3.5">
                <span className="ht-num text-[11.5px] text-ink-4">
                  {words} words{mode === 'story' ? ` · ${minutes} min read` : ''}
                  {chars > 0 && <span className="ht-ink-4"> · {chars} characters</span>}
                </span>
                <span className="flex-1" />
                <span className="hidden text-[11.5px] text-ink-4 sm:block">
                  {s.me ? `publishing as @${s.me.handle}` : 'your identity is created on first publish'}
                </span>
                <span className="hidden items-center gap-1.5 text-[11px] text-ink-4 sm:flex">
                  <kbd className="ht-kbd">⌘</kbd>
                  <kbd className="ht-kbd">↵</kbd>
                </span>
                <button onClick={publish} disabled={!valid || busy} className="ht-btn ht-btn--heat">
                  {busy ? 'Publishing…' : mode === 'note' ? 'Publish note' : 'Publish story'}
                </button>
              </footer>
            )}
          </div>
        </Modal>
      )}
    </AnimatePresence>
  );
}

export { plain };
