import { NextResponse } from 'next/server';
import { getAllModels } from '@/lib/providers';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}

export async function GET() {
  const groups = await getAllModels();
  return NextResponse.json({
    object: 'list',
    data: groups.map((g) => ({ id: g.provider, name: g.label, tier: g.tier, available: g.configured && !g.error, model_count: g.models.length })),
  });
}
