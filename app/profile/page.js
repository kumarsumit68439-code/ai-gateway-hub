'use client';
import { useEffect, useRef, useState } from 'react';
import { sb } from '@/lib/supabase-browser';
import { api } from '@/lib/client';
import Avatar from '@/components/Avatar';
import '@/components/discord.css';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [f, setF] = useState({ display_name: '', company: '', bio: '', avatar_url: '', banner_url: '' });
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
      const { data } = await sb().from('profiles').select('display_name,company,bio,avatar_url,banner_url').maybeSingle();
      if (data) setF({ display_name: data.display_name || '', company: data.company || '', bio: data.bio || '', avatar_url: data.avatar_url || '', banner_url: data.banner_url || '' });
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

  return (
    <div className='wrap'>
      <h1>Profile</h1>

      <div className='botcard'>
        <div className='banner' style={f.banner_url ? { backgroundImage: `url(${f.banner_url})` } : undefined} />
        <div className='info'>
          <span className='av'><Avatar src={f.avatar_url} name={shown} size={78} /></span>
          <div style={{ marginTop: 8 }}><b style={{ fontSize: 20 }}>{shown}</b></div>
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
        <div className='row2'>
          <div>
            <label>Avatar</label>
            <input value={f.avatar_url} placeholder='https://... image URL' onChange={(e) => set('avatar_url', e.target.value)} />
            <input ref={fa} type='file' hidden accept='image/png,image/jpeg,image/webp,image/gif' onChange={(e) => upload('avatar', e.target.files[0])} />
            <button type='button' className='ghost small' onClick={() => fa.current.click()}>Upload image</button>
          </div>
          <div>
            <label>Banner</label>
            <input value={f.banner_url} placeholder='https://... image URL' onChange={(e) => set('banner_url', e.target.value)} />
            <input ref={fb} type='file' hidden accept='image/png,image/jpeg,image/webp,image/gif' onChange={(e) => upload('banner', e.target.files[0])} />
            <button type='button' className='ghost small' onClick={() => fb.current.click()}>Upload image</button>
          </div>
        </div>
        <div style={{ marginTop: 16 }}><button disabled={busy}>{busy ? 'Saving\u2026' : 'Save profile'}</button></div>
        {msg?.ok && <p className='ok'>{msg.ok}</p>}
        {msg?.bad && <p className='bad'>{msg.bad}</p>}
      </form>
    </div>
  );
}
