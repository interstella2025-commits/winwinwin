import { gated, ok, notFound } from '@/lib/seminar/http';
import { resolve, viewOptions } from '@/lib/seminar/public';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const blocked = gated(); if (blocked) return blocked;
  const { slug } = await params;
  const r = await resolve(slug, viewOptions(new URL(request.url).searchParams));
  if (!r) return notFound();
  return ok(r.state);
}
