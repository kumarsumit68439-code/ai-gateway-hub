'use client';
import { useState } from 'react';
import Link from 'next/link';
import KeyManager from '@/components/KeyManager';
import { sb } from '@/lib/supabase-browser';

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
    if (nw !== conf) return setPm({ bad: 'New password and confirmation do not match.' });
    if (nw === cur) return setPm({ bad: 'New password must be different from the current one.' });
    setBusy(true);
    const { data } = await sb().auth.getUser();
    const email = data?.user?.email;
    const check = await sb().auth.signInWithPassword({ email, password: cur });
    if (check.error) { setPm({ bad: 'Current password is incorrect.' }); setBusy(false); return; }
    const { error } = await sb().auth.updateUser({ password: nw });
    if (error) setPm({ bad: error.message });
    else { setPm({ ok: 'Password changed successfully.' }); setCur(''); setNw(''); setConf(''); }
    setBusy(false);
  }

  async function signOutOthers() {
    const { error } = await sb().auth.signOut({ scope: 'others' });
    setSm(error ? error.message : 'Signed out from all other devices.');
  }

  return (
    <div className="wrap">
      <h1>Settings</h1>
      <div className="pills">
        <a href="#keys">Backend API keys</a>
        <a href="#password">Change password</a>
        <a href="#sessions">Sessions</a>
        <Link href="/profile">Profile</Link>
        <Link href="/account">Account check</Link>
      </div>

      <section id="keys" className="block">
        <h2>Backend API keys</h2>
        <p className="mute">Create keys for your own backend, regenerate them if they leak, and lock them to your server IPs. See the <Link href="/docs">API Docs</Link> for usage.</p>
        <KeyManager />
      </section>

      <section id="password" className="block">
        <h2>Change password</h2>
        <form className="card" onSubmit={changePw}>
          <label>Current password</label>
          <input type="password" required value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" />
          <label>New password (min 8 characters)</label>
          <input type="password" required minLength={8} value={nw} onChange={(e) => setNw(e.target.value)} autoComplete="new-password" />
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
          <p style={{ marginTop: 0 }}>Signed in on another device you do not trust? Sign out everywhere else. This device stays logged in.</p>
          <button className="ghost" onClick={signOutOthers}>Sign out other devices</button>
          {sm && <p className="ok">{sm}</p>}
        </div>
      </section>
    </div>
  );
}
