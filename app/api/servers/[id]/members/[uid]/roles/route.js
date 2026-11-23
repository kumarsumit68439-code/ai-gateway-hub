import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase';
import { getUser } from '@/lib/auth';
import { canManage, fail, isUuid } from '@/lib/discord';

export const dynamic = 'force-dynamic';

// Give or take a role from a member. Only the owner can hand out manager roles.
export async function POST(req, { params }) {
  const user = await getUser(req);
  if (!user) return fail(401, 'Not logged in.');
  if (!isUuid(params.id) || !isUuid(params.uid)) return fail(400, 'Bad id.');
  const db = admin();
  const perm = await canManage(db, params.id, user.id);
  if (!perm.ok) return fail(403, 'You do not have permission to manage roles.');

  let b = {};
  try { b = await req.json(); } catch {}
  if (!isUuid(b.roleId) || !['add', 'remove'].includes(b.action)) return fail(400, 'Invalid request.');

  const { data: role } = await db.from('server_roles').select('id,can_manage').eq('id', b.roleId).eq('server_id', params.id).maybeSingle();
  if (!role) return fail(404, 'Role not found.');
  if (role.can_manage && !perm.owner) return fail(403, 'Only the owner can give or remove manager roles.');
  const { data: member } = await db.from('server_members').select('user_id').eq('server_id', params.id).eq('user_id', params.uid).maybeSingle();
  if (!member) return fail(404, 'Member not found.');

  if (b.action === 'add') await db.from('member_roles').upsert({ server_id: params.id, user_id: params.uid, role_id: role.id });
  else await db.from('member_roles').delete().eq('server_id', params.id).eq('user_id', params.uid).eq('role_id', role.id);
  return NextResponse.json({ ok: true });
}
