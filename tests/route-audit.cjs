/* ============================================================================
   tests/route-audit.cjs — what a stranger sees before React runs.

   Search engines, chat clients and link previews never execute our client
   components. They read the HTML the server sent. This audit starts the built
   app, asks every route for that HTML, and checks the things a market-ready
   site is expected to have:

     · a real HTTP status (including 404 for a wrong address)
     · <html lang>, a <title>, a meta description
     · Open Graph and Twitter card tags, with an image that exists on disk
     · exactly one <h1>, and no template leaks ("undefined", "NaN", "[object")
     · the skip link, so the shell is reachable from a keyboard

   Run after `npm run build`.  Usage: node tests/route-audit.cjs
   ==========================================================================*/
'use strict';

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.ROUTE_AUDIT_PORT || 3210);
const BASE = `http://127.0.0.1:${PORT}`;

let pass = 0;
const fails = [];
const ok = (label, cond, note = '') => {
  if (cond) {
    pass += 1;
    console.log(`  ✓ ${label}${note ? `  ${note}` : ''}`);
  } else {
    fails.push(`${label}${note ? ` — ${note}` : ''}`);
    console.log(`  ✗ ${label}${note ? `  ${note}` : ''}`);
  }
};
const section = (t) => console.log(`\n▸ ${t}`);

const ROUTES = [
  { path: '/', kind: 'page' },
  { path: '/feed', kind: 'page' },
  { path: '/explore', kind: 'page' },
  { path: '/library', kind: 'page' },
  { path: '/notifications', kind: 'page' },
  { path: '/settings', kind: 'page' },
  { path: '/read/orig-dark', kind: 'article' },
  { path: '/u/heatt', kind: 'profile' },
  { path: '/nowhere-at-all', kind: 'missing' },
];

const attr = (html, re) => {
  const m = html.match(re);
  return m ? (m[1] || '').trim() : '';
};
const count = (html, re) => (html.match(re) || []).length;

/** Is something already listening? A leftover server would answer for us. */
async function portIsBusy() {
  try {
    await fetch(`${BASE}/`, { redirect: 'manual', signal: AbortSignal.timeout(1200) });
    return true;
  } catch {
    return false;
  }
}

async function startServer() {
  if (await portIsBusy()) {
    throw new Error(`port ${PORT} is already in use — stop that server first (ROUTE_AUDIT_PORT can move this one)`);
  }
  /* detached, so the whole process group can be stopped again: `next start`
     spawns a child server, and a leftover one would silently answer the next
     run with a stale build. */
  const child = spawn('npx', ['next', 'start', '-H', '127.0.0.1', '-p', String(PORT)], {
    cwd: ROOT,
    env: { ...process.env, NODE_ENV: 'production' },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  });
  let log = '';
  child.stdout.on('data', (d) => (log += d.toString()));
  child.stderr.on('data', (d) => (log += d.toString()));

  const deadline = Date.now() + 45000;
  for (;;) {
    if (Date.now() > deadline) throw new Error(`server did not start:\n${log.slice(-600)}`);
    try {
      const r = await fetch(`${BASE}/`, { redirect: 'manual' });
      if (r.status < 500) return child;
    } catch {/* not up yet */}
    await new Promise((r) => setTimeout(r, 300));
  }
}

(async () => {
  if (!fs.existsSync(path.join(ROOT, '.next', 'BUILD_ID'))) {
    console.error('route-audit: no production build found — run `npm run build` first');
    process.exit(1);
  }

  const server = await startServer();
  const stop = () => {
    try {
      process.kill(-server.pid, 'SIGTERM');
    } catch {
      /* already gone */
    }
    try {
      server.kill('SIGTERM');
    } catch {
      /* already gone */
    }
  };
  const bail = (code) => {
    stop();
    setTimeout(() => process.exit(code), 250);
  };

  try {
    for (const route of ROUTES) {
      section(`${route.path} (${route.kind})`);
      const res = await fetch(BASE + route.path, { redirect: 'manual' });
      const html = await res.text();

      const wantStatus = route.kind === 'missing' ? 404 : 200;
      ok(`answers ${wantStatus}`, res.status === wantStatus, String(res.status));

      ok('declares the language', /<html[^>]+lang="en"/.test(html));

      const title = attr(html, /<title[^>]*>([^<]*)<\/title>/i);
      ok('has a title', title.length > 3 && title.length < 90, title);
      if (route.kind !== 'missing') {
        ok('the title names the product or the piece', /heatt|—|·/.test(title), title);
      }

      const desc = attr(html, /<meta name="description" content="([^"]*)"/i);
      ok('has a meta description', desc.length > 30, `${desc.length} chars`);
      ok('the description is written, not generated', !/lorem|placeholder/i.test(desc));

      const ogTitle = attr(html, /<meta property="og:title" content="([^"]*)"/i);
      const ogDesc = attr(html, /<meta property="og:description" content="([^"]*)"/i);
      const ogImage = attr(html, /<meta property="og:image" content="([^"]*)"/i);
      ok('has an og:title', ogTitle.length > 2, ogTitle.slice(0, 60));
      ok('has an og:description', ogDesc.length > 20, `${ogDesc.length} chars`);
      ok('has an og:image', ogImage.length > 2, ogImage.replace(BASE, ''));
      if (ogImage) {
        let rel = '';
        try {
          rel = new URL(ogImage, BASE).pathname;
        } catch {
          rel = ogImage;
        }
        ok('the og:image exists on disk', fs.existsSync(path.join(ROOT, 'public', rel)), rel);
      }
      ok('declares a twitter card', /<meta name="twitter:card" content="(summary|summary_large_image)"/.test(html));

      const h1s = count(html, /<h1[\s>]/g);
      ok('has exactly one h1', h1s === 1, `${h1s} h1`);

      ok('leaks no template artefacts', !/undefined|NaN|\[object |Infinity/.test(html.replace(/undefined\b(?=[^(]*\()/g, '')));

      const shellRoute = !['missing'].includes(route.kind) && route.path !== '/';
      if (shellRoute) ok('offers a skip link', /skip to content/i.test(html));

      if (route.kind === 'article') {
        ok('a story carries an article card', /og:type" content="article"/.test(html));
      }
      if (route.kind === 'profile') {
        ok('a profile carries the writer name', /og:title" content="[^"]*heatt/i.test(html), ogTitle.slice(0, 60));
      }
      if (route.kind === 'missing') {
        ok('the 404 still looks like the room', /never here|not in the room/i.test(html));
      }
    }

    /* the wire endpoint the board falls back to */
    section('/api/feed');
    const feed = await fetch(`${BASE}/api/feed`, { redirect: 'manual' });
    ok('the wire answers a real status', [200, 503].includes(feed.status), String(feed.status));
    const json = await feed.json().catch(() => null);
    ok('the wire answers with json', !!json && typeof json.ok === 'boolean', JSON.stringify(json)?.slice(0, 60));
    const cc = feed.headers.get('cache-control') || '';
    if (feed.status === 200) {
      ok('a good answer is cacheable at the edge', /s-maxage/.test(cc), cc);
      ok('a good answer carries items', Array.isArray(json?.items) && json.items.length > 0, `${json?.items?.length ?? 0} items`);
      ok('the items are normalised', json.items.every((i) => i.title && i.handle && i.canonical));
    } else {
      ok('a failed upstream is never cached', /no-store/.test(cc) && !/s-maxage/.test(cc), cc);
      ok('a failed upstream says when to retry', !!feed.headers.get('retry-after'), feed.headers.get('retry-after') || '');
    }
    /* the offline shell: present, and safely narrow */
    section('/sw.js');
    const sw = await fetch(`${BASE}/sw.js`, { redirect: 'manual' });
    const swSrc = await sw.text();
    ok('the service worker is served', sw.status === 200 && /javascript/i.test(sw.headers.get('content-type') || ''), String(sw.status));
    ok('it never caches HTML or the API', !/cache\.put\([^)]*(html|\/api)/i.test(swSrc) && /method !== 'GET'/.test(swSrc));
    ok('it keeps a bounded cache', /MAX_ENTRIES/.test(swSrc));
  } finally {
    stop();
  }

  console.log(`\n${pass} passed, ${fails.length} failed`);
  if (fails.length) {
    console.log('\nfailures:');
    fails.forEach((f) => console.log(` - ${f}`));
    bail(1);
    return;
  }
  bail(0);
})().catch((e) => {
  console.error(`\nroute-audit threw: ${e && e.stack ? e.stack : e}`);
  process.exit(1);
});
