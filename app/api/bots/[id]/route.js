import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase';
import { getUser } from '@/lib/auth';
import { fail, isUuid, cleanUrl } from '@/lib/discord';

export const dynamic = 'force-dynamic';

async function owned(req, id) {
  const user = await getUser(req);
  if (!user) return { res: fail(401, 'Not logged in.') };
  if (!isUuid(id)) return { res: fail(400, 'Bad id.') };
  const db = admin();
  const { data: bot } = await db.from('bots').select('*').eq('id', id).eq('owner_id', user.id).maybeSingle();
  if (!bot) return { res: fail(404, 'Bot not found.') };
  return { db, user, bot };
}

export async function GET(req, { params }) {
  const o = await owned(req, params.id);
  if (o.res) return o.res;
  const { token_hash, ...bot } = o.bot;
  const { data: commands } = await o.db.from('bot_commands').select('name,response').eq('bot_id', bot.id).order('name');
  return NextResponse.json({ bot, commands: commands || [] });
}

export async function PATCH(req, { params }) {
  const o = await owned(req, params.id);
  if (o.res) return o.res;
  let b;
  try { b = await req.json(); } catch { return fail(400, 'Invalid request.'); }

  const u = {};
  if (b.name !== undefined) {
    const n = String(b.name).trim();
    if (n.length < 2 || n.length > 32) return fail(400, 'Bot name must be 2-32 characters.');
    u.name = n;
  }
  if (b.description !== undefined) {
    const d = String(b.description || '').trim();
    if (d.length > 300) return fail(400, 'Description is too long (300 max).');
    u.description = d || null;
  }
  if (b.prefix !== undefined) {
    const p = String(b.prefix).trim();
    if (p.length < 1 || p.length > 3 || /\s/.test(p)) return fail(400, 'Prefix must be 1-3 characters, no spaces.');
    u.prefix = p;
  }
  if (b.hosting !== undefined) {
    if (!['self', 'jilowa'].includes(b.hosting)) return fail(400, 'Invalid hosting option.');
    u.hosting = b.hosting;
  }
  for (const k of ['avatar_url', 'banner_url']) {
    if (b[k] !== undefined) {
      const v = cleanUrl(b[k]);
      if (v === undefined) return fail(400, 'Image links must be https URLs.');
      u[k] = v;
    }
  }
  if (b.ai_model !== undefined) {
    const m = String(b.ai_model || '').trim();
    if (m.length > 120) return fail(400, 'Model id is too long.');
    u.ai_model = m || null;
  }
  if (b.ai_system !== undefined) {
    const s = String(b.ai_system || '').trim();
    if (s.length > 1000) return fail(400, 'AI instructions are too long (1000 max).');
    u.ai_system = s || null;
  }
  if (!Object.keys(u).length) return fail(400, 'Nothing to update.');

  const { error } = await o.db.from('bots').update(u).eq('id', o.bot.id);
  if (error) return fail(500, 'Could not save.');
  return NextResponse.json({ ok: true });
}

export async function DELETE(req, { params }) {
  const o = await owned(req, params.id);
  if (o.res) return o.res;
  try {
    const bucket = o.db.storage.from('bot-media');
    const { data: files } = await bucket.list(o.bot.id);
    if (files?.length) await bucket.remove(files.map((f) => `${o.bot.id}/${f.name}`));
  } catch {}
  const { error } = await o.db.from('bots').delete().eq('id', o.bot.id);
  if (error) return fail(500, 'Could not delete bot.');
  return NextResponse.json({ ok: true });
}
