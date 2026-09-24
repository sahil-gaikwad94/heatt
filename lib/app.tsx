'use client';
/* ============================================================================
   lib/app.tsx — the app-level context.

   Owns navigation, the live wire, ranking for the current view, the heat
   action, the share/compose overlays and toasts. One provider, no prop
   drilling: cards need heat state, the reader needs the post, the shell needs
   the nav, and any action can raise a toast.
   ==========================================================================*/

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useStore, type LocalArticle } from './store';
import { assemble, rank, type Post, type RankMode, type Tab } from './feed';
import { loadWire, type WireItem } from './syndicate';
import { getUser } from './seed/users';
import type { HeatLevel, User } from './types';

export type Toast = { id: number; text: string; tone?: 'heat' | 'cool' | 'plain'; icon?: React.ReactNode };

export type Ctx = {
  posts: Post[];
  wire: WireItem[];
  live: boolean;
  loading: boolean;
  refresh: (force?: boolean) => void;
  ranked: Post[];
  tab: Tab;
  setTab: (t: Tab) => void;
  mode: RankMode;
  setMode: (m: RankMode) => void;
  query: string;
  setQuery: (q: string) => void;

  openPost: (id: string) => void;

  ignite: (id: string) => void;
  igniting: Record<string, number>;
  setHeat: (id: string, level: HeatLevel, opts?: { title?: string; author?: string }) => void;

  toast: (text: string, tone?: Toast['tone'], icon?: React.ReactNode) => void;
  toasts: Toast[];
  dismissToast: (id: number) => void;

  composerOpen: boolean;
  setComposer: (open: boolean, seed?: { kind?: 'spark' | 'forge'; quote?: string; article?: Partial<LocalArticle> }) => void;
  composerSeed: { kind?: 'spark' | 'forge'; quote?: string; article?: Partial<LocalArticle> };

  shareId: string | null;
  setShare: (id: string | null) => void;

  paletteOpen: boolean;
  setPalette: (v: boolean) => void;

  threadId: string | null;
  setThread: (id: string | null) => void;

  go: (href: string) => void;
  push: (href: string) => void;

  heatOf: (id: string) => HeatLevel;
  countOf: (p: Post) => { reactions: number; comments: number };

  me: User | null;
  ensureMe: () => User;
  follows: string[];
  toggleFollow: (h: string) => void;

  prefs: ReturnType<typeof useStore.getState>['prefs'];
  setPrefs: (p: Partial<ReturnType<typeof useStore.getState>['prefs']>) => void;
  ready: boolean;
};

const AppCtx = React.createContext<Ctx | null>(null);
export const useApp = () => {
  const c = React.useContext(AppCtx);
  if (!c) throw new Error('useApp must be used inside <AppProvider>');
  return c;
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const s = useStore();
  const [wire, setWire] = React.useState<WireItem[]>([]);
  const [live, setLive] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [tab, setTab] = React.useState<Tab>('all');
  const [mode, setMode] = React.useState<RankMode>('for-you');
  const [query, setQuery] = React.useState('');
  const [igniting, setIgniting] = React.useState<Record<string, number>>({});
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const [composerOpen, setComposerOpen] = React.useState(false);
  const [composerSeed, setComposerSeed] = React.useState<Ctx['composerSeed']>({});
  const [shareId, setShareId] = React.useState<string | null>(null);
  const [paletteOpen, setPalette] = React.useState(false);
  const [threadId, setThread] = React.useState<string | null>(null);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => setReady(true), []);

  React.useEffect(() => {
    if (!s.booted) useStore.getState().setBooted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------------------------------------------------------- prefs → <html> */
  React.useEffect(() => {
    const el = document.documentElement;
    el.dataset.density = s.prefs.density;
    el.dataset.measure = s.prefs.measure;
    el.dataset.serif = String(s.prefs.serif);
    el.dataset.reduceMotion = String(s.prefs.reduceMotion);
    el.dataset.theme = s.prefs.theme;
    el.style.fontSize = s.prefs.density === 'cozy' ? '17px' : s.prefs.density === 'dense' ? '15px' : '16px';
  }, [s.prefs]);

  /* --------------------------------------------------------- syndication */
  const refresh = React.useCallback(async (force = false) => {
    setLoading(true);
    const res = await loadWire(force);
    setWire(res.items);
    setLive(res.live);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void refresh(false);
    const id = window.setInterval(() => void refresh(false), 5 * 60 * 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------------------------------------------------------------- toasts */
  const toast = React.useCallback((text: string, tone: Toast['tone'] = 'plain', icon?: React.ReactNode) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((t) => [...t.slice(-2), { id, text, tone, icon }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  }, []);
  const dismissToast = React.useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  /* ------------------------------------------------------------ ranking */
  const posts = React.useMemo(
    () => assemble(s as never, wire),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [wire, s.mySparks, s.myArticles, s.heat, s.saved, s.reads, s.shares, s.me, s.follows, s.muted]
  );

  const ranked = React.useMemo(() => rank(posts, s as never, { mode, tab, query: query || undefined }).items, [posts, mode, tab, query, s]);

  /* ---------------------------------------------------------- ignition */
  const igniteQueue = React.useRef<string[]>([]);
  const burning = React.useRef(0);

  const pumpIgnition = React.useCallback(() => {
    /* at most two burns at once — spectacular, never a hazard */
    while (burning.current < 2 && igniteQueue.current.length) {
      const id = igniteQueue.current.shift()!;
      burning.current += 1;
      setIgniting((m) => ({ ...m, [id]: Date.now() }));
      window.setTimeout(() => {
        burning.current -= 1;
        setIgniting((m) => {
          const n = { ...m };
          delete n[id];
          return n;
        });
        pumpIgnition();
      }, 2100);
    }
  }, []);

  const ignite = React.useCallback(
    (id: string) => {
      igniteQueue.current.unshift(id);
      pumpIgnition();
      try {
        if (navigator.vibrate && useStore.getState().prefs.haptics) navigator.vibrate([14, 22, 38]);
      } catch {
        /* unsupported */
      }
    },
    [pumpIgnition]
  );

  /* -------------------------------------------------------------- heat */
  const setHeat = React.useCallback(
    (id: string, level: HeatLevel, opts?: { title?: string; author?: string }) => {
      const store = useStore.getState();
      const prev = store.heat[id]?.level ?? 0;
      store.setHeat(id, level);
      if (level === 3 && prev < 3) {
        ignite(id);
        toast(opts?.title ? `Ignited · “${truncate(opts.title, 34)}”` : 'Ignited', 'heat');
      } else if (level === 2 && prev < 2) {
        toast('Blazing', 'heat');
      } else if (level === 1 && prev === 0) {
        toast('Heated', 'heat');
      } else if (level === 0 && prev > 0) {
        toast('Heat removed', 'cool');
      }
    },
    [ignite, toast]
  );

  /* --------------------------------------------------------- navigation */
  const go = React.useCallback((href: string) => router.push(href), [router]);
  const push = React.useCallback((href: string) => router.push(href), [router]);

  const openPost = React.useCallback(
    (id: string) => {
      const p = posts.find((x) => x.id === id);
      if (!p) return;
      if (p.kind === 'forge') router.push(`/read/${encodeURIComponent(id)}`);
      else setThread(id);
    },
    [posts, router]
  );

  const heatOf = React.useCallback((id: string) => s.heat[id]?.level ?? 0, [s.heat]);
  const countOf = React.useCallback(
    (p: Post) => ({
      reactions: p.reactions + (s.heat[p.id] && (s.heat[p.id].level ?? 0) > 0 ? 1 : 0),
      comments: p.comments + s.replies.filter((r) => r.postId === p.id).length,
    }),
    [s.heat, s.replies]
  );

  const ensureMe = React.useCallback((): User => useStore.getState().ensureMe(), []);

  const value: Ctx = {
    posts,
    wire,
    live,
    loading,
    refresh,
    ranked,
    tab,
    setTab,
    mode,
    setMode,
    query,
    setQuery,
    openPost,
    ignite,
    igniting,
    setHeat,
    toast,
    toasts,
    dismissToast,
    composerOpen,
    setComposer: (open, seed) => {
      setComposerSeed(seed ?? {});
      setComposerOpen(open);
    },
    composerSeed,
    shareId,
    setShare: setShareId,
    paletteOpen,
    setPalette,
    threadId,
    setThread,
    go,
    push,
    heatOf,
    countOf,
    me: s.me,
    ensureMe,
    follows: s.follows,
    toggleFollow: (h) => {
      s.toggleFollow(h);
      const now = useStore.getState().follows.includes(h);
      toast(now ? `Following @${h}` : `Unfollowed @${h}`, now ? 'heat' : 'cool');
    },
    prefs: s.prefs,
    setPrefs: s.setPrefs,
    ready,
  };

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

function truncate(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

export { getUser };
