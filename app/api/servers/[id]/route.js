import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase';
import { getUser } from '@/lib/auth';
import { fail, isUuid } from '@/lib/discord';

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
