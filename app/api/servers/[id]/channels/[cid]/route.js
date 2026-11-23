import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase';
import { getUser } from '@/lib/auth';
import { canManage, fail, isUuid } from '@/lib/discord';

export const dynamic = 'force-dynamic';

// Delete a channel (owner or manager). A server keeps at least one channel.
export async function DELETE(req, { params }) {
  const user = await getUser(req);
  if (!user) return fail(401, 'Not logged in.');
  if (!isUuid(params.id) || !isUuid(params.cid)) return fail(400, 'Bad id.');
  const db = admin();
  const perm = await canManage(db, params.id, user.id);
  if (!perm.ok) return fail(403, 'You do not have permission to delete channels.');
  const { count } = await db.from('channels').select('id', { count: 'exact', head: true }).eq('server_id', params.id);
  if ((count || 0) <= 1) return fail(400, 'A server needs at least one channel.');
  await db.from('channels').delete().eq('id', params.cid).eq('server_id', params.id);
  return NextResponse.json({ ok: true });
}
