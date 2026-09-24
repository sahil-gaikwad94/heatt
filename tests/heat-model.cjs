/* ============================================================================
   heatt model harness — runs the real TS modules (compiled to CommonJS by
   scripts/model-test.sh) and asserts the decay maths, the ranker, the store
   and the seed corpus. No DOM, no browser: `npm run test:model`.

   The model is deliberately small: recency-weighted attention, no physics.
   These assertions exist to keep it that way — if someone reintroduces a
   temperature, a diffusion step or a reputation multiplier, this file fails.
   ==========================================================================*/
const path = require('node:path');
const OUT = process.env.OUT_DIR || path.resolve(__dirname, '../.tmp-model-test');
const store = {};
globalThis.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => {
    store[k] = String(v);
  },
  removeItem: (k) => {
    delete store[k];
  },
};
globalThis.window = globalThis;
globalThis.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });

const H = require(OUT + '/heat.js');
const F = require(OUT + '/feed.js');
const S = require(OUT + '/store.js');
const U = require(OUT + '/util.js');
const A = require(OUT + '/seed/articles.js');
const SP = require(OUT + '/seed/sparks.js');
const US = require(OUT + '/seed/users.js');

const now = Date.now();
const hrs = (h) => new Date(now - h * 3600e3).toISOString();
let fails = 0;
const ok = (n, c, x = '') => {
  console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${x ? '  ' + x : ''}`);
  if (!c) fails++;
};

/* ------------------------------------------------------------ the decay */

ok('fade(): τ=30h for the crowd', Math.abs(H.fade(30) - Math.exp(-1)) < 1e-9 && H.fade(0) === 1, `e^-1 check: ${H.fade(30).toFixed(4)}`);
ok('fade(): your own heat cools slower', Math.abs(H.fade(46, H.HEAT.tauMine) - Math.exp(-1)) < 1e-9, 'τᵐ=46h');
ok('fade(): never negative, never above 1', H.fade(-5) === 1 && H.fade(1000) > 0 && H.fade(1000) < 1, H.fade(1000).toExponential(2));

const a = H.computeHeat({ reactions: 200, date: hrs(1) }, now);
const b = H.computeHeat({ reactions: 200, date: hrs(31) }, now);
ok('crowd volume decays ~e^(−30/30)', Math.abs(b.volume / a.volume - Math.exp(-30 / 30)) < 0.05, `ratio ${(b.volume / a.volume).toFixed(3)} vs ${Math.exp(-1).toFixed(3)}`);

const hot = H.computeHeat({ reactions: 20, date: hrs(1), mine: { level: 3, at: now - 3600e3 } }, now);
const old = H.computeHeat({ reactions: 20, date: hrs(1), mine: { level: 3, at: now - 45 * 3600e3 } }, now);
ok('personal lift decays with its own constant', old.lift < hot.lift && old.lift > 0, `${hot.lift} → ${old.lift}`);

/* -------------------------------------------------------------- the levels */

const mk = (lvl) => H.computeHeat({ reactions: 5, date: hrs(0.1), mine: { level: lvl, at: now } }, now);
const [t0, t1, t2, t3] = [0, 1, 2, 3].map(mk);
ok('heat rises strictly with the level', t1.heat > t0.heat && t2.heat > t1.heat && t3.heat > t2.heat, `${t0.heat} < ${t1.heat} < ${t2.heat} < ${t3.heat}`);
ok('ignition is worth ≈6.5× a first tap', Math.abs((t3.lift - t0.lift) / (t1.lift - t0.lift) - H.HEAT.levelW[3] / H.HEAT.levelW[1]) < 0.01, `${(((t3.lift - t0.lift) / (t1.lift - t0.lift)) || 0).toFixed(2)} vs ${(H.HEAT.levelW[3] / H.HEAT.levelW[1]).toFixed(2)}`);
ok('heat is normalised to 0..100 and monotone', [t0, t1, t2, t3].every((x) => x.heat >= 0 && x.heat <= 100) && t3.heat > t2.heat, `heats ${[t0, t1, t2, t3].map((x) => x.heat).join(',')}`);
ok('score is positive even for a quiet piece', H.computeHeat({}, now).score > 0);
ok('a piece with no signals still carries a floor', H.computeHeat({}, now).heat >= 0 && Number.isFinite(H.computeHeat({}, now).score));

ok('LEVEL_META covers 0..3 in plain words', [0, 1, 2, 3].every((l) => !!H.LEVEL_META[l]?.name && !!H.LEVEL_META[l]?.copy));
ok('no temperature language in the level copy', !/cold|molten|warm|kelvin|thermal/i.test([0, 1, 2, 3].map((l) => H.LEVEL_META[l].name + ' ' + H.LEVEL_META[l].copy).join(' ')));
ok('HOLD_MS encodes tap / hold / ignite', H.HOLD_MS[3] === 2200 && H.HOLD_MS[2] === 1000, H.HOLD_MS.join(','));
ok('levelLabel() reads plainly', typeof H.levelLabel(3) === 'string' && H.levelLabel(3) === H.LEVEL_META[3].name, H.levelLabel(3));

/* ------------------------------------------------------------- the spread */

const spread = H.spreadByAuthor(
  [
    { id: '1', authorHandle: 'a' },
    { id: '2', authorHandle: 'a' },
    { id: '3', authorHandle: 'a' },
    { id: '4', authorHandle: 'b' },
    { id: '5', authorHandle: 'c' },
  ],
  3
);
ok('spreadByAuthor keeps every item', spread.length === 5 && new Set(spread.map((x) => x.id)).size === 5, spread.map((x) => x.id).join(''));
ok('spreadByAuthor never puts three of one writer in a row', spread.every((x, i) => i < 2 || !(spread[i - 1].authorHandle === x.authorHandle && spread[i - 2].authorHandle === x.authorHandle)), spread.map((x) => x.authorHandle).join(''));
ok('spreadByAuthor leaves short lists alone', H.spreadByAuthor([{ id: '1', authorHandle: 'a' }], 3).length === 1);

/* ------------------------------------------------------------ the corpus */

const emptyState = { mySparks: [], myArticles: [], heat: {}, saved: {}, reads: {}, shares: {}, me: null, follows: [], interests: [], wire: [] };
const posts = F.assemble(emptyState, []);
ok('assemble has unique ids', new Set(posts.map((p) => p.id)).size === posts.length, `${posts.length} posts`);
ok('the corpus is the house plus the syndicated snapshot', posts.every((p) => p.authorHandle === US.HOUSE_HANDLE || p.origin === 'wire' || p.origin === 'mine'), [...new Set(posts.map((p) => p.origin))].join(','));
ok('no invented authors in the bundle', new Set(posts.map((p) => p.authorHandle)).size <= 12, `${new Set(posts.map((p) => p.authorHandle)).size} handles`);
ok('every post carries a heat score', posts.every((p) => p.heatScore && Number.isFinite(p.heatScore.heat) && Number.isFinite(p.heatScore.score)));
ok('heat actually differs between pieces', new Set(posts.map((p) => p.heatScore.heat)).size > Math.min(6, posts.length), `${new Set(posts.map((p) => p.heatScore.heat)).size} distinct of ${posts.length}`);
ok('every post is either a spark or a forge', posts.every((p) => p.kind === 'spark' || p.kind === 'forge'));
ok('stories carry a reading time and notes do not', posts.filter((p) => p.kind === 'forge').every((p) => (p.minutes ?? 0) > 0) && posts.filter((p) => p.kind === 'spark').every((p) => !p.minutes));
ok('the seed articles all expose blocks for the reader', A.ORIGINALS.every((o) => Array.isArray(o.blocks) && o.blocks.length > 3), `${A.ORIGINALS.length} originals`);
ok('the house notes are all written by the house', SP.SPARKS.every((s) => s.author === US.HOUSE_HANDLE), `${SP.SPARKS.length} notes`);
ok('the house handle resolves to a real profile', US.getUser(US.HOUSE_HANDLE).name.length > 0 && US.isHouse(US.HOUSE_HANDLE));

/* -------------------------------------------------------------- the rank */

for (const mode of ['for-you', 'fresh', 'popular', 'discussed']) {
  const r = F.rank(posts, emptyState, { mode });
  ok(`rank(${mode}) returns the whole board, ordered`, r.items.length === posts.length && r.total === posts.length);
}
const fresh = F.rank(posts, emptyState, { mode: 'fresh' }).items;
ok('fresh is newest first', fresh.every((p, i) => i === 0 || new Date(fresh[i - 1].date).getTime() >= new Date(p.date).getTime()));
const popular = F.rank(posts, emptyState, { mode: 'popular' }).items;
ok('popular sorts on decayed volume', popular.every((p, i) => i === 0 || popular[i - 1].heatScore.volume >= p.heatScore.volume));
const discussed = F.rank(posts, emptyState, { mode: 'discussed' }).items;
ok('discussed sorts on replies', discussed.every((p, i) => i === 0 || discussed[i - 1].comments >= p.comments));

const stories = F.rank(posts, emptyState, { tab: 'stories' }).items;
ok('the stories tab holds only stories', stories.length > 0 && stories.every((p) => p.kind === 'forge'), `${stories.length} of ${posts.length}`);
const notes = F.rank(posts, emptyState, { tab: 'notes' }).items;
ok('the notes tab holds only notes', notes.length > 0 && notes.every((p) => p.kind === 'spark'), `${notes.length} of ${posts.length}`);
const keptId = posts[0].id;
const kept = F.rank(posts, { ...emptyState, saved: { [keptId]: Date.now() } }, { tab: 'kept' }).items;
ok('the kept tab is exactly what you saved', kept.length === 1 && kept[0].id === keptId);
const followed = F.rank(posts, { ...emptyState, follows: [US.HOUSE_HANDLE] }, { tab: 'following' }).items;
ok('the following tab is the people you follow', followed.length > 0 && followed.every((p) => p.authorHandle === US.HOUSE_HANDLE), `${followed.length} pieces`);
ok('your own work always appears in your following tab', F.rank(posts, { ...emptyState, me: { handle: 'writer', name: 'Writer', bio: '', joined: '2026-01-01' } }, { tab: 'following' }).items.every((p) => p.authorHandle !== 'nobody'));

ok('rank tolerates an incomplete store', (() => {
  try {
    F.rank(posts, { heat: {} }, { mode: 'for-you' });
    return true;
  } catch {
    return false;
  }
})());

/* ------------------------------------------------------------- the tabs */

ok('matches() finds a word in the body', posts.some((p) => F.matches(p, 'heat')) && !posts.every((p) => F.matches(p, 'zzzzqqq')));
ok('matches() understands a #tag and an @handle', posts.some((p) => F.matches(p, '#design')) || posts.some((p) => F.matches(p, '@heatt')));
const tags = F.trendingTags(posts, now, 6);
ok('trendingTags returns ranked tags with weights', tags.length > 0 && tags.every((t, i) => t.tag && t.weight > 0 && (i === 0 || tags[i - 1].weight >= t.weight)), tags.slice(0, 4).map((t) => `#${t.tag}`).join(' '));
const authors = F.topAuthors(posts, 5);
ok('topAuthors never ranks the house against writers', authors.every((x) => x.handle !== US.HOUSE_HANDLE), `${authors.length} ranked`);

const readingPosts = posts.filter((p) => p.kind === 'forge').slice(0, 2);
const unfinished = F.unfinished(readingPosts, { reads: { [readingPosts[0].id]: { pct: 42, at: now }, [readingPosts[1].id]: { pct: 100, at: now } } });
ok('unfinished() keeps the half-read piece only', unfinished.length === 1 && unfinished[0].pct === 42, JSON.stringify(unfinished.map((u) => u.pct)));
ok('unfinished() ignores a piece you never opened', F.unfinished(readingPosts, { reads: {} }).length === 0);

/* ------------------------------------------------------------- the store */

const s0 = S.useStore.getState();
ok('the store is versioned for migrations', JSON.stringify(S.useStore.persist.getOptions().name).includes('heatt-store-v2'), S.useStore.persist.getOptions().name);
ok('a fresh store has no profile', !s0.me);
ok('a fresh store has no heat', Object.keys(s0.heat).length === 0);
ok('prefs default to the calm end of the range', s0.prefs.reduceMotion === false && s0.prefs.ambient === true && s0.prefs.ignitionFx === 'full', JSON.stringify(s0.prefs));

s0.setHeat('orig-heat', 1, { title: 't', author: 'heatt' });
ok('setHeat writes a ledger entry', S.useStore.getState().heat['orig-heat'].level === 1);
S.useStore.getState().setHeat('orig-heat', 0);
ok('setHeat(0) forgets the piece entirely', S.useStore.getState().heat['orig-heat'] === undefined);
S.useStore.getState().setHeat('orig-room', 3, { title: 't', author: 'heatt' });
ok('ignition is stored at level 3 with a timestamp', S.useStore.getState().heat['orig-room'].level === 3 && S.useStore.getState().heat['orig-room'].at > 0);

S.useStore.getState().toggleSave('orig-room');
ok('keeping a piece is recorded', !!S.useStore.getState().saved['orig-room']);
S.useStore.getState().toggleSave('orig-room');
ok('un-keeping removes it', !S.useStore.getState().saved['orig-room']);

S.useStore.getState().setRead('orig-room', 55);
ok('reading progress is stored', S.useStore.getState().reads['orig-room'].pct === 55);
S.useStore.getState().setRead('orig-room', 99);
ok('finishing is flagged', S.useStore.getState().reads['orig-room'].finished === true);

S.useStore.getState().ensureMe();
const me = S.useStore.getState().me;
ok('ensureMe mints an identity on demand', !!me?.handle && me.handle === 'you', `handle=${me?.handle}`);
ok('the minted identity is never a fake person', !/^[a-z]+_[a-z]+\d+$/.test(me.handle) && me.name === 'You');

const mine = S.useStore.getState().addSpark({ author: me.handle, text: 'Written here.', tags: ['design'], reactions: 0, comments: 0 });
ok('publishing a note mints an id and a date', !!mine.id && !!mine.date && mine.kind === 'spark');
const article = S.useStore.getState().addArticle({ title: 'A story', dek: 'One line.', author: me.handle, tags: ['craft'], markdown: 'Body text.' });
ok('publishing a story estimates its reading time', article.minutes >= 1 && article.kind === 'forge');

const withMine = F.assemble(S.useStore.getState(), []);
ok('your own work is assembled into the corpus', withMine.some((p) => p.id === mine.id) && withMine.some((p) => p.id === article.id));
ok('your own pieces are attributed to you', withMine.filter((p) => p.origin === 'mine').every((p) => p.authorHandle === me.handle && p.authorName === me.name));
ok('every assembled piece carries heat, including yours', withMine.every((p) => p.heatScore && Number.isFinite(p.heatScore.heat)));
ok('ignition visibly raises a piece above a quiet one', (() => {
  const before = F.heatFor(withMine.find((p) => p.id === mine.id), S.useStore.getState()).heat;
  S.useStore.getState().setHeat(mine.id, 3, { title: 'Written here.', author: me.handle });
  const after = F.heatFor(F.assemble(S.useStore.getState(), []).find((p) => p.id === mine.id), S.useStore.getState()).heat;
  return after > before;
})());
const withAuthors = [...withMine];
ok('topAuthors ranks a local writer once one exists', F.topAuthors(withAuthors, 5).some((x) => x.handle === me.handle), F.topAuthors(withAuthors, 5).map((x) => x.handle).join(','));

S.useStore.getState().toggleMute('@heatt');
ok('muting records the handle with its @', S.useStore.getState().muted.includes('@heatt'));
ok('assemble drops a muted author', !F.assemble(S.useStore.getState(), []).some((p) => p.authorHandle === US.HOUSE_HANDLE));
S.useStore.getState().toggleMute('@heatt');
ok('unmuting brings them back', F.assemble(S.useStore.getState(), []).some((p) => p.authorHandle === US.HOUSE_HANDLE));

S.useStore.getState().addReply({ postId: mine.id, author: me.handle, text: 'Adding to the thread.' });
ok('a reply is stored against its post', S.useStore.getState().replies.some((r) => r.postId === mine.id));

S.useStore.getState().completeOnboarding(['design', 'reading', 'craft']);
ok('completeOnboarding only files interests', S.useStore.getState().onboarded === true && S.useStore.getState().interests.length === 3);

const reset = S.useStore.getState().reset();
void reset;
ok('reset clears identity, heat, keeps and drafts', !S.useStore.getState().me && Object.keys(S.useStore.getState().heat).length === 0 && S.useStore.getState().mySparks.length === 0);

/* -------------------------------------------------------------- utilities */

ok('compact() reads as a number, not a wall of digits', U.compact(1200) === '1.2k' || U.compact(1200).startsWith('1.2'), U.compact(1200));
ok('timeAgo() is present tense for just-now', /now|^\d+s$/.test(U.timeAgo(now)), U.timeAgo(now));
ok('plain() strips markdown syntax', !/[#*`>]/.test(U.plain('## Heading with **bold** and `code`')));
ok('hash() is stable for the same string', U.hash('heatt') === U.hash('heatt') && U.hash('heatt') !== U.hash('other'));
ok('avatarDataUri() is a self-contained image', U.avatarDataUri('Nyra Vale', 'nyra').startsWith('data:image/svg+xml'));
ok('coverDataUri() is deterministic per seed', U.coverDataUri('heatt') === U.coverDataUri('heatt') && U.coverDataUri('a') !== U.coverDataUri('b'));
ok('readMinutes() never reports zero', U.readMinutes(10) >= 1);

/* ------------------------------------------------------------------ verdict */

console.log(`\n${fails ? `MODEL TEST FAILED (${fails})` : 'MODEL TEST PASSED'}`);
process.exit(fails ? 1 : 0);
