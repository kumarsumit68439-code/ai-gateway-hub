import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase';
import { getUser } from '@/lib/auth';
import { purgeKey } from '@/lib/store';

export const dynamic = 'force-dynamic';

const okId = (id) => /^[0-9a-f-]{36}$/i.test(id);
const okIp = (v) => typeof v === 'string' && /^[0-9a-fA-F:.]{3,45}$/.test(v);

// Delete a backend project: revokes the key AND permanently deletes its stored data.
export async function DELETE(req, { params }) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });
  if (!okId(params.id)) return NextResponse.json({ error: 'Bad id.' }, { status: 400 });

  const db = admin();
  const { data: key } = await db.from('backend_keys').select('id,engine').eq('id', params.id).eq('user_id', user.id).is('revoked_at', null).maybeSingle();
  if (!key) return NextResponse.json({ error: 'Key not found.' }, { status: 404 });

  const { error } = await db.from('backend_keys').update({ revoked_at: new Date().toISOString() }).eq('id', key.id);
  if (error) return NextResponse.json({ error: 'Could not delete.' }, { status: 500 });
  try { await purgeKey(key); } catch { return NextResponse.json({ ok: true, warning: 'Key revoked, but stored data cleanup failed. Contact support.' }); }
  return NextResponse.json({ ok: true });
}

// Update the server IP allowlist.
export async function PATCH(req, { params }) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });
  if (!okId(params.id)) return NextResponse.json({ error: 'Bad id.' }, { status: 400 });

  let b;
  try { b = await req.json(); } catch { return NextResponse.json({ error: 'Bad JSON.' }, { status: 400 }); }
  const ips = Array.isArray(b.allowed_ips) ? b.allowed_ips : [];
  if (ips.length > 10 || !ips.every(okIp)) return NextResponse.json({ error: 'Provide up to 10 valid IP addresses.' }, { status: 400 });

  const { data, error } = await admin().from('backend_keys').update({ allowed_ips: ips }).eq('id', params.id).eq('user_id', user.id).is('revoked_at', null).select('id').maybeSingle();
  if (error) return NextResponse.json({ error: 'Could not save.' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Key not found.' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
