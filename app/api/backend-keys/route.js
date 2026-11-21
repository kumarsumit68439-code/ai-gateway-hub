import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase';
import { getUser } from '@/lib/auth';
import { newBackendKey, hashKey } from '@/lib/keys';
import { mongoConfigured } from '@/lib/mongo';

export const dynamic = 'force-dynamic';
const MAX_KEYS = 10;

// Which storage engines are available + whether the account is verified.
export async function GET(req) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });
  return NextResponse.json({ engines: { supabase: true, mongodb: mongoConfigured() }, verified: !!user.email_confirmed_at });
}

// Create a backend key (bk-live-...). The full key is returned ONCE.
export async function POST(req) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });
  if (!user.email_confirmed_at)
    return NextResponse.json({ error: 'Verify your email first (Account page), then create keys.' }, { status: 403 });

  let name = '', engine = '';
  try { const b = await req.json(); name = String(b.name || '').trim(); engine = String(b.engine || ''); } catch {}
  if (name.length < 1 || name.length > 60) return NextResponse.json({ error: 'Key name must be 1-60 characters.' }, { status: 400 });
  if (!['supabase', 'mongodb'].includes(engine)) return NextResponse.json({ error: 'Engine must be "supabase" or "mongodb".' }, { status: 400 });
  if (engine === 'mongodb' && !mongoConfigured())
    return NextResponse.json({ error: 'MongoDB is not connected on this server yet. Use Supabase for now.' }, { status: 503 });

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
