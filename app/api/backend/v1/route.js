import { NextResponse } from 'next/server';
import { handle } from '@/lib/backend-auth';
import * as store from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Ping / overview: which engine this key uses and what it has stored.
export async function GET(req) {
  return handle(req, 'info', async (key) => {
    const cols = await store.collections(key);
    return NextResponse.json({
      object: 'backend',
      engine: key.engine,
      collections: cols,
      limits: { per_minute: 60, per_day: 5000, max_document_kb: 64, max_documents: store.MAX_DOCS, page_size_max: 100 },
    });
  });
}
