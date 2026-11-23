import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase';
import { getUser } from '@/lib/auth';
import { fail, isUuid, userCard } from '@/lib/discord';

export const dynamic = 'force-dynamic';

// Send a direct message in a conversation you are part of.
export async function POST(req, { params }) {
  const user = await getUser(req);
  if (!user) return fail(401, 'Not logged in.');
  if (!isUuid(params.tid)) return fail(400, 'Bad id.');
  const db = admin();
  const { data: t } = await db.from('dm_threads').select('id,user_low,user_high').eq('id', params.tid).maybeSingle();
  if (!t || (t.user_low !== user.id && t.user_high !== user.id)) return fail(404, 'Conversation not found.');

  let b = {};
  try { b = await req.json(); } catch {}
  const content = String(b.content || '').trim();
  if (content.length < 1 || content.length > 2000) return fail(400, 'Message must be 1-2000 characters.');

  const since = new Date(Date.now() - 10000).toISOString();
  const { count } = await db.from('dm_messages').select('id', { count: 'exact', head: true }).eq('sender_id', user.id).gte('created_at', since);
  if ((count || 0) >= 10) return fail(429, 'You are sending messages too fast.');

  const me = await userCard(db, user);
  const { error } = await db.from('dm_messages').insert({ thread_id: t.id, sender_id: user.id, sender_name: me.name, sender_avatar: me.avatar, content });
  if (error) return fail(500, 'Message not sent.');
  return NextResponse.json({ ok: true });
}
