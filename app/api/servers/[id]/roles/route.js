import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase';
import { getUser } from '@/lib/auth';
import { canManage, fail, isUuid } from '@/lib/discord';

export const dynamic = 'force-dynamic';

async function gate(req, sid) {
  const user = await getUser(req);
  if (!user) return { res: fail(401, 'Not logged in.') };
  if (!isUuid(sid)) return { res: fail(400, 'Bad id.') };
  const db = admin();
  const perm = await canManage(db, sid, user.id);
  if (!perm.exists) return { res: fail(404, 'Server not found.') };
  if (!perm.ok) return { res: fail(403, 'You do not have permission to manage roles.') };
  return { db, perm };
}

// Create a role. Only the owner can create manager roles.
export async function POST(req, { params }) {
  const g = await gate(req, params.id);
  if (g.res) return g.res;
  let b = {};
  try { b = await req.json(); } catch {}
  const name = String(b.name || '').trim();
  const color = String(b.color || '#99aab5');
  if (name.length < 2 || name.length > 24) return fail(400, 'Role name must be 2-24 characters.');
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) return fail(400, 'Pick a valid color.');
  const manage = !!b.can_manage;
  if (manage && !g.perm.owner) return fail(403, 'Only the owner can create manager roles.');

  const { count } = await g.db.from('server_roles').select('id', { count: 'exact', head: true }).eq('server_id', params.id);
  if ((count || 0) >= 25) return fail(400, 'A server can have up to 25 roles.');
  const { error } = await g.db.from('server_roles').insert({ server_id: params.id, name, color, can_manage: manage, position: (count || 0) + 1 });
  if (error) return fail(400, 'A role with that name already exists.');
  return NextResponse.json({ ok: true });
}

// Delete a role. Only the owner can delete manager roles.
export async function DELETE(req, { params }) {
  const g = await gate(req, params.id);
  if (g.res) return g.res;
  const roleId = new URL(req.url).searchParams.get('roleId');
  if (!isUuid(roleId)) return fail(400, 'Invalid role.');
  const { data: role } = await g.db.from('server_roles').select('id,can_manage').eq('id', roleId).eq('server_id', params.id).maybeSingle();
  if (!role) return fail(404, 'Role not found.');
  if (role.can_manage && !g.perm.owner) return fail(403, 'Only the owner can delete manager roles.');
  await g.db.from('server_roles').delete().eq('id', roleId);
  return NextResponse.json({ ok: true });
}
