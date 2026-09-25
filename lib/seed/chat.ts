/* ============================================================================
   lib/seed/chat — initial real-world conversations and rich messages.
   ==========================================================================*/

import type { Conversation, ChatMessage } from '../types';

export const SEED_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-heatt',
    participantHandle: 'heatt',
    participantName: 'heatt atelier',
    participantAvatar: '/art/nocturne-ui.jpg',
    lastMessage: 'The new story sticker overlay looks exceptional on dark mode.',
    lastMessageAt: Date.now() - 1000 * 60 * 12, // 12 mins ago
    unreadCount: 1,
    isOnline: true,
  },
  {
    id: 'conv-wirewriter',
    participantHandle: 'wirewriter',
    participantName: 'Wire Syndicator',
    participantAvatar: '/art/ember-signal.jpg',
    lastMessage: 'Check out the new piece syndicated from Dev.to on design systems!',
    lastMessageAt: Date.now() - 1000 * 60 * 140, // ~2 hours ago
    unreadCount: 0,
    isOnline: true,
  },
  {
    id: 'conv-sarah',
    participantHandle: 'sarah_zen',
    participantName: 'Sarah K.',
    participantAvatar: '/art/quiet-type.jpg',
    lastMessage: 'Sent a voice note with thoughts on the tri-color palette.',
    lastMessageAt: Date.now() - 1000 * 60 * 60 * 6, // 6 hours ago
    unreadCount: 0,
    isOnline: false,
  },
  {
    id: 'conv-alex',
    participantHandle: 'alex_noir',
    participantName: 'Alex Rivera',
    participantAvatar: '/art/obsidian-atelier.jpg',
    lastMessage: '🔥 Ignited your note on the board!',
    lastMessageAt: Date.now() - 1000 * 60 * 60 * 24, // Yesterday
    unreadCount: 0,
    isOnline: false,
  },
];

export const SEED_MESSAGES: Record<string, ChatMessage[]> = {
  'conv-heatt': [
    {
      id: 'msg-h1',
      conversationId: 'conv-heatt',
      senderHandle: 'heatt',
      senderName: 'heatt atelier',
      text: 'Welcome to heatt DMs! The messaging architecture is designed for fluid, end-to-end conversation.',
      at: Date.now() - 1000 * 60 * 60 * 2,
      status: 'read',
      heatReactions: 4,
      reactions: { '🔥': 3, '⚡': 1 },
    },
    {
      id: 'msg-h2',
      conversationId: 'conv-heatt',
      senderHandle: 'you',
      senderName: 'You',
      text: 'Loving the clean typography and responsive layout. How does the story sticker work?',
      at: Date.now() - 1000 * 60 * 45,
      status: 'read',
      heatReactions: 2,
    },
    {
      id: 'msg-h3',
      conversationId: 'conv-heatt',
      senderHandle: 'heatt',
      senderName: 'heatt atelier',
      text: 'When you tap share on any piece, you get an official media sticker overlay with deep links, designed specifically for Snapchat and Instagram Stories.',
      at: Date.now() - 1000 * 60 * 30,
      status: 'read',
      heatReactions: 7,
      reactions: { '🔥': 5, '🚀': 2 },
      sticker: {
        postId: 'orig-dark',
        title: 'Designing black: a light model for dark interfaces',
        author: 'heatt',
        cover: '/art/obsidian-atelier.jpg',
        heat: 88,
      },
    },
    {
      id: 'msg-h4',
      conversationId: 'conv-heatt',
      senderHandle: 'heatt',
      senderName: 'heatt atelier',
      text: 'The new story sticker overlay looks exceptional on dark mode.',
      at: Date.now() - 1000 * 60 * 12,
      status: 'delivered',
      heatReactions: 1,
    },
  ],
  'conv-wirewriter': [
    {
      id: 'msg-w1',
      conversationId: 'conv-wirewriter',
      senderHandle: 'wirewriter',
      senderName: 'Wire Syndicator',
      text: 'Hey! The RSS and Dev.to syndicate is syncing smoothly.',
      at: Date.now() - 1000 * 60 * 200,
      status: 'read',
      heatReactions: 1,
    },
    {
      id: 'msg-w2',
      conversationId: 'conv-wirewriter',
      senderHandle: 'wirewriter',
      senderName: 'Wire Syndicator',
      text: 'Check out the new piece syndicated from Dev.to on design systems!',
      at: Date.now() - 1000 * 60 * 140,
      status: 'read',
      heatReactions: 3,
      reactions: { '🔥': 2 },
    },
  ],
  'conv-sarah': [
    {
      id: 'msg-s1',
      conversationId: 'conv-sarah',
      senderHandle: 'sarah_zen',
      senderName: 'Sarah K.',
      text: 'Hey! How are you feeling about the new 3-color palette? Electric Crimson, Cyber Violet and Solar Gold look so good together.',
      at: Date.now() - 1000 * 60 * 60 * 8,
      status: 'read',
      heatReactions: 2,
    },
    {
      id: 'msg-s2',
      conversationId: 'conv-sarah',
      senderHandle: 'sarah_zen',
      senderName: 'Sarah K.',
      text: 'Sent a voice note with thoughts on the tri-color palette.',
      at: Date.now() - 1000 * 60 * 60 * 6,
      status: 'read',
      heatReactions: 4,
      voiceNote: {
        durationSec: 18,
        waveform: [20, 35, 60, 80, 45, 90, 75, 40, 65, 95, 80, 50, 70, 85, 40, 25],
      },
    },
  ],
  'conv-alex': [
    {
      id: 'msg-a1',
      conversationId: 'conv-alex',
      senderHandle: 'alex_noir',
      senderName: 'Alex Rivera',
      text: '🔥 Ignited your note on the board!',
      at: Date.now() - 1000 * 60 * 60 * 24,
      status: 'read',
      heatReactions: 8,
      reactions: { '🔥': 6 },
    },
  ],
};
