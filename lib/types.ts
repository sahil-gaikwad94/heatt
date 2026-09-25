/* ============================================================================
   heatt — domain types.

   One platform, two shapes of writing: a *spark* (a short note) and a *forge*
   (a full story). Both are authored by a real handle; there are no invented
   people in the product.
   ==========================================================================*/

/** 0 = no heat. 1 = heated · 2 = blazing · 3 = ignited. */
export type HeatLevel = 0 | 1 | 2 | 3;

export type ArticleBlock =
  | { t: 'h'; text: string; id?: string }
  | { t: 'p'; text: string }
  | { t: 'quote'; text: string; cite?: string }
  | { t: 'ul'; items: string[] }
  | { t: 'ol'; items: string[] }
  | { t: 'code'; lang: string; code: string; caption?: string }
  | { t: 'img'; src: string; alt: string; caption?: string; credit?: string }
  | { t: 'hr' }
  | { t: 'callout'; kind: 'heat' | 'note' | 'warn'; title: string; text: string }
  | { t: 'links'; items: { label: string; href: string; note?: string }[] };

export type Article = {
  id: string;
  kind: 'forge';
  title: string;
  dek: string;
  author: string;
  tags: string[];
  cover: string;
  accent?: string;
  date: string;
  minutes: number;
  blocks: ArticleBlock[];
  source?: { name: string; url: string };
  canonical?: string;
  reactions?: number;
  comments?: number;
  editorsPick?: boolean;
};

export type Spark = {
  id: string;
  kind: 'spark';
  author: string;
  text: string;
  date: string;
  tags?: string[];
  media?: { url: string; alt: string }[];
  link?: { url: string; title: string; site: string; image?: string; desc?: string };
  poll?: { question: string; options: { label: string; votes: number }[] };
  quoteOf?: { author: string; text: string };
  reactions?: number;
  comments?: number;
  reposts?: number;
  /** links a note to the story it grew out of */
  longRef?: string;
};

export type User = {
  handle: string;
  name: string;
  bio: string;
  avatar?: string;
  cover?: string;
  location?: string;
  site?: string;
  joined: string;
  traits?: string[];
  verified?: boolean;
  org?: string;
  /** canonical profile URL when the writer is syndicated from elsewhere */
  sourceUrl?: string;
  /** true for the house account */
  house?: boolean;
};

export type FeedItem = (Article | Spark) & {
  heat?: number;
  authorRef?: User;
  heated?: HeatLevel;
};

export type Notification = {
  id: string;
  type: 'heat' | 'reply' | 'follow' | 'mention' | 'digest';
  actor: string;
  text: string;
  at: number;
  read: boolean;
  postId?: string;
  level?: HeatLevel;
};

/** one entry in the local heat ledger */
export type HeatEvent = {
  level: HeatLevel;
  at: number;
  /** how many times you have heated this piece */
  count?: number;
};

export type ReadingProgress = {
  articleId: string;
  pct: number;
  updatedAt: number;
  finished?: boolean;
};

export type Prefs = {
  density: 'dense' | 'normal' | 'cozy';
  measure: 'narrow' | 'normal' | 'wide';
  serif: boolean;
  reduceMotion: boolean;
  /** animated hero/atmosphere behind the app */
  ambient: boolean;
  haptics: boolean;
  /** ember burst when a piece reaches ignition */
  ignitionFx: 'full' | 'subtle' | 'off';
  theme: string;
};
