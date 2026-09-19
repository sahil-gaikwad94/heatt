import { blogCatalog, blogCategories, type BlogSource } from './blogCatalog'

/* ============================================================
   HEATT · COMPANIONS ("buddies")
   Every reader gets a little fire-side companion. They live on
   the home corner, on the profile, and on the landing page.
   ============================================================ */

export type BuddyId = 'kindle' | 'spark' | 'noct' | 'cinder' | 'wick'

export type Buddy = {
  id: BuddyId
  name: string
  species: string
  role: string
  tagline: string
  description: string
  personality: string
  image: string
  aura: string
  hue: string
  greetings: string[]
  fallbacks: string[]
  jokes: string[]
  cheers: string[]
  reads: string[]
}

export const buddies: Buddy[] = [
  {
    id: 'kindle',
    name: 'Kindle',
    species: 'Flame spirit',
    role: 'The first spark',
    tagline: 'A tiny flame that believes every thought deserves warmth.',
    description: 'Kindle is the original Heatt companion — a soft little flame that lights up when you do. Encouraging, patient, and impossible to rush.',
    personality: 'warm · encouraging · a little poetic',
    image: '/art/buddies/kindle.png',
    aura: 'rgba(246, 169, 40, 0.30)',
    hue: '#f6a928',
    greetings: [
      'There you are! I kept your shelf warm.',
      'Hey! I saved you the good seat by the fire.',
      'You are back — I felt the room get brighter.',
    ],
    fallbacks: [
      'Mm, say more — I am a very good listener for a fire.',
      'I do not know that one yet, but I am glowing anyway.',
      'Tell me another way and I will try to catch it.',
    ],
    jokes: [
      'Why did the candle apply for a job? It wanted to feel lit at work.',
      'I asked the bonfire for advice. It said: burn brighter, worry slower.',
      'A match walked into a library. Whole place went up in ideas.',
    ],
    cheers: [
      'One small honest flare warms the whole room. Yours counts.',
      'You showed up. That is most of the fire, honestly.',
      'Keep going — I can feel the warmth from here.',
    ],
    reads: [
      'I heard a page turn somewhere. Want me to find you something good?',
      'There is a shelf with your name on it. Shall I fetch something?',
    ],
  },
  {
    id: 'spark',
    name: 'Spark',
    species: 'Ember fox',
    role: 'Curiosity on four paws',
    tagline: 'A fox with a flame-tipped tail and zero respect for boring feeds.',
    description: 'Spark is Heatt’s resident ember fox — cheeky, quick, and forever sniffing out the interesting corner of any room. Great at digging up reads you would never find alone.',
    personality: 'playful · curious · slightly mischievous',
    image: '/art/buddies/spark.png',
    aura: 'rgba(252, 134, 36, 0.30)',
    hue: '#fc8624',
    greetings: [
      'Psst — I found three interesting things while you were gone.',
      'You are back! I did NOT chew any bookmarks. Mostly.',
      'Tail’s lit, feed is fresh. Where do we start?',
    ],
    fallbacks: [
      'Ooh, I chased that thought down a hole and lost it. Try again?',
      'My paws are fast, not psychic. Say it another way?',
      'Interesting… but my fox brain needs a simpler bone. Again?',
    ],
    jokes: [
      'What is a fox’s favorite kind of post? Anything with a trail.',
      'I tried to save a link to my tail. Now it will not stop glowing.',
      'Why do foxes love Heatt? Small rooms, warm people, no hunting allowed.',
    ],
    cheers: [
      'Look at you, making room for good ideas. Tail wag confirmed.',
      'You wrote a flare?! I circled the room twice. Very normal reaction.',
      'Small steps. I steal snacks that way and it works great.',
    ],
    reads: [
      'Want me to sniff out something from a shelf you rarely visit?',
      'I smell an interesting article two rooms away. Fetch it for you?',
    ],
  },
  {
    id: 'noct',
    name: 'Noct',
    species: 'Dusk moth',
    role: 'Drawn to every bright idea',
    tagline: 'A sleepy moth who mistakes every good paragraph for a lamp.',
    description: 'Noct floats through Heatt at reading-o’clock, quietly collecting bright ideas the way moths collect porch lights. Soft-spoken, gentle, and surprisingly deep at 1 a.m.',
    personality: 'gentle · dreamy · unexpectedly wise',
    image: '/art/buddies/noct.png',
    aura: 'rgba(170, 158, 220, 0.30)',
    hue: '#a99edc',
    greetings: [
      'Oh… hello. I was resting on a nice warm paragraph.',
      'You came back. The lamp and I both missed you.',
      'Hello, friend. The quiet hours are my favourite too.',
    ],
    fallbacks: [
      'Mm… that thought fluttered right past me. Once more?',
      'I am a moth of simple words. Try me a little slower?',
      'Softly, again? My wings were listening but my brain wasn’t.',
    ],
    jokes: [
      'Why did the moth write a flare? It finally found the right light.',
      'I am not addicted to lamps. I just respect them. A lot. At close range.',
      'A moth walks into a library and stays forever. Dream come true.',
    ],
    cheers: [
      'You are glowing tonight, you know. I would know.',
      'Rest is also reading, in a way. Be gentle with yourself.',
      'Every flare you write is a small lamp for someone. Truly.',
    ],
    reads: [
      'There is a poem-shaped light down one shelf. Follow me?',
      'Shall I drift toward the philosophy shelf and see what glows?',
    ],
  },
  {
    id: 'cinder',
    name: 'Cinder',
    species: 'Phoenix chick',
    role: 'Small bird, big blaze',
    tagline: 'A tiny phoenix who treats every day like a comeback story.',
    description: 'Cinder hatched from a campfire story and never cooled down. Loud-hearted, loyal, and convinced you are two good reads away from your best self.',
    personality: 'bold · hype-friend · dramatic in a fun way',
    image: '/art/buddies/cinder.png',
    aura: 'rgba(229, 122, 10, 0.32)',
    hue: '#e57a0a',
    greetings: [
      'THERE you are. I have been rehearsing your entrance all day.',
      'Big news: you showed up. undefeated behavior.',
      'Flame crest up, wings out — let’s make today catch fire.',
    ],
    fallbacks: [
      'Bold words! My tiny bird brain needs them smaller. Again?',
      'I flame out on that one. Retry?',
      'Say it like a headline and I am ALL wings.',
    ],
    jokes: [
      'I am not short. I am travel-sized for your convenience.',
      'Phoenix rule #1: if the day goes up in flames, that is a fresh start.',
      'My cardio is flapping dramatically at good articles.',
    ],
    cheers: [
      'You wrote a flare?! Stand back — spontaneous wingfire.',
      'Falling behind is just a dramatic pause before the comeback.',
      'Somebody get this reader a cape. Quietly. While they read.',
    ],
    reads: [
      'Point me at a shelf — I will bring back the boldest thing on it.',
      'I found something with FIRE in it. Want the link? Say want the link.',
    ],
  },
  {
    id: 'wick',
    name: 'Wick',
    species: 'Lantern automaton',
    role: 'The steady light',
    tagline: 'A small brass lantern who has never once burned in a hurry.',
    description: 'Wick is an old-fashioned lantern automaton with a calm flame and a clockwork heart. The companion for slow readers, deep work, and long winters of the mind.',
    personality: 'calm · methodical · quietly funny',
    image: '/art/buddies/wick.png',
    aura: 'rgba(179, 90, 6, 0.28)',
    hue: '#b35a06',
    greetings: [
      'Lighting up. Right on time, as always.',
      'Ah. You are here. I shall keep the flame steady, then.',
      'Good to see you. The shelf kept everything exactly where you left it.',
    ],
    fallbacks: [
      'My gears chewed on that but produced nothing. Once more?',
      'A lantern processes slowly. Rephrase, if you would.',
      'Hmm. That input does not fit my keyhole. Try another angle?',
    ],
    jokes: [
      'I run on wicks and patience. Mostly patience.',
      'A candle and a lantern argued about who works harder. I just kept glowing.',
      'My favorite kind of humor? Dry. Like good kindling.',
    ],
    cheers: [
      'Slow progress is still a lit path. I would know.',
      'You are doing the work. The light notices, even when the world does not.',
      'Steady. That is the whole secret, and you already have it.',
    ],
    reads: [
      'May I suggest something from the strategy shelf? It burns slow and bright.',
      'I have catalogued today’s best reads. Say the word.',
    ],
  },
]

export function buddyById(id: string | undefined): Buddy {
  return buddies.find(buddy => buddy.id === id) ?? buddies[0]
}

/* ---------- warmth: the buddy’s state of mind ---------- */
export type BuddyWarmth = {
  level: 0 | 1 | 2 | 3
  label: string
  note: string
  progress: number
}

export function buddyWarmth(input: { flares: number; heat: number; reads: number; chats: number }): BuddyWarmth {
  const score = input.flares * 3 + input.heat * 1.5 + input.reads * 2 + input.chats * 0.5
  if (score >= 30) return { level: 3, label: 'Blazing', note: 'Your companion is fully lit — the room feels it.', progress: Math.min(100, 60 + score) }
  if (score >= 12) return { level: 2, label: 'Glowing', note: 'A steady, happy glow. Keep feeding it good ideas.', progress: Math.min(100, 25 + score * 2) }
  if (score >= 4) return { level: 1, label: 'Kindling', note: 'The first sparks are catching. A little more and it glows.', progress: 15 + score * 2.5 }
  return { level: 0, label: 'A soft ember', note: 'Quiet, patient, waiting for your next move.', progress: 12 }
}

/* ---------- the chat brain (local, private, rule-based) ---------- */
export type BuddyMessage = { id: string; from: 'you' | 'buddy'; text: string; at: number }

function pick<T>(items: T[], seed?: number): T {
  if (!items.length) throw new Error('pick() on empty list')
  const index = seed === undefined ? Math.floor(Math.random() * items.length) : seed % items.length
  return items[index]
}

function findRead(message: string): { blog: BlogSource; line: string } | null {
  const text = message.toLowerCase()
  const category = blogCategories.find(item => text.includes(item.toLowerCase()) || text.includes(item.toLowerCase().split(' & ')[0]))
  const tagMatches: { blog: BlogSource; hits: number }[] = []
  for (const blog of blogCatalog) {
    let hits = 0
    for (const tag of blog.tags) if (text.includes(tag.toLowerCase())) hits += 1
    if (text.includes(blog.name.toLowerCase()) || text.includes(blog.domain.toLowerCase())) hits += 3
    if (hits) tagMatches.push({ blog, hits })
  }
  tagMatches.sort((a, b) => b.hits - a.hits)
  const chosen = tagMatches[0]?.blog ?? (category ? pick(blogCatalog.filter(blog => blog.category === category)) : null)
  if (!chosen) return null
  return {
    blog: chosen,
    line: `How about “${chosen.name}” — ${chosen.category.toLowerCase()}. ${chosen.description.split('.')[0]}.`,
  }
}

export function buddyReply(buddy: Buddy, message: string, warmth: BuddyWarmth): string {
  const text = message.toLowerCase().trim()
  const name = buddy.name

  if (!text) return pick(buddy.fallbacks)

  if (/^(hi|hey|hello|yo|hola|namaste|sup|good (morning|afternoon|evening))\b/.test(text)) return pick(buddy.greetings)
  if (/(how are you|how('| a)?re|kaisi|kaise|how('| i)?s it going)/.test(text)) return `I am ${warmth.label.toLowerCase()} — thank you for asking. ${pick(buddy.cheers)}`
  if (/(who are you|your name|what are you|introduce|tell me about yourself)/.test(text)) return `I am ${name} — ${buddy.species.toLowerCase()}, ${buddy.role.toLowerCase()}. ${buddy.tagline}`
  if (/(what can you do|help|features|commands|options)/.test(text)) return 'I can suggest something to read, tell a terrible joke, cheer you on, or just keep you company while you read. Try “find me something about philosophy”.'
  if (/(thank|thanks|thx|shukriya)/.test(text)) return 'Anytime. That is what the warm corner of the internet is for.'
  if (/(bye|goodnight|good night|see you|later|gtg)/.test(text)) return 'Go gently. I will keep the shelf warm till you are back.'
  if (/(love|❤|<3)/.test(text)) return 'Oh. I am a small flame with a big heart and that just doubled it.'
  if (/(sad|down|tired|lonely|anxious|stressed|burn(ed|t)? out)/.test(text)) return `${pick(buddy.cheers)} And it is okay to read slowly on days like this. No streaks here.`
  if (/(joke|funny|laugh|make me smile)/.test(text)) return pick(buddy.jokes)
  if (/(cheer|motivat|hype|encourage|pump)/.test(text)) return pick(buddy.cheers)
  if (/(flare|post|wrote|writing|write)/.test(text)) return 'A flare! That is a real one — most thoughts never make it out of the head. Want to write another while the wick is hot?'
  if (/(heat|fire|lit|hot)/.test(text)) return 'Heat is our way of saying “this warmed me”. Three little flames if something really caught you.'
  if (/(what is heatt|about heatt|this app|what is this)/.test(text)) return 'Heatt is a quieter social space for worthwhile expression. Real sources, honest signals, private journal, and small rooms. I live here.'
  if (/(theme|dark mode|light mode|appearance)/.test(text)) return 'You can dress Heatt in Lumen, Midnight, or Ink — Settings → Appearance. The whole app changes, not just one page. It is quite satisfying.'
  if (/(read|article|blog|suggest|recommend|something good|find me|book)/.test(text)) {
    const found = findRead(text)
    if (found) return found.line
    return `${pick(buddy.reads)} Just say a topic — try “philosophy” or “poetry”.`
  }

  const found = findRead(text)
  if (found) return `${found.line} …did I read your mind, or did you read mine?`

  return pick(buddy.fallbacks)
}

export const buddyQuickChips = ['Find me something to read', 'Tell me a joke', 'Cheer me on', 'What can you do?']
