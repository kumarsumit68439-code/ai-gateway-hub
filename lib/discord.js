import { NextResponse } from 'next/server';

export const fail = (status, error) => NextResponse.json({ error }, { status });
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const isUuid = (v) => typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v);

export const isOnline = (bot) =>
  bot.hosting === 'jilowa' || (!!bot.last_seen_at && Date.now() - new Date(bot.last_seen_at).getTime() < 70000);

// A member counts as online if the app pinged within the last 75 seconds.
export const seenRecently = (iso) => !!iso && Date.now() - new Date(iso).getTime() < 75000;

export const DEFAULT_ROLES = [
  ['Admin', '#e74c3c', 1, true],
  ['Moderator', '#2ecc71', 2, false],
  ['Developer', '#3498db', 3, false],
  ['Staff', '#f1c40f', 4, false],
  ['Helper', '#9b59b6', 5, false],
];

export async function seedRoles(db, serverId) {
  await db.from('server_roles').insert(DEFAULT_ROLES.map(([name, color, position, can_manage]) => ({ server_id: serverId, name, color, position, can_manage })));
}

// Name and avatar of a user (profile name, or the email name as a fallback).
export async function userCard(db, user) {
  const { data } = await db.from('profiles').select('display_name,avatar_url').eq('id', user.id).maybeSingle();
  return {
    name: String(data?.display_name || (user.email || 'user').split('@')[0]).slice(0, 32),
    avatar: data?.avatar_url || null,
  };
}
export const displayName = async (db, user) => (await userCard(db, user)).name;

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

// Owner, or anyone holding a role with the "manage server" permission.
export async function canManage(db, serverId, userId) {
  const { data: s } = await db.from('servers').select('owner_id').eq('id', serverId).maybeSingle();
  if (!s) return { ok: false, owner: false, exists: false };
  if (s.owner_id === userId) return { ok: true, owner: true, exists: true };
  const { data } = await db.from('member_roles').select('server_roles!inner(can_manage)').eq('server_id', serverId).eq('user_id', userId);
  return { ok: (data || []).some((r) => r.server_roles?.can_manage), owner: false, exists: true };
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
