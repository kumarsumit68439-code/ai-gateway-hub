import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase';
import { getUser } from '@/lib/auth';
import { canManage, cleanUrl, fail, isUuid } from '@/lib/discord';

export const dynamic = 'force-dynamic';

// Owner: delete the server. Member: leave the server.
export async function DELETE(req, { params }) {
  const user = await getUser(req);
  if (!user) return fail(401, 'Not logged in.');
  if (!isUuid(params.id)) return fail(400, 'Bad id.');
  const db = admin();
  const { data: server } = await db.from('servers').select('id,owner_id').eq('id', params.id).maybeSingle();
  if (!server) return fail(404, 'Server not found.');

  if (server.owner_id === user.id) {
    await db.from('servers').delete().eq('id', server.id);
    return NextResponse.json({ ok: true, deleted: true });
  }
  await db.from('server_members').delete().eq('server_id', server.id).eq('user_id', user.id);
  return NextResponse.json({ ok: true, left: true });
}

// Rename the server or change its icon link (owner or manager).
export async function PATCH(req, { params }) {
  const user = await getUser(req);
  if (!user) return fail(401, 'Not logged in.');
  if (!isUuid(params.id)) return fail(400, 'Bad id.');
  const db = admin();
  const perm = await canManage(db, params.id, user.id);
  if (!perm.exists) return fail(404, 'Server not found.');
  if (!perm.ok) return fail(403, 'You do not have permission to do that.');

  let b = {};
  try { b = await req.json(); } catch {}
  const u = {};
  if (b.name !== undefined) {
    const n = String(b.name).trim();
    if (n.length < 2 || n.length > 40) return fail(400, 'Server name must be 2-40 characters.');
    u.name = n;
  }
  if (b.icon_url !== undefined) {
    const v = cleanUrl(b.icon_url);
    if (v === undefined) return fail(400, 'Icon link must be an https URL.');
    u.icon_url = v;
  }
  if (!Object.keys(u).length) return fail(400, 'Nothing to update.');
  const { error } = await db.from('servers').update(u).eq('id', params.id);
  if (error) return fail(500, 'Could not save.');
  return NextResponse.json({ ok: true });
}
