import { supabase } from './auth'

export type FeedMode = 'for-you' | 'following' | 'rooms'
export type ApiPostInput = { text: string; type: 'Thought' | 'Question' | 'Practice' | 'Poem' | 'Check-in'; topic: string; roomId?: string; invitation?: 'Advice welcome' | 'Just sharing' | 'Questions welcome' }
export type ProfileInput = { name: string; handle: string; bio: string; avatarUrl?: string | null }

export class HeattApiError extends Error {
  code: string
  status: number
  constructor(code: string, message: string, status: number) {
    super(message)
    this.name = 'HeattApiError'
    this.code = code
    this.status = status
  }
}

const apiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '')

async function request<T>(path: string, init: RequestInit = {}) {
  if (!apiUrl) throw new HeattApiError('API_NOT_CONFIGURED', 'The online data service is not configured.', 503)
  const session = supabase ? (await supabase.auth.getSession()).data.session : null
  const response = await fetch(`${apiUrl}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}), ...(init.headers ?? {}) } })
  const body = await response.json().catch(() => ({})) as { error?: { code?: string; message?: string } }
  if (!response.ok) throw new HeattApiError(body.error?.code ?? 'REQUEST_FAILED', body.error?.message ?? 'The request failed.', response.status)
  return body as T
}

export const heattApi = {
  getFeed: (mode: FeedMode, before?: string) => request<{ posts: unknown[]; nextCursor: string | null; rankerVersion: string }>(`/v1/feed?mode=${mode}${before ? `&before=${encodeURIComponent(before)}` : ''}`),
  createPost: (input: ApiPostInput, idempotencyKey = crypto.randomUUID()) => request<{ post: unknown }>('/v1/posts', { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: JSON.stringify(input) }),
  setFire: (postId: string, intensity: 1 | 2 | 3 | null) => request<{ postId: string; intensity: number | null }>(`/v1/posts/${postId}/fire`, { method: 'PUT', body: JSON.stringify({ intensity }) }),
  setBookmark: (postId: string, saved: boolean) => request<{ postId: string; saved: boolean }>(`/v1/posts/${postId}/bookmark`, { method: 'PUT', body: JSON.stringify({ saved }) }),
  createReply: (postId: string, text: string) => request<{ reply: unknown }>(`/v1/posts/${postId}/replies`, { method: 'POST', body: JSON.stringify({ text }) }),
  getProfile: () => request<{ profile: unknown }>('/v1/me/profile'),
  updateProfile: (profile: ProfileInput) => request<{ profile: unknown }>('/v1/me/profile', { method: 'PATCH', body: JSON.stringify(profile) }),
  getPreferences: () => request<{ preferences: unknown }>('/v1/preferences'),
  updatePreferences: (preferences: { topics: string[]; styles: string[]; languages: string[]; sessionIntent: string; learnedTunes: string[] }) => request<{ preferences: unknown }>('/v1/preferences', { method: 'PATCH', body: JSON.stringify(preferences) }),
  getJournal: () => request<{ entries: unknown[] }>('/v1/journal'),
  createJournalEntry: (entry: { sourceType: 'wisdom' | 'post' | 'personal'; sourceId?: string | null; quotedSpan: string; note: string }) => request<{ entry: unknown }>('/v1/journal', { method: 'POST', body: JSON.stringify(entry) }),
  deleteJournalEntry: (entryId: string) => request<void>(`/v1/journal/${entryId}`, { method: 'DELETE' }),
  getRooms: () => request<{ rooms: unknown[] }>('/v1/rooms'),
  createRoom: (room: { name: string; description: string; topic: string; visibility?: 'public' | 'private' }) => request<{ room: unknown }>('/v1/rooms', { method: 'POST', body: JSON.stringify(room) }),
  setRoomMembership: (roomId: string, joined: boolean) => request<{ roomId: string; joined: boolean }>(`/v1/rooms/${roomId}/membership`, { method: 'PUT', body: JSON.stringify({ joined }) }),
  getWisdomToday: (language = 'English', path?: string) => request<{ entry: unknown | null }>(`/v1/wisdom/today?language=${encodeURIComponent(language)}${path ? `&path=${encodeURIComponent(path)}` : ''}`),
  markHelpful: (replyId: string) => request<{ mark: unknown }>(`/v1/replies/${replyId}/helpful`, { method: 'POST' }),
  unmarkHelpful: (replyId: string) => request<void>(`/v1/replies/${replyId}/helpful`, { method: 'DELETE' }),
  getJourneys: () => request<{ journeys: unknown[] }>('/v1/journeys'),
  setJourneyEnrollment: (journeyId: string, enrolled: boolean) => request<{ journeyId: string; enrolled: boolean }>(`/v1/journeys/${journeyId}/enrollment`, { method: 'PUT', body: JSON.stringify({ enrolled }) }),
  advanceJourney: (journeyId: string) => request<{ enrollment: unknown }>(`/v1/journeys/${journeyId}/advance`, { method: 'POST' }),
  getTimeCapsules: () => request<{ capsules: unknown[] }>('/v1/time-capsules'),
  createTimeCapsule: (capsule: { content: string; revealAt: string; recipientId?: string | null; visibility?: 'private' | 'mutual' }) => request<{ capsule: unknown }>('/v1/time-capsules', { method: 'POST', body: JSON.stringify(capsule) }),
  deleteTimeCapsule: (capsuleId: string) => request<void>(`/v1/time-capsules/${capsuleId}`, { method: 'DELETE' }),
  getReports: () => request<{ reports: unknown[] }>('/v1/admin/reports'),
  updateReport: (reportId: string, status: 'reviewed' | 'actioned' | 'dismissed') => request<{ report: unknown }>(`/v1/admin/reports/${reportId}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
}
