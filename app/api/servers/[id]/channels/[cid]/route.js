import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase';
import { getUser } from '@/lib/auth';
import { fail, isUuid } from '@/lib/discord';

export const dynamic = 'force-dynamic';

// Owner: delete a channel (keeps at least one channel).
export async function DELETE(req, { params }) {
  const user = await getUser(req);
  if (!user) return fail(401, 'Not logged in.');
  if (!isUuid(params.id) || !isUuid(params.cid)) return fail(400, 'Bad id.');
  const db = admin();
  const { data: server } = await db.from('servers').select('id,owner_id').eq('id', params.id).maybeSingle();
  if (!server || server.owner_id !== user.id) return fail(403, 'Only the server owner can delete channels.');
  const { count } = await db.from('channels').select('id', { count: 'exact', head: true }).eq('server_id', server.id);
  if ((count || 0) <= 1) return fail(400, 'A server needs at least one channel.');
  await db.from('channels').delete().eq('id', params.cid).eq('server_id', server.id);
  return NextResponse.json({ ok: true });
}
