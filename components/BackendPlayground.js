'use client';
import { useState } from 'react';
import { sb } from '@/lib/supabase-browser';
import { Icon, NAMES } from '@/components/Icons';
import './playground.css';

const COL = /^[a-z0-9_-]{1,40}$/;
const PAGE = 10;

// Real playground: runs real requests against your live backend store with your own key.
export default function BackendPlayground() {
  const [key, setKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [overview, setOverview] = useState(null);
  const [col, setCol] = useState('');
  const [newCol, setNewCol] = useState('');
  const [docs, setDocs] = useState([]);
  const [offset, setOffset] = useState(0);
  const [doc, setDoc] = useState('{\n  "name": "Aman"\n}');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [method, setMethod] = useState('GET');
  const [path, setPath] = useState('');
  const [body, setBody] = useState('');
  const [resp, setResp] = useState(null);

  async function call(m, p, b) {
    const session = (await sb().auth.getSession()).data.session;
    const r = await fetch('/api/playground/backend', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + session.access_token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: key.trim(), method: m, path: p, body: b }),
    });
    const j = await r.json();
    if (j.error) return { status: r.status, ms: 0, data: j };
    return j;
  }

  const msgOf = (r) => r.data?.error?.message || (typeof r.data?.error === 'string' ? r.data.error : 'Request failed.');

  async function connect() {
    setErr(''); setBusy(true); setOverview(null); setCol(''); setDocs([]);
    const r = await call('GET', '');
    if (r.status === 200) setOverview(r.data); else setErr(msgOf(r));
    setBusy(false);
  }

  async function refresh(c = col, o = offset) {
    if (!c) return;
    setBusy(true); setErr('');
    const r = await call('GET', `/${c}?limit=${PAGE}&offset=${o}`);
    if (r.status === 200) setDocs(r.data.data || []); else setErr(msgOf(r));
    const ov = await call('GET', '');
    if (ov.status === 200) setOverview(ov.data);
    setBusy(false);
  }

  function pick(c) { setCol(c); setOffset(0); setDocs([]); refresh(c, 0); }

  function startNew() {
    const c = newCol.trim();
    if (!COL.test(c)) { setErr('Collection name: a-z, 0-9, _ and -, up to 40 characters.'); return; }
    setNewCol(''); setCol(c); setOffset(0); setDocs([]); setErr('');
  }

  async function create() {
    let parsed;
    try { parsed = JSON.parse(doc); } catch { setErr('Document must be valid JSON.'); return; }
    if (!col) { setErr('Choose or create a collection first.'); return; }
    setBusy(true); setErr('');
    const r = await call('POST', `/${col}`, parsed);
    if (r.status === 201) { await refresh(col, 0); setOffset(0); } else { setErr(msgOf(r)); setBusy(false); }
  }

  async function remove(id) {
    if (!confirm('Delete this document?')) return;
    setBusy(true);
    const r = await call('DELETE', `/${col}/${id}`);
    if (r.status !== 200) setErr(msgOf(r));
    await refresh(col, offset);
  }

  function page(d) {
    const o = Math.max(0, offset + d * PAGE);
    setOffset(o);
    refresh(col, o);
  }

  async function sendRaw() {
    let parsed;
    if (body.trim()) { try { parsed = JSON.parse(body); } catch { setResp({ status: 0, ms: 0, data: { error: { message: 'Body must be valid JSON.' } } }); return; } }
    setBusy(true);
    setResp(await call(method, path.trim(), parsed));
    setBusy(false);
  }

  const cols = overview?.collections || [];

  return (
    <div>
      <div className="card">
        <label>Backend key</label>
        <div className="pw">
          <input type={showKey ? 'text' : 'password'} value={key} onChange={(e) => setKey(e.target.value)} placeholder="bk-live-..." autoComplete="off" spellCheck={false} />
          <button type="button" className="ghost small" onClick={() => setShowKey(!showKey)}>{showKey ? 'Hide' : 'Show'}</button>
          <button type="button" onClick={connect} disabled={busy || !key.trim()} style={{ marginTop: 6 }}>{busy && !overview ? 'Connecting\u2026' : 'Connect'}</button>
        </div>
        {overview && (
          <div className="row" style={{ marginTop: 4 }}>
            <Icon id={overview.engine} size={28} />
            <b>{NAMES[overview.engine] || overview.engine}</b>
            <span className="pill ok">connected</span>
            <span className="pill">{cols.reduce((s, c) => s + c.count, 0)} documents</span>
          </div>
        )}
        {err && <p className="bad" style={{ marginBottom: 0 }}>{err}</p>}
      </div>

      {overview && (
        <>
          <h2>Data</h2>
          <div className="card">
            <div className="chips2">
              {cols.map((c) => (
                <button key={c.name} className={'tab' + (col === c.name ? ' on' : '')} onClick={() => pick(c.name)}>{c.name} <span>{c.count}</span></button>
              ))}
              {col && !cols.some((c) => c.name === col) && <button className="tab on">{col} <span>new</span></button>}
            </div>
            <div className="pw" style={{ maxWidth: 420 }}>
              <input value={newCol} onChange={(e) => setNewCol(e.target.value)} placeholder="New collection name" onKeyDown={(e) => { if (e.key === 'Enter') startNew(); }} />
              <button type="button" className="ghost small" onClick={startNew}>Add</button>
            </div>

            {col && (
              <>
                {docs.length === 0 ? <p className="mute">{busy ? 'Loading\u2026' : 'No documents in this collection yet.'}</p> : (
                  <table>
                    <thead><tr><th>ID</th><th>Data</th><th>Created</th><th></th></tr></thead>
                    <tbody>
                      {docs.map((d) => (
                        <tr key={d.id}>
                          <td><code>{d.id.slice(0, 8)}</code></td>
                          <td className="mono">{JSON.stringify(d.data).slice(0, 140)}</td>
                          <td>{new Date(d.created_at).toLocaleString()}</td>
                          <td style={{ textAlign: 'right' }}><button className="danger small" onClick={() => remove(d.id)}>Delete</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <div className="row" style={{ marginTop: 10 }}>
                  <button className="ghost small" disabled={offset === 0 || busy} onClick={() => page(-1)}>Previous</button>
                  <button className="ghost small" disabled={docs.length < PAGE || busy} onClick={() => page(1)}>Next</button>
                  <button className="ghost small" disabled={busy} onClick={() => refresh()}>Refresh</button>
                </div>

                <h2 style={{ fontSize: 16 }}>Add document to <code>{col}</code></h2>
                <textarea className="mono" value={doc} onChange={(e) => setDoc(e.target.value)} style={{ minHeight: 110 }} />
                <button onClick={create} disabled={busy}>Create document</button>
              </>
            )}
          </div>

          <h2>Request</h2>
          <div className="card">
            <div className="pw">
              <select className="sel" style={{ width: 120, margin: '6px 0 0' }} value={method} onChange={(e) => setMethod(e.target.value)}>
                {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => <option key={m}>{m}</option>)}
              </select>
              <input value={path} onChange={(e) => setPath(e.target.value)} placeholder="/users or /users/DOC_ID (empty = overview)" style={{ margin: '6px 0 0' }} />
              <button onClick={sendRaw} disabled={busy} style={{ marginTop: 6 }}>Send</button>
            </div>
            {method !== 'GET' && method !== 'DELETE' && (
              <textarea className="mono" value={body} onChange={(e) => setBody(e.target.value)} placeholder='{"field": "value"}' style={{ marginTop: 12, minHeight: 90 }} />
            )}
            {resp && (
              <>
                <div className="statbar">
                  <span className={'pill ' + (resp.status && resp.status < 400 ? 'ok' : 'bad')}>{resp.status || 'error'}</span>
                  <span className="pill">{resp.ms} ms</span>
                </div>
                <pre className="json"><code>{typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data, null, 2)}</code></pre>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
