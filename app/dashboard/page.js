'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { sb } from '@/lib/supabase-browser';

export default function Dashboard() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [keys, setKeys] = useState([]);
  const [logs, setLogs] = useState([]);
  const [name, setName] = useState('');
  const [fresh, setFresh] = useState(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const k = await sb().from('api_keys').select('id,name,key_prefix,request_count,last_used_at,created_at').is('revoked_at', null).order('created_at', { ascending: false });
    setKeys(k.data || []);
    const l = await sb().from('usage_logs').select('id,provider,model,status,latency_ms,created_at').order('created_at', { ascending: false }).limit(15);
    setLogs(l.data || []);
  }, []);

  useEffect(() => {
    sb().auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace('/login'); return; }
      setSession(data.session);
      load();
    });
  }, [router, load]);

  const authHeader = () => ({ Authorization: 'Bearer ' + session.access_token, 'Content-Type': 'application/json' });

  async function create(e) {
    e.preventDefault();
    setBusy(true); setMsg(''); setFresh(null); setCopied(false);
    const r = await fetch('/api/keys', { method: 'POST', headers: authHeader(), body: JSON.stringify({ name }) });
    const j = await r.json();
    if (!r.ok) setMsg(j.error || 'Failed');
    else { setFresh(j.key); setName(''); load(); }
    setBusy(false);
  }

  async function revoke(id) {
    if (!confirm('Revoke this key? Apps using it will stop working.')) return;
    await fetch('/api/keys/' + id, { method: 'DELETE', headers: authHeader() });
    load();
  }

  async function logout() {
    await sb().auth.signOut();
    router.replace('/login');
  }

  if (!session) return <div className="wrap"><p className="mute">Loading…</p></div>;

  return (
    <div className="wrap">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1>API Keys</h1>
        <div className="row"><span className="mute">{session.user.email}</span><button className="ghost" onClick={logout}>Log out</button></div>
      </div>

      <form className="card" onSubmit={create}>
        <b>Create a new API key</b>
        <input required maxLength={60} placeholder="Key name, e.g. my-app" value={name} onChange={(e) => setName(e.target.value)} />
        <button disabled={busy}>Create key</button>
        {msg && <p className="bad">{msg}</p>}
      </form>

      {fresh && (
        <div className="card" style={{ borderColor: 'var(--ok)' }}>
          <b className="ok">Copy your key now. It will not be shown again.</b>
          <pre><code>{fresh}</code></pre>
          <button onClick={() => { navigator.clipboard.writeText(fresh); setCopied(true); }}>{copied ? 'Copied' : 'Copy key'}</button>
        </div>
      )}

      <h2>Your keys</h2>
      <div className="card">
        {keys.length === 0 ? <span className="mute">No active keys yet.</span> : (
          <table>
            <thead><tr><th>Name</th><th>Key</th><th>Requests</th><th>Last used</th><th></th></tr></thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id}>
                  <td>{k.name}</td>
                  <td><code>{k.key_prefix}</code></td>
                  <td>{k.request_count}</td>
                  <td>{k.last_used_at ? new Date(k.last_used_at).toLocaleString() : '-'}</td>
                  <td><button className="danger" onClick={() => revoke(k.id)}>Revoke</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <h2>Recent requests</h2>
      <div className="card">
        {logs.length === 0 ? <span className="mute">No requests yet. See the API Docs page to make your first call.</span> : (
          <table>
            <thead><tr><th>Time</th><th>Provider</th><th>Model</th><th>Status</th><th>ms</th></tr></thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td>{new Date(l.created_at).toLocaleString()}</td>
                  <td>{l.provider}</td>
                  <td>{l.model}</td>
                  <td className={l.status < 400 ? 'ok' : 'bad'}>{l.status}</td>
                  <td>{l.latency_ms}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
