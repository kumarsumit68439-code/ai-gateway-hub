import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase';
import { getUser } from '@/lib/auth';
import { newBackendKey, hashKey } from '@/lib/keys';

export const dynamic = 'force-dynamic';

// Regenerate a backend key. The old secret stops working immediately; stored data is kept.
export async function POST(req, { params }) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) return NextResponse.json({ error: 'Bad id.' }, { status: 400 });

  const { key, prefix } = newBackendKey();
  const { data, error } = await admin()
    .from('backend_keys')
    .update({ key_hash: hashKey(key), key_prefix: prefix, rotated_at: new Date().toISOString() })
    .eq('id', params.id)
    .eq('user_id', user.id)
    .is('revoked_at', null)
    .select('id,name,engine,key_prefix')
    .maybeSingle();
  if (error) return NextResponse.json({ error: 'Could not regenerate.' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Key not found.' }, { status: 404 });
  return NextResponse.json({ ...data, key });
}
