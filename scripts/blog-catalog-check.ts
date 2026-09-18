import assert from 'node:assert/strict'
import { blogCatalog, blogCategories } from '../src/data/blogCatalog.ts'

assert.equal(blogCatalog.length, 53, 'cold-start catalog should keep the reviewed 53-source launch set')
assert.equal(new Set(blogCatalog.map(source => source.id)).size, blogCatalog.length, 'source ids must be unique')
assert.equal(new Set(blogCatalog.map(source => source.url)).size, blogCatalog.length, 'source links must be unique')

for (const category of blogCategories) {
  const sources = blogCatalog.filter(source => source.category === category)
  assert.ok(sources.length >= 4, `${category} should have at least four sources`)
}

for (const source of blogCatalog) {
  const url = new URL(source.url)
  assert.equal(url.protocol, 'https:', `${source.name} must use HTTPS`)
  assert.ok(source.name.trim().length > 2, `${source.id} needs a display name`)
  assert.ok(source.description.length >= 80 && source.description.length <= 220, `${source.id} needs a concise editorial description`)
  assert.ok(source.publisher.trim(), `${source.id} needs a publisher type`)
  assert.ok(source.tags.length >= 3, `${source.id} needs discovery tags`)
  assert.ok(!source.description.includes('http'), `${source.id} description must not embed a link or copied feed content`)
}

console.log(`Blog catalog checks passed (${blogCatalog.length} sources across ${blogCategories.length} categories).`)
