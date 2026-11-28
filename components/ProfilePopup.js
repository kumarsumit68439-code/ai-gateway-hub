'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client';
import Avatar from '@/components/Avatar';
import './dx.css';
import './nitro.css';

// Member profile card, with a Message button. Nitro customization (colors, decoration, banner) shows here.
export default function ProfilePopup({ serverId, userId, meId, onClose }) {
  const router = useRouter();
  const [c, setC] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api('GET', `/api/servers/${serverId}/members/${userId}`).then((r) => {
      if (r.ok) setC(r.j); else setErr(r.j.error || 'Could not load this profile.');
    });
  }, [serverId, userId]);

  async function dm() {
    const r = await api('POST', '/api/dm/open', { uid: userId });
    if (r.ok) router.push('/dm/' + userId); else setErr(r.j.error || 'Could not open the conversation.');
  }

  const bannerStyle = c && (c.banner
    ? { backgroundImage: `url(${c.banner})` }
    : c.accent1 ? { background: `linear-gradient(135deg, ${c.accent1}, ${c.accent2 || c.accent1})` } : undefined);

  return (
    <div className='sheet-back' onClick={onClose} style={{ alignItems: 'center', padding: 16 }}>
      <div className='pcard' onClick={(e) => e.stopPropagation()} style={c?.accent1 ? { boxShadow: `0 0 0 2px ${c.accent1}` } : undefined}>
        {!c && !err && <div style={{ padding: 40 }}><div className='skel' style={{ height: 90 }} /></div>}
        {err && !c && <div style={{ padding: 24 }}><p className='bad'>{err}</p><button className='ghost small' onClick={onClose}>Close</button></div>}
        {c && (
          <>
            <div className='bn' style={bannerStyle} />
            <div className='bd'>
              <span className={'pav sdot' + (c.online ? ' on' : '')} style={c.deco ? { overflow: 'visible', background: 'none' } : undefined}><Avatar src={c.avatar} name={c.name} size={80} deco={c.deco} /></span>
              <div className='pn'>{c.name}{c.is_owner && <span className='mtag own'>OWNER</span>}{c.nitro && <span className='nt-badge'>NITRO</span>}</div>
              <div style={{ color: c.online ? '#23a55a' : '#9a9ca3', fontSize: 14 }}>{c.online ? 'Online' : 'Offline' + (c.last_seen_at ? ' \u00b7 last seen ' + new Date(c.last_seen_at).toLocaleString() : '')}</div>
              {c.roles.length > 0 && (
                <div className='box'><h4>Roles</h4>{c.roles.map((r) => <span className='rchip' key={r.id}><i style={{ background: r.color }} />{r.name}</span>)}</div>
              )}
              {c.bio && <div className='box'><h4>About me</h4>{c.bio}</div>}
              <div className='box'>
                <h4>Member since</h4>{new Date(c.joined_at).toLocaleDateString()}
                {c.company && <><h4 style={{ marginTop: 10 }}>Works at</h4>{c.company}</>}
              </div>
              {err && <p className='bad'>{err}</p>}
              <div className='row' style={{ marginTop: 14 }}>
                {userId !== meId && <button onClick={dm}>Message</button>}
                <button className='ghost' onClick={onClose}>Close</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
