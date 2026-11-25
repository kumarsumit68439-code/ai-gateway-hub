import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase';
import { getUser } from '@/lib/auth';
import { fail, isMember, isUuid, postMessage, userCard } from '@/lib/discord';
import { readMedia, storeImage } from '@/lib/upload';

export const runtime = 'nodejs';
export const maxDuration = 30;
export const dynamic = 'force-dynamic';

// Send an image or a voice message (the + and mic buttons).
export async function POST(req, { params }) {
  const user = await getUser(req);
  if (!user) return fail(401, 'Not logged in.');
  if (!isUuid(params.cid)) return fail(400, 'Bad id.');
  const db = admin();
  const { data: channel } = await db.from('channels').select('id,type,server_id').eq('id', params.cid).maybeSingle();
  if (!channel || channel.type !== 'text') return fail(404, 'Channel not found.');
  if (!(await isMember(db, channel.server_id, user.id))) return fail(403, 'You are not in this server.');

  const since = new Date(Date.now() - 10000).toISOString();
  const { count } = await db.from('messages').select('id', { count: 'exact', head: true }).eq('author_id', user.id).gte('created_at', since);
  if ((count || 0) >= 10) return fail(429, 'You are sending messages too fast.');

  const media = await readMedia(req);
  if (media.res) return media.res;
  const url = await storeImage(db, `${channel.id}/${user.id}-${Date.now()}.${media.ext}`, media, 'chat-media');
  if (!url) return fail(500, 'Upload failed. Please try again.');

  const { data: mem } = await db.from('server_members').select('user_name,user_avatar').eq('server_id', channel.server_id).eq('user_id', user.id).maybeSingle();
  const card = await userCard(db, user);
  await postMessage(db, channel.id, { type: 'user', id: user.id, name: mem?.user_name || card.name, avatar: mem?.user_avatar || card.avatar }, media.text, { attachment_url: url, attachment_type: media.kind });
  return NextResponse.json({ ok: true });
}
