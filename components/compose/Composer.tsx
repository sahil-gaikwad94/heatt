'use client';
/* ============================================================================
   components/compose/Composer — write a note, or a story.

   One sheet, two modes. A note is a paragraph. A story is a title, a
   standfirst and a markdown body with a live preview of how it will read.
   Publishing mints your identity the first time — never during onboarding.
   ==========================================================================*/

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '@/lib/app';
import { useStore } from '@/lib/store';
import { Modal } from '@/components/ui/primitives';
import { Markdown, parseMarkdown, type ParsedDoc } from '@/lib/markdown';
import { cls, leadSentence, plain } from '@/lib/util';
import { EASE_OUT } from '@/lib/motion';

type Mode = 'note' | 'story';

export function Composer() {
  const app = useApp();
  const s = useStore();
  const open = app.composerOpen;
  const [mode, setMode] = React.useState<Mode>('note');
  const [body, setBody] = React.useState('');
  const [title, setTitle] = React.useState('');
  const [dek, setDek] = React.useState('');
  const [tags, setTags] = React.useState('');
  const [preview, setPreview] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    const seed = app.composerSeed;
    setMode(seed.kind === 'forge' ? 'story' : seed.kind === 'spark' ? 'note' : seed.article ? 'story' : 'note');
    setBody(seed.quote ?? seed.article?.markdown ?? '');
    setTitle(seed.article?.title ?? '');
    setDek(seed.article?.dek ?? '');
    setTags((seed.article?.tags ?? []).join(', '));
    setPreview(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const close = () => app.setComposer(false);
  const words = body.trim() ? body.trim().split(/\s+/).length : 0;
  const minutes = Math.max(1, Math.round(words / 225));
  const doc: ParsedDoc | null = React.useMemo(
    () => (preview && mode === 'story' ? parseMarkdown(body) : null),
    [preview, mode, body]
  );
  const valid = mode === 'note' ? body.trim().length > 0 : title.trim().length > 0 && body.trim().length > 0;

  const publish = () => {
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
      app.toast('Note published to the board', 'heat');
    } else {
      store.addArticle({
        title: title.trim(),
        dek: dek.trim() || leadSentence(body, 140),
        author: store.me?.handle ?? 'you',
        tags: tagList,
        cover: undefined,
        markdown: body.trim(),
      });
      app.toast('Story published to your profile', 'heat');
    }
    setBusy(false);
    close();
  };

  return (
    <AnimatePresence>
      {open && (
        <Modal open={open} onClose={close} label="Write">
          <div className="flex max-h-[min(88dvh,820px)] flex-col">
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

            <div className="ht-no-scrollbar flex-1 overflow-y-auto px-5 py-4">
              {mode === 'story' && (
                <div className="space-y-3">
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value.slice(0, 120))}
                    placeholder="Title"
                    aria-label="Story title"
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

            <footer className="flex flex-wrap items-center gap-3 border-t border-line px-5 py-3.5">
              <span className="ht-num text-[11.5px] text-ink-4">
                {words} words{mode === 'story' ? ` · ${minutes} min read` : ''}
              </span>
              <span className="flex-1" />
              <span className="hidden text-[11.5px] text-ink-4 sm:block">
                {s.me ? `publishing as @${s.me.handle}` : 'your identity is created on first publish'}
              </span>
              <button onClick={publish} disabled={!valid || busy} className="ht-btn ht-btn--heat">
                {mode === 'note' ? 'Publish note' : 'Publish story'}
              </button>
            </footer>
          </div>
        </Modal>
      )}
    </AnimatePresence>
  );
}

export { plain };
