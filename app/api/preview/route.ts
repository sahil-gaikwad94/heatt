import { NextResponse } from 'next/server';
import { extractOgMeta, readHeadOnly } from '@/lib/oghead';

/* ============================================================================
   GET /api/preview?url=… — edge link-preview engine (spec §7.1)

   Thin Next.js wrapper over `lib/oghead`: fetch the target, read ONLY the
   <head> byte-stream (aborting the connection the moment `</head>` is seen),
   and extract og/twitter meta. The body is never downloaded, so latency stays
   in the tens of milliseconds and memory flat.
   ==========================================================================*/

export const revalidate = 86400;

const MAX_HEAD_BYTES = 128_000; // safety cap for pathological pages
const FETCH_TIMEOUT_MS = 6500;

export async function GET(req: Request) {
  const url = new URL(req.url).searchParams.get('url');
  if (!url || !/^https?:\/\//i.test(url)) {
    return NextResponse.json({ ok: false, error: 'bad url' }, { status: 400 });
  }

  const host = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  })();

  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        'user-agent': 'heattBot/1.0 (+https://heatt.app; link preview)',
        accept: 'text/html,application/xhtml+xml',
      },
      next: { revalidate: 86400 },
    });

    const { head, truncated } = await readHeadOnly(res, MAX_HEAD_BYTES, FETCH_TIMEOUT_MS);
    const { title, desc, image, site, favicon } = extractOgMeta(head, res.url || url);

    return NextResponse.json(
      {
        ok: true,
        preview: {
          url,
          host: site ?? host,
          hostname: host,
          title,
          desc,
          image,
          favicon,
          truncated,
        },
      },
      { headers: { 'cache-control': 's-maxage=86400, stale-while-revalidate=604800' } }
    );
  } catch (e) {
    return NextResponse.json(
      { ok: false, preview: { url, host, hostname: host, title: host }, error: (e as Error).message },
      { status: 200, headers: { 'cache-control': 'no-store' } }
    );
  }
}
