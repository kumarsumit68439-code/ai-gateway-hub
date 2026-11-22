import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase';
import { getUser } from '@/lib/auth';
import { hashKey } from '@/lib/keys';
import { newBotToken } from '@/lib/bots';
import { fail, isUuid } from '@/lib/discord';

export const dynamic = 'force-dynamic';

// Reset the token. The old token stops working immediately. The new one is returned ONCE.
export async function POST(req, { params }) {
  const user = await getUser(req);
  if (!user) return fail(401, 'Not logged in.');
  if (!isUuid(params.id)) return fail(400, 'Bad id.');

  const { token, prefix } = newBotToken(params.id);
  const { data, error } = await admin()
    .from('bots')
    .update({ token_hash: hashKey(token), token_prefix: prefix })
    .eq('id', params.id)
    .eq('owner_id', user.id)
    .select('id')
    .maybeSingle();
  if (error) return fail(500, 'Could not reset token.');
  if (!data) return fail(404, 'Bot not found.');
  return NextResponse.json({ token });
}
