import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { z } from 'zod'

export type ApiBindings = {
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  CORS_ORIGIN?: string
}
export type ApiVariables = { db: SupabaseClient; userId: string }
export type ApiEnv = { Bindings: ApiBindings; Variables: ApiVariables }

const postSchema = z.object({
  text: z.string().trim().min(1).max(2_000).refine(value => graphemeCount(value) <= 500, 'A thought can be at most 500 grapheme clusters.'),
  type: z.enum(['Thought', 'Question', 'Practice', 'Poem', 'Check-in']).default('Thought'),
  topic: z.string().trim().min(1).max(80),
  roomId: z.string().uuid().optional(),
  invitation: z.enum(['Advice welcome', 'Just sharing', 'Questions welcome']).default('Just sharing'),
})
const profileSchema = z.object({
  name: z.string().trim().min(1).max(80),
  handle: z.string().trim().regex(/^[a-zA-Z0-9_.]{3,24}$/),
  bio: z.string().trim().max(160),
  avatarUrl: z.string().url().nullable().optional(),
})
const fireSchema = z.object({ intensity: z.number().int().min(1).max(3).nullable() })
const bookmarkSchema = z.object({ saved: z.boolean() })

function graphemeCount(value: string) {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const Segmenter = Intl.Segmenter
    return Array.from(new Segmenter(undefined, { granularity: 'grapheme' }).segment(value)).length
  }
  return Array.from(value).length
}

function error(c: any, code: string, message: string, status = 400) {
  return c.json({ error: { code, message } }, status)
}

const app = new Hono<ApiEnv>()
app.use('*', cors({ origin: (origin, context) => context.env.CORS_ORIGIN ?? origin ?? '*', allowHeaders: ['Authorization', 'Content-Type', 'Idempotency-Key'], allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'] }))
app.get('/health', c => c.json({ ok: true, service: 'heatt-api', version: 'v1' }))

app.use('/v1/*', async (c, next) => {
  const authorization = c.req.header('Authorization')
  if (!authorization?.startsWith('Bearer ')) return error(c, 'UNAUTHENTICATED', 'Sign in to continue.', 401)
  if (!c.env.SUPABASE_URL || !c.env.SUPABASE_ANON_KEY) return error(c, 'API_NOT_CONFIGURED', 'The data service is not configured.', 503)

  const db = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY, { global: { headers: { Authorization: authorization } } })
  const { data, error: authError } = await db.auth.getUser()
  if (authError || !data.user) return error(c, 'INVALID_SESSION', 'Your session has expired. Sign in again.', 401)
  c.set('db', db)
  c.set('userId', data.user.id)
  await next()
})

app.get('/v1/me/profile', async c => {
  const { data, error: queryError } = await c.get('db').from('profiles').select('id, display_name, handle, bio, avatar_url, created_at').eq('id', c.get('userId')).maybeSingle()
  if (queryError) return error(c, 'PROFILE_READ_FAILED', 'Could not load your profile.', 500)
  return c.json({ profile: data })
})

app.patch('/v1/me/profile', zValidator('json', profileSchema), async c => {
  const input = c.req.valid('json')
  const { data, error: queryError } = await c.get('db').from('profiles').update({ display_name: input.name, handle: input.handle.toLowerCase(), bio: input.bio, avatar_url: input.avatarUrl ?? null, updated_at: new Date().toISOString() }).eq('id', c.get('userId')).select('id, display_name, handle, bio, avatar_url, created_at').single()
  if (queryError) return error(c, queryError.code === '23505' ? 'HANDLE_TAKEN' : 'PROFILE_UPDATE_FAILED', queryError.code === '23505' ? 'That handle is already in use.' : 'Could not save your profile.', queryError.code === '23505' ? 409 : 500)
  return c.json({ profile: data })
})

app.get('/v1/feed', async c => {
  const mode = c.req.query('mode') ?? 'for-you'
  if (!['for-you', 'following', 'rooms'].includes(mode)) return error(c, 'INVALID_FEED_MODE', 'Choose For You, Following, or Rooms.')
  const requested = Number(c.req.query('limit') ?? 20)
  const limit = Math.min(Math.max(Number.isFinite(requested) ? requested : 20, 1), 50)
  const before = c.req.query('before')
  const db = c.get('db')
  let query = db.from('posts').select('id, author_id, post_type, topic, text, room_id, invitation, created_at, profiles:author_id(id, display_name, handle, bio, avatar_url)').eq('visibility', 'public').is('deleted_at', null).order('created_at', { ascending: false }).limit(250)
  if (before) query = query.lt('created_at', before)

  if (mode === 'following') {
    const { data: follows, error: followError } = await db.from('follows').select('following_id').eq('follower_id', c.get('userId'))
    if (followError) return error(c, 'FEED_READ_FAILED', 'Could not load Following.', 500)
    const ids = (follows ?? []).map(row => row.following_id)
    if (!ids.length) return c.json({ posts: [], nextCursor: null, rankerVersion: 'rules-v1' })
    query = query.in('author_id', ids)
  }
  if (mode === 'rooms') {
    const { data: memberships, error: membershipError } = await db.from('room_memberships').select('room_id').eq('user_id', c.get('userId'))
    if (membershipError) return error(c, 'FEED_READ_FAILED', 'Could not load Rooms.', 500)
    const roomIds = (memberships ?? []).map(row => row.room_id)
    if (!roomIds.length) return c.json({ posts: [], nextCursor: null, rankerVersion: 'rules-v1' })
    query = query.in('room_id', roomIds)
  }

  const { data, error: queryError } = await query
  if (queryError) return error(c, 'FEED_READ_FAILED', 'Could not load your feed.', 500)
  let posts = data ?? []
  let rankerVersion = 'chronological-v1'
  if (mode === 'for-you') {
    const { data: preferences } = await db.from('user_preferences').select('topics, session_intent').eq('user_id', c.get('userId')).maybeSingle()
    const selectedTopics = new Set(preferences?.topics ?? [])
    const now = Date.now()
    const score = (post: (typeof posts)[number]) => {
      const ageHours = Math.max(0, (now - new Date(post.created_at).getTime()) / 3_600_000)
      const freshness = Math.pow(2, -ageHours / 36)
      const topicMatch = selectedTopics.has(post.topic) ? 1 : 0.12
      const relationship = post.room_id ? 0.45 : 0.25
      return 0.38 * topicMatch + 0.27 * freshness + 0.20 * relationship + 0.15 * Math.min(1, 1 / (1 + ageHours / 24))
    }
    posts = [...posts].sort((a, b) => score(b) - score(a) || String(b.created_at).localeCompare(String(a.created_at)))
    rankerVersion = 'rules-v1'
  }
  posts = posts.slice(0, limit)
  return c.json({ posts, nextCursor: posts.length === limit ? posts.at(-1)?.created_at ?? null : null, rankerVersion })
})

app.post('/v1/posts', zValidator('json', postSchema), async c => {
  const input = c.req.valid('json')
  const idempotencyKey = c.req.header('Idempotency-Key')
  const db = c.get('db')
  if (idempotencyKey) {
    const { data: previous } = await db.from('idempotency_keys').select('response_json').eq('user_id', c.get('userId')).eq('key', idempotencyKey).maybeSingle()
    if (previous?.response_json) return c.json(previous.response_json)
  }
  const { data, error: queryError } = await db.from('posts').insert({ author_id: c.get('userId'), post_type: input.type, topic: input.topic, text: input.text, room_id: input.roomId ?? null, invitation: input.invitation, visibility: input.roomId ? 'room' : 'public' }).select('id, author_id, post_type, topic, text, room_id, invitation, created_at').single()
  if (queryError) return error(c, 'POST_CREATE_FAILED', 'Could not publish your thought.', 400)
  const response = { post: data }
  if (idempotencyKey) await db.from('idempotency_keys').insert({ user_id: c.get('userId'), key: idempotencyKey, response_json: response })
  return c.json(response, 201)
})

app.put('/v1/posts/:id/fire', zValidator('json', fireSchema), async c => {
  const postId = c.req.param('id')
  const { intensity } = c.req.valid('json')
  const db = c.get('db')
  const result = intensity === null
    ? await db.from('fires').delete().eq('post_id', postId).eq('user_id', c.get('userId'))
    : await db.from('fires').upsert({ post_id: postId, user_id: c.get('userId'), intensity }, { onConflict: 'post_id,user_id' })
  if (result.error) return error(c, 'FIRE_UPDATE_FAILED', 'Could not update your Fire.', 400)
  return c.json({ postId, intensity })
})

app.put('/v1/posts/:id/bookmark', zValidator('json', bookmarkSchema), async c => {
  const postId = c.req.param('id')
  const { saved } = c.req.valid('json')
  const db = c.get('db')
  const result = saved
    ? await db.from('bookmarks').upsert({ post_id: postId, user_id: c.get('userId') }, { onConflict: 'post_id,user_id' })
    : await db.from('bookmarks').delete().eq('post_id', postId).eq('user_id', c.get('userId'))
  if (result.error) return error(c, 'BOOKMARK_UPDATE_FAILED', 'Could not update your save.', 400)
  return c.json({ postId, saved })
})

app.post('/v1/posts/:id/replies', zValidator('json', z.object({ text: z.string().trim().min(1).max(500) })), async c => {
  const input = c.req.valid('json')
  const { data, error: queryError } = await c.get('db').from('replies').insert({ post_id: c.req.param('id'), author_id: c.get('userId'), text: input.text }).select('id, post_id, author_id, text, created_at').single()
  if (queryError) return error(c, 'REPLY_CREATE_FAILED', 'Could not add your reply.', 400)
  return c.json({ reply: data }, 201)
})

app.post('/v1/reports', zValidator('json', z.object({ postId: z.string().uuid(), reason: z.enum(['spam', 'harassment', 'unsafe', 'copyright', 'other']), details: z.string().trim().max(500).optional() })), async c => {
  const input = c.req.valid('json')
  const { error: queryError } = await c.get('db').from('reports').insert({ reporter_id: c.get('userId'), post_id: input.postId, reason: input.reason, details: input.details ?? null })
  if (queryError) return error(c, 'REPORT_CREATE_FAILED', 'Could not send this report.', 400)
  return c.json({ accepted: true }, 202)
})

app.onError((cause, c) => {
  console.error(JSON.stringify({ code: 'UNHANDLED_API_ERROR', name: cause.name }))
  return error(c, 'INTERNAL_ERROR', 'Something went wrong. Please try again.', 500)
})

export default app
