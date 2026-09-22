/* ============================================================================
   lib/oghead — streaming Open Graph extraction core (spec §7.1)

   Two pure, environment-agnostic pieces:

   • `readHeadOnly(res, cap)` — consumes a response byte stream and stops the
     instant `</head>` is seen, cancelling the reader so the <body> (often
     hundreds of KB) is never downloaded. Memory stays flat: only the head is
     retained, bounded by `cap`. A deadline guards against a hostile server
     that dribbles the head forever.

   • `extractOgMeta(head, baseUrl)` — pulls og/twitter meta out of a <head>
     fragment. Attribute *order* is free-form (property may precede or follow
     content), the common non-standard variants are covered
     (og:image:url / og:image:secure_url / twitter:image / twitter:image:src /
     link[rel=image_src]), relative URLs resolve against the final page URL,
     and HTML entities are decoded.

   The Next.js route (app/api/preview) is a thin wrapper over these, which is
   what makes the "we abort the body at </head>" claim testable in Node.
   ==========================================================================*/

export type ReadHeadResult = {
  /** everything up to (and including) `</head>`, or `cap` bytes */
  head: string;
  /** the stream was cut short — the body download was aborted at `</head>` */
  aborted: boolean;
  /** the cap was hit before `</head>` appeared */
  truncated: boolean;
};

export type OgMeta = {
  title?: string;
  desc?: string;
  image?: string;
  site?: string;
  favicon?: string;
};

export function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => {
      const n = parseInt(h, 16);
      return Number.isFinite(n) ? String.fromCharCode(n) : _;
    })
    .replace(/&#(\d+);/g, (_, d) => {
      const n = Number(d);
      return Number.isFinite(n) ? String.fromCharCode(n) : _;
    })
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

/**
 * Read a response body up to `</head>` and cancel it.
 * `res` is anything fetch-like: `{ body?: ReadableStream<Uint8Array> | null, text?: () => Promise<string> }`.
 * On the deadline we keep whatever head arrived rather than throwing — a
 * partial head still yields a usable (host-fallback) preview.
 */
export async function readHeadOnly(
  res: { body?: ReadableStream<Uint8Array> | null | undefined; text?: () => Promise<string> },
  cap = 128_000,
  deadlineMs = 7000
): Promise<ReadHeadResult> {
  const dec = new TextDecoder('utf-8', { fatal: false });
  if (!res.body) {
    const text = (await (res.text ? res.text() : Promise.resolve(''))) ?? '';
    return { head: text.slice(0, cap), aborted: false, truncated: text.length > cap };
  }
  const reader = res.body.getReader();
  let head = '';
  let aborted = false;
  let truncated = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      try {
        reader.cancel().catch(() => undefined);
      } catch {
        /* already released */
      }
      reject(new Error('head-read timeout'));
    }, deadlineMs);
  });
  try {
    for (;;) {
      const { value, done } = await Promise.race([reader.read(), timeout]);
      if (done || value === undefined) break;
      head += dec.decode(value, { stream: true });
      const close = head.search(/<\/head>/i);
      if (close > -1) {
        head = head.slice(0, close + 7);
        aborted = true;
        await reader.cancel().catch(() => undefined);
        break;
      }
      if (head.length > cap) {
        head = head.slice(0, cap);
        truncated = true;
        await reader.cancel().catch(() => undefined);
        break;
      }
    }
  } catch {
    // deadline fired mid-read: keep the partial head
  } finally {
    if (timer) clearTimeout(timer);
  }
  return { head, aborted, truncated };
}

/** First non-empty match wins; returns the decoded value or undefined. */
function pick(html: string, patterns: RegExp[]): string | undefined {
  for (const r of patterns) {
    const m = html.match(r);
    const v = m?.[1] ?? m?.[2];
    if (v && v.trim()) return decodeHtmlEntities(v.trim());
  }
  return undefined;
}

function absUrl(u: string | undefined, base: string | undefined): string | undefined {
  if (!u) return undefined;
  if (!base) return u;
  try {
    return new URL(u, base).toString();
  } catch {
    return undefined;
  }
}

/** Meta tag with `attr=prop` (either attribute order) → content capture. */
function metaProps(prop: string, name = false): RegExp[] {
  const attr = name ? 'name' : 'property';
  return [
    new RegExp(`<meta[^>]+${attr}=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+${attr}=["']${prop}["']`, 'i'),
  ];
}

/**
 * Extract OG/Twitter metadata from a <head> fragment.
 * `baseUrl` is the final page URL (after redirects) used to resolve relative
 * images; pass `undefined` to keep URLs as written.
 */
export function extractOgMeta(head: string, baseUrl?: string): OgMeta {
  const title = pick(head, [...metaProps('og:title'), ...metaProps('twitter:title', true), /<title[^>]*>([^<]+)<\/title>/i]);
  const desc = pick(head, [
    ...metaProps('og:description'),
    ...metaProps('description', true),
    ...metaProps('twitter:description', true),
  ]);
  const imageRaw = pick(head, [
    ...metaProps('og:image'),
    ...metaProps('og:image:url'),
    ...metaProps('og:image:secure_url'),
    ...metaProps('twitter:image', true),
    ...metaProps('twitter:image:src', true),
    /<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i,
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']image_src["']/i,
  ]);
  const site = pick(head, [...metaProps('og:site_name'), ...metaProps('application-name', true)]);
  const favicon = (() => {
    const m =
      head.match(/<link[^>]+rel=["'](?:apple-touch-icon|icon|shortcut icon)["'][^>]+href=["']([^"']+)["']/i) ??
      head.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:apple-touch-icon|icon|shortcut icon)["']/i);
    return m ? decodeHtmlEntities(m[1].trim()) : undefined;
  })();

  return {
    title,
    desc,
    image: absUrl(imageRaw, baseUrl),
    site,
    favicon: absUrl(favicon, baseUrl),
  };
}
