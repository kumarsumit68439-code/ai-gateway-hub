'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { sb } from '@/lib/supabase-browser';
import { Icon } from '@/components/Icons';

export default function Dashboard() {
  const [name, setName] = useState('');
  const [keys, setKeys] = useState([]);
  const [logs, setLogs] = useState([]);
  const [day, setDay] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const u = (await sb().auth.getUser()).data?.user;
      const p = await sb().from('profiles').select('display_name').maybeSingle();
      setName(p.data?.display_name || (u?.email || '').split('@')[0]);
      const k = await sb().from('api_keys').select('id,request_count').is('revoked_at', null);
      setKeys(k.data || []);
      const l = await sb().from('usage_logs').select('id,provider,model,status,latency_ms,created_at').order('created_at', { ascending: false }).limit(15);
      setLogs(l.data || []);
      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const c = await sb().from('usage_logs').select('id', { count: 'exact', head: true }).gte('created_at', since);
      setDay(c.count || 0);
      setReady(true);
    })();
  }, []);

  const total = keys.reduce((s, k) => s + Number(k.request_count || 0), 0);

  return (
    <div className="wrap">
      <h1>Welcome{name ? ', ' + name : ''}</h1>
      <p className="mute">Here is what is happening with your gateway.</p>

      <div className="stats">
        <div className="stat"><small>Active API keys</small><strong>{ready ? keys.length : '…'}</strong></div>
        <div className="stat"><small>Requests (24 hours)</small><strong>{ready ? day : '…'}</strong></div>
        <div className="stat"><small>Requests (all time)</small><strong>{ready ? total : '…'}</strong></div>
      </div>

      <div className="card row" style={{ justifyContent: 'space-between' }}>
        <div>
          <b>API keys</b>
          <div className="mute">AI Gateway keys and Backend keys are managed in Settings.</div>
        </div>
        <Link className="btn" href="/settings#keys">Manage API keys</Link>
      </div>

      <h2>Recent requests</h2>
      <div className="card">
        {logs.length === 0 ? <span className="mute">No requests yet. See the <Link href="/docs">API Docs</Link> to make your first call.</span> : (
          <table>
            <thead><tr><th>Time</th><th>Provider</th><th>Model</th><th>Status</th><th>ms</th></tr></thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td>{new Date(l.created_at).toLocaleString()}</td>
                  <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Icon id={l.provider} size={20} />{l.provider}</span></td>
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
