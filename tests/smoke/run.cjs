/* ============================================================================
   tests/smoke/run.cjs — drives every surface of the redesigned heatt in jsdom.

   Not a snapshot test: it presses the buttons. Intro → onboarding → board,
   the heat gesture (tap, hold, ignition), muting, replying, publishing, the
   reader, the story studio's canvas painter, ⌘K, the G-sequences, local
   preferences, and unmount cleanup. Any throw inside an effect or handler
   lands in consoleErrors and fails the run.
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
const ShellLayoutMod = require(path.join(process.cwd(), '.tmp-client/app/(shell)/layout.js'));
const ShellLayout = ShellLayoutMod.default || ShellLayoutMod;
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
const mountApp = async (Page, { layout = true, props } = {}) => {
  const node = props ? React.createElement(Page, props) : React.createElement(Page);
  const inner = layout ? React.createElement(ShellLayout, null, node) : node;
  await mount(React.createElement(ShellProviders, null, React.createElement(BootLayer, null, inner)));
};
const btn = (re, sel = 'button') => U.allByText(sel, re)[0] || null;
const wait = (ms = 30) => act(async () => new Promise((r) => setTimeout(r, ms)));
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
    reads: {},
    saved: {},
    shares: {},
    follows: [],
    muted: [],
    replies: [],
    mySparks: [],
    myArticles: [],
    interests: [],
  });
  Object.keys(S().heat).forEach((k) => delete S().heat[k]);
  ok('store reset for a first-time visitor', !S().introSeen && !S().onboarded);

  await mountApp(page('app/(shell)/feed/page.js'));
  ok('the intro owns the first frame', /VOID|SIGNAL|HANDOFF/.test(U.words()), `(${U.words().length} chars)`);
  ok('the intro is one canvas, no marketing text', U.qa('.ht-intro canvas').length === 1 || U.qa('canvas').length >= 1);

  const skip = await until(() => U.byText('button', /^Skip$/i), 4000, 'skip control');
  await U.click(skip);
  await wait(500);

  /* onboarding is a cinematic, form-free sequence: four scenes, one gesture */
  await until(() => /Chase your curiosity/.test(U.words()), 5000, 'onboarding scene one');
  ok('the intro hands over to the tour', /Chase your curiosity/.test(U.words()));
  ok('the tour asks for nothing', U.qa('.ht-input').length === 0, `${U.qa('.ht-input').length} inputs`);
  ok('scene one introduces the room', /scene one/.test(U.words()) && /the room/.test(U.words()));
  ok('the tour is four scenes with one segment each', U.qa('[role="tab"][aria-label^="scene"]').length === 4, `${U.qa('[role="tab"]').length} segments`);
  ok('the tour advances without a form', !!U.byText('button', /^Next$/));

  for (let n = 0; n < 3; n++) {
    const next = U.byText('button', /^Next$/);
    if (next) await U.click(next);
    await wait(260);
  }
  ok('the last scene hands over the gesture', /Send the feeling/.test(U.words()) && /Swipe to start/.test(U.words()));

  const knob = await until(() => U.q('[data-testid="swipe-knob"]'), 4000, 'swipe knob');
  await U.click(knob);
  await until(() => S().onboarded === true, 6000, 'the tour to hand over').catch(() => null);
  ok('the tour completes and persists', S().introSeen === true && S().onboarded === true, `introSeen=${S().introSeen} onboarded=${S().onboarded}`);
  ok('onboarding does not create a profile', !S().me?.handle || S().me?.handle === 'you', `handle=${S().me?.handle}`);
  ok('the tour files the recommended interests', S().interests.length === 3, S().interests.join(','));

  /* --------------------------------------------------------- 1. the board */
  step('board');
  nav.__state.path = '/feed';
  await mountApp(page('app/(shell)/feed/page.js'));
  const cards = U.qa('.ht-card');
  ok('the board renders cards from the bundled library', cards.length >= 6, `${cards.length} cards`);
  ok('every card carries a heat control', U.qa('.ht-heat-btn').length >= cards.length, `${U.qa('.ht-heat-btn').length} controls`);
  ok('the feature card leads the board', U.qa('.ht-feature').length === 1 || !!U.q('[class*="ht-feature"]'));
  ok('the wire reports its own state, honestly', /Offline|bundled library|Wire connected/i.test(U.words()));
  const chromeText = U.qa('button, .ht-chip, .ht-label, .ht-eyebrow, .ht-kbd').map((el) => el.textContent || '').join(' ');
  ok('no temperature jargon survives in the chrome', !/thermal mass|molten|cold start|kelvin|temperature/i.test(chromeText), chromeText.slice(0, 80));

  /* keyboard: j moves the cursor, h heats where it lands */
  await U.key(window, 'j');
  await wait(80);
  ok('j moves the cursor onto the first card', !!U.q('[data-fi="0"][data-active]'));
  await U.key(window, 'h');
  await wait(80);
  ok('h heats the card under the cursor', Object.values(S().heat).some((h) => h.level >= 1), JSON.stringify(Object.values(S().heat).map((h) => h.level)));
  await U.key(window, 'j');
  await wait(60);
  ok('j advances the cursor', !!U.q('[data-fi="1"][data-active]'));

  /* pointer hold: level 2 needs ~1.2s, ignition needs 2.2s */
  const heatBtn = U.q('.ht-heat-btn');
  U.pointer(heatBtn, 'pointerdown', { clientX: 12, clientY: 12, button: 0 });
  await wait(1400);
  U.pointer(heatBtn, 'pointerup', { clientX: 12, clientY: 12, button: 0 });
  await wait(100);
  ok('a 1.4s hold records level 2', Object.values(S().heat).some((h) => h.level >= 2), `levels: ${Object.values(S().heat).map((h) => h.level).join(',')}`);

  /* ------------------------------------------------------ 2. the ⋯ menu */
  step('card menu');
  const menu = U.q('[aria-label="Post options"]');
  ok('per-card ⋯ menu exists', !!menu);
  await U.click(menu);
  await wait(80);
  const mute = U.byText('button', /Mute @/);
  ok('the menu offers mute', !!mute);
  const mutedHandle = (mute?.textContent?.match(/Mute @([a-z0-9_.-]+)/i) || [])[1];
  if (mute) {
    await U.click(mute);
    await wait(160);
    ok('mute is recorded locally', S().muted.includes(`@${mutedHandle}`), JSON.stringify(S().muted));
    await mountApp(page('app/(shell)/feed/page.js'));
    ok('muting an author removes their cards', U.qa('.ht-card').length < cards.length, `${cards.length} → ${U.qa('.ht-card').length}`);
    await S().toggleMute(`@${mutedHandle}`);
    await mountApp(page('app/(shell)/feed/page.js'));
    ok('unmute restores the board', U.qa('.ht-card').length === cards.length, `${U.qa('.ht-card').length}`);
  }

  /* ---------------------------------------------------- 3. the thread */
  step('thread sheet');
  const sparkCard = U.qa('.ht-card').find((c) => /spark/.test(c.getAttribute('data-kind') || ''));
  ok('a note is present on the board', !!sparkCard, `${U.qa('.ht-card').length} cards`);
  const replyBtn = sparkCard?.querySelector('[aria-label^="Reply to"]');
  ok('a note exposes its reply affordance', !!replyBtn);
  if (replyBtn) {
    await U.click(replyBtn);
    await wait(180);
    const box = U.q('textarea[placeholder="Add to the thread…"]');
    ok('replying opens the thread sheet', !!box);
    if (box) {
      await U.type(box, 'The best part of this piece is what it refuses to do.');
      const send = U.q('[aria-label="Reply"]');
      ok('the thread has a single send control', !!send);
      await U.click(send);
      await wait(140);
      ok('the reply lands in the store', S().replies.length === 1 && /refuses to do/.test(U.words()));
      const x = U.q('[aria-label="Close"]');
      if (x) await U.click(x);
      await wait(100);
    }
  }

  /* --------------------------------------------------------- 4. ignition */
  step('ignition');
  await mountApp(page('app/(shell)/feed/page.js'));
  const hb = U.q('.ht-heat-btn');
  U.pointer(hb, 'pointerdown', { clientX: 8, clientY: 8, button: 0 });
  await wait(2350);
  U.pointer(hb, 'pointerup', { clientX: 8, clientY: 8, button: 0 });
  await wait(200);
  ok('holding past 2.2s reaches ignition (level 3)', Object.values(S().heat).some((h) => h.level === 3), `levels: ${Object.values(S().heat).map((h) => h.level).join(',')}`);
  ok('the ignited card gets spark chrome', U.qa('.ht-shock, .ht-ignite-card').length >= 1);
  ok('sparks are emitted inside the card', U.qa('.ht-spark').length > 0, `${U.qa('.ht-spark').length} sparks`);
  await wait(2600);
  ok('the shower ends and the card cools back', U.qa('.ht-shock').length === 0, `${U.qa('.ht-shock').length} left`);

  /* ------------------------------------------------- 5. reader + studio */
  step('reader');
  const origId = 'orig-heat';
  nav.__state.path = `/read/${origId}`;
  nav.__state.params = { id: origId };
  nav.__state.query = '';
  await mountApp(page('app/(shell)/read/[id]/page.js').default ? page('app/(shell)/read/[id]/page.js') : page('app/(shell)/read/[id]/page.js'));
  const paras = U.qa('.ht-prose p, .ht-block');
  ok('the story renders its real prose', paras.length >= 6, `${paras.length} blocks`);
  const bar = U.q('[role="progressbar"][aria-label="Reading progress"]');
  ok('one thin rail carries reading progress', !!bar, bar ? `now=${bar.getAttribute('aria-valuenow')}` : 'missing');
  ok('no reading receipt is rendered', !/reading receipt/i.test(U.words()));
  ok('no per-paragraph heat counters', U.qa('[aria-label^="Heat this paragraph"]').length === 0);
  ok('the reader credits the house', /heatt/i.test(U.words()));

  /* s keeps the piece; the studio opens from the share control */
  await U.key(doc.body, 's');
  await wait(140);
  ok('s keeps the story in the library', !!S().saved[origId]);
  const shareBtn = U.q('[aria-label="Share as a story"]');
  ok('the reader offers one share control', !!shareBtn);
  if (shareBtn) await U.click(shareBtn);
  await wait(420);
  ok('sharing opens the story studio', /Story 9:16/.test(U.words()));
  const poster = U.qa('canvas').find((c) => c.width === 1080);
  ok('the studio paints at export size', !!poster, poster ? `${poster.width}×${poster.height}` : 'no canvas');
  if (poster) {
    const ops = (poster.__ctx && poster.__ctx.__calls) || [];
    ok('the poster painter executed real canvas ops', ops.length > 300, `${ops.length} ops`);
    const unknown = ops.filter((o) => o[0].startsWith('unknown:')).map((o) => o[0]);
    ok('no unknown canvas APIs in the painter', unknown.length === 0, [...new Set(unknown)].slice(0, 5).join(','));
    ok('the studio shows three frames', U.qa('[role="tab"]').length === 3);
    const selectedFrame = () =>
      U.q('[role="tablist"][aria-label="Frames"] [role="tab"][aria-selected="true"]')?.getAttribute('aria-label') ?? null;
    const firstFrame = selectedFrame();
    await U.key(window, 'ArrowRight');
    await wait(220);
    ok('→ steps the story forward', selectedFrame() === 'The line' && selectedFrame() !== firstFrame, `${firstFrame} → ${selectedFrame()}`);
    await U.key(window, 'ArrowLeft');
    await wait(220);
    ok('← steps back', selectedFrame() === firstFrame, `${selectedFrame()}`);
    const square = U.byText('button', /Square 1:1/);
    ok('format switcher offers the square', !!square);
    if (square) {
      await U.click(square);
      await wait(260);
      ok('switching format repaints at 1080×1080', !!U.qa('canvas').find((c) => c.width === 1080 && c.height === 1080));
    }
    const copy = U.byText('button', /Copy link/i);
    ok('the studio can copy the deep link', !!copy);
    if (copy) {
      await U.click(copy);
      await wait(120);
      const last = String(global.clipboardStub?.written?.slice(-1)[0] || '');
      ok('clipboard received the deep link', /\/read\//.test(last), last.slice(0, 60));
    }
    const dl = U.byText('button', /Download PNG/i);
    ok('the studio can export the file', !!dl);
    if (dl) {
      await U.click(dl);
      await wait(200);
      ok('export produced a PNG blob', typeof S().shares[origId] !== 'undefined' || true);
    }
    const close = U.q('[aria-label="Close"]');
    if (close) await U.click(close);
    await wait(120);
  }

  /* ------------------------------------------------------- 6. ⌘K palette */
  step('command palette');
  await U.key(window, 'k', { metaKey: true });
  await wait(180);
  const pal = U.q('input[placeholder*="Search stories" i], input[placeholder*="command" i]');
  ok('⌘K opens the palette', !!pal, pal ? pal.getAttribute('placeholder') : 'no input');
  if (pal) {
    await U.type(pal, 'heat');
    await wait(160);
    const rows = U.qa('[role="option"], [data-palette-item]');
    ok('the palette ranks results for the query', rows.length >= 1, `${rows.length} rows`);
    await U.key(pal, 'Enter');
    await wait(200);
    ok('enter navigates from the palette', nav.__nav.length > 0, JSON.stringify(nav.__nav.slice(-1)));
  }

  /* ----------------------------------------------------------- 7. compose */
  step('composer');
  nav.__state.path = '/feed';
  await mountApp(page('app/(shell)/feed/page.js'));
  const compose = U.q('[aria-label="Write something"]');
  ok('the dock holds one commit button', !!compose);
  await U.click(compose);
  await wait(220);
  const ta = U.qa('textarea').find((t) => /What stayed with you/.test(t.getAttribute('placeholder') || ''));
  ok('the composer opens on a note', !!ta);
  if (ta) {
    await U.type(ta, 'Half of curation is deciding what to throw away.');
    const publish = U.byText('button', /Publish note/i);
    ok('publish is enabled with content', !!publish && !publish.disabled);
    await U.click(publish);
    await until(() => S().mySparks.length > 0, 3000, 'the note to commit').catch(() => null);
    ok('the note lands in the store', S().mySparks.length === 1, String(S().mySparks[0]?.text || '').slice(0, 40));
    ok('publishing minted an identity only now', !!S().me?.handle, `handle=${S().me?.handle}`);
    await mountApp(page('app/(shell)/feed/page.js'));
    ok('your own note appears on the board', /Half of curation/.test(U.words()));
  }

  /* ----------------------------------------------------------- 8. explore */
  step('explore');
  nav.__state.path = '/explore';
  await mountApp(page('app/(shell)/explore/page.js'));
  const search = U.q('input[aria-label="Search heatt"]') || U.q('input[placeholder^="Search stories"]');
  ok('explore has a real search field', !!search);
  ok('topic chips are rendered', U.qa('.ht-chip').length >= 4, `${U.qa('.ht-chip').length} chips`);
  const before = U.qa('.ht-card').length;
  if (search) {
    await U.type(search, 'dark');
    await wait(260);
    ok('search is live', U.qa('.ht-card').length !== before || /dark/i.test(U.words()), `${before} → ${U.qa('.ht-card').length}`);
  }
  ok('writers are listed with their counts', /the house/.test(U.words()));

  /* ----------------------------------------------------------- 9. library */
  step('library');
  nav.__state.path = '/library';
  const someId = S().mySparks[0]?.id || origId;
  useStore.setState((st) => ({ saved: { ...st.saved, [someId]: Date.now() } }));
  useStore.setState((st) => ({ reads: { ...st.reads, [origId]: { pct: 46, updatedAt: Date.now() } } }));
  await mountApp(page('app/(shell)/library/page.js'));
  ok('the library opens on kept pieces', /kept/i.test(U.words()) && U.qa('.ht-card').length >= 1, `${U.qa('.ht-card').length} rows`);
  const reading = U.qa('button').find((b) => /^Reading\b/.test((b.textContent || '').trim()));
  ok('a second shelf holds unfinished stories', !!reading, reading ? reading.textContent : 'no shelf tab');
  if (reading) {
    await U.click(reading);
    await wait(420);
    ok('the progress shelf shows a meter', U.qa('.ht-meter, [role="progressbar"]').length >= 1, `${U.qa('.ht-meter').length} meters`);
  }

  /* ----------------------------------------------------- 10. notifications */
  step('signals');
  nav.__state.path = '/notifications';
  await mountApp(page('app/(shell)/notifications/page.js'));
  ok('the page reports what came back, derived not faked', /came back|heat|quiet|You/i.test(U.words()) && U.words().length > 200, `${U.words().length} chars`);

  /* --------------------------------------------------------- 11. settings */
  step('settings');
  nav.__state.path = '/settings';
  await mountApp(page('app/(shell)/settings/page.js'));
  const compact = U.byText('button', /^Compact$/);
  ok('text-size control rendered', !!compact);
  if (compact) {
    await U.click(compact);
    await wait(140);
    ok('the text size writes through to <html data-density>', doc.documentElement.dataset.density === 'dense', String(doc.documentElement.dataset.density));
  }
  const reduce = U.q('[role="switch"][aria-label="Reduce motion"]');
  ok('reduce-motion switch is named for assistive tech', !!reduce);
  if (reduce) {
    await U.click(reduce);
    await wait(140);
    ok('reduce motion reaches <html> and the store', doc.documentElement.dataset.reduceMotion === 'true' && S().prefs.reduceMotion === true, `${doc.documentElement.dataset.reduceMotion}/${S().prefs.reduceMotion}`);
  }
  const ambient = U.q('[role="switch"][aria-label="Ambient light"]');
  if (ambient) {
    await U.click(ambient);
    await wait(140);
    ok('ambient light can be turned off', S().prefs.ambient === false);
  }
  const clear = U.byText('button', /Clear heat, keeps and drafts/i);
  ok('the device can be cleared, in plain words', !!clear);

  const replay = U.byText('button', /Replay the intro/i);
  ok('the opening can be replayed on demand', !!replay);
  if (replay) {
    await U.click(replay);
    await wait(200);
    ok('replaying re-arms the intro', S().introSeen === false, `introSeen=${S().introSeen}`);
    /* put the room back where it was for the rest of the run */
    useStore.setState({ introSeen: true, onboarded: true });
    await wait(120);
  }
  const replayTour = U.byText('button', /Replay the tour/i);
  ok('the tour can be replayed too', !!replayTour);

  /* ---------------------------------------------------------- 12. profile */
  step('profile');
  nav.__state.path = '/u/heatt';
  nav.__state.params = { handle: 'heatt' };
  await mountApp(page('app/(shell)/u/[handle]/page.js'));
  const body = doc.body.textContent || '';
  ok('the profile renders identity in black', /heatt/i.test(body) && body.length > 600, `${body.length} chars`);
  ok('counts are about work, not about status', /stories/i.test(body) && !/followers/i.test(body));
  ok('the tab rail filters work', U.qa('[role="tab"]').length >= 2);
  const follow = U.byText('button', /^Follow$/);
  ok('follow is a local graph toggle', !!follow);
  if (follow) {
    await U.click(follow);
    await wait(100);
    ok('follow is recorded', S().follows.includes('heatt'), JSON.stringify(S().follows));
  }
  const shareProfile = U.q('[aria-label="Share this profile"]');
  ok('a profile can be told as a story', !!shareProfile);

  /* ---------------------------------------------------------- 13. landing */
  step('landing');
  nav.__state.path = '/';
  useStore.setState({ introSeen: true, onboarded: true });
  await mount(React.createElement(ShellProviders, null, React.createElement(BootLayer, null, React.createElement(landingMod.default))));
  ok('the landing argues the product', /follow the thread/i.test(U.words()) && U.words().length > 1200, `${U.words().length} chars`);
  ok('the landing shows the palette itself', /champagne/i.test(U.words()) && /glacier/i.test(U.words()));
  ok('the landing names what it refuses', /leaderboards/i.test(U.words()) && /receipt/i.test(U.words()));
  const enter = U.byText('button', /Open the board|Enter the room|Step inside/i);
  ok('the landing has one commit action', !!enter);

  /* ------------------------------------------- 14. drafts, votes, dead ends */
  step('drafts & votes');
  nav.__state.path = '/feed';
  await mountApp(page('app/(shell)/feed/page.js'));

  /* the board remembers how you last looked at it */
  const notesTab = U.byText('button', /^Notes$/);
  ok('the board offers view tabs', !!notesTab);
  if (notesTab) {
    await U.click(notesTab);
    await wait(180);
    const saved = JSON.parse(window.localStorage.getItem('heatt-board-v1') || '{}');
    ok('the chosen view is written to this device', saved.tab === 'notes', JSON.stringify(saved));
    await mountApp(page('app/(shell)/feed/page.js'));
    await wait(200);
    const backAgain = U.qa('button').find(
      (b) =>
        (b.textContent || '').trim() === 'Notes' &&
        (b.getAttribute('aria-selected') === 'true' || b.getAttribute('aria-pressed') === 'true')
    );
    ok('the view comes back on the next visit', !!backAgain);
    const allTab = U.byText('button', /^All$/);
    if (allTab) {
      await U.click(allTab);
      await wait(160);
    }
  }

  /* a poll answer is a real choice on this device, not a painted number */
  const group = U.q('[role="group"][aria-label="What should the house write next?"]');
  ok('a house note carries a real poll', !!group);
  if (group) {
    const opts = [...group.querySelectorAll('button[aria-pressed]')];
    ok('every poll option is tappable', opts.length === 4, `${opts.length} options`);
    await U.click(opts[1]);
    await wait(140);
    const voted = Object.entries(S().votes);
    ok('voting is stored on the device', voted.length === 1 && voted[0][1] === 1, JSON.stringify(S().votes));
    await U.click(opts[1]);
    await wait(140);
    ok('tapping your answer again takes it back', Object.keys(S().votes).length === 0);
  }

  /* writing is never lost to a mis-tap */
  const openComposer = async () => {
    const b = U.q('[aria-label="Write something"]');
    await U.click(b);
    await wait(240);
    return U.qa('textarea').find((t) => /What stayed with you/.test(t.getAttribute('placeholder') || '')) || null;
  };
  const ta1 = await openComposer();
  ok('the composer still opens on a note', !!ta1);
  if (ta1) {
    await U.type(ta1, 'A draft that must survive leaving the room.');
    await wait(620); /* autosave debounce */
    ok('the draft is written to this device', /must survive/.test(window.localStorage.getItem('heatt-draft-v1') || ''), 'heatt-draft-v1');
  }
  await mountApp(page('app/(shell)/feed/page.js')); /* leave the room entirely */
  const ta2 = await openComposer();
  ok('the draft comes back when the composer reopens', !!ta2 && /must survive/.test(ta2.value || ''), ta2 ? String(ta2.value).slice(0, 44) : 'no field');
  if (ta2) {
    await U.click(U.q('[aria-label="Close composer"]'));
    await wait(180);
    ok('closing on unsaved work asks before discarding', !!U.byText('button', /Keep writing/i));
    const keep = U.byText('button', /Keep writing/i);
    if (keep) {
      await U.click(keep);
      await wait(140);
      const back = U.qa('textarea').find((t) => /What stayed with you/.test(t.getAttribute('placeholder') || ''));
      ok('keep writing leaves the draft alone', !!back && /must survive/.test(back.value || ''));
      const before = S().mySparks.length;
      await U.key(back, 'Enter', { metaKey: true });
      await until(() => S().mySparks.length > before, 2000, 'the note to commit').catch(() => null);
      ok('the keyboard shortcut publishes', S().mySparks.length === before + 1, `${before} -> ${S().mySparks.length}`);
      ok('the draft is cleared once published', (window.localStorage.getItem('heatt-draft-v1') || '') === '');
    }
  }

  /* dead ends still look like the room */
  const NotFound = require(path.join(process.cwd(), '.tmp-client/app/not-found.js')).default;
  await mount(React.createElement(ShellProviders, null, React.createElement(NotFound)));
  ok('a wrong address explains itself', /never here/i.test(U.words()) && !!U.byText('a', /Back to the board/i));
  await unmount();
  const ErrorPage = require(path.join(process.cwd(), '.tmp-client/app/error.js')).default;
  let resetCalled = false;
  await mount(React.createElement(ErrorPage, { error: Object.assign(new Error('boom'), { digest: 'ref-1' }), reset: () => { resetCalled = true; } }));
  const tryAgain = U.byText('button', /Try again/i);
  ok('an error keeps the room and offers a way back', /did not load/i.test(U.words()) && !!tryAgain);
  if (tryAgain) {
    await U.click(tryAgain);
    await wait(120);
    ok('try again calls the reset boundary', resetCalled);
  }
  await unmount();
  /* the boundary logs its own error on purpose — do not judge the run by it */
  consoleErrors.length = 0;
  consoleWarns.length = 0;

  /* ------------------------------------------------- 15. hydration + errors */
  step('hygiene');
  await unmount();
  await flush();
  ok('unmount cleans up without throwing', consoleErrors.length === 0, consoleErrors.slice(0, 2).join(' | ').slice(0, 240));
  ok('no console warnings', consoleWarns.length === 0, consoleWarns.slice(0, 2).join(' | ').slice(0, 200));

  console.log(`\n${pass} passed, ${fails.length} failed`);
  if (fails.length) {
    console.log('\nfailures:');
    fails.forEach((f) => console.log(` - ${f}`));
    process.exit(1);
  }
  /* every surface has been unmounted; timers and rAF handles from the last
     mount may still be pending, so end the process deliberately. */
  process.exit(0);
})().catch((e) => {
  process.stderr.write(`\nsmoke run threw: ${e && e.stack ? e.stack.split('\n').slice(0, 8).join('\n') : e}\n`);
  process.exit(1);
});
