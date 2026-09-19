import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { BlogSource } from '../data/blogCatalog'
import { artFor } from '../data/categoryArt'
import { HeatButton } from './Heat'

/* ============================================================
   HEATT · FLARE READER
   Blog cards open right here in Heatt instead of redirecting.
   The article is fetched on demand through privacy-friendly
   CORS reader endpoints, rendered as a flare, and always
   credited to the original owner — with the source link one
   tap away. Nothing is stored on any server; a small local
   cache keeps repeat opens instant.
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
    const linkOnly = line.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
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
  const scrollRef = useRef<HTMLDivElement | null>(null)
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
    <div className="reader-backdrop" onClick={event => { if (event.target === event.currentTarget) onClose() }}>
      <motion.article
        className="flare-reader"
        role="dialog"
        aria-label={`Read ${blog.name} in Heatt`}
        initial={{ opacity: 0, y: 36, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 28, scale: 0.99 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <button className="icon-button reader-close" onClick={onClose} aria-label="Close reader">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true"><path d="m5 5 14 14M19 5 5 19" /></svg>
        </button>

        <div className="reader-art">
          {art.image
            ? <img src={art.image} alt="" />
            : <div className={`reader-art-fallback shelf-${art.slug}`}>{blog.category}</div>}
          <div className="reader-art-veil" aria-hidden="true" />
        </div>

        <div className="reader-scroll" ref={scrollRef}>
          <div className="reader-source">
            <span className={`source-mark source-${blog.accent}`}>{blog.initials}</span>
            <div>
              <strong>{blog.name}</strong>
              <span>@{blog.domain} · {blog.publisher}</span>
            </div>
            <span className="reader-credit"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 4.5 4.5L19 7" /></svg> original owner</span>
          </div>

          <h1 className="reader-headline">{headline}</h1>
          <div className="reader-meta">
            <span className="category-label">{blog.category}</span>
            <span>{readingMinutes} min flare</span>
            <span>·</span>
            <span>fetched for you, live</span>
          </div>

          {status === 'loading' && (
            <div className="reader-loading" aria-live="polite">
              <span className="loading-flame" />
              <p>Fetching “{blog.name}” from its home on the open web…</p>
              <span className="reader-skeleton"><i /><i /><i /></span>
            </div>
          )}

          {status === 'offline' && (
            <div className="reader-offline">
              <p><strong>The publisher’s site did not answer just now.</strong></p>
              <p>Here is what we know about this source while it rests:</p>
              <blockquote>“{blog.description}”</blockquote>
              <p className="reader-offline-tags">{blog.tags.map(tag => `#${tag}`).join('  ')}</p>
            </div>
          )}

          {status === 'ready' && article && (
            <div className="reader-body">
              {article.blocks.map((block, index) => {
                if (block.kind === 'heading') return <h2 key={index}>{block.text}</h2>
                if (block.kind === 'quote') return <blockquote key={index}>{block.text}</blockquote>
                if (block.kind === 'list') return <ul key={index}>{block.items.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}</ul>
                return <p key={index}>{block.text}</p>
              })}
            </div>
          )}

          <footer className="reader-footer">
            <p>This flare was fetched live from <strong>{blog.domain}</strong> and belongs to {blog.name}. Heatt stores only a local copy for you.</p>
            <a href={blog.url} target="_blank" rel="noreferrer" data-testid="visit-blog">Open the original at {blog.domain} ↗</a>
          </footer>
        </div>

        <div className="reader-actions">
          <HeatButton value={heat} onChange={onHeat} size="lg" label={blog.name} />
          <button className={`outline-button ${saved ? 'saved-source' : ''}`} onClick={onSave}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-3.5L6 21V4.5Z" /></svg>
            {saved ? 'On your shelf' : 'Save source'}
          </button>
          <button className="icon-button" onClick={shareFlare} aria-label={`Share ${blog.name}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="m8.2 10.8 7.6-4.5M8.2 13.2l7.6 4.5" /></svg>
          </button>
        </div>
      </motion.article>
    </div>
  )
}

export function ReaderPortal({ blog, heat, onHeat, saved, onSave, onToast, onClose }: Parameters<typeof FlareReader>[0]) {
  return (
    <AnimatePresence>
      {blog && <FlareReader blog={blog} heat={heat} onHeat={onHeat} saved={saved} onSave={onSave} onToast={onToast} onClose={onClose} />}
    </AnimatePresence>
  )
}
