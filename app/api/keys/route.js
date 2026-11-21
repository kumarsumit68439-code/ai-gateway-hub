import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase';
import { getUser } from '@/lib/auth';
import { newKey, hashKey } from '@/lib/keys';
import { verifyCaptcha } from '@/lib/captcha';

export const dynamic = 'force-dynamic';
const MAX_KEYS = 10;

// Create a new AI gateway API key. Needs a verified email and a fresh Turnstile captcha.
// The full key is returned ONCE.
export async function POST(req) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });
  if (!user.email_confirmed_at)
    return NextResponse.json({ error: 'Verify your email first (Account page), then create keys.' }, { status: 403 });

  let name = '', captcha = '';
  try { const b = await req.json(); name = String(b.name || '').trim(); captcha = b.captcha; } catch {}
  if (name.length < 1 || name.length > 60)
    return NextResponse.json({ error: 'Key name must be 1-60 characters.' }, { status: 400 });

  const c = await verifyCaptcha(captcha, req);
  if (!c.ok) return NextResponse.json({ error: c.error }, { status: c.status });

  const db = admin();
  const { count } = await db.from('api_keys').select('id', { count: 'exact', head: true }).eq('user_id', user.id).is('revoked_at', null);
  if ((count || 0) >= MAX_KEYS)
    return NextResponse.json({ error: `Maximum ${MAX_KEYS} active keys. Revoke one first.` }, { status: 400 });

  const { key, prefix } = newKey();
  const { data, error } = await db
    .from('api_keys')
    .insert({ user_id: user.id, name, key_prefix: prefix, key_hash: hashKey(key) })
    .select('id,name,key_prefix,created_at')
    .single();
  if (error) return NextResponse.json({ error: 'Could not create key.' }, { status: 500 });
  return NextResponse.json({ ...data, key });
}
