import { NextResponse } from 'next/server';
import { getAllModels } from '@/lib/providers';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}

// Only providers that are currently usable are listed.
export async function GET() {
  const groups = (await getAllModels()).filter((g) => g.configured && !g.error && g.models.length);
  return NextResponse.json({
    object: 'list',
    data: groups.map((g) => ({ id: g.provider, name: g.label, model_count: g.models.length })),
  });
}
