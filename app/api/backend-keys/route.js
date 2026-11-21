import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase';
import { getUser } from '@/lib/auth';
import { newBackendKey, hashKey } from '@/lib/keys';
import { mongoConfigured } from '@/lib/mongo';
import { firebaseConfigured } from '@/lib/firebase';
import { verifyCaptcha } from '@/lib/captcha';

export const dynamic = 'force-dynamic';
const MAX_KEYS = 10;
const ENGINES = ['supabase', 'mongodb', 'firebase'];
const available = () => ({ supabase: true, mongodb: mongoConfigured(), firebase: firebaseConfigured() });

// Which storage engines are connected + whether the account is verified.
export async function GET(req) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });
  return NextResponse.json({ engines: available(), verified: !!user.email_confirmed_at });
}

// Create a backend key (bk-live-...). Needs a verified email and a fresh Turnstile captcha.
// The full key is returned ONCE.
export async function POST(req) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });
  if (!user.email_confirmed_at)
    return NextResponse.json({ error: 'Verify your email first (Account page), then create keys.' }, { status: 403 });

  let name = '', engine = '', captcha = '';
  try { const b = await req.json(); name = String(b.name || '').trim(); engine = String(b.engine || ''); captcha = b.captcha; } catch {}
  if (name.length < 1 || name.length > 60) return NextResponse.json({ error: 'Key name must be 1-60 characters.' }, { status: 400 });
  if (!ENGINES.includes(engine)) return NextResponse.json({ error: 'Engine must be "supabase", "mongodb" or "firebase".' }, { status: 400 });
  if (!available()[engine])
    return NextResponse.json({ error: `${engine === 'mongodb' ? 'MongoDB' : 'Firebase'} is not connected on this server yet. Use another engine for now.` }, { status: 503 });

  const c = await verifyCaptcha(captcha, req);
  if (!c.ok) return NextResponse.json({ error: c.error }, { status: c.status });

  const db = admin();
  const { count } = await db.from('backend_keys').select('id', { count: 'exact', head: true }).eq('user_id', user.id).is('revoked_at', null);
  if ((count || 0) >= MAX_KEYS) return NextResponse.json({ error: `Maximum ${MAX_KEYS} active backend keys.` }, { status: 400 });

  const { key, prefix } = newBackendKey();
  const { data, error } = await db
    .from('backend_keys')
    .insert({ user_id: user.id, name, engine, key_prefix: prefix, key_hash: hashKey(key) })
    .select('id,name,engine,key_prefix,created_at')
    .single();
  if (error) return NextResponse.json({ error: 'Could not create key.' }, { status: 500 });
  return NextResponse.json({ ...data, key });
}
