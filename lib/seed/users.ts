/* ============================================================================
   lib/seed/users — who exists on heatt.

   Exactly two kinds of identity, both real:

     1. the house account (@heatt)      — writes the Originals and the notes
     2. syndicated writers              — real people whose public articles we
                                          index, credited with their own name,
                                          avatar and canonical link

   There are no invented characters. Anything you see in the app was either
   written by the house, syndicated from a real writer, or written by you.
   ==========================================================================*/

import type { User } from '../types';
import { SYNDICATED } from './syndicated';
import { avatarDataUri } from '../util';

export const HOUSE_HANDLE = 'heatt';

export const HOUSE: User = {
  handle: HOUSE_HANDLE,
  name: 'heatt',
  bio: 'The room and its rules. We write about attention, craft, and the quiet parts of the internet — and we keep the design notes here in the open.',
  location: 'the internet',
  site: 'heatt.app',
  joined: '2026-01-01',
  traits: ['attention', 'craft', 'reading', 'design'],
  verified: true,
  org: 'heatt',
  house: true,
};

/** Covers for the house account, drawn from the app's own art. */
export const HOUSE_COVER = '/art/obsidian-atelier.jpg';

const byHandle = new Map<string, User>();

function syndicatedProfile(handle: string): User | null {
  const items = SYNDICATED.filter((s) => s.handle === handle);
  if (!items.length) return null;
  const first = items[0];
  return {
    handle,
    name: first.author,
    bio: first.org
      ? `${first.org} · writing on ${items
          .flatMap((i) => i.tags)
          .slice(0, 3)
          .join(', ')}`
      : `Writes on ${[...new Set(items.flatMap((i) => i.tags))].slice(0, 3).join(', ')}. Syndicated from Dev.to.`,
    avatar: first.avatar,
    joined: first.date,
    traits: [...new Set(items.flatMap((i) => i.tags))].slice(0, 4),
    org: first.org,
    sourceUrl: `https://dev.to/${handle}`,
  };
}

/**
 * Resolve any handle to a real profile. Unknown handles get a neutral
 * placeholder rather than a fabricated biography.
 */
export function getUser(handle: string): User {
  const key = (handle || '').replace(/^@/, '').toLowerCase();
  if (key === HOUSE_HANDLE) return HOUSE;
  const cached = byHandle.get(key);
  if (cached) return cached;
  const syndicated = syndicatedProfile(key) ?? {
    handle: key || 'unknown',
    name: key || 'unknown',
    bio: 'A writer on heatt.',
    joined: new Date().toISOString(),
  };
  byHandle.set(key, syndicated);
  return syndicated;
}

export function isHouse(handle: string) {
  return (handle || '').replace(/^@/, '').toLowerCase() === HOUSE_HANDLE;
}

/** The local reader's identity — minted on demand, never during onboarding. */
export function mintLocalUser(seed: string): User {
  const handle = 'you';
  return {
    handle,
    name: 'You',
    bio: 'Reading, keeping, and occasionally writing things down.',
    avatar: avatarDataUri('You', seed || handle),
    joined: new Date().toISOString(),
    traits: ['reading', 'keeping'],
  };
}
