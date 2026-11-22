import { NextResponse } from 'next/server';

export const fail = (status, error) => NextResponse.json({ error }, { status });
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const isUuid = (v) => typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v);

export const isOnline = (bot) =>
  bot.hosting === 'jilowa' || (!!bot.last_seen_at && Date.now() - new Date(bot.last_seen_at).getTime() < 70000);

export async function displayName(db, user) {
  const { data } = await db.from('profiles').select('display_name').eq('id', user.id).maybeSingle();
  return String(data?.display_name || (user.email || 'user').split('@')[0]).slice(0, 32);
}

// author = { type: 'user' | 'bot', id, name, avatar }
export async function postMessage(db, channelId, author, content) {
  const { data, error } = await db
    .from('messages')
    .insert({
      channel_id: channelId,
      author_type: author.type,
      author_id: author.id,
      author_name: author.name,
      author_avatar: author.avatar || null,
      content: String(content).slice(0, 2000),
    })
    .select('id')
    .single();
  if (error) throw new Error('post failed');
  return data;
}

export async function isMember(db, serverId, userId) {
  const { data } = await db.from('server_members').select('user_id').eq('server_id', serverId).eq('user_id', userId).maybeSingle();
  return !!data;
}

export async function botInstalled(db, serverId, botId) {
  const { data } = await db.from('server_bots').select('bot_id').eq('server_id', serverId).eq('bot_id', botId).maybeSingle();
  return !!data;
}

export function cleanUrl(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v !== 'string' || v.length > 500) return undefined;
  try {
    const u = new URL(v);
    return u.protocol === 'https:' ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}
