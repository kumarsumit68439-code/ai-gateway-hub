'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { sb } from '@/lib/supabase-browser';
import './discord.css';

const online = (b) => b.hosting === 'jilowa' || (b.last_seen_at && Date.now() - new Date(b.last_seen_at).getTime() < 70000);

// Server health check: membership, channels, bots, live connection and microphone.
export default function ServerCheck({ id }) {
  const [d, setD] = useState(null);
  const [live, setLive] = useState('checking');
  const [mic, setMic] = useState('idle');

  useEffect(() => {
    let ch;
    (async () => {
      const u = (await sb().auth.getUser()).data.user;
      const s = await sb().from('servers').select('id,name,owner_id,invite_code,created_at').eq('id', id).maybeSingle();
      if (!s.data) { setD({ missing: true }); return; }
      const [c, m, b] = await Promise.all([
        sb().from('channels').select('id,name,type').eq('server_id', id),
        sb().from('server_members').select('user_id').eq('server_id', id),
        sb().from('server_bots').select('bots(id,name,hosting,last_seen_at)').eq('server_id', id),
      ]);
      const ids = (c.data || []).filter((x) => x.type === 'text').map((x) => x.id);
      let lastMsg = null;
      if (ids.length) {
        const r = await sb().from('messages').select('created_at').in('channel_id', ids).order('id', { ascending: false }).limit(1);
        lastMsg = r.data?.[0]?.created_at || null;
      }
      setD({ server: s.data, owner: s.data.owner_id === u.id, channels: c.data || [], members: (m.data || []).length, bots: (b.data || []).map((x) => x.bots).filter(Boolean), lastMsg });
    })();
    const timer = setTimeout(() => setLive((v) => (v === 'checking' ? 'failed' : v)), 6000);
    ch = sb().channel('check:' + id).subscribe((st) => { if (st === 'SUBSCRIBED') setLive('ok'); });
    return () => { clearTimeout(timer); sb().removeChannel(ch); };
  }, [id]);

  async function testMic() {
    setMic('testing');
    try {
      const st = await navigator.mediaDevices.getUserMedia({ audio: true });
      st.getTracks().forEach((t) => t.stop());
      setMic('ok');
    } catch { setMic('denied'); }
  }

  if (!d) return <div className="skel" style={{ height: 200 }} />;
  if (d.missing) return <p className="bad">Server not found, or you are not a member. <Link href="/servers">Back to servers</Link></p>;

  const text = d.channels.filter((c) => c.type === 'text').length;
  const voice = d.channels.filter((c) => c.type === 'voice').length;
  const checks = [
    { ok: true, title: d.owner ? 'You own this server' : 'You are a member of this server' },
    { ok: text > 0, title: `${text} text channel${text === 1 ? '' : 's'}` },
    { ok: voice > 0, title: `${voice} voice channel${voice === 1 ? '' : 's'}` },
    { ok: live === 'ok', warn: live === 'checking', title: live === 'ok' ? 'Live connection is working' : live === 'checking' ? 'Testing live connection\u2026' : 'Live connection failed. Refresh the page.' },
    { ok: d.bots.length > 0, title: d.bots.length ? `${d.bots.length} bot${d.bots.length === 1 ? '' : 's'} installed` : 'No bots installed yet' },
  ];
  const pass = checks.filter((c) => c.ok).length;
  const pct = Math.round((pass / checks.length) * 100);

  return (
    <div>
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}><b>{d.server.name}</b><b className={pct === 100 ? 'ok' : ''}>{pct}%</b></div>
        <div className="score"><i style={{ width: pct + '%' }} /></div>
        {checks.map((c, i) => (
          <div className="check" key={i}>
            <span className={'tick ' + (c.ok ? 'ok' : 'warn')}>{c.ok ? '\u2713' : '!'}</span>
            <b>{c.title}</b>
          </div>
        ))}
      </div>

      <h2>Overview</h2>
      <div className="stats">
        <div className="stat"><small>Members</small><strong>{d.members}</strong></div>
        <div className="stat"><small>Channels</small><strong>{d.channels.length}</strong></div>
        <div className="stat"><small>Bots</small><strong>{d.bots.length}</strong></div>
      </div>
      <div className="card">
        <dl className="kv">
          <dt>Created</dt><dd>{new Date(d.server.created_at).toLocaleString()}</dd>
          <dt>Last message</dt><dd>{d.lastMsg ? new Date(d.lastMsg).toLocaleString() : 'No messages yet'}</dd>
          <dt>Invite code</dt><dd><code>{d.server.invite_code}</code></dd>
        </dl>
      </div>

      <h2>Bots</h2>
      <div className="card">
        {d.bots.length === 0 ? <p className="mute">No bots yet. <Link href="/bots">Create or invite one</Link></p> : d.bots.map((b) => (
          <div className="check" key={b.id} style={{ alignItems: 'center' }}>
            <span className={online(b) ? 'dot-on' : 'dot-off'} />
            <b style={{ flex: 1 }}>{b.name}</b>
            <span className="mute">{b.hosting === 'jilowa' ? 'Hosted by Jilowa' : online(b) ? 'Self-hosted, online' : 'Self-hosted, offline'}</span>
          </div>
        ))}
      </div>

      <h2>Voice test</h2>
      <div className="card">
        <div className="row">
          <button onClick={testMic} disabled={mic === 'testing'}>{mic === 'testing' ? 'Testing\u2026' : 'Test microphone'}</button>
          {mic === 'ok' && <span className="ok">Microphone works</span>}
          {mic === 'denied' && <span className="bad">Microphone is blocked. Allow it in your browser.</span>}
        </div>
      </div>

      <div className="row" style={{ marginTop: 16 }}>
        <Link className="btn" href={'/servers/' + id}>Open server</Link>
      </div>
    </div>
  );
}
