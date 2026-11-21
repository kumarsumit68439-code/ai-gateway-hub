import { NextResponse } from 'next/server';
import { getAllModels, getModels, PROVIDERS } from '@/lib/providers';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}

export async function GET(req) {
  const p = new URL(req.url).searchParams.get('provider');
  const groups = p && PROVIDERS[p] ? [await getModels(p)] : await getAllModels();
  const data = groups.flatMap((g) =>
    g.models.map((m) => ({ id: m.id, object: 'model', owned_by: g.provider, name: m.name, context_length: m.context, tier: g.tier }))
  );
  return NextResponse.json({ object: 'list', data });
}
