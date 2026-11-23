'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { sb } from '@/lib/supabase-browser';
import { seen } from '@/lib/client';
import Avatar from '@/components/Avatar';
import Ic from '@/components/Ic';
import './dx.css';

const botOn = (b) => b.hosting === 'jilowa' || seen(b.last_seen_at);

// Server check: how many bots, members, owner and each role there are, and who is online or offline.
export default function ServerCheck({ id }) {
  const [d, setD] = useState(null);
  const [me, setMe] = useState(null);
  const [live, setLive] = useState('checking');
  const [mic, setMic] = useState('idle');

  const load = useCallback(async () => {
    const u = (await sb().auth.getUser()).data.user;
    setMe(u.id);
    const s = await sb().from('servers').select('id,name,owner_id,invite_code,created_at').eq('id', id).maybeSingle();
    if (!s.data) { setD({ missing: true }); return; }
    const [c, m, r, mr, b] = await Promise.all([
      sb().from('channels').select('id,name,type').eq('server_id', id),
      sb().from('server_members').select('user_id,user_name,user_avatar,role,last_seen_at').eq('server_id', id),
      sb().from('server_roles').select('id,name,color,position').eq('server_id', id).order('position'),
      sb().from('member_roles').select('user_id,role_id').eq('server_id', id),
      sb().from('server_bots').select('bots(id,name,avatar_url,hosting,last_seen_at)').eq('server_id', id),
    ]);
    const tids = (c.data || []).filter((x) => x.type === 'text').map((x) => x.id);
    let lastMsg = null;
    if (tids.length) {
      const lm = await sb().from('messages').select('created_at').in('channel_id', tids).order('id', { ascending: false }).limit(1);
      lastMsg = lm.data?.[0]?.created_at || null;
    }
    setD({ server: s.data, channels: c.data || [], members: m.data || [], roles: r.data || [], mroles: mr.data || [], bots: (b.data || []).map((x) => x.bots).filter(Boolean), lastMsg });
  }, [id]);

  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    const timer = setTimeout(() => setLive((v) => (v === 'checking' ? 'failed' : v)), 6000);
    const ch = sb().channel('check:' + id).subscribe((st) => { if (st === 'SUBSCRIBED') setLive('ok'); });
    return () => { clearInterval(t); clearTimeout(timer); sb().removeChannel(ch); };
  }, [id, load]);

  async function testMic() {
    setMic('testing');
    try {
      const st = await navigator.mediaDevices.getUserMedia({ audio: true });
      st.getTracks().forEach((t) => t.stop());
      setMic('ok');
    } catch { setMic('denied'); }
  }

  const top = (title) => (
    <div className='dxp-top'>
      <Link className='flat dx-sq' href={'/servers/' + id} aria-label='Back'><Ic n='back' s={22} /></Link>
      <h1>{title}</h1>
      <span style={{ width: 42 }} />
    </div>
  );

  if (!d || !me) return <div className='dxp'>{top('Server check')}<div className='dxp-in'><div className='skel' style={{ height: 160 }} /></div></div>;
  if (d.missing) return <div className='dxp'>{top('Server check')}<div className='dxp-in'><p className='bad'>Server not found, or you are not a member.</p></div></div>;

  const isOn = (m) => m.user_id === me || seen(m.last_seen_at);
  const byId = Object.fromEntries(d.members.map((m) => [m.user_id, m]));
  const owner = d.members.filter((m) => m.role === 'owner');
  const roleGroups = d.roles.map((r) => ({ role: r, list: d.mroles.filter((x) => x.role_id === r.id).map((x) => byId[x.user_id]).filter(Boolean) }));
  const cnt = (list) => ({ total: list.length, on: list.filter(isOn).length });

  const cards = [
    { key: 'bots', title: 'Bots', ...{ total: d.bots.length, on: d.bots.filter(botOn).length } },
    { key: 'members', title: 'Members', ...cnt(d.members) },
    { key: 'owner', title: 'Owner', ...cnt(owner) },
    ...roleGroups.map((g) => ({ key: g.role.id, title: g.role.name, color: g.role.color, ...cnt(g.list) })),
  ];

  const person = (m, bot) => {
    const on = bot ? botOn(m) : isOn(m);
    return (
      <div className='prow' key={(bot ? 'b' : 'u') + (m.user_id || m.id)}>
        <span className={'sdot' + (on ? ' on' : '')}><Avatar src={bot ? m.avatar_url : m.user_avatar} name={bot ? m.name : m.user_name} size={36} /></span>
        <b>{bot ? m.name : m.user_name}</b>{bot && <span className='mtag'>BOT</span>}
        <span className={'st ' + (on ? 'on' : 'off')}>{on ? 'Online' : 'Offline'}</span>
      </div>
    );
  };
  const section = (title, list, bot, color) => (
    <div key={title}>
      <h2 style={color ? { color } : undefined}>{title} \u2014 {list.length}</h2>
      <div className='st-group'>
        {list.length === 0 ? <div className='prow'><span className='mute'>No one yet</span></div> : [...list].sort((a, b) => Number(bot ? botOn(b) : isOn(b)) - Number(bot ? botOn(a) : isOn(a))).map((m) => person(m, bot))}
      </div>
    </div>
  );

  const text = d.channels.filter((c) => c.type === 'text').length;
  const voice = d.channels.filter((c) => c.type === 'voice').length;

  return (
    <div className='dxp'>{top('Server check')}
      <div className='dxp-in'>
        <h2 style={{ marginTop: 6 }}>{d.server.name}</h2>
        <div className='sgrid'>
          {cards.map((c) => (
            <div className='scard' key={c.key}>
              <small style={c.color ? { color: c.color } : undefined}>{c.title}</small>
              <strong>{c.total}</strong>
              <span className='o'>{c.on} online</span> <span className='f'>\u00b7 {c.total - c.on} offline</span>
            </div>
          ))}
        </div>

        {section('Owner', owner, false)}
        {roleGroups.map((g) => section(g.role.name, g.list, false, g.role.color))}
        {section('Bots', d.bots, true)}

        <h2>Server</h2>
        <div className='st-group'>
          <div className='prow'><Ic n='hash' s={18} /><span>{text} text channel{text === 1 ? '' : 's'}</span></div>
          <div className='prow'><Ic n='speaker' s={18} /><span>{voice} voice channel{voice === 1 ? '' : 's'}</span></div>
          <div className='prow'><span>Last message</span><span className='st off'>{d.lastMsg ? new Date(d.lastMsg).toLocaleString() : 'No messages yet'}</span></div>
          <div className='prow'><span>Live connection</span><span className={'st ' + (live === 'ok' ? 'on' : 'off')}>{live === 'ok' ? 'Working' : live === 'checking' ? 'Testing\u2026' : 'Failed. Refresh the page.'}</span></div>
        </div>

        <h2>Voice test</h2>
        <div className='card'>
          <div className='row'>
            <button onClick={testMic} disabled={mic === 'testing'}>{mic === 'testing' ? 'Testing\u2026' : 'Test microphone'}</button>
            {mic === 'ok' && <span className='ok'>Microphone works</span>}
            {mic === 'denied' && <span className='bad'>Microphone is blocked. Allow it in your browser.</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
