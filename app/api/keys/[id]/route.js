import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase';
import { getUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Revoke a key (only the owner can).
export async function DELETE(req, { params }) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) return NextResponse.json({ error: 'Bad id.' }, { status: 400 });

  const { error } = await admin()
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', params.id)
    .eq('user_id', user.id);
  if (error) return NextResponse.json({ error: 'Could not revoke.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
