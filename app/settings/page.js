'use client';
import { useState } from 'react';
import Link from 'next/link';
import { sb } from '@/lib/supabase-browser';
import { Icon } from '@/components/Icons';

export default function Settings() {
  const [cur, setCur] = useState('');
  const [nw, setNw] = useState('');
  const [conf, setConf] = useState('');
  const [pm, setPm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [sm, setSm] = useState('');

  async function changePw(e) {
    e.preventDefault();
    setPm(null);
    if (nw.length < 8) return setPm({ bad: 'New password must be at least 8 characters.' });
    if (nw !== conf) return setPm({ bad: 'Passwords do not match.' });
    if (nw === cur) return setPm({ bad: 'Choose a different password.' });
    setBusy(true);
    const { data } = await sb().auth.getUser();
    const check = await sb().auth.signInWithPassword({ email: data?.user?.email, password: cur });
    if (check.error) { setPm({ bad: 'Current password is incorrect.' }); setBusy(false); return; }
    const { error } = await sb().auth.updateUser({ password: nw });
    if (error) setPm({ bad: error.message });
    else { setPm({ ok: 'Password updated.' }); setCur(''); setNw(''); setConf(''); }
    setBusy(false);
  }

  async function signOutOthers() {
    const { error } = await sb().auth.signOut({ scope: 'others' });
    setSm(error ? error.message : 'Signed out everywhere else.');
  }

  return (
    <div className="wrap">
      <h1>Settings</h1>
      <div className="pills">
        <a href="#keys">API keys</a>
        <a href="#password">Password</a>
        <a href="#sessions">Sessions</a>
        <Link href="/profile">Profile</Link>
        <Link href="/account">Verification</Link>
      </div>

      <section id="keys" className="block">
        <h2>API keys</h2>
        <div className="grid" style={{ marginTop: 8 }}>
          <Link href="/gateway-keys" className="tile">
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              {['groq', 'openrouter', 'gemini', 'openai'].map((id) => <Icon key={id} id={id} size={30} />)}
            </div>
            <b>AI Gateway keys</b>
            <span>Call AI models</span>
          </Link>
          <Link href="/backend-keys" className="tile">
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              {['supabase', 'mongodb', 'firebase'].map((id) => <Icon key={id} id={id} size={30} />)}
            </div>
            <b>Backend keys</b>
            <span>Store your app data</span>
          </Link>
        </div>
      </section>

      <section id="password" className="block">
        <h2>Password</h2>
        <form className="card" onSubmit={changePw}>
          <label>Current password</label>
          <input type="password" required value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" />
          <label>New password</label>
          <input type="password" required minLength={8} value={nw} onChange={(e) => setNw(e.target.value)} autoComplete="new-password" placeholder="Min. 8 characters" />
          <label>Confirm new password</label>
          <input type="password" required minLength={8} value={conf} onChange={(e) => setConf(e.target.value)} autoComplete="new-password" />
          <button disabled={busy}>{busy ? 'Updating…' : 'Update password'}</button>
          {pm?.bad && <p className="bad">{pm.bad}</p>}
          {pm?.ok && <p className="ok">{pm.ok}</p>}
        </form>
      </section>

      <section id="sessions" className="block">
        <h2>Sessions</h2>
        <div className="card">
          <button className="ghost" onClick={signOutOthers}>Sign out other devices</button>
          {sm && <p className="ok" style={{ marginBottom: 0 }}>{sm}</p>}
        </div>
      </section>
    </div>
  );
}
