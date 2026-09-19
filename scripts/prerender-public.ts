import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { blogCatalog, blogCatalogReviewedOn, blogCategories } from '../src/data/blogCatalog.ts'

const siteUrl = (process.env.VITE_SITE_URL || 'https://heatt.app').replace(/\/$/, '')
const shell = await readFile('dist/index.html', 'utf8')
const slugify = (value: string) => value.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
const escape = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
const page = (title: string, description: string, path: string, body: string) => shell
  .replace(/<title>.*?<\/title>/, `<title>${escape(title)}</title>`)
  .replace('<meta name="description" content="A thoughtful social network for worthwhile expression, intentional discovery, and small communities." />', `<meta name="description" content="${escape(description)}" />`)
  .replace('<meta property="og:title" content="Heatt — make room for what matters" />', `<meta property="og:title" content="${escape(title)}" />`)
  .replace('<meta property="og:description" content="Thoughtful expression, original free reads, and kind rooms — without the attention traps." />', `<meta property="og:description" content="${escape(description)}" />`)
  .replace('</head>', `    <link rel="canonical" href="${siteUrl}${path}" />\n    <script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'CollectionPage', name: title, description, url: `${siteUrl}${path}` }).replaceAll('<', '\\u003c')}</script>\n  </head>`)
  .replace('<div id="root"></div>', `<div id="root">${body}</div>`)

const links: string[] = []
for (const category of blogCategories) {
  const slug = slugify(category)
  const path = `/explore/${slug}`
  const sources = blogCatalog.filter(source => source.category === category)
  const title = `Best free ${category.toLowerCase()} blogs to read | Heatt`
  const description = `${sources.length} carefully curated ${category.toLowerCase()} blogs with substantial free writing. Visit every article at its original publisher.`
  const body = `<main style="max-width:900px;margin:60px auto;padding:20px;font-family:system-ui;color:#272724"><a href="/" style="color:#b94b32">Heatt</a><h1>${escape(title)}</h1><p>${escape(description)} Reviewed ${escape(blogCatalogReviewedOn)}.</p><ol>${sources.map(source => `<li style="margin:25px 0"><h2><a href="${escape(source.url)}">${escape(source.name)}</a></h2><p>${escape(source.description)}</p><small>${escape(source.publisher)} · ${escape(source.domain)}</small></li>`).join('')}</ol></main>`
  await mkdir(`dist${path}`, { recursive: true })
  await writeFile(`dist${path}/index.html`, page(title, description, path, body))
  links.push(path)
}

const legal = [
  ['/privacy', 'Privacy policy | Heatt', 'How Heatt handles account data, explicit preferences, private journals, security, retention, and your choices.'],
  ['/terms', 'Terms of use | Heatt', 'The rules that keep Heatt thoughtful, lawful, and safe while preserving room for worthwhile expression.'],
] as const
for (const [path, title, description] of legal) {
  await mkdir(`dist${path}`, { recursive: true })
  await writeFile(`dist${path}/index.html`, page(title, description, path, `<main style="max-width:800px;margin:60px auto;padding:20px;font-family:system-ui"><a href="/">Heatt</a><h1>${escape(title)}</h1><p>${escape(description)}</p><p>Last updated September 19, 2026. Open this page with JavaScript enabled for the complete policy.</p></main>`))
  links.push(path)
}
await writeFile('dist/robots.txt', `User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: ${siteUrl}/sitemap.xml\n`)
await writeFile('dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['/', ...links].map(path => `<url><loc>${siteUrl}${path}</loc></url>`).join('')}</urlset>`)
console.log(`Pre-rendered ${blogCategories.length} category pages, legal pages, robots.txt, and sitemap.xml.`)
