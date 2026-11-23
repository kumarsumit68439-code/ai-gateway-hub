'use client';
import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/client';
import Ic from '@/components/Ic';
import './dx.css';

export function Sheet({ title, onClose, children }) {
  return (
    <div className='sheet-back' onClick={onClose}>
      <div className='sheet' onClick={(e) => e.stopPropagation()}>
        <div className='grab' />
        {title && <h3>{title}</h3>}
        {children}
      </div>
    </div>
  );
}

export function InviteSheet({ server, onClose }) {
  const [copied, setCopied] = useState(false);
  const link = (typeof window !== 'undefined' ? window.location.origin : '') + '/invite/' + server.invite_code;
  function copy() { navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1400); }
  async function share() {
    if (navigator.share) { try { await navigator.share({ title: 'Join ' + server.name, text: 'Join ' + server.name + ' on AI Gateway', url: link }); } catch {} } else copy();
  }
  return (
    <Sheet title={'Invite people to ' + server.name} onClose={onClose}>
      <p className='mute' style={{ marginTop: 0 }}>Anyone with this link can join the server.</p>
      <pre><code>{link}</code></pre>
      <div className='row'>
        <button onClick={copy}>{copied ? 'Copied' : 'Copy link'}</button>
        <button className='ghost' onClick={share}>Share</button>
      </div>
    </Sheet>
  );
}

// Server menu: quick actions, create channel or category, per-server profile, privacy.
export default function ServerMenu({ server, me, myMember, isManager, isOwner, channels, cats, onClose, onInvite, reload, go }) {
  const [view, setView] = useState('main');
  const [type, setType] = useState('text');
  const [name, setName] = useState('');
  const [cat, setCat] = useState('');
  const [nick, setNick] = useState(myMember?.user_name || '');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function createChannel(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    const r = await api('POST', `/api/servers/${server.id}/channels`, { name, type, category_id: cat || null });
    if (r.ok) { await reload(); onClose(); go(`/servers/${server.id}/channels/${r.j.id}`); } else { setErr(r.j.error || 'Could not create channel.'); setBusy(false); }
  }
  async function createCategory(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    const r = await api('POST', `/api/servers/${server.id}/categories`, { name });
    if (r.ok) { await reload(); onClose(); } else { setErr(r.j.error || 'Could not create category.'); setBusy(false); }
  }
  async function saveNick(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    const r = await api('PATCH', `/api/servers/${server.id}/me`, { nickname: nick });
    if (r.ok) { await reload(); onClose(); } else { setErr(r.j.error || 'Could not save.'); setBusy(false); }
  }
  async function toggleDm() {
    await api('PATCH', `/api/servers/${server.id}/me`, { allow_dm: !(myMember?.allow_dm ?? true) });
    reload();
  }
  async function leave() {
    if (!confirm(isOwner ? 'Delete this server for everyone? This cannot be undone.' : 'Leave this server?')) return;
    await api('DELETE', `/api/servers/${server.id}`);
    onClose();
    go('/servers');
  }
  function copyId() { navigator.clipboard.writeText(server.id); setCopied(true); setTimeout(() => setCopied(false), 1400); }

  if (view === 'channel' || view === 'category') {
    return (
      <Sheet title={view === 'channel' ? 'Create channel' : 'Create category'} onClose={onClose}>
        <form onSubmit={view === 'channel' ? createChannel : createCategory}>
          {view === 'channel' && (
            <div className='seg'>
              <button type='button' className={type === 'text' ? 'on' : ''} onClick={() => setType('text')}># Text</button>
              <button type='button' className={type === 'voice' ? 'on' : ''} onClick={() => setType('voice')}>Voice</button>
            </div>
          )}
          <label>{view === 'channel' ? 'Channel name' : 'Category name'}</label>
          <input required autoFocus maxLength={32} value={name} onChange={(e) => setName(e.target.value)} placeholder={view === 'channel' ? (type === 'voice' ? 'game-room' : 'new-channel') : 'Community'} />
          {view === 'channel' && cats.length > 0 && (
            <>
              <label>Category</label>
              <select className='sel' value={cat} onChange={(e) => setCat(e.target.value)}>
                <option value=''>No category</option>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </>
          )}
          {err && <p className='bad'>{err}</p>}
          <div className='row'>
            <button disabled={busy}>{busy ? 'Creating\u2026' : 'Create'}</button>
            <button type='button' className='ghost' onClick={() => { setView('main'); setErr(''); }}>Back</button>
          </div>
        </form>
      </Sheet>
    );
  }

  if (view === 'profile') {
    return (
      <Sheet title='Edit per-server profile' onClose={onClose}>
        <form onSubmit={saveNick}>
          <label>Nickname in this server</label>
          <input required minLength={2} maxLength={32} value={nick} onChange={(e) => setNick(e.target.value)} />
          <p className='mute' style={{ marginTop: 0 }}>Only this server sees your nickname. Leave it as your name to keep things simple.</p>
          {err && <p className='bad'>{err}</p>}
          <div className='row'>
            <button disabled={busy}>Save</button>
            <button type='button' className='ghost' onClick={() => setView('main')}>Back</button>
          </div>
        </form>
      </Sheet>
    );
  }

  const allowDm = myMember?.allow_dm ?? true;
  return (
    <Sheet onClose={onClose}>
      <div className='sh-head'>
        <span className='big'>{server.icon_url ? <img src={server.icon_url} alt='' referrerPolicy='no-referrer' /> : server.name[0].toUpperCase()}</span>
        <b>{server.name}</b>
      </div>

      <div className='sh-quick'>
        <button className='flat sh-q' onClick={onInvite}><span className='i'><Ic n='userplus' s={24} /></span>Invite</button>
        {isManager ? <Link className='flat sh-q' href={`/servers/${server.id}/settings`}><span className='i'><Ic n='gear' s={24} /></span>Settings</Link> : <Link className='flat sh-q' href='/dm'><span className='i'><Ic n='chat' s={24} /></span>Messages</Link>}
        <Link className='flat sh-q' href={`/servers/${server.id}/check`}><span className='i'><Ic n='check' s={24} /></span>Check</Link>
        <button className='flat sh-q' onClick={copyId}><span className='i'><Ic n='copy' s={24} /></span>{copied ? 'Copied' : 'Copy ID'}</button>
      </div>

      {isManager && (
        <div className='sh-group'>
          <button className='flat sh-row' onClick={() => { setView('channel'); setType('text'); }}>Create Channel</button>
          <button className='flat sh-row' onClick={() => setView('category')}>Create Category</button>
          <Link className='flat sh-row' href={`/servers/${server.id}/settings/roles`}>Create Role</Link>
        </div>
      )}

      <div className='sh-group'>
        <button className='flat sh-row' onClick={() => setView('profile')}>Edit Per-server Profile</button>
        <button className='flat sh-row' onClick={toggleDm}>
          <span>Allow Direct Messages<small>Anyone in the server can message you</small></span>
          <span className={'sw' + (allowDm ? ' on' : '')} />
        </button>
      </div>

      <div className='sh-group'>
        <button className='flat sh-row red' onClick={leave}>{isOwner ? 'Delete server' : 'Leave server'}</button>
      </div>
    </Sheet>
  );
}
