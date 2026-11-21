import { getAllModels } from '@/lib/providers';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Live models | AI Gateway Hub' };

export default async function Models() {
  const groups = await getAllModels();
  return (
    <div className="wrap">
      <h1>Live models</h1>
      <p className="mute">
        Fetched live from each provider. Use the full id (for example <code>groq/llama-3.3-70b-versatile</code>) as the <code>model</code> value.
      </p>
      {groups.map((g) => (
        <div className="card" key={g.provider}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <b>{g.label} <span className="mute">({g.models.length})</span></b>
            <span className="mute">{g.tier}</span>
          </div>
          {!g.configured && <p className="bad">Not configured on this server yet.</p>}
          {g.error && <p className="bad">{g.error}</p>}
          {g.models.length > 0 && (
            <table>
              <thead><tr><th>Model id</th><th>Context</th></tr></thead>
              <tbody>
                {g.models.map((m) => (
                  <tr key={m.id}><td><code>{m.id}</code></td><td>{m.context ? m.context.toLocaleString() : '-'}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </div>
  );
}
