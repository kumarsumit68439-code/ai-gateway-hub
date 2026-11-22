import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase';
import { getUser } from '@/lib/auth';
import { hashKey } from '@/lib/keys';

export const runtime = 'nodejs';
export const maxDuration = 30;
export const dynamic = 'force-dynamic';

const fail = (status, message) => NextResponse.json({ error: { message } }, { status });
const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const PATH = /^(\/[a-z0-9_-]{1,40}(\/[A-Za-z0-9-]{1,40})?)?(\?(limit|offset)=\d{1,5}(&(limit|offset)=\d{1,5})?)?$/;

// Playground proxy: runs a real backend request with the user's own key.
// Requires a logged-in session AND a key that belongs to that account.
export async function POST(req) {
  const user = await getUser(req);
  if (!user) return fail(401, 'Please log in again.');

  let b;
  try { b = await req.json(); } catch { return fail(400, 'Invalid request.'); }
  const key = typeof b.key === 'string' ? b.key.trim() : '';
  const method = String(b.method || 'GET').toUpperCase();
  const path = typeof b.path === 'string' ? b.path : '';
  if (!key.startsWith('bk-live-')) return fail(400, 'Paste your backend key (bk-live-...).');
  if (!METHODS.includes(method)) return fail(400, 'Invalid method.');
  if (!PATH.test(path)) return fail(400, 'Invalid path.');

  const { data: row } = await admin().from('backend_keys').select('user_id').eq('key_hash', hashKey(key)).is('revoked_at', null).maybeSingle();
  if (!row || row.user_id !== user.id) return fail(403, 'This key is not valid for your account.');

  const init = { method, headers: { Authorization: 'Bearer ' + key }, signal: AbortSignal.timeout(25000) };
  if (method !== 'GET' && method !== 'DELETE' && b.body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(b.body);
  }

  const t0 = Date.now();
  let up;
  try {
    up = await fetch(new URL('/api/backend/v1' + path, req.url), init);
  } catch {
    return fail(502, 'Request failed. Please try again.');
  }
  const text = await up.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return NextResponse.json({ status: up.status, ms: Date.now() - t0, data });
}
