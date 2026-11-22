'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { sb } from '@/lib/supabase-browser';
import Avatar from '@/components/Avatar';
import ChatPanel from '@/components/ChatPanel';
import VoiceRoom from '@/components/VoiceRoom';
import './discord.css';

const online = (b) => b.hosting === 'jilowa' || (b.last_seen_at && Date.now() - new Date(b.last_seen_at).getTime() < 70000);

export default function ServerView({ id }) {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [server, setServer] = useState(null);
  const [channels, setChannels] = useState([]);
  const [members, setMembers] = useState([]);
  const [bots, setBots] = useState([]);
  const [vc, setVc] = useState([]);
  const [active, setActive] = useState(null);
  const [err, setErr] = useState('');
  const [adding, setAdding] = useState(false);
  const [cname, setCname] = useState('');
  const [ctype, setCtype] = useState('text');
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const s = await sb().from('servers').select('id,name,owner_id,invite_code').eq('id', id).maybeSingle();
    if (!s.data) { setErr('Server not found, or you are not a member.'); return; }
    setServer(s.data);
    const ch = await sb().from('channels').select('id,name,type,position').eq('server_id', id).order('position').order('created_at');
    const list = ch.data || [];
    setChannels(list);
    setActive((a) => (a && list.some((c) => c.id === a) ? a : (list.find((c) => c.type === 'text') || list[0])?.id || null));
    const m = await sb().from('server_members').select('user_id,user_name,role').eq('server_id', id);
    setMembers(m.data || []);
    const b = await sb().from('server_bots').select('bots(id,name,avatar_url,hosting,last_seen_at)').eq('server_id', id);
    setBots((b.data || []).map((x) => x.bots).filter(Boolean));
    const vids = list.filter((c) => c.type === 'voice').map((c) => c.id);
    if (vids.length) {
      const v = await sb().from('voice_members').select('channel_id,user_id,user_name,updated_at').in('channel_id', vids);
      setVc((v.data || []).filter((x) => Date.now() - new Date(x.updated_at).getTime() < 90000));
    } else setVc([]);
  }, [id]);

  useEffect(() => {
    (async () => {
      const u = (await sb().auth.getUser()).data.user;
      const mem = await sb().from('server_members').select('user_name').eq('server_id', id).eq('user_id', u.id).maybeSingle();
      setMe({ id: u.id, name: mem.data?.user_name || (u.email || 'me').split('@')[0] });
    })();
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [id, load]);

  async function call(method, url, body) {
    const s = (await sb().auth.getSession()).data.session;
    return fetch(url, { method, headers: { Authorization: 'Bearer ' + s.access_token, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  }

  async function createChannel(e) {
    e.preventDefault();
    setErr('');
    const r = await call('POST', `/api/servers/${id}/channels`, { name: cname, type: ctype });
    const j = await r.json();
    if (!r.ok) { setErr(j.error || 'Could not create channel.'); return; }
    setCname(''); setAdding(false);
    await load();
    setActive(j.id);
  }

  async function removeChannel(cid) {
    if (!confirm('Delete this channel and its messages?')) return;
    const r = await call('DELETE', `/api/servers/${id}/channels/${cid}`);
    if (!r.ok) setErr((await r.json()).error || 'Could not delete channel.');
    load();
  }

  async function removeBot(botId) {
    if (!confirm('Remove this bot from the server?')) return;
    await call('DELETE', `/api/servers/${id}/bots?botId=${botId}`);
    load();
  }

  async function leaveOrDelete() {
    const owner = server.owner_id === me.id;
    if (!confirm(owner ? 'Delete this server for everyone? This cannot be undone.' : 'Leave this server?')) return;
    await call('DELETE', `/api/servers/${id}`);
    router.push('/servers');
  }

  function copyInvite() {
    navigator.clipboard.writeText(window.location.origin + '/invite/' + server.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  if (err && !server) return <div className="wrap"><p className="bad">{err} <Link href="/servers">Back to servers</Link></p></div>;
  if (!server || !me) return <div className="wrap"><div className="skel" style={{ height: 240 }} /></div>;

  const owner = server.owner_id === me.id;
  const cur = channels.find((c) => c.id === active);
  const text = channels.filter((c) => c.type === 'text');
  const voice = channels.filter((c) => c.type === 'voice');

  return (
    <div className="dc">
      <div className="dc-col dc-left">
        <div className="dc-head"><b>{server.name}</b></div>
        <div className="dc-scroll">
          <div className="row" style={{ marginBottom: 6 }}>
            <button className="ghost small" onClick={copyInvite}>{copied ? 'Copied' : 'Invite'}</button>
            <Link className="btn small" href={`/servers/${id}/check`} style={{ padding: '6px 12px', fontSize: 13 }}>Check</Link>
          </div>

          <div className="dc-sec"><span>Text channels</span>{owner && <button className="ghost small" onClick={() => { setAdding(!adding); setCtype('text'); }} aria-label="Add channel">+</button>}</div>
          {text.map((c) => (
            <div key={c.id} className="row" style={{ gap: 2, flexWrap: 'nowrap' }}>
              <button className={'dc-ch' + (active === c.id ? ' on' : '')} onClick={() => setActive(c.id)}># {c.name}</button>
              {owner && text.length + voice.length > 1 && <button className="ghost small" onClick={() => removeChannel(c.id)} aria-label="Delete channel" style={{ padding: '2px 8px' }}>x</button>}
            </div>
          ))}

          <div className="dc-sec"><span>Voice channels</span>{owner && <button className="ghost small" onClick={() => { setAdding(!adding); setCtype('voice'); }} aria-label="Add channel">+</button>}</div>
          {voice.map((c) => (
            <div key={c.id}>
              <div className="row" style={{ gap: 2, flexWrap: 'nowrap' }}>
                <button className={'dc-ch' + (active === c.id ? ' on' : '')} onClick={() => setActive(c.id)}>{'\u{1F50A}'} {c.name}</button>
                {owner && text.length + voice.length > 1 && <button className="ghost small" onClick={() => removeChannel(c.id)} aria-label="Delete channel" style={{ padding: '2px 8px' }}>x</button>}
              </div>
              <div className="dc-voice-users">
                {vc.filter((v) => v.channel_id === c.id).map((v) => <span key={v.user_id}><Avatar name={v.user_name} size={18} />{v.user_name}</span>)}
              </div>
            </div>
          ))}

          {adding && (
            <form onSubmit={createChannel} style={{ marginTop: 10 }}>
              <input required autoFocus maxLength={32} placeholder={ctype === 'voice' ? 'voice channel name' : 'text channel name'} value={cname} onChange={(e) => setCname(e.target.value)} />
              <div className="row"><button className="small">Create {ctype}</button><button type="button" className="ghost small" onClick={() => setAdding(false)}>Cancel</button></div>
            </form>
          )}
          {err && <p className="bad" style={{ fontSize: 13 }}>{err}</p>}
        </div>
        <div style={{ padding: 10, borderTop: '1px solid var(--line)' }}>
          <button className="ghost small" onClick={leaveOrDelete} style={{ width: '100%' }}>{owner ? 'Delete server' : 'Leave server'}</button>
        </div>
      </div>

      <div className="dc-col">
        {!cur ? <div className="dc-empty">Select a channel.</div> : cur.type === 'text' ? <ChatPanel key={cur.id} channel={cur} /> : <VoiceRoom key={cur.id} channel={cur} me={me} />}
      </div>

      <div className="dc-col dc-right">
        <div className="dc-head"><b>Members</b></div>
        <div className="dc-scroll">
          <div className="dc-sec"><span>Members {members.length}</span></div>
          {members.map((m) => (
            <div className="dc-mem" key={m.user_id}><Avatar name={m.user_name} size={30} /><span className="n">{m.user_name}</span>{m.role === 'owner' && <span className="tag" style={{ background: '#d97706' }}>OWNER</span>}</div>
          ))}
          <div className="dc-sec"><span>Bots {bots.length}</span></div>
          {bots.length === 0 && <p className="mute" style={{ fontSize: 13, padding: '0 8px' }}>No bots yet. Invite one from the Bots page.</p>}
          {bots.map((b) => (
            <div className="dc-mem" key={b.id}>
              <Avatar src={b.avatar_url} name={b.name} size={30} />
              <span className="n">{b.name}</span><span className="tag">BOT</span>
              <span className={online(b) ? 'dot-on' : 'dot-off'} style={{ marginLeft: 'auto' }} />
              {owner && <button className="ghost small" onClick={() => removeBot(b.id)} aria-label="Remove bot" style={{ padding: '2px 8px' }}>x</button>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
