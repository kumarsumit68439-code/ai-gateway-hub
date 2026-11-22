'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { sb } from '@/lib/supabase-browser';
import Avatar from '@/components/Avatar';
import './discord.css';

// Add a bot to one of your servers from its invite link.
export default function InviteBot({ clientId }) {
  const [bot, setBot] = useState(undefined);
  const [servers, setServers] = useState([]);
  const [pick, setPick] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  useEffect(() => {
    (async () => {
      const u = (await sb().auth.getUser()).data.user;
      const b = await sb().from('bots').select('id,name,description,avatar_url,banner_url,prefix,hosting').eq('id', clientId).maybeSingle();
      setBot(b.data || null);
      const s = await sb().from('servers').select('id,name').eq('owner_id', u.id);
      setServers(s.data || []);
      if (s.data?.length) setPick(s.data[0].id);
    })();
  }, [clientId]);

  async function add() {
    setBusy(true); setMsg(null);
    const s = (await sb().auth.getSession()).data.session;
    const r = await fetch(`/api/servers/${pick}/bots`, { method: 'POST', headers: { Authorization: 'Bearer ' + s.access_token, 'Content-Type': 'application/json' }, body: JSON.stringify({ botId: clientId }) });
    const j = await r.json();
    if (r.ok) setDone(pick); else setMsg(j.error || 'Could not add the bot.');
    setBusy(false);
  }

  if (bot === undefined) return <div className="skel" style={{ height: 200 }} />;
  if (bot === null) return <p className="bad">This bot does not exist. <Link href="/bots">Go to bots</Link></p>;

  return (
    <div>
      <div className="botcard">
        <div className="banner" style={bot.banner_url ? { backgroundImage: `url(${bot.banner_url})` } : undefined} />
        <div className="info">
          <span className="av"><Avatar src={bot.avatar_url} name={bot.name} size={78} /></span>
          <div style={{ marginTop: 8 }}><b style={{ fontSize: 20 }}>{bot.name}</b> <span className="tag">BOT</span></div>
          {bot.description && <p className="mute" style={{ marginBottom: 0 }}>{bot.description}</p>}
          <p className="mute" style={{ marginBottom: 0 }}>Prefix <code>{bot.prefix}</code></p>
        </div>
      </div>

      <div className="card">
        {done ? (
          <>
            <b className="ok">{bot.name} was added to your server.</b>
            <div style={{ marginTop: 12 }}><Link className="btn" href={'/servers/' + done}>Open server</Link></div>
          </>
        ) : servers.length === 0 ? (
          <p style={{ margin: 0 }}>You do not own a server yet. <Link href="/servers">Create one</Link>, then come back to this link.</p>
        ) : (
          <>
            <label>Add to server</label>
            <div className="radios">
              {servers.map((s) => (
                <button type="button" key={s.id} className={'radio' + (pick === s.id ? ' on' : '')} onClick={() => setPick(s.id)}>{s.name}</button>
              ))}
            </div>
            <button onClick={add} disabled={busy || !pick}>{busy ? 'Adding\u2026' : 'Add bot'}</button>
            {msg && <p className="bad">{msg}</p>}
          </>
        )}
      </div>
    </div>
  );
}
