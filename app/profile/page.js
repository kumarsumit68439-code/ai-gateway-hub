'use client';
import { useEffect, useState } from 'react';
import { sb } from '@/lib/supabase-browser';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [bio, setBio] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const u = (await sb().auth.getUser()).data?.user || null;
      setUser(u);
      const { data } = await sb().from('profiles').select('display_name,company,bio').maybeSingle();
      if (data) { setName(data.display_name || ''); setCompany(data.company || ''); setBio(data.bio || ''); }
      setReady(true);
    })();
  }, []);

  async function save(e) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const { error } = await sb().from('profiles').upsert({
      id: user.id,
      display_name: name.trim() || null,
      company: company.trim() || null,
      bio: bio.trim() || null,
      updated_at: new Date().toISOString(),
    });
    setMsg(error ? { bad: 'Could not save profile.' } : { ok: 'Profile saved.' });
    setBusy(false);
  }

  if (!ready || !user) return <div className="wrap"><p className="mute">Loading…</p></div>;
  const initial = (name || user.email || '?').trim()[0].toUpperCase();

  return (
    <div className="wrap">
      <h1>Profile</h1>
      <div className="card row" style={{ gap: 20 }}>
        <div className="avatar">{initial}</div>
        <div>
          <b style={{ fontSize: 18 }}>{name || 'Your name'}</b>
          <div className="mute">{user.email}</div>
          {company && <div className="mute">{company}</div>}
        </div>
      </div>

      <form className="card" onSubmit={save}>
        <label>Display name</label>
        <input maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
        <label>Company / project</label>
        <input maxLength={80} value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Optional" />
        <label>About you (max 300 characters)</label>
        <textarea maxLength={300} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Optional" />
        <label>Email (cannot be changed here)</label>
        <input value={user.email} disabled />
        <button disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</button>
        {msg?.ok && <p className="ok">{msg.ok}</p>}
        {msg?.bad && <p className="bad">{msg.bad}</p>}
      </form>
    </div>
  );
}
