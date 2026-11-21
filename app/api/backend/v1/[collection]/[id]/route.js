import { NextResponse } from 'next/server';
import { handle, jerr, okCollection, readDoc } from '@/lib/backend-auth';
import * as store from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bad = (key, p) => {
  if (!okCollection(p.collection)) return jerr(400, 'Collection name must match [a-z0-9_-], 1-40 characters.');
  if (!store.validId(key.engine, p.id)) return jerr(400, 'Invalid document id for this key.');
  return null;
};
const notFound = () => jerr(404, 'Document not found.');

export async function GET(req, { params }) {
  return handle(req, 'get', async (key) => {
    const e = bad(key, params); if (e) return e;
    const d = await store.get(key, params.collection, params.id);
    return d ? NextResponse.json(d) : notFound();
  });
}

// Replace the whole document.
export async function PUT(req, { params }) {
  return handle(req, 'replace', async (key) => {
    const e = bad(key, params); if (e) return e;
    const body = await readDoc(req); if (body.res) return body.res;
    const d = await store.replace(key, params.collection, params.id, body.data);
    return d ? NextResponse.json(d) : notFound();
  });
}

// Update only the fields you send (shallow merge).
export async function PATCH(req, { params }) {
  return handle(req, 'update', async (key) => {
    const e = bad(key, params); if (e) return e;
    const body = await readDoc(req); if (body.res) return body.res;
    const d = await store.merge(key, params.collection, params.id, body.data);
    return d ? NextResponse.json(d) : notFound();
  });
}

export async function DELETE(req, { params }) {
  return handle(req, 'delete', async (key) => {
    const e = bad(key, params); if (e) return e;
    const done = await store.remove(key, params.collection, params.id);
    return done ? NextResponse.json({ deleted: true, id: params.id }) : notFound();
  });
}
