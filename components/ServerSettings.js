'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { sb } from '@/lib/supabase-browser';
import { api } from '@/lib/client';
import Avatar from '@/components/Avatar';
import Ic from '@/components/Ic';
import './dx.css';

const TITLES = { overview: 'Overview', channels: 'Channels', members: 'Members', roles: 'Roles', invites: 'Invites' };

export default function ServerSettings({ id, section }) {
  const router = useRouter();
  const sec = TITLES[section] ? section : null;
  const [me, setMe] = useState(null);
  const [server, setServer] = useState(null);
  const [channels, setChannels] = useState([]);
  const [cats, setCats] = useState([]);
  const [members, setMembers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [mroles, setMroles] = useState([]);
  const [msg, setMsg] = useState(null);
  const [missing, setMissing] = useState(false);

  const load = useCallback(async () => {
    const u = (await sb().auth.getUser()).data.user;
    setMe(u.id);
    const s = await sb().from('servers').select('id,name,owner_id,invite_code,icon_url').eq('id', id).maybeSingle();
    if (!s.data) { setMissing(true); return; }
    setServer(s.data);
    const [ch, ct, m, r, mr] = await Promise.all([
      sb().from('channels').select('id,name,type,category_id').eq('server_id', id).order('position'),
      sb().from('channel_categories').select('id,name').eq('server_id', id).order('position'),
      sb().from('server_members').select('user_id,user_name,user_avatar,role').eq('server_id', id),
      sb().from('server_roles').select('id,name,color,position,can_manage').eq('server_id', id).order('position'),
      sb().from('member_roles').select('user_id,role_id').eq('server_id', id),
    ]);
    setChannels(ch.data || []); setCats(ct.data || []); setMembers(m.data || []); setRoles(r.data || []); setMroles(mr.data || []);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (missing) return <div className='dxp'><div className='dxp-in'><p className='bad'>Server not found, or you are not a member. <Link href='/servers'>Back to servers</Link></p></div></div>;
  if (!server || !me) return <div className='dxp'><div className='dxp-in'><div className='skel' style={{ height: 160 }} /></div></div>;

  const owner = server.owner_id === me;
  const manager = owner || mroles.filter((x) => x.user_id === me).some((x) => roles.find((r) => r.id === x.role_id)?.can_manage);
  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(null), 3500); };
  const act = async (method, url, body, okText) => {
    const r = await api(method, url, body);
    if (r.ok) { if (okText) flash({ ok: okText }); await load(); } else flash({ bad: r.j.error || 'Something went wrong.' });
    return r;
  };

  const top = (
    <div className='dxp-top'>
      <Link className='flat dx-sq' href={sec ? `/servers/${id}/settings` : `/servers/${id}`} aria-label='Back'><Ic n={sec ? 'back' : 'x'} s={22} /></Link>
      <h1>{sec ? TITLES[sec] : 'Server Settings'}</h1>
      <span style={{ width: 42 }} />
    </div>
  );

  if (!manager) return <div className='dxp'>{top}<div className='dxp-in'><p>You do not have permission to manage this server.</p></div></div>;

  const roleOf = (uid) => mroles.filter((x) => x.user_id === uid).map((x) => roles.find((r) => r.id === x.role_id)).filter(Boolean).sort((a, b) => a.position - b.position);
  const flashBar = <>{msg?.ok && <p className='ok'>{msg.ok}</p>}{msg?.bad && <p className='bad'>{msg.bad}</p>}</>;

  /* ---------- home ---------- */
  if (!sec) {
    const rows = (items) => (
      <div className='st-group'>
        {items.map(([href, label, ic]) => (
          <Link key={href} href={href} className='flat st-row'><span className='ic'><Ic n={ic} s={24} /></span><span className='lb'>{label}</span><span className='ch'><Ic n='chevR' s={20} /></span></Link>
        ))}
      </div>
    );
    return (
      <div className='dxp'>{top}
        <div className='dxp-in'>
          <div className='dxp-hero'>
            <span className='big'>{server.icon_url ? <img src={server.icon_url} alt='' referrerPolicy='no-referrer' /> : server.name[0].toUpperCase()}</span>
            <b style={{ fontSize: 22 }}>{server.name}</b>
          </div>
          <h2>Settings</h2>
          {rows([[`/servers/${id}/settings/overview`, 'Overview', 'info'], [`/servers/${id}/settings/channels`, 'Channels', 'list']])}
          <h2>People</h2>
          {rows([[`/servers/${id}/settings/members`, 'Members', 'people'], [`/servers/${id}/settings/roles`, 'Roles', 'shield'], [`/servers/${id}/settings/invites`, 'Invites', 'link']])}
          <h2>Insights</h2>
          {rows([[`/servers/${id}/check`, 'Server check', 'check']])}
        </div>
      </div>
    );
  }

  /* ---------- overview ---------- */
  if (sec === 'overview') return <Overview {...{ top, server, id, owner, act, flash, load, flashBar, router }} />;

  /* ---------- channels ---------- */
  if (sec === 'channels') return <ChannelsPane {...{ top, id, channels, cats, act, flashBar, router }} />;

  /* ---------- members ---------- */
  if (sec === 'members') {
    return (
      <div className='dxp'>{top}
        <div className='dxp-in'>
          {flashBar}
          <div className='st-group'>
            {members.map((m) => {
              const mine = roleOf(m.user_id);
              const addable = roles.filter((r) => !mine.some((x) => x.id === r.id) && (owner || !r.can_manage));
              return (
                <div className='prow' key={m.user_id} style={{ alignItems: 'flex-start' }}>
                  <Avatar src={m.user_avatar} name={m.user_name} size={40} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b style={mine[0] ? { color: mine[0].color } : undefined}>{m.user_name}</b> {m.role === 'owner' && <span className='mtag own'>OWNER</span>}
                    <div style={{ marginTop: 4 }}>
                      {mine.map((r) => (
                        <span className='rchip' key={r.id}><i style={{ background: r.color }} />{r.name}
                          {(owner || !r.can_manage) && <button className='flat' onClick={() => act('POST', `/api/servers/${id}/members/${m.user_id}/roles`, { roleId: r.id, action: 'remove' })} aria-label='Remove role' style={{ marginLeft: 4, color: '#9a9ca3' }}>x</button>}
                        </span>
                      ))}
                      {addable.length > 0 && (
                        <select className='sel' value='' onChange={(e) => e.target.value && act('POST', `/api/servers/${id}/members/${m.user_id}/roles`, { roleId: e.target.value, action: 'add' })} style={{ width: 'auto', margin: '4px 0', padding: '4px 8px', fontSize: 13 }}>
                          <option value=''>+ Add role</option>
                          {addable.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                      )}
                    </div>
                  </div>
                  {m.role !== 'owner' && m.user_id !== me && <button className='danger small' onClick={() => confirm('Remove ' + m.user_name + ' from the server?') && act('DELETE', `/api/servers/${id}/members/${m.user_id}`, null, 'Member removed.')}>Remove</button>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  /* ---------- roles ---------- */
  if (sec === 'roles') return <RolesPane {...{ top, id, roles, mroles, owner, act, flashBar }} />;

  /* ---------- invites ---------- */
  return <InvitesPane {...{ top, server, id, act, flashBar }} />;
}

function Overview({ top, server, id, owner, act, flash, load, flashBar, router }) {
  const [name, setName] = useState(server.name);
  const [icon, setIcon] = useState(server.icon_url || '');
  async function upload(file) {
    if (!file) return;
    const s = (await sb().auth.getSession()).data.session;
    const fd = new FormData();
    fd.append('file', file);
    const r = await fetch(`/api/servers/${id}/icon`, { method: 'POST', headers: { Authorization: 'Bearer ' + s.access_token }, body: fd });
    const j = await r.json();
    if (r.ok) { setIcon(j.url); flash({ ok: 'Icon uploaded.' }); load(); } else flash({ bad: j.error || 'Upload failed.' });
  }
  async function del() {
    if (!confirm('Delete this server for everyone? This cannot be undone.')) return;
    await api('DELETE', `/api/servers/${id}`);
    router.push('/servers');
  }
  return (
    <div className='dxp'>{top}
      <div className='dxp-in'>
        {flashBar}
        <div className='dxp-hero'><span className='big'>{icon ? <img src={icon} alt='' referrerPolicy='no-referrer' /> : name[0]?.toUpperCase()}</span></div>
        <div className='card'>
          <label>Server name</label>
          <input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
          <label>Icon link (https)</label>
          <input value={icon} placeholder='https://... image URL' onChange={(e) => setIcon(e.target.value)} />
          <div className='row'>
            <button onClick={() => act('PATCH', `/api/servers/${id}`, { name, icon_url: icon }, 'Saved.')}>Save</button>
            <label className='ghost small' style={{ cursor: 'pointer', padding: '8px 14px', borderRadius: 11, border: '1px solid var(--line)' }}>Upload icon<input type='file' hidden accept='image/png,image/jpeg,image/webp,image/gif' onChange={(e) => upload(e.target.files[0])} /></label>
          </div>
        </div>
        {owner && <div className='card'><button className='danger' onClick={del}>Delete server</button></div>}
      </div>
    </div>
  );
}

function ChannelsPane({ top, id, channels, cats, act, flashBar, router }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('text');
  const [cat, setCat] = useState('');
  const [cname, setCname] = useState('');
  async function create(e) {
    e.preventDefault();
    const r = await act('POST', `/api/servers/${id}/channels`, { name, type, category_id: cat || null }, 'Channel created.');
    if (r.ok) { setName(''); router.push(`/servers/${id}/channels/${r.j.id}`); }
  }
  async function createCat(e) {
    e.preventDefault();
    const r = await act('POST', `/api/servers/${id}/categories`, { name: cname }, 'Category created.');
    if (r.ok) setCname('');
  }
  const list = (cid) => channels.filter((c) => (c.category_id || null) === cid);
  const item = (c) => (
    <div className='prow' key={c.id}>
      <Ic n={c.type === 'voice' ? 'speaker' : 'hash'} s={20} /><span>{c.name}</span>
      <button className='danger small' style={{ marginLeft: 'auto' }} onClick={() => confirm('Delete this channel and its messages?') && act('DELETE', `/api/servers/${id}/channels/${c.id}`, null, 'Channel deleted.')}>Delete</button>
    </div>
  );
  return (
    <div className='dxp'>{top}
      <div className='dxp-in'>
        {flashBar}
        <form className='card' onSubmit={create}>
          <b>Create channel</b>
          <div className='seg' style={{ marginTop: 10 }}>
            <button type='button' className={type === 'text' ? 'on' : ''} onClick={() => setType('text')}># Text</button>
            <button type='button' className={type === 'voice' ? 'on' : ''} onClick={() => setType('voice')}>Voice</button>
          </div>
          <input required maxLength={32} placeholder='channel-name' value={name} onChange={(e) => setName(e.target.value)} />
          {cats.length > 0 && <select className='sel' value={cat} onChange={(e) => setCat(e.target.value)}><option value=''>No category</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>}
          <button>Create channel</button>
        </form>
        <form className='card' onSubmit={createCat}>
          <b>Create category</b>
          <input required maxLength={32} placeholder='Category name' value={cname} onChange={(e) => setCname(e.target.value)} style={{ marginTop: 10 }} />
          <button>Create category</button>
        </form>
        <h2>All channels</h2>
        <div className='st-group'>
          {list(null).concat(channels.filter((c) => c.category_id && !cats.some((k) => k.id === c.category_id))).map(item)}
          {cats.map((k) => (
            <div key={k.id}>
              <div className='prow' style={{ background: '#1e1f23' }}><Ic n='folder' s={18} /><b>{k.name}</b><button className='ghost small' style={{ marginLeft: 'auto' }} onClick={() => confirm('Delete this category? Its channels stay.') && act('DELETE', `/api/servers/${id}/categories?categoryId=${k.id}`, null, 'Category deleted.')}>Delete category</button></div>
              {list(k.id).map(item)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RolesPane({ top, id, roles, mroles, owner, act, flashBar }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#5865f2');
  const [manage, setManage] = useState(false);
  async function create(e) {
    e.preventDefault();
    const r = await act('POST', `/api/servers/${id}/roles`, { name, color, can_manage: manage }, 'Role created.');
    if (r.ok) { setName(''); setManage(false); }
  }
  return (
    <div className='dxp'>{top}
      <div className='dxp-in'>
        {flashBar}
        <form className='card' onSubmit={create}>
          <b>Create role</b>
          <div className='row' style={{ marginTop: 10, flexWrap: 'nowrap' }}>
            <input required minLength={2} maxLength={24} placeholder='Role name' value={name} onChange={(e) => setName(e.target.value)} style={{ margin: 0 }} />
            <input type='color' value={color} onChange={(e) => setColor(e.target.value)} aria-label='Role color' style={{ width: 56, height: 44, padding: 2, margin: 0 }} />
          </div>
          {owner && <label className='chk' style={{ marginTop: 12 }}><input type='checkbox' checked={manage} onChange={(e) => setManage(e.target.checked)} />Can manage the server (channels, roles, bots, members)</label>}
          <button style={{ marginTop: 10 }}>Create role</button>
        </form>
        <h2>Roles</h2>
        <div className='st-group'>
          {roles.map((r) => (
            <div className='rolebar' key={r.id}>
              <span className='nm'><span className='rdot' style={{ background: r.color }} />{r.name}{r.can_manage && <span className='mtag'>MANAGER</span>}</span>
              <span className='mute'>{mroles.filter((x) => x.role_id === r.id).length} members</span>
              {(owner || !r.can_manage) && <button className='danger small' onClick={() => confirm('Delete the ' + r.name + ' role?') && act('DELETE', `/api/servers/${id}/roles?roleId=${r.id}`, null, 'Role deleted.')}>Delete</button>}
            </div>
          ))}
        </div>
        <p className='mute'>Give roles to people on the Members page.</p>
      </div>
    </div>
  );
}

function InvitesPane({ top, server, id, act, flashBar }) {
  const [copied, setCopied] = useState(false);
  const link = (typeof window !== 'undefined' ? window.location.origin : '') + '/invite/' + server.invite_code;
  function copy() { navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1400); }
  async function share() {
    if (navigator.share) { try { await navigator.share({ title: 'Join ' + server.name, text: 'Join ' + server.name + ' on AI Gateway', url: link }); } catch {} } else copy();
  }
  return (
    <div className='dxp'>{top}
      <div className='dxp-in'>
        {flashBar}
        <div className='card'>
          <b>Invite link</b>
          <pre style={{ marginTop: 10 }}><code>{link}</code></pre>
          <div className='row'>
            <button onClick={copy}>{copied ? 'Copied' : 'Copy link'}</button>
            <button className='ghost' onClick={share}>Share</button>
            <button className='ghost' onClick={() => confirm('Reset the invite link? The old link will stop working.') && act('POST', `/api/servers/${id}/invite`, {}, 'Invite link reset.')}>Reset link</button>
          </div>
        </div>
      </div>
    </div>
  );
}
