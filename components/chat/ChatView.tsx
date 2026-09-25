'use client';
/* ============================================================================
   components/chat/ChatView — Complete End-to-End Chatting / DM Experience.

   Real-world messaging architecture:
   - Conversations list with real-time online status and unread counters
   - Rich message bubbles with read receipts (✓✓), timestamps, and quotes
   - Heat reactions with fire particle bursts on any message
   - Interactive voice notes with dynamic waveform audio visualizer
   - Story Sticker media attachments with direct deep links
   - Realistic typing indicator and auto-reply assistant from @heatt
   ==========================================================================*/

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '@/lib/store';
import { useApp } from '@/lib/app';
import { avatarDataUri, cls, timeAgo } from '@/lib/util';
import { Avatar } from '@/components/ui/primitives';
import type { ChatMessage, Conversation } from '@/lib/types';
import { HOUSE, getUser } from '@/lib/seed/users';

const EMOJI_REACTIONS = ['🔥', '❤️', '⚡', '🚀', '👏', '💡'];

const SUGGESTED_CONTACTS = [
  HOUSE,
  getUser('wirewriter'),
  getUser('sarah_zen'),
  getUser('alex_noir'),
  getUser('elena_core'),
];

export function ChatView() {
  const s = useStore();
  const app = useApp();
  const searchParams = useSearchParams();
  const targetUserParam = searchParams.get('user');

  const conversations = s.conversations || [];
  const chatMessages = s.chatMessages || {};

  const [activeConvId, setActiveConvId] = React.useState<string>(
    conversations[0]?.id || 'conv-heatt'
  );
  const [searchQuery, setSearchQuery] = React.useState('');
  const [inputText, setInputText] = React.useState('');
  const [replyingTo, setReplyingTo] = React.useState<ChatMessage | null>(null);
  const [isTyping, setIsTyping] = React.useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = React.useState(false);
  const [voiceTimer, setVoiceTimer] = React.useState(0);
  const [newChatModalOpen, setNewChatModalOpen] = React.useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = React.useState<string | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = React.useState<string | null>(null);

  const messagesEndRef = React.useRef<HTMLDivElement | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  // Handle URL param: e.g. /messages?user=sarah_zen
  React.useEffect(() => {
    if (targetUserParam) {
      const conv = s.getOrCreateConversation(targetUserParam);
      setActiveConvId(conv.id);
    }
  }, [targetUserParam, s]);

  const activeConv = conversations.find((c) => c.id === activeConvId) || conversations[0];
  const messages = activeConv ? chatMessages[activeConv.id] || [] : [];

  // Scroll to bottom on message list change
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (activeConv) {
      s.markConversationRead(activeConv.id);
    }
  }, [activeConvId, messages.length]);

  // Voice recording timer simulation
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecordingVoice) {
      interval = setInterval(() => setVoiceTimer((prev) => prev + 1), 1000);
    } else {
      setVoiceTimer(0);
    }
    return () => clearInterval(interval);
  }, [isRecordingVoice]);

  // Filter conversations
  const filteredConvs = conversations.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.participantName.toLowerCase().includes(q) ||
      c.participantHandle.toLowerCase().includes(q) ||
      (c.lastMessage && c.lastMessage.toLowerCase().includes(q))
    );
  });

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || !activeConv) return;

    const textToSend = inputText.trim();
    setInputText('');

    const extra = replyingTo
      ? {
          quote: {
            id: replyingTo.id,
            senderHandle: replyingTo.senderHandle,
            text: replyingTo.text,
          },
        }
      : undefined;

    setReplyingTo(null);
    s.sendMessage(activeConv.id, textToSend, extra);

    // Simulate realistic intelligent response if chatting with an AI / bot handle
    if (activeConv.participantHandle === 'heatt' || activeConv.participantHandle === 'wirewriter') {
      setIsTyping(true);
      window.setTimeout(() => {
        setIsTyping(false);
        const botReplies = [
          'That aligns directly with the black room philosophy. Elevating signals through heat rather than noisy counters.',
          'Love this perspective! The media sticker is ready to be shared straight into stories.',
          'Checking the latest wire syndicate now. Great seeing your heat activity on the timeline!',
          'Totally agree. The new tri-color contrast gives the interface so much depth without sacrificing legibility.',
        ];
        const randomReply = botReplies[Math.floor(Math.random() * botReplies.length)];
        const botMsg: ChatMessage = {
          id: `msg-${Date.now()}`,
          conversationId: activeConv.id,
          senderHandle: activeConv.participantHandle,
          senderName: activeConv.participantName,
          text: randomReply,
          at: Date.now(),
          status: 'read',
          heatReactions: 1,
        };
        const current = s.chatMessages[activeConv.id] || [];
        useStore.setState({
          chatMessages: { ...s.chatMessages, [activeConv.id]: [...current, botMsg] },
          conversations: s.conversations.map((c) =>
            c.id === activeConv.id ? { ...c, lastMessage: randomReply, lastMessageAt: Date.now() } : c
          ),
        });
      }, 1600);
    }
  };

  const sendVoiceNote = () => {
    if (!activeConv) return;
    setIsRecordingVoice(false);
    const duration = Math.max(3, voiceTimer);
    s.sendMessage(activeConv.id, 'Voice message', {
      voiceNote: {
        durationSec: duration,
        waveform: Array.from({ length: 18 }, () => Math.floor(Math.random() * 70) + 20),
      },
    });
  };

  const sendStorySticker = () => {
    if (!activeConv) return;
    s.sendMessage(activeConv.id, 'Shared a story sticker', {
      sticker: {
        postId: 'orig-dark',
        title: 'Designing black: a light model for dark interfaces',
        author: 'heatt',
        cover: '/art/nocturne-ui.jpg',
        heat: 92,
      },
    });
  };

  return (
    <div className="mx-auto flex h-[calc(100dvh-130px)] min-h-[580px] max-w-[1100px] overflow-hidden rounded-[var(--r-xl)] border border-line bg-surface/80 shadow-2xl backdrop-blur-2xl">
      {/* =========================================================================
          LEFT SIDEBAR: Conversation list
          ========================================================================= */}
      <div
        className={cls(
          'flex flex-col border-r border-line bg-base/60 transition-all duration-300 md:w-[340px] md:flex',
          activeConvId ? 'hidden md:flex' : 'w-full flex-1'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
          <div className="flex items-center gap-2">
            <h2 className="ht-display text-[18px] font-semibold text-ink">Messages</h2>
            <span className="rounded-full bg-[var(--acc-soft)] px-2 py-0.5 text-[11px] font-bold text-[var(--acc)]">
              {conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0)} new
            </span>
          </div>

          <button
            onClick={() => setNewChatModalOpen(true)}
            className="ht-icon-btn !h-8 !w-8 text-[var(--acc)] hover:bg-[var(--acc-soft)]"
            aria-label="New conversation"
            title="Start new message"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-line/60 p-3">
          <div className="flex items-center gap-2 rounded-[var(--r-md)] border border-line bg-white/[0.03] px-3 py-1.5 focus-within:border-[var(--acc-line)]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink-4">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4.2-4.2" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations…"
              className="w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-4"
            />
          </div>
        </div>

        {/* Online contacts row */}
        <div className="ht-no-scrollbar flex items-center gap-3 overflow-x-auto border-b border-line/50 px-4 py-2.5">
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveConvId(c.id)}
              className="group relative flex flex-col items-center gap-1 shrink-0"
              title={`Chat with ${c.participantName}`}
            >
              <div className="relative">
                <Avatar name={c.participantName} handle={c.participantHandle} src={c.participantAvatar} size={38} />
                {c.isOnline && (
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-black bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                )}
              </div>
              <span className="w-12 truncate text-center text-[10px] text-ink-3 group-hover:text-ink">
                {c.participantName.split(' ')[0]}
              </span>
            </button>
          ))}
        </div>

        {/* List */}
        <div className="ht-no-scrollbar flex-1 overflow-y-auto divide-y divide-line/40">
          {filteredConvs.length === 0 ? (
            <div className="p-6 text-center text-[13px] text-ink-4">No conversations found.</div>
          ) : (
            filteredConvs.map((conv) => {
              const active = conv.id === activeConvId;
              return (
                <button
                  key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  className={cls(
                    'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
                    active ? 'bg-white/[0.08]' : 'hover:bg-white/[0.03]'
                  )}
                >
                  <div className="relative shrink-0">
                    <Avatar name={conv.participantName} handle={conv.participantHandle} src={conv.participantAvatar} size={42} />
                    {conv.isOnline && (
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-black bg-emerald-400" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="truncate text-[13.5px] font-semibold text-ink">
                        {conv.participantName}
                      </span>
                      <span className="shrink-0 text-[11px] text-ink-4">
                        {timeAgo(new Date(conv.lastMessageAt).toISOString())}
                      </span>
                    </div>

                    <p className="mt-0.5 truncate text-[12px] text-ink-mute">
                      {conv.lastMessage || 'No messages yet'}
                    </p>
                  </div>

                  {conv.unreadCount > 0 && (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--acc)] text-[10px] font-bold text-white shadow-sm">
                      {conv.unreadCount}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* =========================================================================
          RIGHT COLUMN: Active Chat Conversation
          ========================================================================= */}
      {activeConv ? (
        <div
          className={cls(
            'flex flex-1 flex-col bg-surface/40',
            !activeConvId ? 'hidden md:flex' : 'flex'
          )}
        >
          {/* Thread Header */}
          <div className="flex h-[58px] items-center justify-between border-b border-line px-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveConvId('')}
                className="ht-icon-btn !h-8 !w-8 md:hidden"
                aria-label="Back to conversations"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>

              <Link href={`/u/${activeConv.participantHandle}`} className="relative shrink-0">
                <Avatar name={activeConv.participantName} handle={activeConv.participantHandle} src={activeConv.participantAvatar} size={36} />
                {activeConv.isOnline && (
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-black bg-emerald-400" />
                )}
              </Link>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <Link href={`/u/${activeConv.participantHandle}`} className="truncate text-[14px] font-semibold text-ink hover:underline">
                    {activeConv.participantName}
                  </Link>
                  <span className="text-[12px] text-ink-4">@{activeConv.participantHandle}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-ink-mute">
                  {isTyping ? (
                    <span className="flex items-center gap-1 text-[var(--acc)]">
                      <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--acc)]" />
                      typing...
                    </span>
                  ) : activeConv.isOnline ? (
                    <span className="text-emerald-400">Active now</span>
                  ) : (
                    <span>Offline</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={sendStorySticker}
                className="ht-btn ht-btn--glass !h-8 !px-2.5 !text-[11.5px] text-[var(--acc)] hover:border-[var(--acc-line)]"
                title="Send a Story Sticker"
              >
                <span className="mr-1">🔥</span> Sticker
              </button>

              <button
                onClick={() => s.deleteConversation(activeConv.id)}
                className="ht-icon-btn !h-8 !w-8 text-ink-4 hover:text-[var(--neg)]"
                aria-label="Clear chat"
                title="Clear conversation"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="ht-no-scrollbar flex-1 overflow-y-auto p-4 space-y-3.5">
            <div className="py-2 text-center">
              <span className="rounded-full bg-white/[0.04] px-3 py-1 text-[11px] text-ink-4">
                Encrypted & persisted locally on this device
              </span>
            </div>

            {messages.map((msg) => {
              const isMine = msg.senderHandle === (s.me?.handle ?? 'you');
              return (
                <div
                  key={msg.id}
                  className={cls('group relative flex flex-col', isMine ? 'items-end' : 'items-start')}
                >
                  {/* Quoted message if any */}
                  {msg.quote && (
                    <div className="mb-1 max-w-[75%] rounded-t-lg border-l-2 border-[var(--acc)] bg-white/[0.04] px-3 py-1.5 text-[11px] text-ink-3">
                      <span className="font-semibold text-ink-2">@{msg.quote.senderHandle}:</span>{' '}
                      <span className="line-clamp-1">{msg.quote.text}</span>
                    </div>
                  )}

                  <div className="relative flex max-w-[82%] sm:max-w-[70%] items-end gap-1.5">
                    {/* Action buttons (hover) */}
                    <div
                      className={cls(
                        'opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1',
                        isMine ? 'order-first' : 'order-last'
                      )}
                    >
                      <button
                        onClick={() => s.heatMessage(activeConv.id, msg.id)}
                        className="ht-icon-btn !h-6 !w-6 text-[var(--acc)] hover:scale-125"
                        title="Add heat"
                      >
                        🔥
                      </button>
                      <button
                        onClick={() => setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id)}
                        className="ht-icon-btn !h-6 !w-6 text-ink-4 hover:text-ink"
                        title="React"
                      >
                        😊
                      </button>
                      <button
                        onClick={() => setReplyingTo(msg)}
                        className="ht-icon-btn !h-6 !w-6 text-ink-4 hover:text-ink"
                        title="Reply"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="9 17 4 12 9 7" />
                          <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
                        </svg>
                      </button>
                    </div>

                    {/* Emoji reaction picker popup */}
                    {showEmojiPicker === msg.id && (
                      <div className="absolute -top-9 z-20 flex items-center gap-1 rounded-full border border-line bg-elev/95 p-1 shadow-lg backdrop-blur-md">
                        {EMOJI_REACTIONS.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => {
                              s.reactToMessage(activeConv.id, msg.id, emoji);
                              setShowEmojiPicker(null);
                            }}
                            className="rounded-full px-1.5 py-0.5 text-[14px] hover:scale-125 transition-transform"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Bubble Content */}
                    <div
                      className={cls(
                        'relative overflow-hidden px-4 py-2.5 text-[13.5px] leading-relaxed shadow-sm transition-all',
                        isMine
                          ? 'rounded-2xl rounded-br-sm bg-gradient-to-r from-[var(--acc-deep)] to-[var(--acc)] text-white font-medium shadow-[0_4px_16px_rgba(255,51,102,0.25)]'
                          : 'rounded-2xl rounded-bl-sm border border-line bg-elev/80 text-ink shadow-[0_4px_12px_rgba(0,0,0,0.5)]'
                      )}
                    >
                      {/* Voice Note player */}
                      {msg.voiceNote ? (
                        <div className="flex items-center gap-3 py-1">
                          <button
                            onClick={() => setPlayingVoiceId(playingVoiceId === msg.id ? null : msg.id)}
                            className={cls(
                              'flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform hover:scale-105',
                              isMine ? 'bg-white text-[var(--acc)]' : 'bg-[var(--acc)] text-white'
                            )}
                          >
                            {playingVoiceId === msg.id ? (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <rect x="6" y="4" width="4" height="16" />
                                <rect x="14" y="4" width="4" height="16" />
                              </svg>
                            ) : (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <polygon points="5 3 19 12 5 21 5 3" />
                              </svg>
                            )}
                          </button>

                          <div className="flex items-center gap-0.5">
                            {(msg.voiceNote.waveform || [20, 40, 60, 80, 50, 90, 70, 30, 80, 60]).map((h, idx) => (
                              <span
                                key={idx}
                                className={cls(
                                  'w-1 rounded-full transition-all duration-200',
                                  playingVoiceId === msg.id ? 'animate-pulse' : '',
                                  isMine ? 'bg-white/70' : 'bg-[var(--acc)]'
                                )}
                                style={{ height: `${Math.max(6, (h / 100) * 24)}px` }}
                              />
                            ))}
                          </div>
                          <span className={cls('text-[11px] font-mono', isMine ? 'text-white/80' : 'text-ink-4')}>
                            0:{msg.voiceNote.durationSec < 10 ? `0${msg.voiceNote.durationSec}` : msg.voiceNote.durationSec}
                          </span>
                        </div>
                      ) : msg.sticker ? (
                        /* Story Sticker Attachment */
                        <div className="w-[240px] space-y-2 py-1">
                          <div className="relative aspect-video overflow-hidden rounded-xl border border-white/20">
                            <img src={msg.sticker.cover || '/art/nocturne-ui.jpg'} alt="" className="h-full w-full object-cover" />
                            <span className="absolute bottom-1 right-1 rounded-full bg-black/60 px-2 py-0.5 text-[9px] font-bold text-[var(--champ)]">
                              🔥 {msg.sticker.heat}°
                            </span>
                          </div>
                          <p className="line-clamp-1 font-semibold">{msg.sticker.title}</p>
                          <Link
                            href={`/read/${msg.sticker.postId}`}
                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-white/20 py-1.5 text-[11px] font-bold text-white hover:bg-white/30 backdrop-blur-md transition-colors"
                          >
                            <span>📎 heatt &gt;</span>
                          </Link>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                      )}

                      {/* Footer: Time & status */}
                      <div
                        className={cls(
                          'mt-1 flex items-center justify-end gap-1 text-[10px]',
                          isMine ? 'text-white/70' : 'text-ink-4'
                        )}
                      >
                        <span>{new Date(msg.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {isMine && (
                          <span className="text-[11px]">
                            {msg.status === 'read' ? '✓✓' : msg.status === 'delivered' ? '✓✓' : '✓'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Reaction Chips below bubble */}
                  {(msg.heatReactions > 0 || (msg.reactions && Object.keys(msg.reactions).length > 0)) && (
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      {msg.heatReactions > 0 && (
                        <button
                          onClick={() => s.heatMessage(activeConv.id, msg.id)}
                          className="flex items-center gap-1 rounded-full border border-[var(--acc-line)] bg-[var(--acc-soft)] px-2 py-0.5 text-[11px] text-[var(--acc)] font-bold shadow-sm"
                        >
                          🔥 {msg.heatReactions}
                        </button>
                      )}
                      {msg.reactions &&
                        Object.entries(msg.reactions).map(([emoji, count]) => (
                          <span
                            key={emoji}
                            className="flex items-center gap-1 rounded-full border border-line bg-elev px-1.5 py-0.5 text-[11px] text-ink-2 shadow-sm"
                          >
                            {emoji} {count}
                          </span>
                        ))}
                    </div>
                  )}
                </div>
              );
            })}

            {isTyping && (
              <div className="flex items-center gap-2 text-[12px] text-ink-4">
                <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-[var(--acc)]" />
                <span>{activeConv.participantName} is typing…</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Reply Quote Banner */}
          {replyingTo && (
            <div className="flex items-center justify-between border-t border-line bg-white/[0.04] px-4 py-2 text-[12px]">
              <div className="flex items-center gap-2 truncate">
                <span className="text-[var(--acc)]">Replying to @{replyingTo.senderHandle}:</span>
                <span className="truncate text-ink-3">{replyingTo.text}</span>
              </div>
              <button
                onClick={() => setReplyingTo(null)}
                className="ht-icon-btn !h-6 !w-6 text-ink-4 hover:text-ink"
              >
                ✕
              </button>
            </div>
          )}

          {/* Voice Recording Banner */}
          {isRecordingVoice && (
            <div className="flex items-center justify-between border-t border-line bg-red-950/40 px-4 py-2.5 text-[12.5px] text-red-200">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 animate-ping rounded-full bg-red-500" />
                <span>Recording voice memo… 0:{voiceTimer < 10 ? `0${voiceTimer}` : voiceTimer}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsRecordingVoice(false)}
                  className="rounded-full bg-white/10 px-3 py-1 text-[11px] hover:bg-white/20"
                >
                  Cancel
                </button>
                <button
                  onClick={sendVoiceNote}
                  className="rounded-full bg-[var(--acc)] px-3 py-1 text-[11px] font-bold text-white shadow-md"
                >
                  Send Voice
                </button>
              </div>
            </div>
          )}

          {/* Input Bar */}
          <form
            onSubmit={handleSendMessage}
            className="flex items-end gap-2 border-t border-line bg-surface/90 p-3"
          >
            <button
              type="button"
              onClick={() => setIsRecordingVoice(!isRecordingVoice)}
              className={cls(
                'ht-icon-btn !h-9 !w-9 shrink-0 transition-colors',
                isRecordingVoice ? 'bg-red-500 text-white' : 'text-ink-3 hover:text-[var(--acc)]'
              )}
              title="Record voice note"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </button>

            <button
              type="button"
              onClick={sendStorySticker}
              className="ht-icon-btn !h-9 !w-9 shrink-0 text-ink-3 hover:text-[var(--acc)]"
              title="Attach media sticker"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </button>

            <textarea
              ref={textareaRef}
              value={inputText}
              rows={1}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={`Message @${activeConv.participantHandle}… (Enter to send)`}
              className="ht-input !h-auto max-h-32 min-h-[40px] flex-1 resize-none py-2 text-[13.5px] outline-none"
            />

            <button
              type="submit"
              disabled={!inputText.trim()}
              className="ht-btn ht-btn--heat !h-10 !w-10 !p-0 shrink-0 disabled:opacity-40"
              aria-label="Send message"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </form>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center p-8 text-center text-ink-4">
          Select or start a conversation to begin chatting.
        </div>
      )}

      {/* =========================================================================
          NEW CHAT MODAL
          ========================================================================= */}
      <AnimatePresence>
        {newChatModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-2xl border border-line bg-elev p-5 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-line pb-3">
                <h3 className="ht-title text-[16px] text-ink">New Message</h3>
                <button onClick={() => setNewChatModalOpen(false)} className="ht-icon-btn !h-7 !w-7">
                  ✕
                </button>
              </div>

              <div className="mt-4 space-y-2 max-h-72 overflow-y-auto">
                <p className="text-[11.5px] uppercase tracking-wider text-ink-4 font-semibold">
                  Suggested Community Writers
                </p>
                {SUGGESTED_CONTACTS.map((user) => (
                  <button
                    key={user.handle}
                    onClick={() => {
                      const c = s.getOrCreateConversation(user.handle, user.name, user.avatar);
                      setActiveConvId(c.id);
                      setNewChatModalOpen(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-white/[0.05] transition-colors"
                  >
                    <Avatar name={user.name} handle={user.handle} src={user.avatar} size={38} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-semibold text-ink">{user.name}</p>
                      <p className="truncate text-[11.5px] text-ink-mute">@{user.handle}</p>
                    </div>
                    <span className="text-[12px] text-[var(--acc)] font-medium">Chat &gt;</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
