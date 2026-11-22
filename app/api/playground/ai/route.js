import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase';
import { getUser } from '@/lib/auth';
import { hashKey } from '@/lib/keys';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const fail = (status, message) => NextResponse.json({ error: { message } }, { status });

// Playground proxy: runs a real gateway request with the user's own key.
// Requires a logged-in session AND a key that belongs to that account.
export async function POST(req) {
  const user = await getUser(req);
  if (!user) return fail(401, 'Please log in again.');

  let b;
  try { b = await req.json(); } catch { return fail(400, 'Invalid request.'); }
  const key = typeof b.key === 'string' ? b.key.trim() : '';
  if (!key.startsWith('sk-gw-')) return fail(400, 'Paste your AI Gateway key (sk-gw-...).');
  if (!b.request || typeof b.request !== 'object') return fail(400, 'Invalid request.');

  const { data: row } = await admin().from('api_keys').select('user_id').eq('key_hash', hashKey(key)).is('revoked_at', null).maybeSingle();
  if (!row || row.user_id !== user.id) return fail(403, 'This key is not valid for your account.');

  let up;
  try {
    up = await fetch(new URL('/api/v1/chat/completions', req.url), {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify(b.request),
      signal: AbortSignal.timeout(58000),
    });
  } catch {
    return fail(502, 'Request failed. Please try again.');
  }
  return new Response(up.body, {
    status: up.status,
    headers: { 'Content-Type': up.headers.get('content-type') || 'application/json', 'Cache-Control': 'no-store' },
  });
}
