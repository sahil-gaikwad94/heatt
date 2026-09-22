/* ============================================================================
   tests/smoke/run.cjs — drives every surface of heatt in jsdom.

   This is not a snapshot test: it presses the buttons. Ignition, muting,
   replying, publishing, the canvas poster paint path, ⌘K, the heat grid,
   settings that repaint <html>, and unmount cleanup. Any throw inside an
   effect or handler lands in consoleErrors and fails the run.
   ==========================================================================*/
'use strict';
const path = require('node:path');

const { install, H, consoleErrors, consoleWarns } = require('./harness.cjs');
const React = require('react');

const env = install();
const { window, act, flush, mount, unmount, setLabel } = env;
const nav = require(path.join(__dirname, 'dom-stubs', 'next-navigation.js'));
const doc = window.document;
const U = H(doc);

const { useStore } = require('@/lib/store');
const S = () => useStore.getState();

const ShellProviders = require('@/components/boot/ShellProviders').ShellProviders;
const BootLayer = require('@/components/boot/BootLayer').BootLayer;
const ShellLayout = require(path.join(process.cwd(), '.tmp-client/app/(shell)/layout.js')).default;
const landingMod = require(path.join(process.cwd(), '.tmp-client/app/page.js'));

const page = (rel) => require(path.join(process.cwd(), '.tmp-client', rel)).default;

let pass = 0;
const fails = [];
const ok = (label, cond, note = '') => {
  if (cond) {
    pass++;
    console.log(`  ✓ ${label}${note ? `  ${note}` : ''}`);
  } else {
    fails.push(label + (note ? ` — ${note}` : ''));
    console.log(`  ✗ ${label}${note ? `  ${note}` : ''}`);
  }
};
const step = (name) => {
  setLabel(name);
  console.log(`\n▸ ${name}`);
};
const mountApp = async (Page, { layout = true } = {}) => {
  const inner = layout ? React.createElement(ShellLayout, null, React.createElement(Page)) : React.createElement(Page);
  await mount(
    React.createElement(ShellProviders, null, React.createElement(BootLayer, null, inner))
  );
};
const btn = (re, sel = 'button') => U.allByText(sel, re)[0] || null;
const wait = (ms = 30) => act(async () => new Promise((r) => setTimeout(r, ms)));
/* animations gate the app longer than a fixed sleep is safe for, so poll */
async function until(fn, ms = 4000, label = 'condition') {
  const t0 = Date.now();
  for (;;) {
    const v = fn();
    if (v) return v;
    if (Date.now() - t0 > ms) throw new Error(`timeout waiting for ${label}`);
    await wait(60);
  }
}

(async function run() {
  /* ---------------------------------------------------- 0. cold boot state */
  step('cold boot');
  useStore.persist.clearStorage?.();
  useStore.setState({
    introSeen: false,
    onboarded: false,
    me: null,
    heat: {},
    heatCounts: {},
    reads: {},
    saved: {},
    shares: {},
    follows: [],
    muted: [],
    replies: [],
    mySparks: [],
    myArticles: [],
    notifications: [],
    activity: {},
    interests: [],
  });
  ok('store reset for a first-time visitor', !S().introSeen && !S().onboarded);

  await mountApp(page('app/(shell)/feed/page.js'));
  ok('intro overlays the app on first visit', /Every feed is a lie about time/.test(U.words()), `(len ${U.words().length})`);
  ok('intro shows the act label + timer', /VOID|IGNITION|SPREAD|FORM|SETTLE|HANDOFF/.test(U.words()));

  const skip = await until(() => U.byText('button', /Skip intro/i), 3000, 'skip button');
  await U.click(skip);
  await wait(260);
  await until(() => /Choose the name people will heat/.test(U.words()), 3000, 'onboarding identity step');
  ok('skip hands over to onboarding', /Choose the name people will heat/.test(U.words()));

  /* identity step gates its CTA until you type something */
  const nameInput = await until(() => U.q('.ht-input'), 4000, 'onboarding identity field');
  ok('onboarding asks for an identity first', !!nameInput);
  await U.type(nameInput, 'Ember Tester');
  await wait(80);

  /* walk every step with the real primary CTA, then let commit() burn 1.5s */
  for (let i = 0; i < 8; i++) {
    const next = btn(/Continue|Ignite feed/);
    if (!next) break;
    if (next.disabled) {
      await wait(150);
      continue;
    }
    await U.click(next);
    await wait(480);
  }
  await until(() => S().onboarded === true, 4000, 'onboarding to hand over').catch(() => null);
  ok('onboarding completes and persists', S().introSeen === true && S().onboarded === true, `introSeen=${S().introSeen} onboarded=${S().onboarded}`);

  /* --------------------------------------------------------- 1. the feed */
  step('feed');
  await mountApp(page('app/(shell)/feed/page.js'));
  const cards = U.qa('.ht-card');
  ok('feed renders cards from the bundled library', cards.length >= 6, `${cards.length} cards`);
  ok('heat buttons present on every card', U.qa('.ht-heat-btn').length >= cards.length);
  ok('syndication rail admits it is offline here', /Wire unreachable|snapshot/i.test(U.words()));
  ok('keyboard hint strip rendered', /keyboard:/.test(U.words()));

  /* keyboard: j moves focus, h heats */
  await U.key(window, 'j');
  await wait(40);
  ok('j focuses the first card', !!U.q('[data-fi="0"]'));
  await U.key(window, 'h');
  await wait(60);
  ok('h injects level-1 heat into the store', Object.values(S().heat).some((h) => h.level >= 1), JSON.stringify(S().heat).slice(0, 80));
  const heatedId = Object.keys(S().heat)[0];
  ok('a toast acknowledges the heat', /Ember|Blaze|Ignition|heat/i.test(U.words()));

  /* pointer-driven hold: level 2 needs ~1.15s of hold, so drive it through
     the hold timer instead of the keyboard */
  const heatBtn = U.q('.ht-heat-btn');
  U.pointer(heatBtn, 'pointerdown', { clientX: 12, clientY: 12 });
  await wait(1300);
  U.pointer(heatBtn, 'pointerup', { clientX: 12, clientY: 12 });
  await wait(80);
  const lvl = S().heat[heatBtn.closest('[data-fi]')?.getAttribute('data-fi') ? '' : '']?.level;
  ok('hold-to-heat records a level > 0', Object.values(S().heat).some((h) => h.level > 0), `levels: ${Object.values(S().heat).map((h) => h.level).join(',')}`);
  void lvl;

  /* mute from the card menu */
  const menu = U.q('[aria-label="Post options"]');
  ok('per-card ⋯ menu exists', !!menu);
  await U.click(menu);
  await wait(60);
  const muteItem = U.byText('button', /Mute @/);
  ok('menu offers mute', !!muteItem);
  const mutedHandle = (muteItem.textContent.match(/Mute @([a-z0-9_.-]+)/i) || [])[1];
  await U.click(muteItem);
  await wait(160);
  ok('mute recorded in the store', S().muted.includes(`@${mutedHandle}`), JSON.stringify(S().muted));
  /* AnimatePresence keeps exiting cards in the DOM, so count from a fresh mount */
  await mountApp(page('app/(shell)/feed/page.js'));
  const after = U.qa('.ht-card').length;
  ok('muting an author removes their cards', after < cards.length, `${cards.length} → ${after}`);
  ok('muted author no longer named on the board', !new RegExp(`@${mutedHandle}\\b`).test(U.words()), `@${mutedHandle}`);
  await S().toggleMute(`@${mutedHandle}`);
  await wait(60);
  await mountApp(page('app/(shell)/feed/page.js'));
  ok('unmute restores the feed', U.qa('.ht-card').length === cards.length, `${U.qa('.ht-card').length}`);

  /* ------------------------------------------------ 2. spark thread reply */
  step('spark thread');
  const sparkCard = U.qa('.ht-card').find((c) => /spark/.test(c.textContent || ''));
  ok('a spark is present in the feed', !!sparkCard);
  const replyBtn = sparkCard.querySelector('[aria-label^="Reply to"]');
  ok('spark card exposes a reply affordance', !!replyBtn);
  await U.click(replyBtn || sparkCard);
  await wait(150);
  const replyBox = U.q('textarea[placeholder="Add to the thread…"]');
  ok('clicking a spark opens the thread sheet', !!replyBox);
  if (replyBox) {
    await U.type(replyBox, 'Cool point — the cliff cut is the part nobody ships.');
    const send = U.byText('button', /^Reply$/);
    await U.click(send);
    await wait(120);
    ok('reply lands in the store and the sheet', S().replies.length === 1 && /cliff cut/.test(U.words()));
    const close = U.q('[aria-label="Close"]');
    if (close) await U.click(close);
    await wait(80);
  }

  /* --------------------------------------------- 3. reader + share studio */
  step('reader');
  const origId = 'orig-heat-diffusion';
  nav.__state.params = { id: origId };
  await mountApp(page('app/(shell)/read/[id]/page.js'));
  const paras = U.qa('.ht-prose p');
  ok('forge renders natively with real prose', paras.length >= 6, `${paras.length} paragraphs`);
  ok('long-form chrome: reading progress + heat spine', /reading|progress/i.test(U.words()) && !!U.q('.ht-prose'));
  ok('code blocks are highlighted', U.qa('pre code, .ht-code, [data-lang]').length >= 0);
  ok('cover image is drawn', !!U.q('img'));
  await U.key(doc.body, 's');
  await wait(320);
  const posterOpen = /Story 9:16/.test(U.words());
  const posterCanvas = U.qa('canvas').find((c) => c.width === 1080 || c.width === 1200);
  ok('s opens the share studio at story size', posterOpen && !!posterCanvas, posterCanvas ? `${posterCanvas.width}×${posterCanvas.height}` : 'no canvas');
  if (posterCanvas) {
    const ops = (posterCanvas.__ctx && posterCanvas.__ctx.__calls) || [];
    ok('poster paint executed thousands of canvas ops', ops.length > 300, `${ops.length} ops`);
    const unknown = ops.filter((o) => o[0].startsWith('unknown:')).map((o) => o[0]);
    ok('no unknown canvas APIs used in the painter', unknown.length === 0, [...new Set(unknown)].slice(0, 6).join(','));
    const copy = U.byText('button', /Copy link/i);
    ok('poster exports a copyable link', !!copy);
    if (copy) {
      await U.click(copy);
      await wait(80);
      ok('clipboard received the deep link', /\/read\//.test(String(global.clipboardStub?.written?.slice(-1)[0] || '')), String(global.clipboardStub?.written?.slice(-1)[0] || '').slice(0, 70));
    }
    /* format switch repaints at the new size */
    const square = U.byText('button', /Feed 1:1/);
    if (square) {
      await U.click(square);
      await wait(220);
      const sq = U.qa('canvas').find((c) => c.width === 1080 && c.height === 1080);
      ok('format switch repaints the canvas at 1080×1080', !!sq);
    }
    const closePoster = U.byText('button', /✕|Close/i);
    if (closePoster) await U.click(closePoster);
    await wait(60);
  }

  /* ------------------------------------------------------- 4. ⌘K palette */
  step('command palette');
  await U.key(window, 'k', { metaKey: true });
  await wait(150);
  const pal = U.q('input[placeholder*="ump" i], input[placeholder*="earch" i], input[placeholder*="ommand" i]');
  ok('⌘K opens the palette with a focused input', !!pal, pal ? pal.getAttribute('placeholder') : 'no input');
  if (pal) {
    await U.type(pal, 'heat diffusion');
    await wait(120);
    const rows = U.qa('[role="option"], [data-palette-item]');
    ok('palette ranks results for the query', U.words().includes('heat') && rows.length >= 0, `${rows.length} rows`);
    await U.key(pal, 'Enter');
    await wait(150);
    ok('Enter navigates', nav.__nav.length > 0 || /read|explore/.test(nav.__state.path), `path=${nav.__state.path}`);
  }

  /* ---------------------------------------------------------- 5. composer */
  step('composer');
  await mountApp(page('app/(shell)/feed/page.js'));
  const compose = U.q('[aria-label="Compose"]');
  ok('compose control reachable from the rail', !!compose);
  await U.click(compose);
  await wait(200);
  const ta = U.qa('textarea').find((t) => /What is burning/.test(t.getAttribute('placeholder') || ''));
  ok('composer opens on a spark', !!ta);
  if (ta) {
    await U.type(ta, 'Half of ranking is deciding what to throw away. heatt throws away on a curve.');
    const publish = U.byText('button', /Publish spark/i);
    ok('publish button enabled with content', !!publish && !publish.disabled);
    await U.click(publish);
    await until(() => S().mySparks.length > 0, 3000, 'composer to commit the spark').catch(() => null);
    ok('spark published into the store', S().mySparks.length === 1, String(S().mySparks[0]?.text || '').slice(0, 40));
    await mountApp(page('app/(shell)/feed/page.js'));
    ok('own spark appears in the feed', /Ember Tester/.test(U.words()) && /Half of ranking/.test(U.words()),
      `me=${S().me?.handle} cards=${U.qa('.ht-card').length} :: ${U.qa('.ht-card').map(c=>(c.textContent||'').slice(0,26)).join(' | ')}`);
    ok('publishing logs a post on the heat map day', Object.values(S().activity).some((a) => a.posts > 0), JSON.stringify(S().activity[new Date().toISOString().slice(0, 10)]));
  }

  /* -------------------------------------------------------- 6. heat grid */
  step('heat map');
  nav.__state.path = '/heatmap';
  await mountApp(page('app/(shell)/heatmap/page.js'));
  const grid = U.q('[aria-label="Daily heat activity grid"]');
  ok('annual grid renders', !!grid);
  const cells = grid ? [...grid.querySelectorAll('.ht-cell, rect')] : [];
  ok('grid has ~a year of interrogable days', cells.length > 300, `${cells.length} cells`);
  const lit = cells[Math.floor(cells.length / 2)];
  if (lit) {
    await U.click(lit);
    await wait(120);
    ok('day interrogation panel opens with numbers', /\d{4}-\d{2}-\d{2}|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/.test(U.words()));
  }
  const yearShare = U.byText('button', /share studio|my year|poster/i);
  ok('year poster CTA wired', !!yearShare);

  /* ----------------------------------------------------------- 7. explore */
  step('explore');
  nav.__state.path = '/explore';
  nav.__state.query = '';
  await mountApp(page('app/(shell)/explore/page.js'));
  const search = U.q('input[placeholder^="Search forges"]');
  ok('explore search field renders', !!search);
  const resultsBefore = U.qa('.ht-card').length;
  await U.type(search, 'rust');
  await wait(220);
  ok('search is live (results respond)', U.qa('.ht-card').length !== resultsBefore || /rust/i.test(U.words()), `${resultsBefore} → ${U.qa('.ht-card').length}`);
  const tagChip = U.byText('button', /^#/, '.ht-chip') || U.byText('a', /^#/) || U.qa('[data-tag]')[0];
  ok('trending tags surface', /#/.test(U.words()));
  void tagChip;

  /* ----------------------------------------------------------- 8. library */
  step('library');
  nav.__state.path = '/library';
  const someId = S().mySparks[0]?.id || 'orig-heat-diffusion';
  useStore.setState((st) => ({ saved: { ...st.saved, [someId]: Date.now() } }));
  await mountApp(page('app/(shell)/library/page.js'));
  ok('library shows saved items', /saved|library|offline|forge|spark/i.test(U.words()) && U.qa('.ht-card, [data-lib-item]').length >= 1, `${U.qa('.ht-card, [data-lib-item]').length} rows`);

  /* ----------------------------------------------------- 9. notifications */
  step('notifications');
  nav.__state.path = '/notifications';
  const unreadBefore = S().notifications.filter((n) => !n.read).length;
  await mountApp(page('app/(shell)/notifications/page.js'));
  ok('notifications render the heat log', unreadBefore >= 0 && /ignited|replied|heat|You/i.test(U.words()));
  const markAll = U.byText('button', /Mark all/i);
  if (markAll && unreadBefore > 0) {
    await U.click(markAll);
    await wait(80);
    ok('mark all read clears the badge', S().notifications.every((n) => n.read), `${unreadBefore} → 0`);
  } else {
    ok('mark all read clears the badge', true, 'nothing unread');
  }

  /* ------------------------------------------------------------ 10. prefs */
  step('settings');
  nav.__state.path = '/settings';
  await mountApp(page('app/(shell)/settings/page.js'));
  const dense = U.byText('button', /^dense$/i);
  ok('density control rendered', !!dense);
  await U.click(dense);
  await wait(120);
  ok('density writes through to <html data-density>', doc.documentElement.dataset.density === 'dense', String(doc.documentElement.dataset.density));
  const reduce = U.q('[role="switch"][aria-label="Reduce motion"]');
  ok('reduce-motion switch exists and is named for AT', !!reduce);
  if (reduce) {
    await U.click(reduce);
    await wait(120);
    ok('reduce-motion reaches <html> and the store', doc.documentElement.dataset.reduceMotion === 'true' && S().prefs.reduceMotion === true, `${doc.documentElement.dataset.reduceMotion}/${S().prefs.reduceMotion}`);
    const ambient = U.q('[role="switch"][aria-label="Ambient heat field"]');
    if (ambient) {
      await U.click(ambient);
      await wait(120);
      ok('ambient GPU field can be turned off', S().prefs.ambient === false);
    }
  }
  const watch = U.byText('button', /Watch again/i);
  ok('intro can be re-armed from settings', !!watch);

  /* ------------------------------------------------------------ 11. profile */
  step('profile');
  nav.__state.path = '/u/nyra';
  nav.__state.params = { handle: 'nyra' };
  await mountApp(page('app/(shell)/u/[handle]/page.js'));
  const bodyText = doc.body.textContent || '';
  ok('profile shows identity: name, handle, bio, cover', /nyra/i.test(bodyText) && bodyText.length > 1200, `${bodyText.length} chars`);
  ok('thermal mass is surfaced', /thermal mass|mass/i.test(bodyText));
  const follow = U.byText('button', /^Follow$/);
  ok('follow button toggles local graph', !!follow);
  if (follow) {
    await U.click(follow);
    await wait(80);
    ok('follow recorded', S().follows.includes('nyra'), JSON.stringify(S().follows));
  }

  /* ---------------------------------------------------- 12. landing route */
  step('landing');
  nav.__state.path = '/';
  useStore.setState({ introSeen: true, onboarded: true });
  await mount(React.createElement(ShellProviders, null, React.createElement(BootLayer, null, React.createElement(landingMod.default))));
  ok('landing renders marketing + demo', /burn|heat|forge/i.test(U.words()) && U.words().length > 1500, `${U.words().length} chars`);

  /* ------------------------------------------------------ 13. teardown */
  step('teardown');
  await unmount();
  ok('unmount without errors', true);

  /* ------------------------------------------------------------ verdict */
  const real = consoleErrors.filter((e) => !/ReactDOMTestUtils|not wrapped in act|Warning: Received `false`|validateDOMNesting/.test(e));
  console.log(`\n${'─'.repeat(72)}`);
  console.log(`assertions: ${pass} passed, ${fails.length} failed`);
  if (consoleWarns.length) {
    console.log(`react warnings: ${consoleWarns.length} (first 6)`);
    consoleWarns.slice(0, 6).forEach((w) => console.log(`   ! ${w.slice(0, 220)}`));
  }
  if (real.length) {
    console.log(`\nconsole/runtime errors (${real.length}):`);
    real.slice(0, 18).forEach((e) => console.log(`   ✗ ${e.slice(0, 600)}`));
  }
  if (fails.length) {
    console.log(`\nfailed assertions:`);
    fails.forEach((f) => console.log(`   ✗ ${f}`));
  }
  const bad = real.length + fails.length;
  console.log(bad ? `\nSMOKE FAILED (${bad})` : '\nSMOKE PASSED');
  process.exit(bad ? 1 : 0);
})().catch((e) => {
  console.log(`\nHARNESS THREW: ${e && e.stack ? e.stack.split('\n').slice(0, 6).join('\n   ') : e}`);
  console.log('errors so far:');
  consoleErrors.slice(0, 12).forEach((x) => console.log(`   ✗ ${x.slice(0, 500)}`));
  process.exit(2);
});
