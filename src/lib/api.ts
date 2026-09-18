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
}
