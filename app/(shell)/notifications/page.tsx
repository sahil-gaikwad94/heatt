'use client';
/* ============================================================================
   /notifications — the heat log. Every level-3 ignition you cause, every
   reply, every milestone, plus a generated "today's heat" digest card.
   ==========================================================================*/

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/lib/app';
import { useStore } from '@/lib/store';
import { TopBar } from '@/components/shell/Shell';
import { Avatar } from '@/components/ui/primitives';
import { getUser } from '@/lib/seed/users';
import { cls, timeAgo } from '@/lib/util';
import { dailyDigest } from '@/lib/feed';

const ICON: Record<string, { glyph: string; tone: string }> = {
  ignite: { glyph: '🔥', tone: 'linear-gradient(140deg,rgba(255,45,18,.3),rgba(255,181,49,.1))' },
  heat: { glyph: '▲', tone: 'linear-gradient(140deg,rgba(255,138,31,.2),transparent)' },
  follow: { glyph: '+', tone: 'linear-gradient(140deg,rgba(43,224,200,.16),transparent)' },
  reply: { glyph: '↩', tone: 'linear-gradient(140deg,rgba(255,255,255,.06),transparent)' },
  milestone: { glyph: '★', tone: 'linear-gradient(140deg,rgba(255,181,49,.22),transparent)' },
  digest: { glyph: '◷', tone: 'linear-gradient(140deg,rgba(91,75,255,.2),transparent)' },
};

export default function NotificationsPage() {
  const app = useApp();
  const s = useStore();
  const digest = React.useMemo(() => dailyDigest(app.posts, s as any), [app.posts, s]);
  const [seen, setSeen] = React.useState(false);

  React.useEffect(() => {
    if (s.notifications.length === 0) {
      const d = new Date();
      const t = (h: number) => new Date(d.getTime() - h * 3600_000).toISOString();
      const seed = [
        { type: 'ignite' as const, actor: 'amara', text: `@amara ignited your spark about reading progress — ${2} levels above your usual heat`, postId: 'sp-04', level: 3 as const },
        { type: 'heat' as const, actor: 'k-vasiliev', text: '@k-vasiliev heated “Heat Diffusion: ranking a feed like a cooling body” to blaze', postId: 'orig-heat-diffusion', level: 2 as const },
        { type: 'follow' as const, actor: 'sena', text: '@sena started following you — thermal mass 1.44, so their heat counts more', read: true },
        { type: 'milestone' as const, actor: 'heatt', text: 'Your reading crossed 3 forges finished this week. Heatmap row is now fully lit.', read: true },
      ];
      seed.forEach((n, i) => setTimeout(() => useStore.getState().notify({ ...n, read: false, at: t(i * 3) } as any), 300 + i * 260));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const list = s.notifications;

  return (
    <div className="mx-auto w-full max-w-[680px]">
      <TopBar
        title="Heat log"
        sub={list.length ? `${list.filter((n) => !n.read).length} new` : 'quiet'}
        right={
          list.length > 0 ? (
            <button onClick={() => (setSeen(true), app.markAll())} className="ht-btn ht-btn--ghost !text-[12px]">
              Mark read
            </button>
          ) : undefined
        }
      />

      {/* digest */}
      <section className="ht-panel mt-1 overflow-hidden p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="ht-label">today’s heat</span>
            <h2 className="ht-title mt-1 text-[20px]">
              The board is at <span className="ht-heat-text">{digest.totalHeat}°</span> total
            </h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-dim">
              {digest.items} items ranked · {digest.contested.length} contested right now · {digest.cooling.length} cooling off.
            </p>
          </div>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[18px]" style={{ background: 'radial-gradient(circle at 40% 30%,rgba(255,181,49,.35),rgba(255,45,18,.14))', boxShadow: '0 0 30px -8px rgba(255,92,10,.8)' }}>
            ◷
          </span>
        </div>
        {digest.hottest && (
          <button onClick={() => app.openPost(digest.hottest!.id)} className="mt-3.5 flex w-full items-center gap-3 rounded-[14px] border border-ember-500/25 bg-ember-500/[.05] p-3 text-left transition-all hover:border-ember-500/50">
            <span className="ht-num shrink-0 text-[11px] font-black uppercase tracking-[0.14em] text-ember-300">hottest</span>
            <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-ink">{digest.hottest.title}</span>
            <span className="ht-num shrink-0 text-[13px] font-black text-ember-200">{digest.hottest.temp}°</span>
          </button>
        )}
      </section>

      <div className="mt-4 space-y-2 pb-8">
        <AnimatePresence initial={false}>
          {list.map((n, i) => {
            const u = getUser(n.actor);
            const meta = ICON[n.type] ?? ICON.heat;
            return (
              <motion.div
                key={n.id}
                layout
                initial={{ opacity: 0, x: -14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(0.3, i * 0.05), duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className={cls('ht-card flex items-start gap-3 p-3.5', !n.read && '!border-ember-500/30')}
                style={{ background: `linear-gradient(90deg, ${meta.tone}, transparent 40%), linear-gradient(180deg, rgba(24,24,28,.86), rgba(12,12,15,.94))` }}
              >
                <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-black/40 text-[15px]">
                  {meta.glyph === '🔥' ? (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--ht-flare)" strokeWidth="1.8">
                      <path d="M12 3c1 2.6.2 3.9-1 5.2C9.7 9.6 8.2 10.8 8.2 13.4A4.4 4.4 0 0 0 16.4 18c.1-2.2-1.3-3.6-1.8-5.6 2 1.9 3.2 4 3.2 6.4A5.8 5.8 0 1 1 6.2 11C6.2 6.9 9.6 4.4 12 3Z" />
                    </svg>
                  ) : (
                    meta.glyph
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] leading-relaxed text-ink-dim">
                    <b className="text-ink">{u.name}</b> {n.text.replace(`@${n.actor}`, '').trim()}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2 text-[11.5px] text-ink-mute">
                    <span>{timeAgo(n.at)}</span>
                    {n.postId && (
                      <button onClick={() => app.openPost(n.postId!)} className="font-bold text-ember-300 hover:underline">
                        view post →
                      </button>
                    )}
                    {!n.read && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-cryo-teal shadow-[0_0_8px_#2BE0C8]" />}
                  </div>
                </div>
                <Avatar name={u.name} handle={u.handle} src={u.avatar} size={30} />
              </motion.div>
            );
          })}
        </AnimatePresence>

        {list.length === 0 && (
          <div className="ht-panel p-10 text-center">
            <h3 className="ht-title text-[19px]">No heat on you yet</h3>
            <p className="mt-2 text-[13.5px] text-ink-dim">Publish a spark or a forge — ignitions, replies and milestones land here.</p>
            <button onClick={() => app.setComposer(true)} className="ht-btn ht-btn--heat mt-4">
              Write something
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
