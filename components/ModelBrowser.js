'use client';
import { useMemo, useState } from 'react';
import { Icon, ModelIcon, NAMES } from '@/components/Icons';

export default function ModelBrowser({ groups }) {
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [copied, setCopied] = useState('');
  const total = groups.reduce((s, g) => s + g.models.length, 0);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return groups
      .flatMap((g) => g.models.map((m) => ({ ...m, provider: g.provider })))
      .filter((m) => (tab === 'all' || m.provider === tab) && m.id.toLowerCase().includes(needle));
  }, [groups, tab, q]);

  function copy(id) {
    navigator.clipboard.writeText(id);
    setCopied(id);
    setTimeout(() => setCopied(''), 1500);
  }

  return (
    <>
      <div className="tabs">
        <button className={'tab' + (tab === 'all' ? ' on' : '')} onClick={() => setTab('all')}>All <span>{total}</span></button>
        {groups.map((g) => (
          <button key={g.provider} className={'tab' + (tab === g.provider ? ' on' : '')} onClick={() => setTab(g.provider)}>
            <Icon id={g.provider} size={20} />{NAMES[g.provider]} <span>{g.models.length}</span>
          </button>
        ))}
      </div>
      <input className="search" placeholder="Search models" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="card">
        {rows.length === 0 ? <span className="mute">No models found.</span> : (
          <table>
            <thead><tr><th>Model</th><th>Context</th><th></th></tr></thead>
            <tbody>
              {rows.slice(0, 300).map((m) => (
                <tr key={m.id}>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                      <Icon id={m.provider} size={20} /><ModelIcon model={m.id} size={24} /><code>{m.id}</code>
                    </span>
                  </td>
                  <td>{m.context ? m.context.toLocaleString() : '-'}</td>
                  <td style={{ textAlign: 'right' }}><button className="ghost small" onClick={() => copy(m.id)}>{copied === m.id ? 'Copied' : 'Copy'}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
