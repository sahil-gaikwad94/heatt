'use client';
/* ============================================================================
   heatt client store — one zustand slice persisted to localStorage.

   Owns: identity, the heat ledger, keeps, replies, what you wrote, prefs.
   That is the whole state surface. No reputation, no streaks, no counters
   that describe you.
   ==========================================================================*/

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ChatMessage, Conversation, HeatEvent, HeatLevel, Prefs, Spark, User } from './types';
import { SEED_CONVERSATIONS, SEED_MESSAGES } from './seed/chat';
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

  /* chatting / DM */
  conversations: Conversation[];
  chatMessages: Record<string, ChatMessage[]>;
  sendMessage: (
    conversationId: string,
    text: string,
    extra?: {
      quote?: { id: string; senderHandle: string; text: string };
      mediaUrl?: string;
      voiceNote?: { durationSec: number; waveform?: number[] };
      sticker?: { postId: string; title: string; author: string; cover?: string; heat?: number };
    }
  ) => ChatMessage;
  reactToMessage: (conversationId: string, messageId: string, emoji: string) => void;
  heatMessage: (conversationId: string, messageId: string) => void;
  markConversationRead: (conversationId: string) => void;
  getOrCreateConversation: (handle: string, name?: string, avatar?: string) => Conversation;
  deleteConversation: (conversationId: string) => void;

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
  /** your own writing can be taken back — restore puts the exact piece back */
  removeReply: (id: string) => Reply | undefined;
  restoreReply: (r: Reply) => void;
  removeSpark: (id: string) => Spark | undefined;
  restoreSpark: (s: Spark) => void;
  removeArticle: (id: string) => LocalArticle | undefined;
  restoreArticle: (a: LocalArticle) => void;
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

      conversations: SEED_CONVERSATIONS,
      chatMessages: SEED_MESSAGES,

      sendMessage: (conversationId, text, extra) => {
        const store = get();
        const me = store.me ?? { handle: 'you', name: 'You' };
        const msgId = uid('msg');
        const newMsg: ChatMessage = {
          id: msgId,
          conversationId,
          senderHandle: me.handle,
          senderName: me.name || me.handle,
          text: text.trim(),
          at: Date.now(),
          status: 'sent',
          heatReactions: 0,
          quote: extra?.quote,
          mediaUrl: extra?.mediaUrl,
          voiceNote: extra?.voiceNote,
          sticker: extra?.sticker,
        };

        const currentMsgs = store.chatMessages[conversationId] || [];
        const updatedMsgs = [...currentMsgs, newMsg];

        const updatedConvs = store.conversations.map((c) => {
          if (c.id === conversationId) {
            return {
              ...c,
              lastMessage: text.trim() || (extra?.voiceNote ? 'Voice note' : 'Story sticker'),
              lastMessageAt: Date.now(),
            };
          }
          return c;
        });

        set({
          chatMessages: { ...store.chatMessages, [conversationId]: updatedMsgs },
          conversations: updatedConvs,
        });

        return newMsg;
      },

      reactToMessage: (conversationId, messageId, emoji) => {
        const store = get();
        const msgs = store.chatMessages[conversationId] || [];
        const next = msgs.map((m) => {
          if (m.id === messageId) {
            const rx = { ...(m.reactions || {}) };
            rx[emoji] = (rx[emoji] || 0) + 1;
            return { ...m, reactions: rx };
          }
          return m;
        });
        set({ chatMessages: { ...store.chatMessages, [conversationId]: next } });
      },

      heatMessage: (conversationId, messageId) => {
        const store = get();
        const msgs = store.chatMessages[conversationId] || [];
        const next = msgs.map((m) => {
          if (m.id === messageId) {
            return { ...m, heatReactions: (m.heatReactions || 0) + 1 };
          }
          return m;
        });
        set({ chatMessages: { ...store.chatMessages, [conversationId]: next } });
      },

      markConversationRead: (conversationId) => {
        const store = get();
        const convs = store.conversations.map((c) =>
          c.id === conversationId ? { ...c, unreadCount: 0 } : c
        );
        const msgs = (store.chatMessages[conversationId] || []).map((m) =>
          m.status !== 'read' ? { ...m, status: 'read' as const } : m
        );
        set({
          conversations: convs,
          chatMessages: { ...store.chatMessages, [conversationId]: msgs },
        });
      },

      getOrCreateConversation: (handle, name, avatar) => {
        const cleanHandle = handle.replace(/^@/, '').toLowerCase();
        const store = get();
        const found = store.conversations.find((c) => c.participantHandle.toLowerCase() === cleanHandle);
        if (found) return found;

        const newConv: Conversation = {
          id: `conv-${cleanHandle}`,
          participantHandle: cleanHandle,
          participantName: name || cleanHandle,
          participantAvatar: avatar,
          lastMessage: 'Conversation opened',
          lastMessageAt: Date.now(),
          unreadCount: 0,
          isOnline: true,
        };

        set({
          conversations: [newConv, ...store.conversations],
          chatMessages: { ...store.chatMessages, [newConv.id]: store.chatMessages[newConv.id] || [] },
        });

        return newConv;
      },

      deleteConversation: (conversationId) => {
        const store = get();
        const convs = store.conversations.filter((c) => c.id !== conversationId);
        const msgs = { ...store.chatMessages };
        delete msgs[conversationId];
        set({ conversations: convs, chatMessages: msgs });
      },

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

      removeReply: (id) => {
        const reply = get().replies.find((r) => r.id === id);
        if (reply) set({ replies: get().replies.filter((r) => r.id !== id) });
        return reply;
      },
      restoreReply: (r) =>
        set({ replies: [...get().replies, r].sort((a, b) => a.at - b.at) }),

      removeSpark: (id) => {
        const spark = get().mySparks.find((x) => x.id === id);
        if (spark) {
          set({ mySparks: get().mySparks.filter((x) => x.id !== id) });
          /* a piece that is gone should not leave heat or a reading position behind */
          const { heat, saved, reads } = get();
          const nHeat = { ...heat };
          const nSaved = { ...saved };
          const nReads = { ...reads };
          delete nHeat[id];
          delete nSaved[id];
          delete nReads[id];
          set({ heat: nHeat, saved: nSaved, reads: nReads });
        }
        return spark;
      },
      restoreSpark: (spark) => set({ mySparks: [spark, ...get().mySparks] }),

      removeArticle: (id) => {
        const art = get().myArticles.find((x) => x.id === id);
        if (art) {
          set({ myArticles: get().myArticles.filter((x) => x.id !== id) });
          const { heat, saved, reads } = get();
          const nHeat = { ...heat };
          const nSaved = { ...saved };
          const nReads = { ...reads };
          delete nHeat[id];
          delete nSaved[id];
          delete nReads[id];
          set({ heat: nHeat, saved: nSaved, reads: nReads });
        }
        return art;
      },
      restoreArticle: (art) => set({ myArticles: [art, ...get().myArticles] }),

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
        conversations: s.conversations,
        chatMessages: s.chatMessages,
      }),
    }
  )
);

export function heatLevelOf(s: State, id: string): HeatLevel {
  return s.heat[id]?.level ?? 0;
}

/* -------------------------------------------------------------------------- */
/* Two tabs of heatt in the same browser are the same person. When one of them
   writes, the others rehydrate — otherwise a keep made in one tab is invisible
   in the one you are actually reading.                                                 */
const STORE_KEY = 'heatt-store-v2';

if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('storage', (e) => {
    if (e.key !== null && e.key !== STORE_KEY) return;
    void useStore.persist.rehydrate();
  });
}
