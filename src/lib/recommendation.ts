export type RecommendationMode = 'For You' | 'Following' | 'Rooms'

export type RecommendationItem = {
  id: string
  authorId: string
  topic: string
  type: string
  room?: string
  tags?: string[]
  createdAt: number
}

export type RecommendationPreferences = {
  topics: string[]
  styles: string[]
  intent?: string
  following: string[]
  joinedRooms: string[]
  savedIds?: string[]
  practicedIds?: string[]
  excludedIds?: string[]
  recentlySeenIds?: string[]
  tuned?: string[]
}

export type RecommendationReasonCode =
  | 'chosen_topic'
  | 'followed_voice'
  | 'followed_path'
  | 'practice_continuity'
  | 'new_angle'
  | 'broadened_after_no_match'
  | 'recently_saved'

export type RecommendationResult<T extends RecommendationItem> = {
  item: T
  score: number
  reasonCode: RecommendationReasonCode
  reason: string
}

type Scored<T extends RecommendationItem> = RecommendationResult<T> & {
  baseScore: number
  fresh: boolean
}

const styleForType: Record<string, string> = {
  Practice: 'Practical',
  Question: 'Curious',
  Thought: 'Reflective',
  Poem: 'Poetic',
  'Check-in': 'Reflective',
}

function stableNumber(value: string) {
  return Array.from(value).reduce((total, character, index) => (total * 31 + character.charCodeAt(0) + index) % 100003, 7)
}

function freshness(item: RecommendationItem, now: number) {
  const ageHours = Math.max(0, (now - item.createdAt) / 3600000)
  return Math.pow(2, -ageHours / (item.type === 'Poem' ? 72 : 36))
}

function reasonFor<T extends RecommendationItem>(item: T, preferences: RecommendationPreferences, hasTopicMatch: boolean): { code: RecommendationReasonCode; text: string } {
  if (preferences.topics.includes(item.topic)) return { code: 'chosen_topic', text: `Matches your chosen topic: ${item.topic}` }
  if (preferences.following.includes(item.authorId)) return { code: 'followed_voice', text: 'From a voice you chose to follow' }
  if (item.room && preferences.joinedRooms.includes(item.room)) return { code: 'followed_path', text: `From a room you joined: ${item.room}` }
  if (preferences.practicedIds?.includes(item.id)) return { code: 'practice_continuity', text: 'Continues a practice you have started' }
  if (preferences.savedIds?.includes(item.id)) return { code: 'recently_saved', text: 'Related to something you saved' }
  return hasTopicMatch ? { code: 'new_angle', text: 'A new angle beside your chosen topics' } : { code: 'broadened_after_no_match', text: 'A broader local option after no exact match' }
}

/**
 * Rank a finite page without popularity or opaque model calls.
 *
 * Explicit preferences lead. Relationship and practice signals explain the next
 * layer. Freshness, bounded exploration, and a greedy diversity pass prevent a
 * page from becoming one author, topic, or emotional register. Unknown means
 * unknown: an item that was not shown is never treated as disliked.
 */
export function rankRecommendations<T extends RecommendationItem>(items: T[], preferences: RecommendationPreferences, options: { now?: number; pageSize?: number; mode?: RecommendationMode; maxPerAuthor?: number; maxPerTopic?: number } = {}): RecommendationResult<T>[] {
  const now = options.now ?? Date.now()
  const pageSize = Math.max(0, options.pageSize ?? 7)
  const maxPerAuthor = Math.max(1, options.maxPerAuthor ?? 2)
  const maxPerTopic = Math.max(1, options.maxPerTopic ?? 3)
  const excluded = new Set(preferences.excludedIds ?? [])
  const recentlySeen = new Set(preferences.recentlySeenIds ?? [])
  const saved = new Set(preferences.savedIds ?? [])
  const practiced = new Set(preferences.practicedIds ?? [])
  const topicMatches = items.some(item => preferences.topics.includes(item.topic))
  const eligible = items.filter(item => !excluded.has(item.id))

  const scored: Scored<T>[] = eligible.map(item => {
    const explicitTopic = preferences.topics.includes(item.topic)
    const styleMatch = preferences.styles.includes(styleForType[item.type] ?? '')
    const followed = preferences.following.includes(item.authorId)
    const inRoom = Boolean(item.room && preferences.joinedRooms.includes(item.room))
    const hasPracticeSignal = practiced.has(item.id)
    const savedSignal = saved.has(item.id)
    const isFresh = !recentlySeen.has(item.id)
    const tuned = preferences.tuned ?? []
    const intentMatch = preferences.intent === 'Reflect' && ['Thought', 'Poem'].includes(item.type)
      || preferences.intent === 'Learn' && ['Thought', 'Practice'].includes(item.type)
      || preferences.intent === 'Connect' && ['Question', 'Check-in'].includes(item.type)
      || preferences.intent === 'Explore' && isFresh
    const tunedStyleBoost = tuned.includes('more practical') && item.type === 'Practice' ? 0.08 : tuned.includes('more reflective') && item.type === 'Thought' ? 0.08 : 0
    const lessPoetryPenalty = tuned.includes('less poetry') && item.type === 'Poem' ? -0.18 : 0
    const exploration = tuned.includes('more new voices') && !followed ? 0.08 : 0
    const fatigue = isFresh ? 0 : -0.25
    const age = freshness(item, now)
    const baseScore = (explicitTopic ? 0.38 : 0.05)
      + (styleMatch ? 0.11 : 0)
      + (intentMatch ? 0.09 : 0)
      + (followed ? 0.19 : 0)
      + (inRoom ? 0.13 : 0)
      + (hasPracticeSignal ? 0.12 : 0)
      + (savedSignal ? 0.08 : 0)
      + (age * 0.08)
      + tunedStyleBoost
      + lessPoetryPenalty
      + exploration
      + fatigue
    const reason = reasonFor(item, preferences, topicMatches)
    return { item, score: baseScore, baseScore, fresh: isFresh, reasonCode: reason.code, reason: reason.text }
  })

  // Prefer fresh candidates until the page would otherwise be short. This is a
  // fatigue limit, not a hidden dislike signal; seen items may return later.
  const fresh = scored.filter(item => item.fresh)
  const pool = fresh.length >= pageSize ? fresh : scored
  const remaining = [...pool]
  const selected: Scored<T>[] = []
  const authorCounts: Record<string, number> = {}
  const topicCounts: Record<string, number> = {}

  while (remaining.length && selected.length < pageSize) {
    let bestIndex = 0
    let bestValue = Number.NEGATIVE_INFINITY
    remaining.forEach((candidate, index) => {
      const authorPenalty = (authorCounts[candidate.item.authorId] ?? 0) * 0.18
      const topicPenalty = (topicCounts[candidate.item.topic] ?? 0) * 0.07
      const typePenalty = selected.length > 1 && selected[selected.length - 1].item.type === candidate.item.type ? 0.025 : 0
      const value = candidate.baseScore - authorPenalty - topicPenalty - typePenalty + stableNumber(`${candidate.item.id}:${selected.length}`) / 100003 * 0.0001
      const blockedByAuthor = (authorCounts[candidate.item.authorId] ?? 0) >= maxPerAuthor
      const blockedByTopic = (topicCounts[candidate.item.topic] ?? 0) >= maxPerTopic
      if (!blockedByAuthor && !blockedByTopic && value > bestValue) { bestIndex = index; bestValue = value }
    })
    const [chosen] = remaining.splice(bestIndex, 1)
    if (!chosen) break
    selected.push({ ...chosen, score: bestValue })
    authorCounts[chosen.item.authorId] = (authorCounts[chosen.item.authorId] ?? 0) + 1
    topicCounts[chosen.item.topic] = (topicCounts[chosen.item.topic] ?? 0) + 1
  }

  // If strict diversity caps made the page too short, fill the remaining finite
  // slots with the deterministic best candidates rather than looping forever.
  if (selected.length < pageSize) {
    const selectedIds = new Set(selected.map(result => result.item.id))
    scored.sort((a, b) => b.baseScore - a.baseScore || stableNumber(a.item.id) - stableNumber(b.item.id))
    for (const candidate of scored) {
      if (selected.length >= pageSize) break
      if (!selectedIds.has(candidate.item.id)) selected.push(candidate)
    }
  }

  return selected.slice(0, pageSize).map(({ item, score, reasonCode, reason }) => ({ item, score, reasonCode, reason }))
}
