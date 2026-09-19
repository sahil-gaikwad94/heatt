import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import {
  ArrowRight, Bell, BookOpen, Bookmark, Check, ChevronRight, Clock, Compass, Flame, Heart, Home, Lock, MessageCircle,
  Moon, MoreHorizontal, Plus, Quote, Search, Send, Settings, Share2, SlidersHorizontal, Sparkles, User, Users, X,
} from 'lucide-react'
import { signInWithGoogle, supabase } from './lib/auth'
import { heattApi } from './lib/api'
import wisdomCatalog from '../content/wisdom/library.json'
import { rankRecommendations, type RecommendationResult } from './lib/recommendation'
import { HeattAtmosphere } from './components/HeattAtmosphere'
import { SettingsPage } from './components/SettingsPage'
import { LandingPage } from './components/LandingPage'
import { ProfilePage, type ProfileStats } from './components/ProfilePage'
import { BuddyChat, BuddyDock, buddyTeaser } from './components/Buddy'
import { ReaderPortal } from './components/FlareReader'
import { HeatButton } from './components/Heat'
import { SourceMark } from './components/ui/SourceMark'
import { Dialog, DialogContent, DialogFooter, DialogHeader } from './components/ui/Dialog'
import { cn } from './lib/cn'
import { normalizeTheme, type Preferences, type ProfileData, type ThemeId } from './types'
import { blogCatalog, blogCatalogReviewedOn, blogCategories, type BlogCategory, type BlogSource } from './data/blogCatalog'
import { artFor } from './data/categoryArt'
import { buddyById, buddyReply, buddyWarmth, type Buddy, type BuddyMessage } from './data/buddies'

type Page = 'landing' | 'home' | 'rooms' | 'create' | 'journal' | 'wisdom' | 'profile' | 'settings' | 'admin'
type FeedMode = 'For You' | 'Following' | 'Rooms'
type PostType = 'Thought' | 'Question' | 'Practice' | 'Poem' | 'Check-in'
type IconName = 'home' | 'compass' | 'plus' | 'book' | 'user' | 'search' | 'bell' | 'fire' | 'bookmark' | 'message' | 'more' | 'spark' | 'arrow' | 'sliders' | 'x' | 'check' | 'moon' | 'send' | 'clock' | 'users' | 'heart' | 'share' | 'settings' | 'quote' | 'lock' | 'chevron'

type Author = { id: string; name: string; handle: string; initials: string; tone: string; bio: string; avatarData?: string }
type Post = {
  id: string; authorId: string; type: PostType; topic: string; text: string; createdAt: number
  room?: string; invitation?: 'Advice welcome' | 'Just sharing' | 'Questions welcome'; tags?: string[]
}
type Comment = { id: string; postId: string; author: string; initials: string; text: string; createdAt: number }
type Wisdom = {
  id: string; path: string; title: string; sourceText: string; source: string; editorialContext: string; practicePrompt: string
  attribution: string; edition: string; sourceUrl: string; sourceType: 'original' | 'public-domain-source-review'; rightsStatus: 'original' | 'public_domain_source_pending_review' | 'licensed' | 'do_not_publish'
  rightsNotes: string; jurisdictionCaveat: string; provenance: string; reviewState: 'approved_internal_original' | 'pending_rights_review'; work: string; author: string; translatorOrEditor: string; sourceLocation: string; language: string; contentNotes: string; interpretation: string; tags: string[]; retrievedOn: string
  tone?: string; triedBy?: number
}
type JournalEntry = { id: string; source: string; quote: string; note: string; createdAt: number }
type TimeCapsule = { id: string; content: string; revealAt: number; openedAt?: number }
type RoomSummary = { name: string; description: string; members: string; posts: string; tone: string; topic: string }
type StoredState = { posts: Post[]; comments: Comment[]; reactions: Record<string, number>; saved: string[]; savedBlogs: string[]; following: string[]; joinedRooms: string[]; journal: JournalEntry[]; capsules: TimeCapsule[]; journeyProgress: Record<string, number>; helpfulReplies: string[]; preferences: Preferences; onboarded: boolean; theme: ThemeId; buddyId: string; buddyChats: BuddyMessage[]; profile: ProfileData; authorProfiles: Record<string, Author> }

const topics = ['Creative practice', 'Books & ideas', 'Poetry & language', 'Relationships', 'Health & attention', 'Leadership', 'Strategy & decisions', 'Innovation & technology', 'Work & careers', 'Culture & society', 'Philosophy', 'Making & craft', 'Money & meaning']
const styles = ['Practical', 'Reflective', 'Funny', 'Poetic', 'Curious']
const intents = ['Reflect', 'Learn', 'Connect', 'Explore']

/** Every post on Heatt is a flare. The API keeps its own wire value. */
const postTypeLabel: Record<PostType, string> = { Thought: 'Flare', Question: 'Question', Practice: 'Practice', Poem: 'Poem', 'Check-in': 'Check-in' }

const authors: Author[] = [
  { id: 'user', name: 'Guest Reader', handle: 'guest', initials: 'GR', tone: 'user', bio: 'A private, local profile until you choose to sign in.' },
]

// There are no fabricated community members in the cold-start experience.
// Public posts arrive from the authenticated API; until then, original
// publishers in blogCatalog make the discovery feed useful.
const initialPosts: Post[] = []
const initialComments: Comment[] = []

const journeys = [
  { id: 'noticing', title: '7 mornings of noticing', description: 'A small daily practice for paying attention before the day gets loud.', days: 7, tone: 'sage', label: 'Mindfulness' },
  { id: 'patient-work', title: 'The patient work', description: 'Five prompts for making something slowly, without needing an audience yet.', days: 5, tone: 'amber', label: 'Creative practice' },
  { id: 'good-questions', title: 'A life of good questions', description: 'Six days of asking better questions of yourself and the people around you.', days: 6, tone: 'lilac', label: 'Relationships' },
]

const wisdomLibrary: Wisdom[] = wisdomCatalog as Wisdom[]

const defaultState: StoredState = {
  posts: initialPosts,
  comments: initialComments,
  reactions: {},
  saved: [],
  savedBlogs: [],
  following: [],
  joinedRooms: [],
  journal: [],
  capsules: [],
  journeyProgress: {},
  helpfulReplies: [],
  preferences: { topics: ['Creative practice', 'Books & ideas', 'Philosophy', 'Making & craft'], styles: ['Reflective', 'Curious'], intent: 'Explore', languages: ['English'], tuned: [], excludedIds: [] },
  theme: 'ember',
  buddyId: 'kindle',
  buddyChats: [],
  profile: { name: 'Guest Reader', handle: 'guest', bio: 'A private, local profile until you choose to sign in.' },
  authorProfiles: Object.fromEntries(authors.map(author => [author.id, author])),
  onboarded: false,
}

function loadState(): StoredState {
  try {
    const raw = window.localStorage.getItem('heatt-state')
    if (!raw) return defaultState
    const parsed = JSON.parse(raw) as Partial<StoredState>
    const legacySeedIds = new Set(['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'])
    const posts = (parsed.posts ?? defaultState.posts).filter(post => !legacySeedIds.has(post.id))
    return { ...defaultState, ...parsed, posts, comments: (parsed.comments ?? []).filter(comment => !legacySeedIds.has(comment.postId)), saved: (parsed.saved ?? []).filter(id => !legacySeedIds.has(id)), savedBlogs: parsed.savedBlogs ?? [], following: (parsed.following ?? []).filter(id => id === 'user'), joinedRooms: parsed.joinedRooms ?? [], theme: normalizeTheme(parsed.theme), profile: { ...defaultState.profile, ...(parsed.profile ?? {}) }, authorProfiles: { ...defaultState.authorProfiles, ...(parsed.authorProfiles ?? {}) }, capsules: parsed.capsules ?? defaultState.capsules, journeyProgress: parsed.journeyProgress ?? defaultState.journeyProgress, helpfulReplies: parsed.helpfulReplies ?? defaultState.helpfulReplies, buddyChats: parsed.buddyChats ?? [], preferences: { ...defaultState.preferences, ...(parsed.preferences ?? {}) } }
  } catch { return defaultState }
}

/* ---------- icons (lucide) ---------- */

const iconRegistry: Record<IconName, typeof Flame> = {
  home: Home, compass: Compass, plus: Plus, book: BookOpen, user: User, search: Search, bell: Bell, fire: Flame,
  bookmark: Bookmark, message: MessageCircle, more: MoreHorizontal, spark: Sparkles, arrow: ArrowRight, sliders: SlidersHorizontal,
  x: X, check: Check, moon: Moon, send: Send, clock: Clock, users: Users, heart: Heart, share: Share2, settings: Settings,
  quote: Quote, lock: Lock, chevron: ChevronRight,
}

function Icon({ name, size = 18, stroke = 1.8 }: { name: IconName; size?: number; stroke?: number }) {
  const Glyph = iconRegistry[name]
  return <Glyph width={size} height={size} strokeWidth={stroke} aria-hidden className="shrink-0" />
}

function formatTime(timestamp: number) {
  const minutes = Math.max(1, Math.floor((Date.now() - timestamp) / 60000))
  if (minutes < 60) return `${minutes}m`
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h`
  return `${Math.floor(minutes / 1440)}d`
}
function authorFor(id: string) { return authors.find(author => author.id === id) ?? authors[0] }
function countGraphemes(value: string) {
  if ('Segmenter' in Intl) {
    const Segmenter = Intl.Segmenter
    return Array.from(new Segmenter(undefined, { granularity: 'grapheme' }).segment(value)).length
  }
  return Array.from(value).length
}
function avatarClass(tone: string) { return `avatar avatar-${tone}` }
function initialsFor(name: string) { return name.split(/\s+/).filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase() || 'GR' }
function formatHeadingDate() { return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date()).toUpperCase() }
function seededNumber(input: string) { return input.split('').reduce((total, char) => total + char.charCodeAt(0), 0) }
const wisdomPathTopics: Record<string, string[]> = {
  Gita: ['Philosophy', 'Books & ideas', 'Culture & society'],
  Stoic: ['Philosophy', 'Health & attention', 'Strategy & decisions'],
  Poetry: ['Poetry & language', 'Culture & society'],
  Creator: ['Creative practice', 'Making & craft', 'Innovation & technology', 'Work & careers'],
  Blend: ['Relationships', 'Health & attention', 'Money & meaning'],
}
function wisdomForPreferences(preferences: Preferences) {
  const preferredPaths = Object.entries(wisdomPathTopics).filter(([, pathTopics]) => preferences.topics.some(topic => pathTopics.includes(topic))).map(([path]) => path)
  const matching = wisdomLibrary.filter(item => preferredPaths.includes(item.path))
  const originalFallback = wisdomLibrary.filter(item => item.rightsStatus === 'original')
  const pool = matching.length ? matching : originalFallback.length ? originalFallback : wisdomLibrary
  const seed = `${preferences.intent}|${preferences.topics.join('|')}|${preferences.tuned.join('|')}`
  return pool[seededNumber(seed) % pool.length]
}
function categorySlug(category: string) { return category.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') }
function categoryFromPath(pathname: string) {
  const slug = pathname.match(/^\/explore\/([^/]+)\/?$/)?.[1]
  return slug ? blogCategories.find(category => categorySlug(category) === slug) : undefined
}

export default function App() {
  const [state, setState] = useState<StoredState>(loadState)
  const [page, setPage] = useState<Page>('home')
  const [feedMode, setFeedMode] = useState<FeedMode>('For You')
  const [search, setSearch] = useState('')
  const [showTuner, setShowTuner] = useState(false)
  const [showShare, setShowShare] = useState<Post | Wisdom | null>(null)
  const [toast, setToast] = useState('')
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null)
  const [signedIn, setSignedIn] = useState(false)
  const [openBlog, setOpenBlog] = useState<BlogSource | null>(null)
  const [buddyChatOpen, setBuddyChatOpen] = useState(false)

  useEffect(() => { window.localStorage.setItem('heatt-state', JSON.stringify(state)); document.documentElement.dataset.theme = normalizeTheme(state.theme) }, [state])
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(''), 2600); return () => window.clearTimeout(timer) }, [toast])
  useEffect(() => {
    if (!supabase) return
    let active = true
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      setSignedIn(Boolean(data.session))
      if (!data.session) return
      try {
        const response = await heattApi.getProfile()
        const remote = response.profile as { display_name?: string; handle?: string; bio?: string; avatar_url?: string | null } | null
        if (remote && active) setState(previous => ({ ...previous, profile: { ...previous.profile, name: remote.display_name ?? previous.profile.name, handle: remote.handle ?? previous.profile.handle, bio: remote.bio ?? previous.profile.bio, avatarData: remote.avatar_url ?? previous.profile.avatarData } }))
        const preferencesResponse = await heattApi.getPreferences()
        const remotePreferences = preferencesResponse.preferences as { topics?: string[]; styles?: string[]; languages?: string[]; session_intent?: string; learned_tunes?: string[] } | null
        if (remotePreferences && active) setState(previous => ({ ...previous, preferences: { ...previous.preferences, topics: remotePreferences.topics ?? previous.preferences.topics, styles: remotePreferences.styles ?? previous.preferences.styles, languages: remotePreferences.languages ?? previous.preferences.languages, intent: (remotePreferences.session_intent as Preferences['intent']) ?? previous.preferences.intent, tuned: remotePreferences.learned_tunes ?? previous.preferences.tuned } }))
        const journalResponse = await heattApi.getJournal()
        const remoteJournal = (journalResponse.entries as Array<{ id: string; source_type: 'wisdom' | 'post' | 'personal'; quoted_span: string; note: string; created_at: string }>).map(item => ({ id: item.id, source: item.source_type === 'personal' ? 'Personal note' : item.source_type, quote: item.quoted_span, note: item.note, createdAt: new Date(item.created_at).getTime() }))
        if (remoteJournal.length && active) setState(previous => ({ ...previous, journal: remoteJournal }))
        const capsuleResponse = await heattApi.getTimeCapsules()
        const remoteCapsules = (capsuleResponse.capsules as Array<{ id: string; content: string; reveal_at: string; opened_at?: string | null }>).map(item => ({ id: item.id, content: item.content, revealAt: new Date(item.reveal_at).getTime(), openedAt: item.opened_at ? new Date(item.opened_at).getTime() : undefined }))
        if (remoteCapsules.length && active) setState(previous => ({ ...previous, capsules: remoteCapsules }))
      } catch { /* Local-first mode remains usable when the API is not configured. */ }
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(Boolean(session)))
    return () => { active = false; listener.subscription.unsubscribe() }
  }, [])
  useEffect(() => {
    if (!signedIn) return
    let active = true
    heattApi.getFeed('for-you').then(response => {
      if (!active || !response.posts.length) return
      const remotePosts = (response.posts as Array<{ id: string; author_id: string; post_type: PostType; topic: string; text: string; created_at: string; invitation?: Post['invitation']; profiles?: { id?: string; display_name?: string; handle?: string; bio?: string; avatar_url?: string | null } | null }>).map(post => ({ id: post.id, authorId: post.author_id, type: post.post_type, topic: post.topic, text: post.text, createdAt: new Date(post.created_at).getTime(), invitation: post.invitation ?? 'Just sharing' as const }))
      const remoteAuthors = Object.fromEntries((response.posts as Array<{ author_id: string; profiles?: { id?: string; display_name?: string; handle?: string; bio?: string; avatar_url?: string | null } | null }>).filter(post => post.profiles).map(post => [post.author_id, { id: post.author_id, name: post.profiles?.display_name ?? 'Heatt member', handle: post.profiles?.handle ?? 'member', initials: (post.profiles?.display_name ?? 'HM').split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase(), tone: 'ink', bio: post.profiles?.bio ?? '', avatarData: post.profiles?.avatar_url ?? undefined }]))
      setState(previous => ({ ...previous, posts: remotePosts, authorProfiles: { ...previous.authorProfiles, ...remoteAuthors } }))
    }).catch(() => undefined)
    return () => { active = false }
  }, [signedIn])

  const setStatePartial = (partial: Partial<StoredState>) => setState(previous => ({ ...previous, ...partial }))
  const setTheme = (next: ThemeId) => {
    document.documentElement.classList.add('theme-transitioning')
    setStatePartial({ theme: next })
    window.setTimeout(() => document.documentElement.classList.remove('theme-transitioning'), 560)
  }
  const toggleSave = (postId: string) => {
    const wasSaved = state.saved.includes(postId)
    setStatePartial({ saved: wasSaved ? state.saved.filter(id => id !== postId) : [...state.saved, postId] })
    if (signedIn) heattApi.setBookmark(postId, !wasSaved).catch(() => { setState(previous => ({ ...previous, saved: wasSaved ? [...previous.saved, postId] : previous.saved.filter(id => id !== postId) })); setToast('Could not sync that save. It is still available locally.') })
  }
  const toggleSaveBlog = (blogId: string) => {
    const wasSaved = state.savedBlogs.includes(blogId)
    setState(previous => ({ ...previous, savedBlogs: wasSaved ? previous.savedBlogs.filter(id => id !== blogId) : [...previous.savedBlogs, blogId] }))
    setToast(wasSaved ? 'Removed from your reading shelf.' : 'Saved to your reading shelf.')
  }
  const setReaction = (postId: string, intensity: number) => {
    setState(previous => ({ ...previous, reactions: { ...previous.reactions, [postId]: intensity } }))
    if (signedIn) heattApi.setFire(postId, (intensity || null) as 1 | 2 | 3 | null).catch(() => { setToast('Could not sync that Fire. It is still available locally.') })
  }
  /** Blog heat stays local — catalog sources are not server posts. */
  const setBlogReaction = (blogId: string, intensity: number) => {
    setState(previous => ({ ...previous, reactions: { ...previous.reactions, [blogId]: intensity } }))
  }
  const addComment = (comment: Comment) => {
    setState(previous => ({ ...previous, comments: [...previous.comments, comment] }))
    if (signedIn) heattApi.createReply(comment.postId, comment.text).catch(() => { setState(previous => ({ ...previous, comments: previous.comments.filter(item => item.id !== comment.id) })); setToast('Could not sync that reply. Try again when connected.') })
  }
  const createPost = (post: Post) => {
    setState(previous => ({ ...previous, posts: [post, ...previous.posts] })); setPage('home'); setFeedMode('Following'); setToast('Your flare is live — it is warming the room.')
    if (signedIn) heattApi.createPost({ text: post.text, type: post.type, topic: post.topic, invitation: post.invitation }).then(response => {
      const remote = response.post as { id?: string; created_at?: string }
      if (remote.id) setState(previous => ({ ...previous, posts: previous.posts.map(item => item.id === post.id ? { ...item, id: remote.id!, createdAt: remote.created_at ? new Date(remote.created_at).getTime() : item.createdAt } : item) }))
    }).catch(() => { setState(previous => ({ ...previous, posts: previous.posts.filter(item => item.id !== post.id) })); setToast('Could not publish online. Your draft was removed from the feed; try again when connected.') })
  }
  const joinRoom = (room: string) => { const joined = state.joinedRooms.includes(room); setStatePartial({ joinedRooms: joined ? state.joinedRooms.filter(item => item !== room) : [...state.joinedRooms, room] }); setToast(joined ? `Left ${room}` : `Joined ${room}`) }
  const toggleHelpful = (replyId: string) => {
    const wasMarked = state.helpfulReplies.includes(replyId)
    setState(previous => ({ ...previous, helpfulReplies: wasMarked ? previous.helpfulReplies.filter(id => id !== replyId) : [...previous.helpfulReplies, replyId] }))
    if (signedIn) (wasMarked ? heattApi.unmarkHelpful(replyId) : heattApi.markHelpful(replyId)).catch(() => { setState(previous => ({ ...previous, helpfulReplies: wasMarked ? [...previous.helpfulReplies, replyId] : previous.helpfulReplies.filter(id => id !== replyId) })); setToast('Could not sync that helpful mark.') })
  }
  const addCapsule = (capsule: TimeCapsule) => {
    setState(previous => ({ ...previous, capsules: [capsule, ...previous.capsules] })); setToast('Time capsule sealed. It will wait for you.')
    if (signedIn) heattApi.createTimeCapsule({ content: capsule.content, revealAt: new Date(capsule.revealAt).toISOString(), visibility: 'private' }).then(response => { const remote = response.capsule as { id?: string; reveal_at?: string }; if (remote.id) setState(previous => ({ ...previous, capsules: previous.capsules.map(item => item.id === capsule.id ? { ...item, id: remote.id!, revealAt: remote.reveal_at ? new Date(remote.reveal_at).getTime() : item.revealAt } : item) })) }).catch(() => { setState(previous => ({ ...previous, capsules: previous.capsules.filter(item => item.id !== capsule.id) })); setToast('Could not sync this capsule. Try again when connected.') })
  }
  const advanceJourney = (journeyId: string) => { const journey = journeys.find(item => item.id === journeyId); if (!journey) return; const current = state.journeyProgress[journeyId] ?? 0; setState(previous => ({ ...previous, journeyProgress: { ...previous.journeyProgress, [journeyId]: Math.min(journey.days, current + 1) } })); setToast(current + 1 >= journey.days ? 'Journey complete. A new waypoint on your trail.' : 'Next day unlocked. No streak required.') }
  const toggleFollow = (authorId: string) => { const following = state.following.includes(authorId); setStatePartial({ following: following ? state.following.filter(id => id !== authorId) : [...state.following, authorId] }); setToast(following ? 'Voice removed from Following.' : 'You will see more from this voice.') }
  const addJournal = (entry: JournalEntry) => {
    setState(previous => ({ ...previous, journal: [entry, ...previous.journal] })); setToast('Saved privately to your journal.')
    if (signedIn) heattApi.createJournalEntry({ sourceType: entry.source === 'Personal note' ? 'personal' : 'wisdom', quotedSpan: entry.quote, note: entry.note }).then(response => {
      const remote = response.entry as { id?: string; created_at?: string }
      if (remote.id) setState(previous => ({ ...previous, journal: previous.journal.map(item => item.id === entry.id ? { ...item, id: remote.id!, createdAt: remote.created_at ? new Date(remote.created_at).getTime() : item.createdAt } : item) }))
    }).catch(() => { setState(previous => ({ ...previous, journal: previous.journal.filter(item => item.id !== entry.id) })); setToast('Could not sync this private entry. Try again when connected.') })
  }

  /* ---------- companion state ---------- */
  const buddy = useMemo<Buddy>(() => buddyById(state.buddyId), [state.buddyId])
  const warmth = useMemo(() => buddyWarmth({
    flares: state.posts.filter(post => post.authorId === 'user').length,
    heat: Object.values(state.reactions).filter(value => value > 0).length,
    reads: state.savedBlogs.length,
    chats: state.buddyChats.filter(message => message.from === 'you').length,
  }), [state.posts, state.reactions, state.savedBlogs, state.buddyChats])
  const buddyTeaseLine = useMemo(() => buddyTeaser(buddy, state.profile.name.split(' ')[0] || 'friend'), [buddy, state.profile.name])
  const sendBuddyMessage = (text: string) => setState(previous => {
    const at = Date.now()
    const replies = [...previous.buddyChats, { id: `m-${at}-you`, from: 'you' as const, text, at }, { id: `m-${at}-buddy`, from: 'buddy' as const, text: buddyReply(buddy, text, warmth), at: at + 1 }]
    return { ...previous, buddyChats: replies.slice(-120) }
  })
  const profileStats = useMemo<ProfileStats>(() => ({
    flares: state.posts.filter(post => post.authorId === 'user').length,
    heatGiven: Object.values(state.reactions).filter(value => value > 0).length,
    saved: state.saved.length + state.savedBlogs.length,
    rooms: state.joinedRooms.length,
    shelves: state.preferences.topics.length,
  }), [state.posts, state.reactions, state.saved, state.savedBlogs, state.joinedRooms, state.preferences.topics])

  const recommendations = useMemo<RecommendationResult<Post>[]>(() => {
    const query = search.trim().toLowerCase()
    const eligible = state.posts.filter(post => {
      const author = state.authorProfiles[post.authorId] ?? authorFor(post.authorId)
      const matchesSearch = !query || `${post.text} ${post.topic} ${author.name} ${author.handle} ${post.room ?? ''}`.toLowerCase().includes(query)
      const matchesMode = feedMode === 'For You' || (feedMode === 'Following' ? post.authorId === 'user' || state.following.includes(post.authorId) : post.room ? state.joinedRooms.includes(post.room) : false)
      return matchesSearch && matchesMode
    })
    return rankRecommendations(eligible, {
      topics: state.preferences.topics,
      styles: state.preferences.styles,
      intent: state.preferences.intent,
      following: state.following,
      joinedRooms: state.joinedRooms,
      savedIds: state.saved,
      excludedIds: state.preferences.excludedIds,
      tuned: state.preferences.tuned,
    }, { pageSize: 7, mode: feedMode })
  }, [feedMode, search, state.following, state.joinedRooms, state.posts, state.preferences, state.saved])
  const filteredPosts = recommendations.map(result => result.item)
  const recommendationReasons = Object.fromEntries(recommendations.map(result => [result.item.id, result.reason]))

  const openPage = (next: Page) => { setPage(next); setSearch(''); setSelectedRoom(null); window.scrollTo({ top: 0 }) }
  const handleSignIn = async () => { try { const result = await signInWithGoogle(); if (result.error) setToast('Sign in is unavailable right now. You can keep exploring locally.'); } catch { setToast('Connect Supabase Auth to enable account sign-in.'); } }
  const publicCategory = categoryFromPath(window.location.pathname)
  if (publicCategory) return <PublicExplorePage category={publicCategory} onEnter={() => { window.history.pushState({}, '', '/'); window.location.reload() }} />
  if (window.location.pathname === '/privacy' || window.location.pathname === '/terms') return <LegalPage kind={window.location.pathname === '/privacy' ? 'privacy' : 'terms'} />
  if (window.location.pathname === '/admin') return <AdminPage signedIn={signedIn} onSignIn={handleSignIn} />
  if (!state.onboarded) return <OnboardingPage preferences={state.preferences} onComplete={preferences => setState(previous => ({ ...previous, preferences, onboarded: true }))} />
  const surfaceAtmosphere: ThemeId = normalizeTheme(state.theme)

  return <MotionConfig reducedMotion="user"><div className={`app-shell atmosphere-${surfaceAtmosphere} preference-${state.theme || 'ember'}`}>
    <main className="main-column">
      <header className="topbar">
        <button className="mobile-brand" onClick={() => openPage('home')} aria-label="Heatt home"><span className="brand-mark"><span /></span><span className="brand-name">heatt</span></button>
        <label className="search-box"><Icon name="search" size={17} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search shelves, topics, flares" aria-label="Search Heatt" />{search && <button onClick={() => setSearch('')} aria-label="Clear search"><Icon name="x" size={15} /></button>}</label>
        <div className="top-actions"><button className="icon-button notification-button" aria-label="Notifications"><Icon name="bell" size={19} /></button><button className="avatar avatar-user avatar-small" onClick={() => openPage('profile')} aria-label="Open profile">{initialsFor(state.profile.name)}</button></div>
      </header>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={page} className={`route-stage surface-${surfaceAtmosphere}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: .32, ease: [0.22, 1, 0.36, 1] }}>
          {page === 'landing' && <LandingPage onEnter={() => openPage('home')} onExplore={() => openPage('rooms')} onSignIn={handleSignIn} theme={surfaceAtmosphere} onChooseTheme={setTheme} buddyId={state.buddyId} />}
          {page === 'home' && <HomePage posts={filteredPosts} mode={feedMode} setMode={setFeedMode} state={state} search={search} onClearSearch={() => setSearch('')} onReact={setReaction} onSave={toggleSave} onSaveBlog={toggleSaveBlog} onOpenBlog={setOpenBlog} onComment={addComment} onShare={setShowShare} onTune={() => setShowTuner(true)} onToast={setToast} onCreatePost={createPost} onFollow={toggleFollow} onJournal={addJournal} recommendationReasons={recommendationReasons} helpfulReplies={state.helpfulReplies} onHelpful={toggleHelpful} />}
          {page === 'rooms' && <RoomsPage joinedRooms={state.joinedRooms} onJoin={joinRoom} onOpenRoom={room => setSelectedRoom(room)} selectedRoom={selectedRoom} posts={state.posts} state={state} onReact={setReaction} onSave={toggleSave} onComment={addComment} onShare={setShowShare} onFollow={toggleFollow} onJournal={addJournal} helpfulReplies={state.helpfulReplies} onHelpful={toggleHelpful} onToast={setToast} onCreateRoom={room => { if (signedIn) heattApi.createRoom(room).then(() => setToast('Your room is synced.')).catch(() => setToast('Room created locally. Sync will retry when the API is available.')); }} />}
          {page === 'create' && <CreatePage profile={state.profile} onCreate={createPost} onCancel={() => openPage('home')} />}
          {page === 'journal' && <JournalPage entries={state.journal} savedPosts={state.posts.filter(post => state.saved.includes(post.id))} capsules={state.capsules} onShare={setShowShare} onAddJournal={addJournal} onAddCapsule={addCapsule} />}
          {page === 'wisdom' && <WisdomPage state={state} journeyProgress={state.journeyProgress} onJourneyChange={advanceJourney} onAddJournal={addJournal} onShare={setShowShare} onToast={setToast} />}
          {page === 'settings' && <SettingsPage theme={surfaceAtmosphere} onThemeChange={setTheme} buddyId={state.buddyId} onBuddyChange={buddyId => setStatePartial({ buddyId })} preferences={state.preferences} onPreferencesChange={preferences => setStatePartial({ preferences })} signedIn={signedIn} onSignIn={handleSignIn} onOpenProfile={() => openPage('profile')} />}
          {page === 'profile' && <ProfilePage
            profile={state.profile}
            preferences={state.preferences}
            stats={profileStats}
            buddy={buddy}
            warmth={warmth}
            signedIn={signedIn}
            onOpenChat={() => setBuddyChatOpen(true)}
            onSwapBuddy={() => openPage('settings')}
            onSavePreferences={preferences => { setStatePartial({ preferences }); if (signedIn) heattApi.updatePreferences({ topics: preferences.topics, styles: preferences.styles, languages: preferences.languages, sessionIntent: preferences.intent, learnedTunes: preferences.tuned }).then(() => setToast('Your preferences are synced.')).catch(() => setToast('Saved locally. Sync will retry when the API is available.')); else setToast('Your preferences are updated.'); }}
            onSaveProfile={profile => { setStatePartial({ profile }); if (signedIn) { heattApi.updateProfile({ name: profile.name, handle: profile.handle, bio: profile.bio }).then(() => setToast('Your profile is synced.')).catch(() => setToast('Saved locally. Sync will retry when the API is available.')); } else setToast('Your profile is ready for the next conversation.'); }}
            onOpenAbout={() => { openPage('landing'); window.scrollTo(0, 0) }}
          />}
        </motion.div>
      </AnimatePresence>
    </main>

    <nav className="mobile-nav" aria-label="Mobile navigation"><MobileNavItem icon="home" label="Home" active={page === 'home'} onClick={() => openPage('home')} /><MobileNavItem icon="compass" label="Rooms" active={page === 'rooms'} onClick={() => openPage('rooms')} /><MobileNavItem icon="plus" label="Create" active={page === 'create'} onClick={() => openPage('create')} /><MobileNavItem icon="book" label="Journal" active={page === 'journal'} onClick={() => openPage('journal')} /><MobileNavItem icon="user" label="You" active={page === 'profile'} onClick={() => openPage('profile')} /><MobileNavItem icon="settings" label="Settings" active={page === 'settings'} onClick={() => openPage('settings')} /></nav>

    {page === 'home' && <BuddyDock buddy={buddy} unreadLine={buddyTeaseLine} onOpen={() => setBuddyChatOpen(true)} />}
    {buddyChatOpen && <BuddyChat buddy={buddy} messages={state.buddyChats} onSend={sendBuddyMessage} onClose={() => setBuddyChatOpen(false)} warmthLabel={warmth.label} />}
    {openBlog && <ReaderPortal blog={openBlog} heat={state.reactions[openBlog.id] ?? 0} onHeat={value => setBlogReaction(openBlog.id, value)} saved={state.savedBlogs.includes(openBlog.id)} onSave={() => toggleSaveBlog(openBlog.id)} onToast={setToast} onClose={() => setOpenBlog(null)} />}
    {showTuner && <TunerModal preferences={state.preferences} onClose={() => setShowTuner(false)} onSave={preferences => { setStatePartial({ preferences }); setShowTuner(false); setToast('Feed tuned. Your choices lead the way.'); }} />}
    {showShare && <ShareModal item={showShare} onClose={() => setShowShare(null)} onToast={setToast} />}
    {toast && <div className="toast" role="status"><span className="toast-check"><Icon name="check" size={14} /></span>{toast}</div>}
  </div></MotionConfig>
}

function OnboardingPage({ preferences, onComplete }: { preferences: Preferences; onComplete: (preferences: Preferences) => void }) {
  const [selectedTopics, setSelectedTopics] = useState<string[]>([])
  const toggleTopic = (topic: string) => setSelectedTopics(current => current.includes(topic) ? current.filter(item => item !== topic) : [...current, topic])
  const finish = () => onComplete({ ...preferences, topics: selectedTopics.length ? selectedTopics : preferences.topics })
  return <main className="ember-onboarding">
    <header className="onboarding-header"><span className="brand-lockup"><span className="brand-mark"><span /></span><span className="brand-name">heatt</span></span><button className="onboarding-skip" onClick={finish}>Skip</button></header>
    <section className="onboarding-card">
      <div className="ember-aura" aria-hidden="true"><span /><span /></div>
      <p className="onboarding-welcome">A quieter place for worthwhile ideas</p>
      <h1>What would you like<br />to <em>make room for?</em></h1>
      <p className="onboarding-reassurance">Choose anything that feels alive right now. There is no wrong answer, and you can change this later.</p>
      <div className="onboarding-pills" aria-label="Choose topics">{topics.map(topic => <button key={topic} aria-pressed={selectedTopics.includes(topic)} className={selectedTopics.includes(topic) ? 'selected' : ''} onClick={() => toggleTopic(topic)}>{selectedTopics.includes(topic) && <Icon name="check" size={13} />}{topic}</button>)}</div>
      <button className="onboarding-enter" onClick={finish}>Enter heatt</button>
      <p className="onboarding-change">Your choices shape your first shelf. Change them anytime in Profile.</p>
    </section>
  </main>
}

function PublicExplorePage({ category, onEnter }: { category: BlogCategory; onEnter: () => void }) {
  const sources = blogCatalog.filter(source => source.category === category)
  return <div className="public-explore">
    <header className="public-header"><a className="brand-lockup" href="/"><span className="brand-mark"><span /></span><span className="brand-name">heatt</span></a><nav><a href="/#rooms">Rooms</a><a href="/privacy">Privacy</a><button className="primary-button" onClick={onEnter}>Open Heatt <Icon name="arrow" size={14} /></button></nav></header>
    <main><section className="public-hero"><p className="kicker">THE OPEN WEB · CURATED BY PEOPLE</p><h1>Best free {category.toLowerCase()} blogs<br /><em>worth your attention.</em></h1><p>{sources.length} thoughtful, free-to-read sources. Every link opens at the original publisher — no copied articles, invented activity, or login wall from us.</p><div className="public-stats"><span><strong>{sources.length}</strong> sources</span><span><strong>100%</strong> original links</span><span><strong>{blogCatalogReviewedOn}</strong> last reviewed</span></div></section>
    <section className="public-source-list" aria-label={`${category} sources`}>{sources.map((source, index) => <article key={source.id}><span className={`public-source-number accent-${index % 5}`}>{String(index + 1).padStart(2, '0')}</span><div><p className="kicker">{source.publisher} · FREE TO READ</p><h2>{source.name}</h2><p>{source.description}</p><div className="public-tags">{source.tags.slice(0, 3).map(tag => <span key={tag}>#{tag}</span>)}</div></div><a href={source.url} target="_blank" rel="noopener noreferrer">Visit original <Icon name="arrow" size={15} /></a></article>)}</section>
    <section className="public-cta"><span className="spark-soft"><Icon name="spark" size={19} /></span><h2>Your reading should lead somewhere.</h2><p>Save sources, tune your shelf, and follow a curiosity trail — without giving up control of your attention.</p><button className="primary-button" onClick={onEnter}>Build your personal shelf <Icon name="arrow" size={15} /></button></section></main>
    <footer className="public-footer"><span>© 2026 Heatt</span><span>Worthwhile expression, intentional discovery.</span><nav><a href="/privacy">Privacy</a><a href="/terms">Terms</a></nav></footer>
  </div>
}

function LegalPage({ kind }: { kind: 'privacy' | 'terms' }) {
  const privacy = kind === 'privacy'
  return <div className="legal-page"><header className="public-header"><a className="brand-lockup" href="/"><span className="brand-mark"><span /></span><span className="brand-name">heatt</span></a><a href="/">Back to Heatt</a></header><main><p className="kicker">LAST UPDATED · SEPTEMBER 19, 2026</p><h1>{privacy ? 'Privacy, in plain language.' : 'Terms of use.'}</h1><p className="legal-lede">{privacy ? 'Your attention and private writing belong to you. This policy explains the small amount of data Heatt needs and the boundaries we will not cross.' : 'These terms keep Heatt thoughtful, lawful, and safe while preserving room for honest expression.'}</p>{privacy ? <><LegalSection title="What we collect"><p>When you create an account, we receive your email address and basic profile information from the sign-in provider. We store the profile, topics, rooms, posts, replies, saves, reactions, reports, and settings you choose to create. Basic technical logs may be retained briefly for reliability and abuse prevention.</p></LegalSection>
    <LegalSection title="Private means private"><p>Journal entries and private time capsules are visible only to you under database access policies. They are excluded from public discovery, search, share cards, and recommendation inputs. Local guest data stays in your browser unless you sign in and explicitly sync it.</p></LegalSection>
    <LegalSection title="How data is used"><p>We use your explicit preferences to order your shelf, provide requested features, secure the service, and respond to reports. We do not sell personal information, run third-party behavioral advertising, or train public AI models on private journal content.</p></LegalSection>
    <LegalSection title="Providers and retention"><p>Heatt may use Supabase for authentication and storage, Cloudflare for edge delivery, and the original publishers you choose to visit. External links have their own policies. Account content is retained while your account is active; security logs and deleted-item backups may remain for a limited operational period.</p></LegalSection>
    <LegalSection title="Your choices"><p>You may edit your profile and preferences, export or delete your content, revoke Google access, or request account deletion. Contact <a href="mailto:privacy@heatt.app">privacy@heatt.app</a> for access, correction, deletion, or privacy questions.</p></LegalSection>
  </> : <><LegalSection title="Using Heatt"><p>You must be at least 13, provide accurate account information, and use Heatt lawfully. You remain responsible for content you post and grant Heatt a limited license to host and display it only as needed to operate the service. You keep ownership.</p></LegalSection>
    <LegalSection title="Kind rooms"><p>Do not harass, threaten, impersonate, spam, exploit minors, publish private information, infringe intellectual property, or interfere with the service. We may limit or remove content and accounts to protect people, comply with law, or enforce these terms.</p></LegalSection>
    <LegalSection title="Open-web sources"><p>Directory cards are editorial links, not republications or endorsements. Articles remain on and belong to their original publishers. Availability and publisher terms can change.</p></LegalSection>
    <LegalSection title="Service boundaries"><p>Heatt is provided as available during beta. We cannot promise uninterrupted operation or that every external source remains available. To the extent permitted by law, liability is limited to the amount you paid Heatt in the prior twelve months.</p></LegalSection>
    <LegalSection title="Changes and contact"><p>Material changes will be announced in the product or by email. Continued use after they take effect means you accept them. Questions may be sent to <a href="mailto:hello@heatt.app">hello@heatt.app</a>.</p></LegalSection>
  </>}<p className="legal-note">This launch-ready baseline should be reviewed by qualified counsel for the countries where Heatt operates.</p></main></div>
}
function LegalSection({ title, children }: { title: string; children: ReactNode }) { return <section className="legal-section"><h2>{title}</h2>{children}</section> }

function AdminPage({ signedIn, onSignIn }: { signedIn: boolean; onSignIn: () => void }) {
  type Report = { id: string; reason: string; details?: string | null; status: string; created_at: string; post_id?: string | null; posts?: { text?: string; author_id?: string } | null }
  const [reports, setReports] = useState<Report[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'denied' | 'error'>('idle')
  useEffect(() => { if (!signedIn) return; setStatus('loading'); heattApi.getReports().then(response => { setReports(response.reports as Report[]); setStatus('ready') }).catch(error => setStatus(String(error).includes('403') ? 'denied' : 'error')) }, [signedIn])
  const review = (id: string, next: 'reviewed' | 'actioned' | 'dismissed') => heattApi.updateReport(id, next).then(() => setReports(items => items.map(item => item.id === id ? { ...item, status: next } : item))).catch(() => setStatus('error'))
  return <div className="admin-page"><header className="admin-header"><a className="brand-lockup" href="/"><span className="brand-mark"><span /></span><span className="brand-name">heatt</span></a><span className="admin-badge"><Icon name="lock" size={13} /> Moderation</span></header><main><div className="admin-title"><div><p className="kicker">TRUST & SAFETY</p><h1>Report queue</h1><p>Review member reports without opening the Supabase dashboard.</p></div><span>{reports.filter(report => report.status === 'open').length} open</span></div>{!signedIn && <div className="admin-empty"><Icon name="lock" size={25} /><h2>Administrator sign-in required</h2><p>Access is checked against the database administrator allowlist.</p><button className="primary-button" onClick={onSignIn}>Sign in with Google</button></div>}{signedIn && status === 'loading' && <div className="admin-empty">Loading secure report queue…</div>}{signedIn && status === 'denied' && <div className="admin-empty"><h2>No administrator access</h2><p>This account is signed in but is not on the administrator allowlist.</p></div>}{signedIn && status === 'error' && <div className="admin-empty"><h2>Could not load reports</h2><p>Confirm the Worker and moderation migration are deployed.</p></div>}{status === 'ready' && !reports.length && <div className="admin-empty"><Icon name="check" size={25} /><h2>The queue is clear</h2><p>There are no reports to review.</p></div>}{status === 'ready' && reports.map(report => <article className="report-card" key={report.id}><div><span className={`report-status status-${report.status}`}>{report.status}</span><span className="kicker">{new Date(report.created_at).toLocaleString()}</span></div><h2>{report.reason}</h2><blockquote>{report.posts?.text ?? 'The reported post is no longer available.'}</blockquote>{report.details && <p>{report.details}</p>}<footer><code>{report.post_id ?? 'deleted post'}</code><button onClick={() => review(report.id, 'dismissed')}>Dismiss</button><button onClick={() => review(report.id, 'reviewed')}>Mark reviewed</button><button className="primary-button" onClick={() => review(report.id, 'actioned')}>Actioned</button></footer></article>)}</main></div>
}

function NavItem({ icon, label, active, onClick }: { icon: IconName; label: string; active: boolean; onClick: () => void }) { return <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>{active && <motion.span layoutId="nav-active" className="nav-active-indicator" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}<Icon name={icon} size={19} /><span>{label}</span></button> }
function MobileNavItem({ icon, label, active, onClick }: { icon: IconName; label: string; active: boolean; onClick: () => void }) { return <button className={`mobile-nav-item ${active ? 'active' : ''}`} onClick={onClick}><Icon name={icon} size={20} /><span>{label}</span></button> }

function HomePage({ posts, mode, setMode, state, search, onClearSearch, recommendationReasons, onReact, onSave, onSaveBlog, onOpenBlog, onComment, onShare, onTune, onToast, onCreatePost, onFollow, onJournal, helpfulReplies, onHelpful }: { posts: Post[]; mode: FeedMode; setMode: (mode: FeedMode) => void; state: StoredState; search: string; onClearSearch: () => void; recommendationReasons: Record<string, string>; onReact: (id: string, intensity: number) => void; onSave: (id: string) => void; onSaveBlog: (id: string) => void; onOpenBlog: (blog: BlogSource) => void; onComment: (comment: Comment) => void; onShare: (item: Post) => void; onTune: () => void; onToast: (message: string) => void; onCreatePost: (post: Post) => void; onFollow: (authorId: string) => void; onJournal: (entry: JournalEntry) => void; helpfulReplies: string[]; onHelpful: (replyId: string) => void }) {
  const [showNew, setShowNew] = useState(false)
  const [roulette, setRoulette] = useState<Post | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<'All' | 'Saved' | BlogCategory>('All')
  const [visibleCount, setVisibleCount] = useState(8)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const modes: FeedMode[] = ['For You', 'Following', 'Rooms']

  const eligibleBlogs = useMemo(() => {
    const query = search.trim().toLowerCase()
    return blogCatalog
      .filter(blog => selectedCategory === 'All' || (selectedCategory === 'Saved' ? state.savedBlogs.includes(blog.id) : blog.category === selectedCategory))
      .filter(blog => !query || `${blog.name} ${blog.domain} ${blog.category} ${blog.description} ${blog.publisher} ${blog.tags.join(' ')}`.toLowerCase().includes(query))
      .sort((left, right) => {
        const leftPreferred = state.preferences.topics.includes(left.category) ? 0 : 1
        const rightPreferred = state.preferences.topics.includes(right.category) ? 0 : 1
        return leftPreferred - rightPreferred || blogCategories.indexOf(left.category) - blogCategories.indexOf(right.category)
      })
  }, [search, selectedCategory, state.preferences.topics, state.savedBlogs])

  const isInfiniteView = mode === 'For You' && selectedCategory === 'All' && !search.trim() && eligibleBlogs.length > 0
  const canLoadMore = isInfiniteView || visibleCount < eligibleBlogs.length
  const displayedBlogs = useMemo(() => {
    if (!isInfiniteView) return eligibleBlogs.slice(0, visibleCount).map((blog, index) => ({ blog, key: blog.id, loop: 0, index }))
    return Array.from({ length: visibleCount }, (_, index) => {
      const loop = Math.floor(index / eligibleBlogs.length)
      const rotatedIndex = (index + loop * 7) % eligibleBlogs.length
      const blog = eligibleBlogs[rotatedIndex]
      return { blog, key: `${loop}-${blog.id}`, loop, index }
    })
  }, [eligibleBlogs, isInfiniteView, visibleCount])

  useEffect(() => { setVisibleCount(8) }, [mode, search, selectedCategory])
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !canLoadMore || mode !== 'For You') return
    let timer = 0
    const observer = new IntersectionObserver(entries => {
      if (!entries[0]?.isIntersecting || isLoadingMore) return
      setIsLoadingMore(true)
      timer = window.setTimeout(() => {
        setVisibleCount(count => count + 6)
        setIsLoadingMore(false)
      }, 280)
    }, { rootMargin: '500px 0px' })
    observer.observe(sentinel)
    return () => { observer.disconnect(); window.clearTimeout(timer) }
  }, [canLoadMore, mode, visibleCount])

  const shareBlog = async (blog: BlogSource) => {
    try {
      const nativeShare = (navigator as Navigator & { share?: (data: ShareData) => Promise<void> }).share
      if (typeof nativeShare === 'function') await nativeShare.call(navigator, { title: blog.name, text: `A free read from ${blog.name}`, url: blog.url })
      else await navigator.clipboard?.writeText(blog.url)
      onToast(typeof nativeShare === 'function' ? 'Shared from the original source.' : 'Original link copied.')
    } catch { /* Cancelling the native share sheet is not an error. */ }
  }

  return <div className="page-content home-page">
    <HeattAtmosphere firstName={state.profile.name.split(' ')[0] || 'friend'} onWrite={() => setShowNew(true)} onTune={onTune} />
    <div className="page-heading feed-heading"><div><p className="kicker">{formatHeadingDate()} · THE OPEN WEB</p><h1>Read outside the usual loop.</h1><p className="lede">A living shelf of excellent writing — every flare opens right here in Heatt.</p></div><div className="heading-actions"><button className="icon-button filter-button" onClick={onTune} aria-label="Tune your feed"><Icon name="sliders" size={18} /></button><button className="primary-button compact" onClick={() => setShowNew(true)}><Icon name="plus" size={16} /> Write a flare</button></div></div>
    <div className="topic-scroller" data-testid="category-filter"><span className="topic-scroller-label">SHELVES</span><button className={selectedCategory === 'All' ? 'active' : ''} onClick={() => setSelectedCategory('All')}>All <small>{blogCatalog.length}</small></button><button className={selectedCategory === 'Saved' ? 'active' : ''} onClick={() => setSelectedCategory('Saved')}>My reads <small>{state.savedBlogs.length}</small></button>{blogCategories.map(category => <button key={category} className={selectedCategory === category ? 'active' : ''} onClick={() => setSelectedCategory(category)}>{category} <small>{blogCatalog.filter(blog => blog.category === category).length}</small></button>)}</div>
    <div className="feed-tabs" role="tablist" aria-label="Feed views">{modes.map(item => <button key={item} className={mode === item ? 'active' : ''} onClick={() => setMode(item)} role="tab" aria-selected={mode === item}>{item}{item === 'For You' && <span className="tab-dot" />}</button>)}</div>

    {mode === 'For You' ? <><div className="feed-explainer open-web-explainer"><span className="spark-soft"><Icon name="spark" size={14} /></span><span><strong>Real sources, no invented activity.</strong> Flares are fetched from the publisher and read inside Heatt.</span><button className="text-button" onClick={onTune}>Tune feed</button></div>
      <section className="library-overview" aria-label="Curated blog directory summary"><div><span className="library-count">{blogCatalog.length}</span><span>free-reading<br />destinations</span></div><div><span className="library-count">{blogCategories.length}</span><span>clear<br />categories</span></div><p><Icon name="check" size={14} /><span><strong>Reviewed {blogCatalogReviewedOn}</strong><br />Descriptions are written by Heatt. The words stay the author’s own.</span></p></section>
      {eligibleBlogs.length === 0 ? <EmptyState icon="search" title="No source matches that search" description="Try a broader phrase or choose another shelf. The original directory is still here." action="Show all sources" onAction={() => { setSelectedCategory('All'); onClearSearch() }} /> : <><div className="blog-list" aria-live="polite">{displayedBlogs.map(({ blog, key, loop, index }) => <BlogCard key={key} blog={blog} index={index} repeated={loop > 0} saved={state.savedBlogs.includes(blog.id)} preferred={state.preferences.topics.includes(blog.category)} onOpen={() => onOpenBlog(blog)} onSave={() => onSaveBlog(blog.id)} onShare={() => shareBlog(blog)} />)}</div>
        <div ref={sentinelRef} className="feed-sentinel" data-testid="infinite-scroll-sentinel" role="status" aria-label={isLoadingMore ? 'Loading more sources' : canLoadMore ? 'More sources load as you scroll' : 'End of this category'}>{isLoadingMore ? <><span className="loading-flame" /><strong>Kindling more good reads…</strong></> : canLoadMore ? <><span className="sentinel-line" /><span>Keep going · more reads load automatically</span><span className="sentinel-line" /></> : <><Icon name="check" size={14} /><span>You have reached every source in this shelf.</span></>}</div>
      </>}
    </> : <><div className="feed-explainer"><span className="spark-soft"><Icon name={mode === 'Rooms' ? 'users' : 'spark'} size={14} /></span><span><strong>{mode === 'Following' ? 'Chosen voices only.' : 'Posts from rooms you join.'}</strong> Community flares appear here when real members publish them.</span></div>
      {posts.length === 0 ? <EmptyState icon={mode === 'Rooms' ? 'users' : 'search'} title={mode === 'Following' ? 'No voices to follow yet' : 'Your rooms are quiet for now'} description="Heatt is just opening its doors. Explore the free reading feed while the first real community flares arrive." action="Explore free blogs" onAction={() => setMode('For You')} /> : <div className="post-list">{posts.map((post, index) => <PostCard key={post.id} post={post} author={post.authorId === 'user' ? { ...authorFor('user'), name: state.profile.name, handle: state.profile.handle, bio: state.profile.bio, avatarData: state.profile.avatarData } : state.authorProfiles[post.authorId] ?? authorFor(post.authorId)} index={index} explanation={recommendationReasons?.[post.id]} reaction={state.reactions[post.id] ?? 0} saved={state.saved.includes(post.id)} comments={state.comments.filter(comment => comment.postId === post.id)} onReact={onReact} onSave={onSave} onComment={onComment} onShare={onShare} following={state.following.includes(post.authorId)} onFollow={onFollow} onJournal={onJournal} helpfulReplies={helpfulReplies} onHelpful={onHelpful} />)}</div>}
      {posts.length > 0 && <div className="feed-next-actions"><button className="outline-button" onClick={() => setRoulette(posts[(seededNumber(new Date().toDateString()) % posts.length)] ?? posts[0])}><Icon name="spark" size={15} /> Surprise me</button><button className="text-button" onClick={() => setMode('For You')}>Explore the open web</button></div>}
    </>}
    {roulette && <RouletteModal post={roulette} onClose={() => setRoulette(null)} onShare={onShare} />}
    {showNew && <CreateFlareModal profile={state.profile} onClose={() => setShowNew(false)} onCreate={post => { setShowNew(false); onCreatePost(post) }} />}
  </div>
}

/* ---------- blog flare card: category art + owner + read in-app ---------- */

function BlogCard({ blog, index, repeated, saved, preferred, onOpen, onSave, onShare }: { blog: BlogSource; index: number; repeated: boolean; saved: boolean; preferred: boolean; onOpen: () => void; onSave: () => void; onShare: () => void }) {
  const art = artFor(blog.category)
  return <motion.article
    className="group relative grid overflow-hidden rounded-[22px] border border-line bg-card text-left shadow-soft transition-colors duration-300 hover:border-ember/45 hover:shadow-lift"
    data-testid="blog-card"
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: .12 }}
    transition={{ duration: .45, delay: Math.min((index % 6) * .05, .2), ease: [0.22, 1, 0.36, 1] }}
  >
    <button className="block w-full text-left" onClick={onOpen} aria-label={`Open ${blog.name} — read the flare inside Heatt`}>
      <span className="relative block h-[168px] overflow-hidden bg-card-deep">
        {art.image && <img src={art.image} alt="" className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]" />}
        <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/62 via-black/12 to-transparent" />
        <span className="absolute left-3.5 top-3.5 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-black/35 px-2.5 py-1 font-mono text-[8.5px] font-bold uppercase tracking-[0.12em] text-white/90 backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-[#8ce29b]" /> FREE TO READ
        </span>
        <span className="absolute bottom-3 left-3.5 right-3.5 flex items-end justify-between gap-2">
          <span className="rounded-full bg-card/90 px-2.5 py-1 font-mono text-[9px] font-semibold text-ink-soft backdrop-blur">{blog.category}</span>
          {repeated && <span className="rounded-full border border-white/30 bg-black/40 px-2.5 py-1 font-mono text-[8.5px] font-semibold uppercase tracking-[0.1em] text-white/85 backdrop-blur">Fresh reading loop</span>}
        </span>
      </span>

      <span className="grid gap-3.5 p-5 pt-4">
        <span className="flex items-center gap-3">
          <SourceMark accent={blog.accent} initials={blog.initials} className="h-12 w-12 text-[13px]" />
          <span className="grid min-w-0 flex-1 gap-0.5">
            <strong role="heading" aria-level={2} className="truncate font-display text-[16px] font-bold tracking-[-0.02em] text-ink">{blog.name}</strong>
            <span className="truncate font-mono text-[10px] text-muted">@{blog.domain}</span>
          </span>
          <span className="hidden shrink-0 items-center gap-1 rounded-full border border-good/45 bg-good/10 px-2.5 py-1 font-mono text-[8.5px] font-bold uppercase tracking-[0.1em] text-good sm:inline-flex">
            <Icon name="check" size={10} stroke={2.6} /> owner
          </span>
        </span>

        <span className="block text-[13px] leading-[1.6] text-ink-soft">{blog.description}</span>

        <span className="flex flex-wrap items-center gap-2">
          {blog.tags.map(tag => <span key={tag} className="font-mono text-[9.5px] text-muted">#{tag}</span>)}
        </span>

        <span className="flex items-center justify-between border-t border-dashed border-line pt-3 font-mono text-[9px] uppercase tracking-[0.08em] text-muted">
          <span>{preferred ? 'on your shelves' : blog.publisher}</span>
          <span className="inline-flex items-center gap-1 font-bold text-ember transition group-hover:gap-1.5">read the flare <Icon name="arrow" size={11} /></span>
        </span>
      </span>
    </button>

    <span className="flex items-center gap-2.5 border-t border-line bg-card-soft/60 px-5 py-3.5">
      <button
        className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-ember text-[12px] font-bold text-on-ember shadow-[0_8px_18px_var(--accent-glow)] transition hover:bg-ember-deep"
        onClick={onOpen}
      >
        Open flare <Icon name="arrow" size={13} />
      </button>
      <button
        className={cn(
          'inline-flex h-10 items-center gap-2 rounded-full border px-4 text-[12px] font-bold transition',
          saved ? 'border-good bg-good/10 text-good' : 'border-line-strong bg-card text-ink hover:border-ember hover:text-ember',
        )}
        onClick={onSave}
      >
        <Icon name={saved ? 'check' : 'bookmark'} size={14} /> {saved ? 'On your shelf' : 'Save source'}
      </button>
      <button className="grid h-10 w-10 place-items-center rounded-full border border-line-strong bg-card text-ink-soft transition hover:border-ember hover:text-ember" onClick={onShare} aria-label={`Share ${blog.name}`}>
        <Icon name="share" size={15} />
      </button>
    </span>
  </motion.article>
}

function PostCard({ post, author, index, explanation: recommendationExplanation, reaction, saved, comments, onReact, onSave, onComment, onShare, following, onFollow, onJournal, helpfulReplies, onHelpful }: { post: Post; author: Author; index: number; explanation?: string; reaction: number; saved: boolean; comments: Comment[]; onReact: (id: string, intensity: number) => void; onSave: (id: string) => void; onComment: (comment: Comment) => void; onShare: (post: Post) => void; following: boolean; onFollow: (authorId: string) => void; onJournal: (entry: JournalEntry) => void; helpfulReplies: string[]; onHelpful: (replyId: string) => void }) {
  const [showWhy, setShowWhy] = useState(false)
  const [showReplies, setShowReplies] = useState(false)
  const [showIntensity, setShowIntensity] = useState(false)
  const [showHighlight, setShowHighlight] = useState(false)
  const [highlightQuote, setHighlightQuote] = useState('')
  const [reply, setReply] = useState('')
  const replyCount = comments.length
  const explanation = recommendationExplanation ?? stateExplanation(post)
  return <motion.article className={`post-card ${post.type === 'Poem' ? 'poem-card' : ''}`} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .18 }} transition={{ duration: .48, delay: Math.min(index * .055, .22), ease: [0.22, 1, 0.36, 1] }}>
    <div className="post-card-top"><div className="author-row"><div className={`${avatarClass(author.tone)} ${author.avatarData ? 'avatar-photo' : ''}`} style={author.avatarData ? { backgroundImage: `url(${author.avatarData})` } : undefined}>{!author.avatarData && author.initials}</div><div className="author-meta"><div><strong>{author.name}</strong>{post.room && <><span className="meta-separator">·</span><span className="room-link">{post.room}</span></>}</div><span>@{author.handle} <span className="meta-separator">·</span> {formatTime(post.createdAt)}</span></div></div><div className="post-top-actions">{author.id !== 'user' && <button className={`follow-link ${following ? 'following' : ''}`} onClick={() => onFollow(author.id)}>{following ? <><Icon name="check" size={12} /> Following</> : '+ Follow'}</button>}<button className="icon-button ghost more-button" aria-label="More options"><Icon name="more" size={18} /></button></div></div>
    <div className="post-labels"><span className={`type-label type-${post.type.toLowerCase()}`}>{postTypeLabel[post.type]}</span>{post.invitation && <span className="invitation-label">{post.invitation}</span>}<button className="why-button" onClick={() => setShowWhy(!showWhy)}><Icon name="spark" size={12} /> Why this?</button></div>
    {showWhy && <div className="why-popover"><div className="why-heading"><Icon name="spark" size={14} /><strong>Why this appeared</strong><button onClick={() => setShowWhy(false)} aria-label="Close"><Icon name="x" size={13} /></button></div><p>{explanation}.</p><span>Adjust this in <button onClick={() => setShowWhy(false)}>Feed Tuner</button></span></div>}
    <p className="post-text">{post.text}</p>
    {post.tags && <div className="post-tags">{post.tags.map(tag => <span key={tag}>#{tag}</span>)}</div>}
    <div className="post-actions"><div className="action-group fire-group"><HeatButton value={reaction as 0 | 1 | 2 | 3} onChange={value => onReact(post.id, value)} label="Heat this flare" /></div><button className={`post-action ${saved ? 'saved' : ''}`} onClick={() => onSave(post.id)}><Icon name="bookmark" size={16} /><span>{saved ? 'Saved' : 'Save'}</span></button><button className="post-action" onClick={() => { setHighlightQuote(window.getSelection()?.toString().trim() || post.text.slice(0, 260)); setShowHighlight(true) }}><Icon name="quote" size={16} /><span>Keep a line</span></button><button className="post-action" onClick={() => setShowReplies(!showReplies)}><Icon name="message" size={16} /><span>Reply</span><span className="action-count">{replyCount}</span></button><button className="post-action share-action" onClick={() => onShare(post)}><Icon name="share" size={16} /><span>Share</span></button></div>
    {showReplies && <div className="replies"><div className="replies-heading"><strong>{replyCount} replies</strong><span>Thoughtful replies welcome</span></div>{comments.map(comment => <div className="reply" key={comment.id}><div className="avatar avatar-user avatar-tiny">{comment.initials}</div><div><strong>{comment.author}</strong><p>{comment.text}</p>{post.type === 'Question' && post.authorId === 'user' && <button className={`helpful-button ${helpfulReplies.includes(comment.id) ? 'marked' : ''}`} onClick={() => onHelpful(comment.id)}>{helpfulReplies.includes(comment.id) ? <><Icon name="check" size={11} /> Helpful</> : 'Mark helpful'}</button>}</div></div>)}<form className="reply-form" onSubmit={event => { event.preventDefault(); if (!reply.trim()) return; onComment({ id: `c-${Date.now()}`, postId: post.id, author: 'You', initials: 'ME', text: reply.trim(), createdAt: Date.now() }); setReply('') }}><div className="avatar avatar-user avatar-tiny">ME</div><input value={reply} onChange={event => setReply(event.target.value)} placeholder={post.invitation === 'Advice welcome' ? 'Offer a little advice…' : 'Add something thoughtful…'} aria-label="Write a reply" /><button type="submit" aria-label="Send reply"><Icon name="send" size={16} /></button></form></div>}
    {showHighlight && <HighlightModal quote={highlightQuote} source={`${author.name} · ${post.topic}`} onClose={() => setShowHighlight(false)} onSave={note => { onJournal({ id: `j-${Date.now()}`, source: `${author.name} · ${post.topic}`, quote: highlightQuote, note, createdAt: Date.now() }); setShowHighlight(false) }} />}</motion.article>
}
function stateExplanation(post: Post) { if (post.room) return `Because you spend time in ${post.room}`; if (post.type === 'Poem') return 'A new voice in poetry'; return `Similar to posts you saved in ${post.topic.toLowerCase()}` }

function HighlightModal({ quote, source, onClose, onSave }: { quote: string; source: string; onClose: () => void; onSave: (note: string) => void }) { const [note, setNote] = useState(''); return <div className="modal-backdrop"><div className="modal highlight-modal"><div className="modal-header"><div><span className="eyebrow">HIGHLIGHT & ANNOTATE</span><h2>Keep this line.</h2><p>Save the spark privately. Your note never enters public recommendations.</p></div><button className="icon-button" onClick={onClose} aria-label="Close"><Icon name="x" size={20} /></button></div><div className="highlight-quote"><Icon name="quote" size={18} /><blockquote>“{quote}”</blockquote><span>{source}</span></div><label className="field-label highlight-note">Add a private note <textarea autoFocus rows={4} maxLength={500} value={note} onChange={event => setNote(event.target.value)} placeholder="What do you want to remember about this?" /></label><div className="modal-footer"><button className="text-button" onClick={onClose}>Not now</button><button className="primary-button" onClick={() => onSave(note.trim())}>Save to journal <Icon name="bookmark" size={15} /></button></div></div></div> }

/* ---------- create flare (Radix + Tailwind) ---------- */

function CreateFlareModal({ profile, onClose, onCreate }: { profile: ProfileData; onClose: () => void; onCreate: (post: Post) => void }) {
  const [text, setText] = useState('')
  const [type, setType] = useState<PostType>('Thought')
  const [topic, setTopic] = useState('Creative practice')
  const [privacy, setPrivacy] = useState('Public')
  const remaining = 500 - countGraphemes(text)
  return <Dialog open onOpenChange={open => { if (!open) onClose() }}>
    <DialogContent aria-label="Write a flare">
      <DialogHeader eyebrow="A SMALL MOMENT" title="Write a flare." note="Short, honest, and yours. A flare is a thought with a little heat in it." />
      <div className="grid gap-5 px-7 pb-1">
        <div className="flex items-center gap-3">
          <span className={`avatar avatar-user ${profile.avatarData ? 'avatar-photo' : ''}`} style={profile.avatarData ? { backgroundImage: `url(${profile.avatarData})` } : undefined}>{!profile.avatarData && initialsFor(profile.name)}</span>
          <div className="grid flex-1 gap-0.5">
            <strong className="text-[13px] text-ink">{profile.name}</strong>
            <span className="flex items-center gap-1 text-[10.5px] text-muted"><Icon name="users" size={11} /> {privacy} · Anyone can reply</span>
          </div>
          <select value={privacy} onChange={event => setPrivacy(event.target.value)} aria-label="Flare visibility" className="h-9 rounded-full border border-line bg-card px-3 font-mono text-[10.5px] text-ink outline-none focus:border-ember">
            <option>Public</option><option>Followers</option><option>Private draft</option>
          </select>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(['Thought', 'Question', 'Practice', 'Poem', 'Check-in'] as PostType[]).map(item => (
            <button key={item} onClick={() => setType(item)} className={cn('h-9 shrink-0 rounded-full border px-3.5 text-[11.5px] font-bold transition', type === item ? 'border-ember bg-ember text-on-ember' : 'border-line bg-card-soft text-ink-soft hover:border-ember/50 hover:text-ink')}>{postTypeLabel[item]}</button>
          ))}
        </div>
        <textarea
          autoFocus
          value={text}
          onChange={event => setText(event.target.value.slice(0, 500))}
          placeholder={type === 'Question' ? 'Ask something you genuinely want to hear about…' : type === 'Poem' ? 'Let the line breaks do some of the talking…' : 'What is taking up a little space in your mind?'}
          rows={7}
          className="resize-none rounded-2xl border border-line bg-card px-4 py-3.5 text-[14.5px] leading-[1.7] text-ink outline-none transition focus:border-ember"
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-ember-soft px-3 py-2 text-[10.5px] font-semibold text-ember-deep"><Icon name="spark" size={12} /> Try a gentle prompt</span>
            <select value={topic} onChange={event => setTopic(event.target.value)} aria-label="Choose a topic" className="h-9 rounded-full border border-line bg-card px-3 font-mono text-[10.5px] text-ink outline-none focus:border-ember">
              {topics.map(item => <option key={item}>{item}</option>)}
            </select>
          </div>
          <span className={cn('font-mono text-[10.5px]', remaining < 40 ? 'font-bold text-heat-3' : 'text-muted')}>{remaining} graphemes left</span>
        </div>
      </div>
      <DialogFooter className="mt-4">
        <button className="px-4 py-2.5 text-[12px] font-semibold text-muted transition hover:text-ink" onClick={onClose}>Not now</button>
        <button
          className="inline-flex h-11 items-center gap-2 rounded-full bg-ember px-6 text-[12.5px] font-bold text-on-ember shadow-[0_10px_24px_var(--accent-glow)] transition hover:bg-ember-deep disabled:opacity-40"
          disabled={!text.trim()}
          onClick={() => onCreate({ id: `post-${Date.now()}`, authorId: 'user', type, topic, text: text.trim(), createdAt: Date.now(), invitation: type === 'Question' ? 'Questions welcome' : 'Just sharing' })}
        >
          Publish flare <Icon name="arrow" size={14} />
        </button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
}

function CreatePage({ profile, onCreate, onCancel }: { profile: ProfileData; onCreate: (post: Post) => void; onCancel: () => void }) { return <div className="page-content create-page"><div className="page-heading"><div><p className="kicker">MAKE A LITTLE SPACE</p><h1>What wants to be said?</h1><p className="lede">Your words do not need to be finished to be worth sharing.</p></div></div><CreateForm profile={profile} onCreate={onCreate} onCancel={onCancel} /></div> }
function CreateForm({ profile, onCreate, onCancel }: { profile: ProfileData; onCreate: (post: Post) => void; onCancel: () => void }) { const [text, setText] = useState(() => window.localStorage.getItem('heatt-draft') ?? ''); const [type, setType] = useState<PostType>('Thought'); const [topic, setTopic] = useState('Creative practice'); const remaining = 500 - countGraphemes(text); useEffect(() => { if (text) window.localStorage.setItem('heatt-draft', text); else window.localStorage.removeItem('heatt-draft') }, [text]); return <div className="large-create-card"><div className="create-card-top"><div className="avatar avatar-user">{initialsFor(profile.name)}</div><div><strong>{profile.name}</strong><span><Icon name="users" size={12} /> Public · Anyone can reply</span></div><span className="draft-status"><span /> Draft saved locally</span></div><div className="type-segment">{(['Thought', 'Question', 'Practice', 'Poem', 'Check-in'] as PostType[]).map(item => <button key={item} className={type === item ? 'active' : ''} onClick={() => setType(item)}>{postTypeLabel[item]}</button>)}</div><textarea autoFocus value={text} onChange={event => setText(event.target.value.slice(0, 500))} placeholder="Start with one honest sentence…" rows={8} /><div className="suggestion-strip"><div className="spark-soft"><Icon name="spark" size={14} /></div><div><strong>Need a beginning?</strong><span>Something I changed my mind about…</span></div><button className="text-button" onClick={() => setText('Something I changed my mind about is ')}>Use this <Icon name="arrow" size={14} /></button></div><div className="create-form-bottom"><select value={topic} onChange={event => setTopic(event.target.value)} aria-label="Choose a topic">{topics.map(item => <option key={item}>{item}</option>)}</select><span className={remaining < 40 ? 'near-limit' : ''}>{remaining} / 500 graphemes</span><button className="outline-button" onClick={onCancel}>Save as draft</button><button className="primary-button" disabled={!text.trim()} onClick={() => { window.localStorage.removeItem('heatt-draft'); onCreate({ id: `post-${Date.now()}`, authorId: 'user', type, topic, text: text.trim(), createdAt: Date.now(), invitation: type === 'Question' ? 'Questions welcome' : 'Just sharing' })}}>Publish flare <Icon name="arrow" size={15} /></button></div></div> }

function RoomsPage({ joinedRooms, onJoin, onOpenRoom, selectedRoom, posts, state, onReact, onSave, onComment, onShare, onFollow, onJournal, helpfulReplies, onHelpful, onToast, onCreateRoom }: { joinedRooms: string[]; onJoin: (room: string) => void; onOpenRoom: (room: string) => void; selectedRoom: string | null; posts: Post[]; state: StoredState; onReact: (id: string, intensity: number) => void; onSave: (id: string) => void; onComment: (comment: Comment) => void; onShare: (item: Post) => void; onFollow: (authorId: string) => void; onJournal: (entry: JournalEntry) => void; helpfulReplies: string[]; onHelpful: (replyId: string) => void; onToast: (message: string) => void; onCreateRoom: (room: { name: string; description: string; topic: string; visibility: 'public' }) => void }) { const roomSeeds = [{ name: 'Quiet Reading', description: 'Books, margins, and the ideas that stay after the last page.', members: '0', posts: '0', tone: 'lilac', topic: 'Books & ideas' }, { name: 'The Human Thread', description: 'A warm corner for the questions we carry together.', members: '0', posts: '0', tone: 'sage', topic: 'Relationships' }, { name: 'The Long View', description: 'For patient work, lasting ideas, and making things slowly.', members: '0', posts: '0', tone: 'amber', topic: 'Philosophy' }, { name: 'Quiet Poetry', description: 'Line breaks welcome. Read softly, respond generously.', members: '0', posts: '0', tone: 'coral', topic: 'Poetry & language' }]; const [customRooms, setCustomRooms] = useState<RoomSummary[]>(() => { try { return JSON.parse(window.localStorage.getItem('heatt-custom-rooms') ?? '[]') as RoomSummary[] } catch { return [] } }); useEffect(() => { window.localStorage.setItem('heatt-custom-rooms', JSON.stringify(customRooms)) }, [customRooms]); const rooms = [...roomSeeds, ...customRooms]; const [showCreateRoom, setShowCreateRoom] = useState(false); const roomPosts = selectedRoom ? posts.filter(post => post.room === selectedRoom || post.topic === rooms.find(room => room.name === selectedRoom)?.topic) : []; return <div className="page-content rooms-page">{selectedRoom ? <><button className="back-link" onClick={() => onOpenRoom('')}><Icon name="arrow" size={15} /> All rooms</button><div className="room-hero"><div className={`room-symbol ${rooms.find(room => room.name === selectedRoom)?.tone}`}><Icon name="users" size={24} /></div><div><p className="kicker">ROOM</p><h1>{selectedRoom}</h1><p>{rooms.find(room => room.name === selectedRoom)?.description}</p><span className="room-stats">{rooms.find(room => room.name === selectedRoom)?.members} members · A kind place to be</span></div><button className={`outline-button ${joinedRooms.includes(selectedRoom) ? 'joined' : ''}`} onClick={() => onJoin(selectedRoom)}>{joinedRooms.includes(selectedRoom) ? <><Icon name="check" size={15} /> Joined</> : 'Join room'}</button></div><div className="room-tabs"><button className="active">Recent</button><button>Warm</button><button>About this room</button></div><div className="post-list">{roomPosts.length ? roomPosts.map((post, index) => <PostCard key={post.id} post={post} author={post.authorId === 'user' ? { ...authorFor('user'), name: state.profile.name, handle: state.profile.handle, bio: state.profile.bio, avatarData: state.profile.avatarData } : state.authorProfiles[post.authorId] ?? authorFor(post.authorId)} index={index} reaction={state.reactions[post.id] ?? 0} saved={state.saved.includes(post.id)} comments={state.comments.filter(comment => comment.postId === post.id)} onReact={onReact} onSave={onSave} onComment={onComment} onShare={onShare} following={state.following.includes(post.authorId)} onFollow={onFollow} onJournal={onJournal} helpfulReplies={helpfulReplies} onHelpful={onHelpful} />) : <EmptyState icon="users" title="A quiet room, for now" description="Be the first to leave a thoughtful note here." action="Write a flare" onAction={() => undefined} />}</div></> : <><div className="page-heading"><div><p className="kicker">SMALLER PLACES, DEEPER THREADS</p><h1>Find your room.</h1><p className="lede">A few corners of Heatt to settle into.</p></div><button className="primary-button compact" onClick={() => setShowCreateRoom(true)}><Icon name="plus" size={16} /> Create a room</button></div><div className="room-feature"><div className="feature-mark"><Icon name="spark" size={22} /></div><div><span className="eyebrow">ROOM RITUAL · THIS WEEK</span><h3>One thing you learned lately</h3><p>A gentle prompt shared across rooms. Add your own when it feels right.</p></div><button className="text-button">Explore prompt <Icon name="arrow" size={14} /></button></div><div className="room-grid">{rooms.map(room => <RoomCard key={room.name} room={room} joined={joinedRooms.includes(room.name)} onJoin={onJoin} onOpen={() => onOpenRoom(room.name)} />)}</div></>}{showCreateRoom && <CreateRoomModal onClose={() => setShowCreateRoom(false)} onCreate={(name, description, topic) => { setCustomRooms(previous => [{ name, description, topic, members: '1', posts: '0', tone: 'coral' }, ...previous]); onCreateRoom({ name, description, topic, visibility: 'public' }); setShowCreateRoom(false); onToast(`Room “${name}” is ready for its first thoughtful flare.`); onJoin(name) }} />}</div> }
function CreateRoomModal({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string, description: string, topic: string) => void }) { const [name, setName] = useState(''); const [description, setDescription] = useState(''); const [topic, setTopic] = useState('Books & ideas'); return <div className="modal-backdrop"><div className="modal create-room-modal"><div className="modal-header"><div><span className="eyebrow">MAKE A SMALLER PLACE</span><h2>Create a room.</h2><p>Give a few good conversations somewhere to gather.</p></div><button className="icon-button" onClick={onClose} aria-label="Close"><Icon name="x" size={20} /></button></div><div className="room-form"><label className="field-label">Room name<input autoFocus maxLength={80} value={name} onChange={event => setName(event.target.value)} placeholder="A name people want to step into" /></label><label className="field-label">Description<textarea maxLength={240} rows={3} value={description} onChange={event => setDescription(event.target.value)} placeholder="What kind of thoughts belong here?" /></label><label className="field-label">A topic<select value={topic} onChange={event => setTopic(event.target.value)}>{topics.map(item => <option key={item}>{item}</option>)}</select></label></div><div className="modal-footer"><button className="text-button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={name.trim().length < 2} onClick={() => onCreate(name.trim(), description.trim(), topic)}>Create room <Icon name="arrow" size={15} /></button></div></div></div> }
function RoomCard({ room, joined, onJoin, onOpen }: { room: { name: string; description: string; members: string; posts: string; tone: string; topic: string }; joined: boolean; onJoin: (name: string) => void; onOpen: () => void }) { return <article className="room-card"><button className={`room-card-art ${room.tone}`} onClick={onOpen}><span>{room.name.split(' ').map(word => word[0]).join('').slice(0, 2)}</span></button><div className="room-card-body"><button className="room-title" onClick={onOpen}>{room.name}</button><p>{room.description}</p><div className="room-card-meta"><span><Icon name="users" size={14} /> {room.members}</span><span>{room.posts} today</span></div><button className={`room-join ${joined ? 'joined' : ''}`} onClick={() => onJoin(room.name)}>{joined ? <><Icon name="check" size={14} /> Joined</> : 'Join room'}</button></div></article> }

function WisdomPage({ state, journeyProgress, onJourneyChange, onAddJournal, onShare, onToast }: { state: StoredState; journeyProgress: Record<string, number>; onJourneyChange: (journeyId: string) => void; onAddJournal: (entry: JournalEntry) => void; onShare: (item: Wisdom) => void; onToast: (message: string) => void }) {
  const wisdom = wisdomForPreferences(state.preferences)
  const [showContext, setShowContext] = useState(false)
  const [reflection, setReflection] = useState('')
  const [tried, setTried] = useState(false)
  const tone = wisdom.tone ?? ({ Gita: 'coral', Stoic: 'ink', Poetry: 'lilac', Creator: 'coral', Blend: 'ink' }[wisdom.path] ?? 'ink')
  const isOriginal = wisdom.rightsStatus === 'original' && wisdom.reviewState === 'approved_internal_original'
  return <div className="page-content wisdom-page">
    <div className="page-heading wisdom-heading"><div><p className="kicker">DAILY WISDOM · {wisdom.path.toUpperCase()}</p><h1>A thought to carry.</h1><p className="lede">Sourced carefully. Kept close.</p></div><button className="outline-button"><Icon name="clock" size={15} /> Quiet mode</button></div>
    <article className={`wisdom-card-large ${tone}`}>
      <div className="wisdom-card-top"><span className="wisdom-path"><span className="path-mark"><Icon name="spark" size={13} /></span>{wisdom.path} path</span><span className="verified-source"><Icon name={isOriginal ? 'check' : 'clock'} size={13} /> {isOriginal ? 'Heatt original' : 'Rights review required'}</span></div>
      <div className="quote-mark"><Icon name="quote" size={28} /></div><blockquote>{wisdom.sourceText}</blockquote>
      <cite>{wisdom.attribution} · {wisdom.source}</cite>
      <div className="wisdom-provenance"><span>{wisdom.edition}</span><a href={wisdom.sourceUrl} target="_blank" rel="noreferrer">Open source record <Icon name="arrow" size={11} /></a></div>
      <div className="wisdom-divider" />
      <div className="wisdom-context"><span className="eyebrow">A LITTLE CONTEXT</span><p>{wisdom.editorialContext}</p>{showContext && <div className="wisdom-editorial"><div><span className="eyebrow">HEATT'S READING</span><p>{wisdom.interpretation}</p></div><div><span className="eyebrow">CONTENT NOTE</span><p>{wisdom.contentNotes}</p></div><div><span className="eyebrow">RIGHTS NOTE</span><p>{wisdom.rightsNotes}</p><p>{wisdom.jurisdictionCaveat}</p></div><div><span className="eyebrow">PROVENANCE</span><p>{wisdom.provenance}</p></div></div>}<button className="text-button" onClick={() => setShowContext(!showContext)}>{showContext ? 'Hide editorial notes' : 'Read context & editorial notes'} <Icon name="arrow" size={14} /></button></div>
      <div className="wisdom-card-actions"><button className="outline-button" onClick={() => onAddJournal({ id: `j-${Date.now()}`, source: wisdom.source, quote: wisdom.sourceText, note: '', createdAt: Date.now() })}><Icon name="bookmark" size={15} /> Save to journal</button><button className="outline-button" onClick={() => onShare(wisdom)}><Icon name="share" size={15} /> Make a card</button></div>
    </article>
    <div className="practice-card"><div className="practice-icon"><Icon name="spark" size={18} /></div><div className="practice-content"><span className="eyebrow">TRY IT TODAY</span><h3>{wisdom.practicePrompt}</h3><div className="pulse-row"><span>{wisdom.sourceType === 'original' ? 'An original Heatt prompt.' : 'An editorial practice prompt, separate from the quotation.'}</span></div></div><button className={`primary-button ${tried ? 'success-button' : ''}`} onClick={() => { setTried(!tried); onToast(tried ? 'Practice unmarked.' : 'Marked as tried. A quiet win.') }}>{tried ? <><Icon name="check" size={15} /> Tried</> : 'I tried it'}</button></div>
    <div className="wisdom-reflection"><div><span className="eyebrow">PRIVATE REFLECTION</span><h3>What does this open up for you?</h3><p>Only you will see this. Your journal is never used to shape public recommendations.</p></div><textarea value={reflection} onChange={event => setReflection(event.target.value)} placeholder="A sentence is enough…" rows={3} /><button className="primary-button" disabled={!reflection.trim()} onClick={() => { onAddJournal({ id: `j-${Date.now()}`, source: wisdom.source, quote: wisdom.sourceText, note: reflection.trim(), createdAt: Date.now() }); setReflection('') }}>Keep this reflection</button></div>
    <div className="wisdom-library-link"><Icon name="book" size={17} /><div><strong>Explore the library</strong><span>Stoic, Poetry, Creator, Gita, and Blend paths · {wisdomLibrary.length} reviewed records</span></div><button className="text-button">Browse all <Icon name="arrow" size={14} /></button></div><JourneyPanel progress={journeyProgress} onAdvance={onJourneyChange} />
  </div>
}
function JourneyPanel({ progress, onAdvance }: { progress: Record<string, number>; onAdvance: (journeyId: string) => void }) { return <section className="journey-panel"><div className="section-heading"><div><span className="eyebrow">PRACTICE JOURNEYS</span><h2>Follow an idea for a few days.</h2><p>Nothing breaks when life gets busy. The next step waits.</p></div><span className="journey-no-pressure"><Icon name="check" size={13} /> no streaks</span></div><div className="journey-grid">{journeys.map(journey => { const current = progress[journey.id] ?? 0; const complete = current >= journey.days; return <article className={`journey-card ${journey.tone}`} key={journey.id}><span className="journey-label">{journey.label}</span><h3>{journey.title}</h3><p>{journey.description}</p><div className="journey-progress"><span style={{ width: `${Math.min(100, current / journey.days * 100)}%` }} /></div><div className="journey-bottom"><span>{complete ? 'Complete' : current ? `Day ${current} of ${journey.days}` : `${journey.days} gentle days`}</span><button className="text-button" onClick={() => onAdvance(journey.id)}>{complete ? 'Revisit' : current ? 'Open next' : 'Begin'} <Icon name="arrow" size={13} /></button></div></article>})}</div></section> }

function JournalPage({ entries, savedPosts, capsules, onShare, onAddJournal, onAddCapsule }: { entries: JournalEntry[]; savedPosts: Post[]; capsules: TimeCapsule[]; onShare: (item: Post | Wisdom) => void; onAddJournal: (entry: JournalEntry) => void; onAddCapsule: (capsule: TimeCapsule) => void }) { const [tab, setTab] = useState<'journal' | 'saved'>('journal'); const [note, setNote] = useState(''); const [showCapsule, setShowCapsule] = useState(false); return <div className="page-content journal-page"><div className="page-heading"><div><p className="kicker">A PRIVATE PLACE TO KEEP THINGS</p><h1>Your journal.</h1><p className="lede">A collection of what you want to remember.</p></div><div className="journal-heading-actions"><button className="outline-button" onClick={() => setShowCapsule(true)}><Icon name="clock" size={15} /> Time capsule</button><div className="private-badge"><Icon name="lock" size={14} /> Private by default</div></div></div>{capsules.length > 0 && <CapsuleList capsules={capsules} />}<div className="journal-tabs"><button className={tab === 'journal' ? 'active' : ''} onClick={() => setTab('journal')}>Reflections <span>{entries.length}</span></button><button className={tab === 'saved' ? 'active' : ''} onClick={() => setTab('saved')}>Saved flares <span>{savedPosts.length}</span></button></div>{tab === 'journal' ? <>{entries.length === 0 ? <div className="journal-empty"><div className="empty-journal-icon"><Icon name="book" size={24} /></div><h3>Your private shelf is waiting.</h3><p>Save a piece of wisdom or highlight a line that you want to come back to. Only you can see what lives here.</p><button className="outline-button" onClick={() => setNote('A note I want to remember…')}>Write a private note</button>{note && <div className="quick-note"><textarea value={note} onChange={event => setNote(event.target.value)} /><button className="primary-button" onClick={() => { onAddJournal({ id: `j-${Date.now()}`, source: 'Personal note', quote: '', note, createdAt: Date.now() }); setNote('') }}>Save privately</button></div>}</div> : <div className="journal-list">{entries.map(entry => <article className="journal-entry" key={entry.id}><div className="journal-entry-top"><span className="eyebrow">{entry.source}</span><time>{formatTime(entry.createdAt)} ago</time><button className="icon-button ghost"><Icon name="more" size={17} /></button></div>{entry.quote && <blockquote>“{entry.quote}”</blockquote>}{entry.note && <p>{entry.note}</p>}<span className="private-line"><Icon name="lock" size={12} /> Private to you</span></article>)}</div>}</> : <div className="saved-list">{savedPosts.map(post => <div className="saved-row" key={post.id}><div className={avatarClass(authorFor(post.authorId).tone)}>{authorFor(post.authorId).initials}</div><div><span className="eyebrow">{post.topic} · {postTypeLabel[post.type]}</span><p>{post.text}</p><span>{authorFor(post.authorId).name} · {formatTime(post.createdAt)} ago</span></div><button className="icon-button" onClick={() => onShare(post)} aria-label="Make a card"><Icon name="share" size={17} /></button></div>)}{!savedPosts.length && <EmptyState icon="bookmark" title="Nothing saved yet" description="When a flare stays with you, save it here." action="Go to home" onAction={() => undefined} />}</div>}{showCapsule && <CapsuleModal onClose={() => setShowCapsule(false)} onSave={capsule => { onAddCapsule(capsule); setShowCapsule(false) }} />}</div> }

function CapsuleList({ capsules }: { capsules: TimeCapsule[] }) { return <section className="capsule-list"><div className="capsule-list-heading"><span className="eyebrow">WAITING FOR LATER</span><span>{capsules.length} sealed</span></div>{capsules.slice(0, 3).map(capsule => <div className="capsule-row" key={capsule.id}><div className="capsule-seal"><Icon name="lock" size={14} /></div><div><strong>{new Date(capsule.revealAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</strong><span>{capsule.content.slice(0, 90)}{capsule.content.length > 90 ? '…' : ''}</span></div><Icon name="clock" size={14} /></div>)}</section> }
function CapsuleModal({ onClose, onSave }: { onClose: () => void; onSave: (capsule: TimeCapsule) => void }) { const [content, setContent] = useState(''); const [delay, setDelay] = useState('30'); return <div className="modal-backdrop"><div className="modal capsule-modal"><div className="modal-header"><div><span className="eyebrow">TIME CAPSULE REFLECTION</span><h2>Write to a future you.</h2><p>Private by construction. No streaks, no pressure — just a note waiting at the right time.</p></div><button className="icon-button" onClick={onClose} aria-label="Close"><Icon name="x" size={20} /></button></div><div className="capsule-form"><textarea autoFocus rows={5} maxLength={1000} value={content} onChange={event => setContent(event.target.value)} placeholder="What do you want to remember when this day is farther away?" /><div className="capsule-schedule"><span><Icon name="clock" size={15} /> Open this capsule in</span><select value={delay} onChange={event => setDelay(event.target.value)}><option value="7">7 days</option><option value="30">30 days</option><option value="365">1 year</option></select></div></div><div className="modal-footer"><button className="text-button" onClick={onClose}>Not now</button><button className="primary-button" disabled={!content.trim()} onClick={() => onSave({ id: `capsule-${Date.now()}`, content: content.trim(), revealAt: Date.now() + Number(delay) * 86_400_000 })}>Seal capsule <Icon name="lock" size={15} /></button></div></div></div> }

function TunerModal({ preferences, onClose, onSave }: { preferences: Preferences; onClose: () => void; onSave: (preferences: Preferences) => void }) { const [selected, setSelected] = useState(preferences.tuned); const options = [['more practical', 'More practical', 'Useful ideas I can try today'], ['less poetry', 'Less poetry', 'Fewer posts from this topic'], ['more new voices', 'More new voices', 'Make room for people I have not heard from'], ['more reflective', 'More reflective', 'Thoughts with a little more room to breathe']]; return <div className="modal-backdrop"><div className="modal tuner-modal"><div className="modal-header"><div><span className="eyebrow">FEED TUNER</span><h2>Make it feel more like yours.</h2><p>Explicit choices beat guesses. These changes take effect now.</p></div><button className="icon-button" onClick={onClose} aria-label="Close"><Icon name="x" size={20} /></button></div><div className="tuner-options">{options.map(([value, label, description]) => <button key={value} className={selected.includes(value) ? 'selected' : ''} onClick={() => setSelected(selected.includes(value) ? selected.filter(item => item !== value) : [...selected, value])}><span className="tuner-check">{selected.includes(value) && <Icon name="check" size={14} />}</span><span><strong>{label}</strong><small>{description}</small></span></button>)}</div><div className="modal-footer"><button className="text-button" onClick={() => setSelected([])}>Reset learned preferences</button><button className="primary-button" onClick={() => onSave({ ...preferences, tuned: selected })}>Save changes <Icon name="arrow" size={15} /></button></div></div></div> }

function RouletteModal({ post, onClose, onShare }: { post: Post; onClose: () => void; onShare: (post: Post) => void }) { const author = authorFor(post.authorId); return <div className="modal-backdrop"><div className="modal roulette-modal"><button className="icon-button modal-close" onClick={onClose} aria-label="Close"><Icon name="x" size={20} /></button><div className="roulette-spark"><Icon name="spark" size={23} /></div><span className="eyebrow">A LITTLE SURPRISE</span><h2>Here is something<br />you might not expect.</h2><div className="roulette-post"><div className={avatarClass(author.tone)}>{author.initials}</div><div><span className="eyebrow">{postTypeLabel[post.type]} · {post.topic}</span><p>{post.text}</p><span className="roulette-author">{author.name} · @{author.handle}</span></div></div><div className="modal-footer"><button className="outline-button" onClick={() => onShare(post)}><Icon name="share" size={15} /> Make a card</button><button className="primary-button" onClick={onClose}>Keep exploring <Icon name="arrow" size={15} /></button></div></div></div> }

function ShareModal({ item, onClose, onToast }: { item: Post | Wisdom; onClose: () => void; onToast: (message: string) => void }) { const isWisdom = 'sourceText' in item; const rightsCleared = !isWisdom || item.rightsStatus === 'original' || item.rightsStatus === 'licensed'; const text = isWisdom ? item.sourceText : item.text; const source = isWisdom ? item.source : `${authorFor(item.authorId).name} · @${authorFor(item.authorId).handle}`; const downloadCard = () => { const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1080; const ctx = canvas.getContext('2d'); if (!ctx) return; ctx.fillStyle = '#f2ede4'; ctx.fillRect(0, 0, 1080, 1080); ctx.fillStyle = '#191917'; ctx.font = 'bold 28px Georgia'; ctx.fillText('heatt', 72, 92); ctx.fillStyle = '#d96442'; ctx.fillRect(72, 134, 62, 5); ctx.fillStyle = '#191917'; ctx.font = '44px Georgia'; const words = text.split(' '); let line = ''; let y = 350; for (const word of words) { const test = line + word + ' '; if (ctx.measureText(test).width > 870) { ctx.fillText(line, 72, y); line = word + ' '; y += 62 } else line = test } ctx.fillText(line, 72, y); ctx.fillStyle = '#6c6b63'; ctx.font = '20px Arial'; ctx.fillText(source, 72, y + 90); ctx.fillText('where your mind catches fire.', 72, 1004); const link = document.createElement('a'); link.download = 'heatt-card.png'; link.href = canvas.toDataURL('image/png'); link.click(); onToast('Your card is ready to share.'); onClose() }; return <div className="modal-backdrop"><div className="modal share-modal"><div className="modal-header"><div><span className="eyebrow">SHARE BEAUTIFULLY</span><h2>Carry this with you.</h2><p>A simple card, rendered here on your device.</p></div><button className="icon-button" onClick={onClose} aria-label="Close"><Icon name="x" size={20} /></button></div><div className="share-preview"><div className="preview-brand"><span className="brand-mark"><span /></span>heatt</div><div className="preview-content">{isWisdom && <span className="preview-eyebrow">{item.path} path</span>}<div className="preview-quote">{isWisdom ? '\u201c' : ''}{text}{isWisdom ? '\u201d' : ''}</div><span className="preview-source">{source}</span></div><span className="preview-footer">where your mind catches fire.</span></div><div className="share-options"><button className="outline-button" onClick={downloadCard}><Icon name="arrow" size={15} /> Download 1080 \u00d7 1080</button><button className="primary-button" onClick={() => { navigator.clipboard?.writeText(text); onToast('Copied to your clipboard.'); onClose() }}><Icon name="share" size={15} /> Copy text</button></div><p className="share-note"><Icon name="lock" size={12} /> This card is made locally. Your private writing never leaves your device. {isWisdom && !rightsCleared && 'This source is still pending rights review; do not publish it externally until cleared.'}</p></div></div> }

function EmptyState({ icon, title, description, action, onAction }: { icon: IconName; title: string; description: string; action: string; onAction: () => void }) { return <div className="empty-state"><div className="empty-icon"><Icon name={icon} size={22} /></div><h3>{title}</h3><p>{description}</p><button className="outline-button" onClick={onAction}>{action} <Icon name="arrow" size={14} /></button></div> }
