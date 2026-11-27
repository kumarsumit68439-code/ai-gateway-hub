'use client';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/client';

// Admin: add, switch off and delete the ads that people watch for free Nitro.
export default function AdminAds() {
  const [ads, setAds] = useState(null);
  const [denied, setDenied] = useState(false);
  const [f, setF] = useState({ title: '', advertiser: '', kind: 'image', media_url: '', click_url: '', duration: 15 });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  const load = useCallback(async () => {
    const r = await api('GET', '/api/admin/ads');
    if (r.ok) setAds(r.j.ads); else if (r.status === 403) setDenied(true); else setMsg({ bad: r.j.error || 'Could not load ads.' });
  }, []);
  useEffect(() => { load(); }, [load]);

  async function add(e) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const r = await api('POST', '/api/admin/ads', f);
    if (r.ok) { setMsg({ ok: 'Ad added.' }); setF({ title: '', advertiser: '', kind: 'image', media_url: '', click_url: '', duration: 15 }); load(); } else setMsg({ bad: r.j.error || 'Could not add the ad.' });
    setBusy(false);
  }
  async function toggle(a) { await api('PATCH', '/api/admin/ads', { id: a.id, active: !a.active }); load(); }
  async function del(a) { if (confirm('Delete this ad?')) { await api('DELETE', '/api/admin/ads?id=' + a.id); load(); } }

  if (denied) return <p className='bad'>Only admins can open this page. Add your email to ADMIN_EMAILS.</p>;
  if (!ads) return <div className='skel' style={{ height: 160 }} />;

  return (
    <div>
      <form className='card' onSubmit={add}>
        <b>Add an ad</b>
        <div className='seg' style={{ display: 'flex', gap: 8, margin: '10px 0' }}>
          {['image', 'video'].map((k) => <button key={k} type='button' className={f.kind === k ? '' : 'ghost'} onClick={() => set('kind', k)}>{k === 'image' ? 'Image' : 'Video'}</button>)}
        </div>
        <input required minLength={2} maxLength={60} placeholder='Ad title' value={f.title} onChange={(e) => set('title', e.target.value)} />
        <input maxLength={40} placeholder='Advertiser name (optional)' value={f.advertiser} onChange={(e) => set('advertiser', e.target.value)} />
        <input required placeholder={f.kind === 'video' ? 'https:// video file (mp4)' : 'https:// image'} value={f.media_url} onChange={(e) => set('media_url', e.target.value)} />
        <input placeholder='https:// link when people click (optional)' value={f.click_url} onChange={(e) => set('click_url', e.target.value)} />
        <label>Watch time in seconds (5-60). For a video, use its length.</label>
        <input type='number' min='5' max='60' value={f.duration} onChange={(e) => set('duration', e.target.value)} />
        <button disabled={busy}>Add ad</button>
        {msg?.ok && <p className='ok'>{msg.ok}</p>}
        {msg?.bad && <p className='bad'>{msg.bad}</p>}
      </form>

      <h2>Your ads</h2>
      <div className='card'>
        {ads.length === 0 ? <p className='mute' style={{ margin: 0 }}>No ads yet.</p> : (
          <table>
            <thead><tr><th>Ad</th><th>Type</th><th>Seconds</th><th>Watched</th><th></th></tr></thead>
            <tbody>
              {ads.map((a) => (
                <tr key={a.id}>
                  <td>{a.title}{a.advertiser && <div className='mute' style={{ fontSize: 13 }}>{a.advertiser}</div>}</td>
                  <td>{a.kind}</td><td>{a.duration}</td><td>{a.views}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className='ghost small' onClick={() => toggle(a)}>{a.active ? 'Turn off' : 'Turn on'}</button>{' '}
                    <button className='danger small' onClick={() => del(a)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
