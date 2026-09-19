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
const preferencesSchema = z.object({ topics: z.array(z.string().trim().min(1).max(80)).max(30), styles: z.array(z.string().trim().min(1).max(40)).max(10), languages: z.array(z.string().trim().min(1).max(40)).max(10), sessionIntent: z.enum(['Reflect', 'Learn', 'Connect', 'Explore']), learnedTunes: z.array(z.string().trim().min(1).max(80)).max(20) })
const journalSchema = z.object({ sourceType: z.enum(['wisdom', 'post', 'personal']), sourceId: z.string().uuid().nullable().optional(), quotedSpan: z.string().max(1000).default(''), note: z.string().max(5000).default('') })
const roomSchema = z.object({ name: z.string().trim().min(2).max(80), description: z.string().trim().max(240).default(''), topic: z.string().trim().min(1).max(80), visibility: z.enum(['public', 'private']).default('public') })
const capsuleSchema = z.object({ content: z.string().trim().min(1).max(1000), revealAt: z.string().datetime(), recipientId: z.string().uuid().nullable().optional(), visibility: z.enum(['private', 'mutual']).default('private') })

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

async function isAdministrator(c: any) {
  const { data } = await c.get('db').from('admin_users').select('user_id').eq('user_id', c.get('userId')).maybeSingle()
  return Boolean(data)
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

app.get('/v1/preferences', async c => {
  const { data, error: queryError } = await c.get('db').from('user_preferences').select('topics, styles, languages, session_intent, learned_tunes').eq('user_id', c.get('userId')).maybeSingle()
  if (queryError) return error(c, 'PREFERENCES_READ_FAILED', 'Could not load your preferences.', 500)
  return c.json({ preferences: data ?? { topics: [], styles: [], languages: ['English'], session_intent: 'Explore', learned_tunes: [] } })
})

app.patch('/v1/preferences', zValidator('json', preferencesSchema), async c => {
  const input = c.req.valid('json')
  const { data, error: queryError } = await c.get('db').from('user_preferences').upsert({ user_id: c.get('userId'), topics: input.topics, styles: input.styles, languages: input.languages, session_intent: input.sessionIntent, learned_tunes: input.learnedTunes, updated_at: new Date().toISOString() }, { onConflict: 'user_id' }).select('topics, styles, languages, session_intent, learned_tunes').single()
  if (queryError) return error(c, 'PREFERENCES_UPDATE_FAILED', 'Could not save your preferences.', 400)
  return c.json({ preferences: data })
})

app.get('/v1/journal', async c => {
  const { data, error: queryError } = await c.get('db').from('journal_entries').select('id, source_type, source_id, quoted_span, note, created_at, updated_at').eq('user_id', c.get('userId')).order('created_at', { ascending: false }).limit(100)
  if (queryError) return error(c, 'JOURNAL_READ_FAILED', 'Could not load your journal.', 500)
  return c.json({ entries: data ?? [] })
})

app.post('/v1/journal', zValidator('json', journalSchema), async c => {
  const input = c.req.valid('json')
  const { data, error: queryError } = await c.get('db').from('journal_entries').insert({ user_id: c.get('userId'), source_type: input.sourceType, source_id: input.sourceId ?? null, quoted_span: input.quotedSpan, note: input.note }).select('id, source_type, source_id, quoted_span, note, created_at, updated_at').single()
  if (queryError) return error(c, 'JOURNAL_CREATE_FAILED', 'Could not save this private entry.', 400)
  return c.json({ entry: data }, 201)
})

app.delete('/v1/journal/:id', async c => {
  const { error: queryError } = await c.get('db').from('journal_entries').delete().eq('id', c.req.param('id')).eq('user_id', c.get('userId'))
  if (queryError) return error(c, 'JOURNAL_DELETE_FAILED', 'Could not delete this private entry.', 400)
  return c.body(null, 204)
})

app.get('/v1/rooms', async c => {
  const { data, error: queryError } = await c.get('db').from('rooms').select('id, slug, name, description, topic, visibility, created_by, room_memberships(user_id)').is('deleted_at', null).order('created_at', { ascending: false }).limit(100)
  if (queryError) return error(c, 'ROOMS_READ_FAILED', 'Could not load rooms.', 500)
  return c.json({ rooms: data ?? [] })
})

app.post('/v1/rooms', zValidator('json', roomSchema), async c => {
  const input = c.req.valid('json')
  const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60)
  const { data, error: queryError } = await c.get('db').from('rooms').insert({ name: input.name, slug: `${slug}-${crypto.randomUUID().slice(0, 6)}`, description: input.description, topic: input.topic, visibility: input.visibility, created_by: c.get('userId') }).select('id, slug, name, description, topic, visibility, created_by, created_at').single()
  if (queryError) return error(c, 'ROOM_CREATE_FAILED', 'Could not create this room.', 400)
  await c.get('db').from('room_memberships').insert({ room_id: data.id, user_id: c.get('userId'), role: 'owner' })
  return c.json({ room: data }, 201)
})

app.put('/v1/rooms/:id/membership', zValidator('json', z.object({ joined: z.boolean() })), async c => {
  const { joined } = c.req.valid('json')
  const roomId = c.req.param('id')
  const result = joined ? await c.get('db').from('room_memberships').upsert({ room_id: roomId, user_id: c.get('userId'), role: 'member' }, { onConflict: 'room_id,user_id' }) : await c.get('db').from('room_memberships').delete().eq('room_id', roomId).eq('user_id', c.get('userId'))
  if (result.error) return error(c, 'ROOM_MEMBERSHIP_FAILED', 'Could not update room membership.', 400)
  return c.json({ roomId, joined })
})

app.post('/v1/replies/:id/helpful', async c => {
  const replyId = c.req.param('id')
  const { data: reply, error: replyError } = await c.get('db').from('replies').select('id, post_id').eq('id', replyId).maybeSingle()
  if (replyError || !reply) return error(c, 'REPLY_NOT_FOUND', 'That reply is no longer available.', 404)
  const { data: post, error: postError } = await c.get('db').from('posts').select('id').eq('id', reply.post_id).eq('author_id', c.get('userId')).maybeSingle()
  if (postError || !post) return error(c, 'HELPFUL_NOT_ALLOWED', 'Only the question author can mark an answer helpful.', 403)
  const { data: mark, error: markError } = await c.get('db').from('answer_marks').upsert({ post_id: reply.post_id, reply_id: replyId, marked_helpful_by: c.get('userId') }, { onConflict: 'post_id,reply_id' }).select('post_id, reply_id, marked_at').single()
  if (markError) return error(c, 'HELPFUL_MARK_FAILED', 'Could not mark this answer helpful.', 400)
  return c.json({ mark })
})

app.delete('/v1/replies/:id/helpful', async c => {
  const replyId = c.req.param('id')
  const { data: reply } = await c.get('db').from('replies').select('id, post_id').eq('id', replyId).maybeSingle()
  if (!reply) return error(c, 'REPLY_NOT_FOUND', 'That reply is no longer available.', 404)
  const { data: post } = await c.get('db').from('posts').select('id').eq('id', reply.post_id).eq('author_id', c.get('userId')).maybeSingle()
  if (!post) return error(c, 'HELPFUL_NOT_ALLOWED', 'Only the question author can change helpful marks.', 403)
  const { error: deleteError } = await c.get('db').from('answer_marks').delete().eq('reply_id', replyId).eq('marked_helpful_by', c.get('userId'))
  if (deleteError) return error(c, 'HELPFUL_UNMARK_FAILED', 'Could not remove this helpful mark.', 400)
  return c.body(null, 204)
})

app.get('/v1/journeys', async c => {
  const { data, error: queryError } = await c.get('db').from('practice_journeys').select('id, slug, title, description, path, day_count, journey_enrollments!left(current_day, completed_at)').not('approved_at', 'is', null).is('deleted_at', null).limit(50)
  if (queryError) return error(c, 'JOURNEYS_READ_FAILED', 'Could not load practice journeys.', 500)
  return c.json({ journeys: data ?? [] })
})

app.put('/v1/journeys/:id/enrollment', zValidator('json', z.object({ enrolled: z.boolean() })), async c => {
  const journeyId = c.req.param('id')
  const { enrolled } = c.req.valid('json')
  const result = enrolled ? await c.get('db').from('journey_enrollments').upsert({ journey_id: journeyId, user_id: c.get('userId'), current_day: 0 }, { onConflict: 'user_id,journey_id' }) : await c.get('db').from('journey_enrollments').delete().eq('journey_id', journeyId).eq('user_id', c.get('userId'))
  if (result.error) return error(c, 'JOURNEY_ENROLLMENT_FAILED', 'Could not update this journey.', 400)
  return c.json({ journeyId, enrolled })
})

app.post('/v1/journeys/:id/advance', async c => {
  const journeyId = c.req.param('id')
  const { data: journey } = await c.get('db').from('practice_journeys').select('day_count').eq('id', journeyId).maybeSingle()
  if (!journey) return error(c, 'JOURNEY_NOT_FOUND', 'That journey is no longer available.', 404)
  const { data: enrollment } = await c.get('db').from('journey_enrollments').select('current_day').eq('journey_id', journeyId).eq('user_id', c.get('userId')).maybeSingle()
  if (!enrollment) return error(c, 'JOURNEY_NOT_ENROLLED', 'Start the journey before opening its next day.', 409)
  const currentDay = Math.min(journey.day_count, (enrollment.current_day ?? 0) + 1)
  const { data, error: updateError } = await c.get('db').from('journey_enrollments').update({ current_day: currentDay, completed_at: currentDay >= journey.day_count ? new Date().toISOString() : null }).eq('journey_id', journeyId).eq('user_id', c.get('userId')).select('journey_id, current_day, completed_at').single()
  if (updateError) return error(c, 'JOURNEY_ADVANCE_FAILED', 'Could not open the next day.', 400)
  return c.json({ enrollment: data })
})

app.get('/v1/time-capsules', async c => {
  const { data, error: queryError } = await c.get('db').from('time_capsules').select('id, content, reveal_at, opened_at, visibility, created_at').eq('author_id', c.get('userId')).order('reveal_at', { ascending: true }).limit(100)
  if (queryError) return error(c, 'CAPSULES_READ_FAILED', 'Could not load time capsules.', 500)
  return c.json({ capsules: data ?? [] })
})

app.post('/v1/time-capsules', zValidator('json', capsuleSchema), async c => {
  const input = c.req.valid('json')
  if (new Date(input.revealAt).getTime() <= Date.now()) return error(c, 'CAPSULE_DATE_INVALID', 'A time capsule must open in the future.')
  if (input.visibility === 'mutual' && !input.recipientId) return error(c, 'CAPSULE_CONSENT_REQUIRED', 'A mutual capsule needs an explicitly consented recipient.', 409)
  const { data, error: queryError } = await c.get('db').from('time_capsules').insert({ author_id: c.get('userId'), recipient_id: input.recipientId ?? null, content: input.content, reveal_at: input.revealAt, visibility: input.visibility }).select('id, content, reveal_at, opened_at, visibility, created_at').single()
  if (queryError) return error(c, 'CAPSULE_CREATE_FAILED', 'Could not seal this capsule.', 400)
  return c.json({ capsule: data }, 201)
})

app.delete('/v1/time-capsules/:id', async c => {
  const { error: deleteError } = await c.get('db').from('time_capsules').delete().eq('id', c.req.param('id')).eq('author_id', c.get('userId'))
  if (deleteError) return error(c, 'CAPSULE_DELETE_FAILED', 'Could not delete this capsule.', 400)
  return c.body(null, 204)
})

app.get('/v1/wisdom/today', async c => {
  const language = c.req.query('language') ?? 'English'
  const path = c.req.query('path')
  let query = c.get('db').from('wisdom_entries').select('id, path, language, title, exact_text, attribution, source, rights_status, context, interpretation, practice').eq('language', language).not('approved_at', 'is', null).is('deleted_at', null).limit(100)
  if (path && ['Gita', 'Stoic', 'Poetry', 'Creator', 'Blend'].includes(path)) query = query.eq('path', path)
  const { data, error: queryError } = await query
  if (queryError) return error(c, 'WISDOM_READ_FAILED', 'Could not load today\'s wisdom.', 500)
  const entries = data ?? []
  const selected = entries.length ? entries[Math.floor(Date.now() / 86_400_000) % entries.length] : null
  return c.json({ entry: selected })
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

app.get('/v1/admin/reports', async c => {
  if (!await isAdministrator(c)) return error(c, 'FORBIDDEN', 'Administrator access is required.', 403)
  const { data, error: queryError } = await c.get('db').from('reports').select('id, post_id, reason, details, status, created_at, reviewed_at, posts(text, author_id)').order('created_at', { ascending: false }).limit(200)
  if (queryError) return error(c, 'REPORTS_READ_FAILED', 'Could not load the report queue.', 500)
  return c.json({ reports: data ?? [] })
})

app.patch('/v1/admin/reports/:id', zValidator('json', z.object({ status: z.enum(['reviewed', 'actioned', 'dismissed']) })), async c => {
  if (!await isAdministrator(c)) return error(c, 'FORBIDDEN', 'Administrator access is required.', 403)
  const { status } = c.req.valid('json')
  const { data, error: queryError } = await c.get('db').from('reports').update({ status, reviewed_at: new Date().toISOString(), reviewed_by: c.get('userId') }).eq('id', c.req.param('id')).select('id, status, reviewed_at').single()
  if (queryError) return error(c, 'REPORT_UPDATE_FAILED', 'Could not update this report.', 400)
  return c.json({ report: data })
})

app.onError((cause, c) => {
  console.error(JSON.stringify({ code: 'UNHANDLED_API_ERROR', name: cause.name }))
  return error(c, 'INTERNAL_ERROR', 'Something went wrong. Please try again.', 500)
})

export default app
