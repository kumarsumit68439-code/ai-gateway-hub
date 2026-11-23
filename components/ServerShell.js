'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { sb } from '@/lib/supabase-browser';
import { seen } from '@/lib/client';
import Avatar from '@/components/Avatar';
import Ic from '@/components/Ic';
import Rail from '@/components/Rail';
import ChatPanel from '@/components/ChatPanel';
import VoiceRoom from '@/components/VoiceRoom';
import ProfilePopup from '@/components/ProfilePopup';
import ServerMenu, { InviteSheet, Sheet } from '@/components/ServerMenu';
import './dx.css';

const botOnline = (b) => b.hosting === 'jilowa' || seen(b.last_seen_at);

function SearchSheet({ server, channels, onClose, onOpen }) {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState(null);
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setRows(null); return; }
    const t = setTimeout(async () => {
      const ids = channels.filter((c) => c.type === 'text').map((c) => c.id);
      if (!ids.length) { setRows([]); return; }
      const r = await sb().from('messages').select('id,channel_id,author_name,content,created_at').in('channel_id', ids).ilike('content', '%' + term.replace(/[%_\\]/g, '\\$&') + '%').order('id', { ascending: false }).limit(30);
      setRows(r.data || []);
    }, 300);
    return () => clearTimeout(t);
  }, [q, channels]);
  const name = (id) => channels.find((c) => c.id === id)?.name || 'channel';
  return (
    <Sheet title={'Search ' + server.name} onClose={onClose}>
      <input autoFocus placeholder='Search messages' value={q} onChange={(e) => setQ(e.target.value)} />
      {rows === null && <p className='mute'>Type at least 2 characters.</p>}
      {rows && rows.length === 0 && <p className='mute'>No messages found.</p>}
      {rows && rows.map((m) => (
        <button key={m.id} className='flat sh-row' onClick={() => onOpen(m.channel_id)} style={{ background: '#2b2c31', borderRadius: 12, marginBottom: 8 }}>
          <span style={{ minWidth: 0 }}>
            <small># {name(m.channel_id)} \u00b7 {m.author_name}</small>
            <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.content}</span>
          </span>
        </button>
      ))}
    </Sheet>
  );
}

export default function ServerShell({ id, channelId }) {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [server, setServer] = useState(null);
  const [channels, setChannels] = useState([]);
  const [cats, setCats] = useState([]);
  const [members, setMembers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [mroles, setMroles] = useState([]);
  const [bots, setBots] = useState([]);
  const [vc, setVc] = useState([]);
  const [err, setErr] = useState('');
  const [sheet, setSheet] = useState(null);
  const [profileId, setProfileId] = useState(null);
  const [membersOpen, setMembersOpen] = useState(false);
  const [collapsed, setCollapsed] = useState({});

  const load = useCallback(async () => {
    const s = await sb().from('servers').select('id,name,owner_id,invite_code,icon_url').eq('id', id).maybeSingle();
    if (!s.data) { setErr('Server not found, or you are not a member.'); return; }
    setServer(s.data);
    const [ch, ct, m, r, mr, b] = await Promise.all([
      sb().from('channels').select('id,name,type,position,category_id').eq('server_id', id).order('position').order('created_at'),
      sb().from('channel_categories').select('id,name,position').eq('server_id', id).order('position'),
      sb().from('server_members').select('user_id,user_name,user_avatar,role,last_seen_at,allow_dm').eq('server_id', id),
      sb().from('server_roles').select('id,name,color,position,can_manage').eq('server_id', id).order('position'),
      sb().from('member_roles').select('user_id,role_id').eq('server_id', id),
      sb().from('server_bots').select('bots(id,name,avatar_url,hosting,last_seen_at)').eq('server_id', id),
    ]);
    const list = ch.data || [];
    setChannels(list); setCats(ct.data || []); setMembers(m.data || []); setRoles(r.data || []); setMroles(mr.data || []);
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
      setMe({ id: u.id, email: u.email });
    })();
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [id, load]);

  // On wide screens, open the first text channel automatically.
  useEffect(() => {
    if (channelId || !channels.length || window.innerWidth <= 820) return;
    const first = channels.find((c) => c.type === 'text') || channels[0];
    router.replace(`/servers/${id}/channels/${first.id}`);
  }, [channelId, channels, id, router]);

  const myMember = members.find((m) => m.user_id === me?.id);
  const topRole = (uid) => mroles.filter((x) => x.user_id === uid).map((x) => roles.find((r) => r.id === x.role_id)).filter(Boolean).sort((a, b) => a.position - b.position)[0];
  const roleColor = (uid) => topRole(uid)?.color;
  const isOwner = !!server && server.owner_id === me?.id;
  const isManager = isOwner || (!!me && mroles.filter((x) => x.user_id === me.id).some((x) => roles.find((r) => r.id === x.role_id)?.can_manage));
  const isOn = (m) => m.user_id === me?.id || seen(m.last_seen_at);

  const groups = (() => {
    const used = new Set();
    const out = [];
    const take = (title, list, color) => { if (list.length) { list.forEach((m) => used.add(m.user_id)); out.push({ title, list, color }); } };
    take('Owner', members.filter((m) => m.role === 'owner' && isOn(m)));
    [...roles].sort((a, b) => a.position - b.position).forEach((r) => take(r.name, members.filter((m) => !used.has(m.user_id) && isOn(m) && topRole(m.user_id)?.id === r.id), r.color));
    take('Online', members.filter((m) => !used.has(m.user_id) && isOn(m)));
    take('Offline', members.filter((m) => !isOn(m)));
    return out;
  })();
  const onlineCount = members.filter(isOn).length;

  if (err && !server) return <div className='wrap'><p className='bad'>{err} <Link href='/servers'>Back to servers</Link></p></div>;
  if (!server || !me) return <div className='dx'><Rail activeId={id} /><div className='dx-list'><div className='dx-lhead'><span className='skel' style={{ width: 160, height: 26 }} /></div></div></div>;

  const cur = channels.find((c) => c.id === channelId);
  const go = (p) => router.push(p);
  const open = (cid) => { setSheet(null); go(`/servers/${id}/channels/${cid}`); };
  const uncategorized = channels.filter((c) => !c.category_id || !cats.some((k) => k.id === c.category_id));

  const row = (c) => (
    <div key={c.id}>
      <Link href={`/servers/${id}/channels/${c.id}`} className={'flat dx-ch' + (channelId === c.id ? ' on' : '')}>
        <Ic n={c.type === 'voice' ? 'speaker' : 'hash'} s={22} /><span>{c.name}</span>
      </Link>
      {c.type === 'voice' && vc.some((v) => v.channel_id === c.id) && (
        <div className='dx-vu'>{vc.filter((v) => v.channel_id === c.id).map((v) => <span key={v.user_id}><Avatar name={v.user_name} size={22} />{v.user_name}</span>)}</div>
      )}
    </div>
  );

  return (
    <div className={'dx ' + (channelId ? 'has-ch' : 'no-ch')}>
      <Rail activeId={id} />

      <section className='dx-list'>
        <button className='flat dx-lhead' onClick={() => setSheet('menu')}>
          <b>{server.name}</b><Ic n='chevR' s={18} />
        </button>
        <div className='dx-actions'>
          <button className='flat dx-search' onClick={() => setSheet('search')}><Ic n='search' s={19} />Search</button>
          <button className='flat dx-sq' onClick={() => setSheet('invite')} aria-label='Invite'><Ic n='userplus' s={20} /></button>
        </div>
        <div className='dx-chs'>
          {uncategorized.map(row)}
          {cats.map((k) => (
            <div key={k.id}>
              <button className='flat dx-cat' onClick={() => setCollapsed((c) => ({ ...c, [k.id]: !c[k.id] }))}>
                <Ic n={collapsed[k.id] ? 'chevR' : 'chevD'} s={14} />{k.name}
              </button>
              {!collapsed[k.id] && channels.filter((c) => c.category_id === k.id).map(row)}
            </div>
          ))}
          {channels.length === 0 && <p className='mute' style={{ padding: 12 }}>No channels yet.</p>}
        </div>
        <div className='dx-user'>
          <span className='sdot on'><Avatar src={myMember?.user_avatar} name={myMember?.user_name || me.email} size={40} /></span>
          <div className='who'><b>{myMember?.user_name || me.email}</b><small>Online</small></div>
          <Link className='flat dx-sq' href='/settings' aria-label='Settings' style={{ background: 'none' }}><Ic n='gear' s={20} /></Link>
        </div>
      </section>

      <section className='dx-main'>
        {!cur ? (
          <div className='dx-empty'>Pick a channel to start.</div>
        ) : (
          <>
            <div className='dx-top'>
              <Link className='flat dx-sq dx-back' href={`/servers/${id}`} aria-label='Back'><Ic n='back' s={22} /></Link>
              <div className='tt'>
                <div className='t'><Ic n={cur.type === 'voice' ? 'speaker' : 'hash'} s={20} />{cur.name}</div>
                <div className='sub'><span className='gdot' />{onlineCount} Online</div>
              </div>
              <button className='flat dx-sq' onClick={() => setSheet('search')} aria-label='Search'><Ic n='search' s={20} /></button>
              <button className='flat dx-sq' onClick={() => setMembersOpen(!membersOpen)} aria-label='Members'><Ic n='people' s={20} /></button>
            </div>
            {cur.type === 'text'
              ? <ChatPanel key={cur.id} channel={cur} roleColor={roleColor} onProfile={setProfileId} />
              : <VoiceRoom key={cur.id} channel={cur} me={{ id: me.id, name: myMember?.user_name || me.email }} />}
          </>
        )}
      </section>

      <aside className={'dx-members' + (membersOpen ? ' open' : '')}>
        <div className='dx-top' style={{ minHeight: 60 }}>
          <div className='tt'><div className='t'>Members</div></div>
          <button className='flat dx-sq dx-back' onClick={() => setMembersOpen(false)} aria-label='Close'><Ic n='x' s={20} /></button>
        </div>
        <div className='dx-ms'>
          {groups.map((g) => (
            <div key={g.title}>
              <div className='dx-mg'>{g.title} \u2014 {g.list.length}</div>
              {g.list.map((m) => (
                <button key={m.user_id} className={'flat dx-mem' + (g.title === 'Offline' ? ' off' : '')} onClick={() => { setProfileId(m.user_id); setMembersOpen(false); }}>
                  <span className={'sdot' + (isOn(m) ? ' on' : '')}><Avatar src={m.user_avatar} name={m.user_name} size={36} /></span>
                  <span className='n' style={roleColor(m.user_id) ? { color: roleColor(m.user_id) } : undefined}>{m.user_name}</span>
                  {m.role === 'owner' && <span className='mtag own'>OWNER</span>}
                </button>
              ))}
            </div>
          ))}
          <div className='dx-mg'>Bots \u2014 {bots.length}</div>
          {bots.length === 0 && <p className='mute' style={{ fontSize: 13, padding: '0 8px' }}>No bots yet.</p>}
          {bots.map((b) => (
            <div key={b.id} className={'dx-mem' + (botOnline(b) ? '' : ' off')}>
              <span className={'sdot' + (botOnline(b) ? ' on' : '')}><Avatar src={b.avatar_url} name={b.name} size={36} /></span>
              <span className='n'>{b.name}</span><span className='mtag'>BOT</span>
            </div>
          ))}
        </div>
      </aside>

      {sheet === 'menu' && <ServerMenu server={server} me={me} myMember={myMember} isManager={isManager} isOwner={isOwner} channels={channels} cats={cats} onClose={() => setSheet(null)} onInvite={() => setSheet('invite')} reload={load} go={go} />}
      {sheet === 'invite' && <InviteSheet server={server} onClose={() => setSheet(null)} />}
      {sheet === 'search' && <SearchSheet server={server} channels={channels} onClose={() => setSheet(null)} onOpen={open} />}
      {profileId && <ProfilePopup serverId={id} userId={profileId} meId={me.id} onClose={() => setProfileId(null)} />}
    </div>
  );
}
