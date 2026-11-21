import { NextResponse } from 'next/server';
import { handle, jerr, okCollection, readDoc } from '@/lib/backend-auth';
import * as store from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// List documents of a collection (newest first).
export async function GET(req, { params }) {
  return handle(req, 'list', async (key) => {
    if (!okCollection(params.collection)) return jerr(400, 'Collection name must match [a-z0-9_-], 1-40 characters.');
    const sp = new URL(req.url).searchParams;
    const limit = Math.min(Math.max(parseInt(sp.get('limit') || '20', 10) || 20, 1), 100);
    const offset = Math.max(parseInt(sp.get('offset') || '0', 10) || 0, 0);
    const data = await store.list(key, params.collection, limit, offset);
    return NextResponse.json({ object: 'list', data, limit, offset });
  });
}

// Create a document. The JSON body itself is the document.
export async function POST(req, { params }) {
  return handle(req, 'create', async (key) => {
    if (!okCollection(params.collection)) return jerr(400, 'Collection name must match [a-z0-9_-], 1-40 characters.');
    const body = await readDoc(req);
    if (body.res) return body.res;
    if ((await store.count(key)) >= store.MAX_DOCS) return jerr(403, `Storage limit reached (${store.MAX_DOCS} documents per key).`, 'limit_error');
    const doc = await store.insert(key, params.collection, body.data);
    return NextResponse.json(doc, { status: 201 });
  });
}
