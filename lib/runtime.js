import { PROVIDERS, providerKey, getModels } from '@/lib/providers';
import { postMessage } from '@/lib/discord';

const cut = (s, n = 1900) => String(s).slice(0, n);

// Picks the bot's chosen model if it is live, otherwise the first live free model.
async function pickModel(pref) {
  if (pref) {
    const p = pref.split('/')[0];
    if (PROVIDERS[p]) {
      const info = await getModels(p);
      if (info.models.some((m) => m.id === pref)) return pref;
    }
  }
  for (const p of ['groq', 'gemini', 'openrouter']) {
    const info = await getModels(p);
    if (info.models.length) return (info.models.find((m) => /llama|flash|gemma/i.test(m.id)) || info.models[0]).id;
  }
  return null;
}

async function chatOnce(modelId, messages) {
  const provider = modelId.split('/')[0];
  const raw = modelId.slice(provider.length + 1);
  const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + providerKey(provider) };
  if (provider === 'openrouter') { headers['HTTP-Referer'] = process.env.SITE_URL || 'https://vercel.com'; headers['X-Title'] = 'AI Gateway'; }
  const r = await fetch(PROVIDERS[provider].base + '/chat/completions', {
    method: 'POST',
    headers,
    body: JSON.stringify({ model: raw, messages, max_tokens: 400, temperature: 0.7 }),
    signal: AbortSignal.timeout(25000),
  });
  if (!r.ok) throw new Error('ai');
  const j = await r.json();
  return (j.choices?.[0]?.message?.content || '').trim();
}

function parseMedia(input) {
  let u;
  try { u = new URL(input); } catch { return null; }
  if (u.protocol !== 'https:' || input.length > 500) return null;
  const host = u.hostname.replace(/^www\./, '');
  const yt = host === 'youtu.be' || host.endsWith('youtube.com');
  const last = decodeURIComponent(u.pathname.split('/').filter(Boolean).pop() || host);
  return { url: u.toString(), title: yt ? 'YouTube video' : last.slice(0, 80) };
}

// The voice channel (of this server) the user is currently in.
async function userVoice(db, server, userId) {
  const { data: chs } = await db.from('channels').select('id,name').eq('server_id', server.id).eq('type', 'voice');
  if (!chs?.length) return null;
  const since = new Date(Date.now() - 90000).toISOString();
  const { data } = await db.from('voice_members').select('channel_id').eq('user_id', userId).in('channel_id', chs.map((c) => c.id)).gte('updated_at', since).limit(1);
  return data?.length ? chs.find((c) => c.id === data[0].channel_id) : null;
}

async function botVoice(db, server, botId) {
  const { data: chs } = await db.from('channels').select('id,name').eq('server_id', server.id).eq('type', 'voice');
  if (!chs?.length) return null;
  const { data } = await db.from('voice_bots').select('channel_id').eq('bot_id', botId).in('channel_id', chs.map((c) => c.id)).limit(1);
  return data?.length ? chs.find((c) => c.id === data[0].channel_id) : null;
}

async function command(ctx) {
  const { db, bot, server, channel, user, userName, cmd, args, sentAt } = ctx;
  const p = bot.prefix;
  switch (cmd) {
    case 'ping':
      return `Pong! ${Math.max(1, Date.now() - sentAt)} ms`;

    case 'help': {
      const { data: custom } = await db.from('bot_commands').select('name').eq('bot_id', bot.id);
      return `Commands: ${['help', 'ping', 'ai <question>', 'say <text>', 'roll [sides]', 'serverinfo', 'join', 'leave', 'play <url>', 'stop', 'nowplaying'].map((c) => p + c).join(', ')}` +
        (custom?.length ? `\nCustom: ${custom.map((c) => p + c.name).join(', ')}` : '');
    }

    case 'ai': case 'ask': case 'chat': {
      if (!args) return `Usage: ${p}ai <question>`;
      const model = await pickModel(bot.ai_model);
      if (!model) return 'AI is unavailable right now.';
      const text = await chatOnce(model, [
        { role: 'system', content: bot.ai_system || `You are ${bot.name}, a friendly chat bot in a Discord-style server. Keep answers short.` },
        { role: 'user', content: cut(args, 1500) },
      ]);
      return cut(text || 'No response.');
    }

    case 'say':
      return args ? cut(args) : `Usage: ${p}say <text>`;

    case 'roll': {
      const n = Math.min(Math.max(parseInt(args, 10) || 6, 2), 1000);
      return `${userName} rolled ${1 + Math.floor(Math.random() * n)} (1-${n})`;
    }

    case 'serverinfo': {
      const c = (t) => db.from(t).select('*', { count: 'exact', head: true }).eq('server_id', server.id);
      const [m, ch, b] = await Promise.all([c('server_members'), c('channels'), c('server_bots')]);
      return `${server.name}: ${m.count} members, ${ch.count} channels, ${b.count} bots`;
    }

    case 'join': {
      const vc = await userVoice(db, server, user.id);
      if (!vc) return 'Join a voice channel first, then try again.';
      await db.from('voice_bots').upsert({ channel_id: vc.id, bot_id: bot.id });
      return `Joined ${vc.name}.`;
    }

    case 'leave': {
      const vc = await botVoice(db, server, bot.id);
      if (!vc) return 'I am not in a voice channel.';
      await db.from('voice_music').delete().eq('channel_id', vc.id);
      await db.from('voice_bots').delete().eq('channel_id', vc.id).eq('bot_id', bot.id);
      return `Left ${vc.name}.`;
    }

    case 'play': {
      const media = parseMedia(args);
      if (!media) return `Usage: ${p}play <direct audio URL or YouTube link>`;
      const vc = (await userVoice(db, server, user.id)) || (await botVoice(db, server, bot.id));
      if (!vc) return 'Join a voice channel first, then try again.';
      await db.from('voice_bots').upsert({ channel_id: vc.id, bot_id: bot.id });
      const now = new Date().toISOString();
      await db.from('voice_music').upsert({ channel_id: vc.id, url: media.url, title: media.title, requested_by: userName, started_at: now, updated_at: now });
      return `Now playing in ${vc.name}: ${media.title}`;
    }

    case 'stop': {
      const vc = await botVoice(db, server, bot.id);
      if (!vc) return 'Nothing is playing.';
      await db.from('voice_music').delete().eq('channel_id', vc.id);
      return 'Stopped the music.';
    }

    case 'nowplaying': {
      const vc = await botVoice(db, server, bot.id);
      if (!vc) return 'Nothing is playing.';
      const { data } = await db.from('voice_music').select('title,requested_by').eq('channel_id', vc.id).maybeSingle();
      return data ? `Now playing: ${data.title} (requested by ${data.requested_by})` : 'Nothing is playing.';
    }

    default: {
      const { data: c } = await db.from('bot_commands').select('response').eq('bot_id', bot.id).eq('name', cmd).maybeSingle();
      if (!c) return null;
      return cut(c.response.replaceAll('{user}', userName).replaceAll('{server}', server.name).replaceAll('{channel}', channel.name).replaceAll('{args}', args));
    }
  }
}

// Runs prefix commands for bots that are hosted on this platform.
export async function runHostedBots({ db, server, channel, user, userName, content }) {
  const { data: links } = await db
    .from('server_bots')
    .select('bots!inner(id,name,avatar_url,prefix,hosting,ai_model,ai_system)')
    .eq('server_id', server.id);
  const sentAt = Date.now();
  for (const l of links || []) {
    const bot = l.bots;
    if (!bot || bot.hosting !== 'jilowa' || !content.startsWith(bot.prefix)) continue;
    const rest = content.slice(bot.prefix.length).trim();
    if (!rest) continue;
    const [first, ...parts] = rest.split(/\s+/);
    let reply = null;
    try {
      reply = await command({ db, bot, server, channel, user, userName, cmd: first.toLowerCase(), args: parts.join(' '), sentAt });
    } catch {
      reply = 'Something went wrong. Please try again.';
    }
    if (reply) await postMessage(db, channel.id, { type: 'bot', id: bot.id, name: bot.name, avatar: bot.avatar_url }, reply);
  }
}
