import type { BlogCategory } from './blogCatalog'

/* ============================================================
   HEATT · SHELF ART
   Every category shelf carries its own commissioned artwork.
   Art direction: ice-white daylight, electric blue washes,
   warm gold accents — it sits comfortably inside all three
   app themes (Lumen, Midnight, Ink).
   ============================================================ */

export type ShelfArt = {
  slug: string
  image?: string
  caption: string
  description: string
}

export const shelfArt: Record<BlogCategory, ShelfArt> = {
  'Creative practice': {
    slug: 'creative-practice',
    image: '/art/categories/creative-practice.jpg',
    caption: 'Make something small and honest',
    description: 'Brushes, drafts, and the daily discipline of showing up.',
  },
  'Books & ideas': {
    slug: 'books-and-ideas',
    image: '/art/categories/books-and-ideas.jpg',
    caption: 'Follow one idea all the way home',
    description: 'Stacks of hardcovers with sparks rising from the pages.',
  },
  'Poetry & language': {
    slug: 'poetry-and-language',
    image: '/art/categories/poetry-and-language.jpg',
    caption: 'Words that remember they were once fire',
    description: 'Quills, ink rivers, and lines that turn into birds.',
  },
  Relationships: {
    slug: 'relationships',
    image: '/art/categories/relationships.jpg',
    caption: 'The warm, complicated, worth-it work',
    description: 'Two figures leaning in, making a little light between them.',
  },
  'Health & attention': {
    slug: 'health-and-attention',
    image: '/art/categories/health-and-attention.jpg',
    caption: 'Your attention is the rarest currency',
    description: 'Breathing ripples, one leaf, a slow-rising sun.',
  },
  Leadership: {
    slug: 'leadership',
    image: '/art/categories/leadership.jpg',
    caption: 'Go first, kindly',
    description: 'A summit, a flag, and the nerve to climb at all.',
  },
  'Strategy & decisions': {
    slug: 'strategy-and-decisions',
    image: '/art/categories/strategy-and-decisions.jpg',
    caption: 'Choose well, then commit',
    description: 'A knight on a quiet board where the paths fork in gold.',
  },
  'Innovation & technology': {
    slug: 'innovation-and-technology',
    image: '/art/categories/innovation-and-technology.jpg',
    caption: 'New tools, old curiosity',
    description: 'A lightbulb growing from a circuit seed.',
  },
  'Work & careers': {
    slug: 'work-and-careers',
    image: '/art/categories/work-and-careers.jpg',
    caption: 'A living, not just a ladder',
    description: 'Rungs toward a warm sun, milestones floating by.',
  },
  'Culture & society': {
    slug: 'culture-and-society',
    image: '/art/categories/culture-and-society.jpg',
    caption: 'We are all in one amphitheatre',
    description: 'Arches and rings, a scattered crowd of golden dots.',
  },
  Philosophy: {
    slug: 'philosophy',
    image: '/art/categories/philosophy.jpg',
    caption: 'Questions older than the lamps',
    description: 'A column, a crescent moon, and a very patient star.',
  },
  'Making & craft': {
    slug: 'making-and-craft',
    image: '/art/categories/making-and-craft.jpg',
    caption: 'Slow hands, real things',
    description: 'A workbench, honest tools, clay becoming a vessel.',
  },
  'Money & meaning': {
    slug: 'money-and-meaning',
    image: '/art/categories/money-and-meaning.jpg',
    caption: 'Enough, and what enough is for',
    description: 'Coins that grow a small green tree.',
  },
}

export function artFor(category: BlogCategory): ShelfArt {
  return shelfArt[category] ?? { slug: 'reading', caption: 'Worth your attention', description: 'A shelf of good reading.' }
}
