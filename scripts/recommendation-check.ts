import assert from 'node:assert/strict'
import { rankRecommendations, type RecommendationItem } from '../src/lib/recommendation.ts'

const now = Date.parse('2026-09-19T12:00:00Z')
const items: RecommendationItem[] = [
  { id: 'a1', authorId: 'maya', topic: 'Creative practice', type: 'Practice', createdAt: now - 1_000 },
  { id: 'a2', authorId: 'maya', topic: 'Creative practice', type: 'Thought', createdAt: now - 2_000 },
  { id: 'a3', authorId: 'maya', topic: 'Books & ideas', type: 'Thought', createdAt: now - 3_000 },
  { id: 'b1', authorId: 'julian', topic: 'Books & ideas', type: 'Thought', room: 'Quiet Reading', createdAt: now - 4_000 },
  { id: 'c1', authorId: 'nora', topic: 'Relationships', type: 'Question', createdAt: now - 5_000 },
  { id: 'd1', authorId: 'leila', topic: 'Poetry & language', type: 'Poem', createdAt: now - 6_000 },
]

const preferences = {
  topics: ['Creative practice'],
  styles: ['Practical', 'Reflective'],
  following: ['julian'],
  joinedRooms: ['Quiet Reading'],
  recentlySeenIds: ['a1'],
  excludedIds: ['a3'],
}

const first = rankRecommendations(items, preferences, { now, pageSize: 4 })
const second = rankRecommendations(items, preferences, { now, pageSize: 4 })
assert.deepEqual(first.map(result => result.item.id), second.map(result => result.item.id), 'ranking is deterministic')
assert.equal(first.length, 4, 'ranking is finite')
assert.ok(!first.some(result => result.item.id === 'a3'), 'explicit exclusions are respected')
assert.equal(first[0]?.reasonCode, 'chosen_topic', 'explicit topic explains the first match')
assert.ok(first.some(result => result.reasonCode === 'followed_voice' || result.reasonCode === 'followed_path'), 'relationship context is explainable')
assert.ok(first.filter(result => result.item.authorId === 'maya').length <= 2, 'author fatigue cap prevents one voice taking the page')
assert.notEqual(first[0]?.item.id, 'a1', 'fresh candidates are preferred over recently seen candidates')
const practical = rankRecommendations(items, { ...preferences, topics: [], intent: 'Learn', tuned: ['more practical'], recentlySeenIds: [], following: [], joinedRooms: [] }, { now, pageSize: 1 })
assert.equal(practical[0]?.item.type, 'Practice', 'explicit tuner intent can favor practical posts')

const broad = rankRecommendations(items.filter(item => item.topic !== 'Creative practice'), { ...preferences, topics: ['Unavailable topic'], following: [], joinedRooms: [] }, { now, pageSize: 2 })
assert.equal(broad[0]?.reasonCode, 'broadened_after_no_match', 'no-match fallback is labeled')

console.log(`Recommendation checks passed (${first.length} finite results; ${new Set(first.map(result => result.item.authorId)).size} authors).`)
