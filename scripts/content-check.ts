import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const records = JSON.parse(readFileSync(new URL('../content/wisdom/library.json', import.meta.url), 'utf8')) as Array<Record<string, unknown>>
assert.ok(records.length >= 20, 'Wisdom catalog should have a meaningful cold-start set')
assert.ok(records.some(record => record.sourceType === 'original'), 'original Heatt fallback records are required')
assert.ok(records.some(record => record.sourceType === 'public-domain-source-review'), 'researched source records are required')
for (const record of records) {
  for (const key of ['sourceText', 'editorialContext', 'interpretation', 'practicePrompt', 'sourceUrl', 'work', 'author', 'translatorOrEditor', 'edition', 'provenance', 'jurisdictionCaveat', 'rightsStatus', 'reviewState']) {
    assert.ok(record[key], `${String(record.id)} is missing ${key}`)
  }
  assert.ok(!('quote' in record) && !('context' in record) && !('practice' in record), `${String(record.id)} must use separated content fields`)
  if (record.sourceType === 'public-domain-source-review') assert.equal(record.reviewState, 'pending_rights_review', `${String(record.id)} is not launch-cleared by default`)
  if (record.sourceType === 'original') assert.equal(record.rightsStatus, 'original', `${String(record.id)} must retain the original rights state`)
}
console.log(`Wisdom content checks passed (${records.length} records; ${records.filter(record => record.sourceType === 'original').length} original fallbacks).`)
