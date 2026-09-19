import { useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { BadgeCheck, Bookmark, Clock, ExternalLink, Share2 } from 'lucide-react'
import type { BlogSource } from '../data/blogCatalog'
import { artFor } from '../data/categoryArt'
import { HeatButton } from './Heat'
import { Dialog, DialogContent } from './ui/Dialog'
import { SourceMark } from './ui/SourceMark'
import { cn } from '../lib/cn'

/* ============================================================
   HEATT · FLARE READER (Radix + Tailwind)
   Blog cards open right here in Heatt — no redirect. The
   article is fetched on demand through privacy-friendly CORS
   reader endpoints, rendered as a flare post, and always
   credited to the original owner, with the source link one
   tap away. A small local cache keeps repeat opens instant.
   ============================================================ */

type ReaderBlock =
  | { kind: 'heading'; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'quote'; text: string }
  | { kind: 'list'; items: string[] }

type ReaderCacheEntry = { at: number; title: string; blocks: ReaderBlock[] }

const CACHE_KEY = 'heatt-reader-cache'
const CACHE_TTL = 1000 * 60 * 60 * 24 * 7
const MAX_BLOCKS = 46

function loadCache(): Record<string, ReaderCacheEntry> {
  try { return JSON.parse(window.localStorage.getItem(CACHE_KEY) ?? '{}') as Record<string, ReaderCacheEntry> } catch { return {} }
}

function saveCache(id: string, entry: ReaderCacheEntry) {
  try {
    const cache = loadCache()
    cache[id] = entry
    const keys = Object.keys(cache)
    if (keys.length > 40) for (const key of keys.slice(0, keys.length - 40)) delete cache[key]
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch { /* storage full or unavailable — the reader still works uncached */ }
}

/** Convert fetched text (markdown from the reader proxy) into display blocks. */
function toBlocks(raw: string): { title: string; blocks: ReaderBlock[] } {
  const lines = raw.split(/\r?\n/).map(line => line.trim())
  const blocks: ReaderBlock[] = []
  let title = ''
  let listBuffer: string[] = []
  let paragraph: string[] = []
  let seen = 0

  const flushParagraph = () => {
    if (!paragraph.length) return
    const text = paragraph.join(' ')
    paragraph = []
    if (text.length < 2) return
    blocks.push({ kind: 'paragraph', text: clean(text) })
    seen += 1
  }
  const flushList = () => {
    if (!listBuffer.length) return
    blocks.push({ kind: 'list', items: listBuffer.slice(0, 8).map(clean) })
    listBuffer = []
    seen += 1
  }

  for (const line of lines) {
    if (seen >= MAX_BLOCKS) break
    if (!line) { flushParagraph(); flushList(); continue }
    if (/^(title|markdown lite|warning|source url):/i.test(line)) continue
    const heading = line.match(/^#{1,6}\s+(.*)$/) || line.match(/^(?:\*\*){0,1}([A-Z][^.!?]{8,90})(?:\*\*){0,1}$/)
    if (heading && heading[1] && line.startsWith('#')) {
      flushParagraph(); flushList()
      const text = clean(heading[1])
      if (!title && line.startsWith('# ')) title = text
      else if (text.length > 2 && text.length < 110) blocks.push({ kind: 'heading', text })
      continue
    }
    const bullet = line.match(/^[-*•]\s+(.*)$/)
    if (bullet) {
      flushParagraph()
      listBuffer.push(bullet[1])
      continue
    }
    const quote = line.match(/^>\s+(.*)$/)
    if (quote) { flushParagraph(); flushList(); blocks.push({ kind: 'quote', text: clean(quote[1]) }); seen += 1; continue }
    const linkOnly = line.match(/^\[([^\\]]+)\]\(([^)]+)\)$/)
    if (linkOnly) continue
    paragraph.push(line)
    if (paragraph.join(' ').length > 420) flushParagraph()
  }
  flushParagraph(); flushList()
  return { title, blocks }
}

function clean(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/[*_`#>]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

async function fetchArticle(url: string): Promise<{ title: string; blocks: ReaderBlock[] } | null> {
  const endpoints = [
    `https://r.jina.ai/${url}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  ]
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, { headers: { Accept: 'text/plain, text/markdown, text/html;q=0.9, */*;q=0.8' } })
      if (!response.ok) continue
      const body = await response.text()
      if (!body || body.length < 200) continue
      const parsed = toBlocks(body)
      if (parsed.blocks.length >= 3) return parsed
    } catch { /* try the next endpoint */ }
  }
  return null
}

export function FlareReader({ blog, heat, onHeat, saved, onSave, onToast, onClose }: {
  blog: BlogSource
  heat: number
  onHeat: (intensity: number) => void
  saved: boolean
  onSave: () => void
  onToast: (message: string) => void
  onClose: () => void
}) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'offline'>('loading')
  const [article, setArticle] = useState<{ title: string; blocks: ReaderBlock[] } | null>(null)
  const art = artFor(blog.category)

  useEffect(() => {
    let active = true
    const cached = loadCache()[blog.id]
    if (cached && Date.now() - cached.at < CACHE_TTL) {
      setArticle(cached); setStatus('ready'); return
    }
    setStatus('loading')
    fetchArticle(blog.url).then(result => {
      if (!active) return
      if (result) {
        setArticle(result)
        setStatus('ready')
        saveCache(blog.id, { at: Date.now(), title: result.title, blocks: result.blocks })
      } else setStatus('offline')
    })
    return () => { active = false }
  }, [blog.id, blog.url])

  const headline = useMemo(() => article?.title?.trim() || `The latest from ${blog.name}`, [article, blog.name])
  const readingMinutes = useMemo(() => {
    const words = (article?.blocks ?? []).map(block => block.kind === 'list' ? block.items.join(' ') : block.text).join(' ').split(/\s+/).length
    return Math.max(1, Math.round(words / 220))
  }, [article])

  const shareFlare = async () => {
    try {
      const nativeShare = (navigator as Navigator & { share?: (data: ShareData) => Promise<void> }).share
      if (typeof nativeShare === 'function') await nativeShare.call(navigator, { title: blog.name, text: `A warm read from ${blog.name}`, url: blog.url })
      else await navigator.clipboard?.writeText(blog.url)
      onToast(typeof nativeShare === 'function' ? 'Shared from the original source.' : 'Original link copied.')
    } catch { /* cancelled share sheet */ }
  }

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent wide className="flex max-h-[min(92vh,900px)] flex-col p-0" aria-label={`Read ${blog.name} in Heatt`}>
        {/* cover */}
        <div className="relative h-44 shrink-0 overflow-hidden bg-card-deep sm:h-52">
          {art.image
            ? <img src={art.image} alt="" className="h-full w-full object-cover" />
            : <div className="grid h-full w-full place-items-center font-display text-sm uppercase tracking-[0.2em] text-muted">{blog.category}</div>}
          <div className="absolute inset-0 bg-gradient-to-t from-card via-black/25 to-black/10" />
          <div className="absolute bottom-3 left-7 right-7 flex items-end justify-between gap-3">
            <span className="rounded-full border border-white/25 bg-black/35 px-3 py-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-white/90 backdrop-blur">
              {blog.category}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-good/50 bg-card/85 px-3 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-good backdrop-blur">
              <BadgeCheck size={12} strokeWidth={2.4} /> original owner
            </span>
          </div>
        </div>

        {/* scrollable body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-7 pb-7 pt-4">
          {/* author row — the blog's owner is the author of this flare */}
          <div className="flex items-center gap-3.5">
            <SourceMark accent={blog.accent} initials={blog.initials} className="h-12 w-12 text-[13px]" />
            <div className="grid min-w-0 flex-1 gap-0.5">
              <strong className="truncate font-display text-[15px] font-bold text-ink">{blog.name}</strong>
              <span className="truncate font-mono text-[10.5px] text-muted">@{blog.domain} · {blog.publisher}</span>
            </div>
          </div>

          <h1 className="mt-5 font-display text-[clamp(23px,3.4vw,31px)] font-bold leading-[1.13] tracking-[-0.02em] text-ink">{headline}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-ember-soft px-2.5 py-1 font-semibold text-ember-deep">
              <Clock size={11} /> {readingMinutes} min flare
            </span>
            <span>fetched for you, live</span>
            <span aria-hidden>·</span>
            <span>cached on this device</span>
          </div>

          {status === 'loading' && (
            <div className="mt-7 grid gap-3" aria-live="polite">
              <p className="text-[12.5px] text-ink-soft">Fetching “{blog.name}” from its home on the open web…</p>
              <div className="grid gap-2.5">
                <span className="h-3 w-full animate-shimmer rounded-full bg-card-deep" />
                <span className="h-3 w-[82%] animate-shimmer rounded-full bg-card-deep [animation-delay:.12s]" />
                <span className="h-3 w-[64%] animate-shimmer rounded-full bg-card-deep [animation-delay:.24s]" />
                <span className="mt-2 h-3 w-[92%] animate-shimmer rounded-full bg-card-deep [animation-delay:.3s]" />
                <span className="h-3 w-[55%] animate-shimmer rounded-full bg-card-deep [animation-delay:.4s]" />
              </div>
            </div>
          )}

          {status === 'offline' && (
            <div className="mt-6 grid gap-2.5">
              <p className="text-[13px] font-semibold text-ink">The publisher’s site did not answer just now.</p>
              <p className="text-[12.5px] text-ink-soft">Here is what we know about this source while it rests:</p>
              <blockquote className="rounded-r-2xl border-l-[3px] border-ember bg-card-soft px-5 py-4 font-display text-[15px] leading-relaxed text-ink">
                “{blog.description}”
              </blockquote>
              <p className="font-mono text-[11px] text-muted">{blog.tags.map(tag => `#${tag}`).join('   ')}</p>
            </div>
          )}

          {status === 'ready' && article && (
            <motion.div
              className="mt-6 grid gap-[15px]"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              {article.blocks.map((block, index) => {
                if (block.kind === 'heading') return <h2 key={index} className="mt-2 font-display text-[19px] font-bold leading-snug tracking-[-0.01em] text-ink">{block.text}</h2>
                if (block.kind === 'quote') return <blockquote key={index} className="border-l-[3px] border-ember py-1 pl-[18px] font-display text-[16.5px] leading-[1.6] text-ink">{block.text}</blockquote>
                if (block.kind === 'list') return <ul key={index} className="grid list-disc gap-2 pl-5 text-[14px] leading-[1.7] text-ink-soft">{block.items.map((item, itemIndex) => <li key={itemIndex} className="marker:text-ember">{item}</li>)}</ul>
                return <p key={index} className="text-[14.5px] leading-[1.8] text-ink-soft">{block.text}</p>
              })}
            </motion.div>
          )}

          <footer className="mt-7 grid gap-2.5 border-t border-dashed border-line-strong pt-5">
            <p className="text-[11px] leading-relaxed text-muted">
              This flare was fetched live from <strong className="text-ink-soft">{blog.domain}</strong> and belongs to {blog.name}. Heatt stores only a local copy for you — the words stay the author’s own.
            </p>
            <a
              href={blog.url}
              target="_blank"
              rel="noreferrer"
              data-testid="visit-blog"
              className="inline-flex w-max items-center gap-1.5 text-[12px] font-semibold text-ember transition hover:text-ember-deep hover:underline"
            >
              Open the original at {blog.domain} <ExternalLink size={13} />
            </a>
          </footer>
        </div>

        {/* actions */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-line bg-card-soft px-6 py-4">
          <HeatButton value={heat} onChange={onHeat} size="lg" label={blog.name} />
          <div className="flex items-center gap-2.5">
            <button
              className={cn(
                'inline-flex h-11 items-center gap-2 rounded-full border px-4 text-[12px] font-bold transition',
                saved ? 'border-good bg-good/10 text-good' : 'border-line-strong bg-card text-ink hover:border-ember hover:text-ember',
              )}
              onClick={onSave}
            >
              {saved ? <Bookmark size={14} className="fill-current" /> : <Bookmark size={14} />}
              {saved ? 'On your shelf' : 'Save source'}
            </button>
            <button
              className="grid h-11 w-11 place-items-center rounded-full border border-line-strong bg-card text-ink-soft transition hover:border-ember hover:text-ember"
              onClick={shareFlare}
              aria-label={`Share ${blog.name}`}
            >
              <Share2 size={16} />
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function ReaderPortal({ blog, heat, onHeat, saved, onSave, onToast, onClose }: Parameters<typeof FlareReader>[0]) {
  if (!blog) return null
  return <FlareReader blog={blog} heat={heat} onHeat={onHeat} saved={saved} onSave={onSave} onToast={onToast} onClose={onClose} />
}
