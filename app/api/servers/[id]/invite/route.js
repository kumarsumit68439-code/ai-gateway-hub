import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { admin } from '@/lib/supabase';
import { getUser } from '@/lib/auth';
import { canManage, fail, isUuid } from '@/lib/discord';

export const dynamic = 'force-dynamic';

// Reset the invite link. The old link stops working.
export async function POST(req, { params }) {
  const user = await getUser(req);
  if (!user) return fail(401, 'Not logged in.');
  if (!isUuid(params.id)) return fail(400, 'Bad id.');
  const db = admin();
  const perm = await canManage(db, params.id, user.id);
  if (!perm.ok) return fail(403, 'You do not have permission to do that.');
  const code = randomBytes(5).toString('hex');
  await db.from('servers').update({ invite_code: code }).eq('id', params.id);
  return NextResponse.json({ code });
}
