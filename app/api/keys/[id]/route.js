import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase';
import { getUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const okId = (id) => /^[0-9a-f-]{36}$/i.test(id);
const okIp = (v) => typeof v === 'string' && /^[0-9a-fA-F:.]{3,45}$/.test(v);
const okOrigin = (v) => {
  try {
    const u = new URL(v);
    const local = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
    return u.origin === v && (u.protocol === 'https:' || (local && u.protocol === 'http:'));
  } catch { return false; }
};

// Revoke a key (only the owner can).
export async function DELETE(req, { params }) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });
  if (!okId(params.id)) return NextResponse.json({ error: 'Bad id.' }, { status: 400 });

  const { error } = await admin()
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', params.id)
    .eq('user_id', user.id);
  if (error) return NextResponse.json({ error: 'Could not revoke.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// Update restrictions: allowed server IPs and allowed browser origins.
export async function PATCH(req, { params }) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });
  if (!okId(params.id)) return NextResponse.json({ error: 'Bad id.' }, { status: 400 });

  let b;
  try { b = await req.json(); } catch { return NextResponse.json({ error: 'Bad JSON.' }, { status: 400 }); }
  const ips = Array.isArray(b.allowed_ips) ? b.allowed_ips : [];
  const origins = Array.isArray(b.allowed_origins) ? b.allowed_origins : [];
  if (ips.length > 10 || origins.length > 10) return NextResponse.json({ error: 'Maximum 10 entries each.' }, { status: 400 });
  if (!ips.every(okIp)) return NextResponse.json({ error: 'Invalid IP address in list.' }, { status: 400 });
  if (!origins.every(okOrigin)) return NextResponse.json({ error: 'Origins must look like https://example.com (no path, no trailing slash).' }, { status: 400 });

  const { data, error } = await admin()
    .from('api_keys')
    .update({ allowed_ips: ips, allowed_origins: origins })
    .eq('id', params.id)
    .eq('user_id', user.id)
    .is('revoked_at', null)
    .select('id')
    .maybeSingle();
  if (error) return NextResponse.json({ error: 'Could not save.' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Key not found.' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
