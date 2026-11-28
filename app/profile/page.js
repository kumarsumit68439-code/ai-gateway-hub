'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { sb } from '@/lib/supabase-browser';
import { api } from '@/lib/client';
import Avatar from '@/components/Avatar';
import '@/components/discord.css';
import '@/components/nitro.css';

const DECOS = [['', 'None'], ['neon', 'Neon'], ['gold', 'Gold'], ['rainbow', 'Rainbow'], ['sunset', 'Sunset'], ['frost', 'Frost']];

export default function Profile() {
  const [user, setUser] = useState(null);
  const [f, setF] = useState({ display_name: '', company: '', bio: '', avatar_url: '', banner_url: '', accent1: '', accent2: '', avatar_deco: '' });
  const [rank, setRank] = useState(0);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const fa = useRef(null);
  const fb = useRef(null);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  useEffect(() => {
    (async () => {
      const u = (await sb().auth.getUser()).data?.user || null;
      setUser(u);
      const { data } = await sb().from('profiles').select('display_name,company,bio,avatar_url,banner_url,accent1,accent2,avatar_deco').maybeSingle();
      if (data) setF({ display_name: data.display_name || '', company: data.company || '', bio: data.bio || '', avatar_url: data.avatar_url || '', banner_url: data.banner_url || '', accent1: data.accent1 || '', accent2: data.accent2 || '', avatar_deco: data.avatar_deco || '' });
      const n = await api('GET', '/api/nitro');
      if (n.ok && n.j.nitro.active) setRank(n.j.nitro.plan === 'nitro' ? 2 : 1);
      setReady(true);
    })();
  }, []);

  async function save(e) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const r = await api('PATCH', '/api/profile', f);
    setMsg(r.ok ? { ok: 'Profile saved.' } : { bad: r.j.error || 'Could not save profile.' });
    setBusy(false);
  }

  async function upload(kind, file) {
    if (!file) return;
    setMsg(null);
    const s = (await sb().auth.getSession()).data.session;
    const fd = new FormData();
    fd.append('file', file);
    const r = await fetch('/api/profile/upload?kind=' + kind, { method: 'POST', headers: { Authorization: 'Bearer ' + s.access_token }, body: fd });
    const j = await r.json();
    if (r.ok) { set(kind + '_url', j.url); setMsg({ ok: 'Image uploaded.' }); } else setMsg({ bad: j.error || 'Upload failed.' });
  }

  if (!ready || !user) return <div className='wrap'><div className='skel' style={{ height: 160 }} /></div>;
  const shown = f.display_name || user.email.split('@')[0];
  const locked = (need) => rank < need;
  const bannerStyle = f.banner_url ? { backgroundImage: `url(${f.banner_url})` } : f.accent1 ? { background: `linear-gradient(135deg, ${f.accent1}, ${f.accent2 || f.accent1})` } : undefined;
  const lockNote = <span className='mute' style={{ fontSize: 13 }}>Free with Nitro. <Link href='/nitro'>Get Nitro</Link></span>;

  return (
    <div className='wrap'>
      <h1>Profile</h1>

      <div className='botcard' style={f.accent1 && rank >= 2 ? { boxShadow: `0 0 0 2px ${f.accent1}` } : undefined}>
        <div className='banner' style={bannerStyle} />
        <div className='info'>
          <span className='av' style={f.avatar_deco ? { overflow: 'visible' } : undefined}><Avatar src={f.avatar_url} name={shown} size={78} deco={f.avatar_deco || undefined} /></span>
          <div style={{ marginTop: 8 }}><b style={{ fontSize: 20 }}>{shown}</b> {rank > 0 && <span className='nt-badge'>NITRO</span>}</div>
          <div className='mute'>{user.email}</div>
          {f.company && <div className='mute'>{f.company}</div>}
          {f.bio && <p style={{ marginBottom: 0 }}>{f.bio}</p>}
        </div>
      </div>

      <form className='card' onSubmit={save}>
        <div className='row2'>
          <div><label>Display name</label><input maxLength={32} value={f.display_name} onChange={(e) => set('display_name', e.target.value)} placeholder='Your name' /></div>
          <div><label>Company or project</label><input maxLength={80} value={f.company} onChange={(e) => set('company', e.target.value)} placeholder='Optional' /></div>
        </div>
        <label>About you</label>
        <textarea maxLength={300} value={f.bio} onChange={(e) => set('bio', e.target.value)} placeholder='Optional' style={{ minHeight: 80 }} />
        <div>
          <label>Avatar {rank < 1 && <span className='mute' style={{ fontSize: 12 }}>(GIF needs Nitro)</span>}</label>
          <input value={f.avatar_url} placeholder='https://... image URL' onChange={(e) => set('avatar_url', e.target.value)} />
          <input ref={fa} type='file' hidden accept='image/png,image/jpeg,image/webp,image/gif' onChange={(e) => upload('avatar', e.target.files[0])} />
          <button type='button' className='ghost small' onClick={() => fa.current.click()}>Upload image</button>
        </div>

        <h2>Nitro customization</h2>
        <div style={{ opacity: locked(2) ? 0.55 : 1 }}>
          <label>Banner {locked(2) && lockNote}</label>
          <input disabled={locked(2)} value={f.banner_url} placeholder='https://... image URL' onChange={(e) => set('banner_url', e.target.value)} />
          <input ref={fb} type='file' hidden accept='image/png,image/jpeg,image/webp,image/gif' onChange={(e) => upload('banner', e.target.files[0])} />
          <button type='button' className='ghost small' disabled={locked(2)} onClick={() => fb.current.click()}>Upload banner</button>
          <div className='row2' style={{ marginTop: 14 }}>
            <div><label>Profile color 1</label><input type='color' disabled={locked(2)} value={f.accent1 || '#5865f2'} onChange={(e) => set('accent1', e.target.value)} style={{ height: 46, padding: 3 }} /></div>
            <div><label>Profile color 2</label><input type='color' disabled={locked(2)} value={f.accent2 || '#22d3ee'} onChange={(e) => set('accent2', e.target.value)} style={{ height: 46, padding: 3 }} /></div>
          </div>
          {(f.accent1 || f.accent2) && !locked(2) && <button type='button' className='ghost small' onClick={() => { set('accent1', ''); set('accent2', ''); }}>Reset colors</button>}
        </div>

        <div style={{ marginTop: 16, opacity: locked(1) ? 0.55 : 1 }}>
          <label>Avatar decoration {locked(1) && lockNote}</label>
          <div className='row' style={{ gap: 14, margin: '8px 0' }}>
            {DECOS.map(([k, label]) => (
              <button key={k || 'none'} type='button' disabled={locked(1)} onClick={() => set('avatar_deco', k)} style={{ background: 'none', boxShadow: 'none', padding: 8, borderRadius: 14, border: '1px solid ' + (f.avatar_deco === k ? 'var(--accent)' : 'var(--line)'), display: 'grid', placeItems: 'center', gap: 6, color: 'var(--text)', fontWeight: 500 }}>
                <Avatar src={f.avatar_url} name={shown} size={44} deco={k || undefined} />
                <small>{label}</small>
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 16 }}><button disabled={busy}>{busy ? 'Saving\u2026' : 'Save profile'}</button></div>
        {msg?.ok && <p className='ok'>{msg.ok}</p>}
        {msg?.bad && <p className='bad'>{msg.bad}</p>}
      </form>
    </div>
  );
}
