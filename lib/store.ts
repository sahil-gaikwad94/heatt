'use client';
/* ============================================================================
   heatt client store — one zustand slice persisted to localStorage.

   Owns: identity, the heat ledger, keeps, replies, what you wrote, prefs.
   That is the whole state surface. No reputation, no streaks, no counters
   that describe you.
   ==========================================================================*/

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { HeatEvent, HeatLevel, Prefs, Spark, User } from './types';
import { uid } from './util';

export type LocalArticle = {
  id: string;
  kind: 'forge';
  title: string;
  dek: string;
  author: string;
  tags: string[];
  cover?: string;
  date: string;
  minutes: number;
  markdown: string;
  source?: { name: string; url: string };
};

export type Reply = {
  id: string;
  postId: string;
  author: string;
  text: string;
  at: number;
  heat: number;
  parent?: string;
};

type HeatKey = string;

export type State = {
  booted: boolean;
  introSeen: boolean;
  onboarded: boolean;
  me: User | null;
  prefs: Prefs;

  heat: Record<HeatKey, HeatEvent>;
  reads: Record<HeatKey, { pct: number; at: number; finished?: boolean }>;
  /** pieces you kept */
  saved: Record<HeatKey, number>;
  shares: Record<HeatKey, number>;
  /** poll answers: postId → option index. Tapping the same option again clears it. */
  votes: Record<HeatKey, number>;
  follows: string[];
  muted: string[];
  replies: Reply[];
  mySparks: Spark[];
  myArticles: LocalArticle[];
  interests: string[];
  wire: { at: number; items: unknown[] } | null;

  setBooted: (v: boolean) => void;
  setIntroSeen: () => void;
  /** mints the local identity — deliberately separate from onboarding */
  ensureMe: () => User;
  updateMe: (patch: Partial<User>) => void;
  setPrefs: (patch: Partial<Prefs>) => void;
  completeOnboarding: (interests: string[]) => void;
  setHeat: (id: HeatKey, level: HeatLevel) => void;
  setRead: (id: HeatKey, pct: number, minutes?: number) => void;
  toggleSave: (id: HeatKey) => void;
  addShare: (id: HeatKey) => void;
  castVote: (id: HeatKey, option: number) => void;
  toggleFollow: (handle: string) => void;
  toggleMute: (entry: string) => void;
  isMuted: (entry: string) => boolean;
  addReply: (r: Omit<Reply, 'id' | 'at' | 'heat'>) => void;
  addSpark: (s: Omit<Spark, 'id' | 'date' | 'kind'>) => Spark;
  addArticle: (a: Omit<LocalArticle, 'id' | 'date' | 'kind' | 'minutes'>) => LocalArticle;
  setWire: (items: unknown[]) => void;
  reset: () => void;
};

const DEFAULT_PREFS: Prefs = {
  density: 'normal',
  measure: 'normal',
  serif: true,
  reduceMotion: false,
  ambient: true,
  haptics: true,
  ignitionFx: 'full',
  theme: 'nocturne',
};

const today = () => new Date().toISOString().slice(0, 10);

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      booted: false,
      introSeen: false,
      onboarded: false,
      me: null,
      prefs: DEFAULT_PREFS,
      heat: {},
      reads: {},
      saved: {},
      shares: {},
      votes: {},
      follows: ['heatt'],
      muted: [],
      replies: [],
      mySparks: [],
      myArticles: [],
      interests: ['design', 'reading', 'craft'],
      wire: null,

      setBooted: (v) => set({ booted: v }),
      setIntroSeen: () => set({ introSeen: true }),

      ensureMe: () => {
        const existing = get().me;
        if (existing) return existing;
        const me: User = {
          handle: 'you',
          name: 'You',
          bio: 'Reading, keeping, and occasionally writing things down.',
          joined: today(),
          traits: get().interests.slice(0, 3),
        };
        set({ me });
        return me;
      },

      updateMe: (patch) => set({ me: { ...(get().me ?? ({ handle: 'you', name: 'You' } as User)), ...patch } }),

      setPrefs: (patch) => set({ prefs: { ...get().prefs, ...patch } }),

      /* Onboarding records what you are interested in and nothing else.
         No handle, no bio, no avatar, no profile — that is a separate,
         deliberate act from inside the app. */
      completeOnboarding: (interests) => set({ onboarded: true, interests }),

      setHeat: (id, level) => {
        if (level === 0) {
          const heat = { ...get().heat };
          delete heat[id];
          set({ heat });
          return;
        }
        set({ heat: { ...get().heat, [id]: { level, at: Date.now() } } });
      },

      setRead: (id, pct, minutes = 0) => {
        const clean = Math.max(0, Math.min(100, Math.round(Number.isFinite(pct) ? pct : 0)));
        const prev = get().reads[id];
        set({
          reads: {
            ...get().reads,
            [id]: {
              pct: Math.max(prev?.pct ?? 0, clean),
              at: Date.now(),
              finished: clean >= 97 || !!prev?.finished,
            },
          },
        });
        void minutes;
      },

      toggleSave: (id) => {
        const saved = { ...get().saved };
        if (saved[id]) delete saved[id];
        else saved[id] = Date.now();
        set({ saved });
      },

      addShare: (id) => set({ shares: { ...get().shares, [id]: (get().shares[id] ?? 0) + 1 } }),

      castVote: (id, option) => {
        const votes = { ...get().votes };
        if (votes[id] === option) delete votes[id];
        else votes[id] = option;
        set({ votes });
      },

      toggleFollow: (handle) => {
        const has = get().follows.includes(handle);
        set({ follows: has ? get().follows.filter((h) => h !== handle) : [...get().follows, handle] });
      },

      toggleMute: (entry) => {
        const has = get().muted.includes(entry);
        set({ muted: has ? get().muted.filter((m) => m !== entry) : [...get().muted, entry] });
      },
      isMuted: (entry) => get().muted.includes(entry),

      addReply: (r) => set({ replies: [...get().replies, { ...r, id: uid('re'), at: Date.now(), heat: 0 }] }),

      addSpark: (s) => {
        const spark: Spark = { ...s, id: uid('sp'), kind: 'spark', date: new Date().toISOString() };
        set({ mySparks: [spark, ...get().mySparks] });
        return spark;
      },

      addArticle: (a) => {
        const words = a.markdown.split(/\s+/).length;
        const art: LocalArticle = {
          ...a,
          id: uid('fg'),
          kind: 'forge',
          date: new Date().toISOString(),
          minutes: Math.max(1, Math.round(words / 225)),
        };
        set({ myArticles: [art, ...get().myArticles] });
        return art;
      },

      setWire: (items) => set({ wire: { at: Date.now(), items } }),

      reset: () =>
        set({
          booted: true,
          introSeen: true,
          onboarded: false,
          me: null,
          heat: {},
          reads: {},
          saved: {},
          shares: {},
          votes: {},
          replies: [],
          mySparks: [],
          myArticles: [],
          wire: null,
        }),
    }),
    {
      name: 'heatt-store-v2',
      storage: createJSONStorage(() => (typeof window === 'undefined' ? (undefined as never) : localStorage)),
      partialize: (s) => ({
        booted: s.booted,
        introSeen: s.introSeen,
        onboarded: s.onboarded,
        me: s.me,
        prefs: s.prefs,
        heat: s.heat,
        reads: s.reads,
        saved: s.saved,
        shares: s.shares,
        follows: s.follows,
        muted: s.muted,
        replies: s.replies,
        mySparks: s.mySparks,
        myArticles: s.myArticles,
        interests: s.interests,
      }),
    }
  )
);

export function heatLevelOf(s: State, id: string): HeatLevel {
  return s.heat[id]?.level ?? 0;
}
