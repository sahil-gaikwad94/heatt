import { redirect } from 'next/navigation';

/**
 * /n/[id] — a note's permalink.
 *
 * A note is not a page of its own: it is a card on the board with its thread
 * open. So the address resolves to the board and opens the conversation, which
 * means a link copied from a note lands on something a person can actually
 * read and reply to, instead of a 404.
 */
export default async function NotePermalink({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/feed?note=${encodeURIComponent(decodeURIComponent(id ?? ''))}`);
}
