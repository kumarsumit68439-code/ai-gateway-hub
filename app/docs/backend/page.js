import Link from 'next/link';
import { headers } from 'next/headers';
import { ProviderStrip } from '@/components/Icons';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Backend docs | AI Gateway' };

export default function BackendDocs() {
  const host = headers().get('host') || 'YOUR-DOMAIN';
  const base = `https://${host}/api/backend/v1`;

  const create = `curl -X POST ${base}/users \\
  -H "Authorization: Bearer $BACKEND_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Aman","plan":"pro"}'

# 201
{"id":"...","data":{"name":"Aman","plan":"pro"},"created_at":"...","updated_at":"..."}`;

  const read = `# list
curl "${base}/users?limit=20" -H "Authorization: Bearer $BACKEND_API_KEY"

# get one
curl ${base}/users/DOC_ID -H "Authorization: Bearer $BACKEND_API_KEY"

# update fields
curl -X PATCH ${base}/users/DOC_ID \\
  -H "Authorization: Bearer $BACKEND_API_KEY" -H "Content-Type: application/json" \\
  -d '{"plan":"free"}'

# delete
curl -X DELETE ${base}/users/DOC_ID -H "Authorization: Bearer $BACKEND_API_KEY"`;

  const node = `const API = "${base}";
const headers = {
  Authorization: "Bearer " + process.env.BACKEND_API_KEY,
  "Content-Type": "application/json",
};

export async function saveOrder(order) {
  const r = await fetch(API + "/orders", { method: "POST", headers, body: JSON.stringify(order) });
  return r.json();
}

export async function listOrders() {
  const r = await fetch(API + "/orders?limit=50", { headers });
  return (await r.json()).data;
}`;

  return (
    <div className="wrap">
      <h1>Backend docs</h1>
      <p className="mute">A private JSON store for your app. Same endpoints on every engine.</p>
      <ProviderStrip ids={['supabase', 'mongodb', 'firebase']} />

      <h2>Quick start</h2>
      <p>Create a key in <Link href="/backend-keys">Backend keys</Link>, then:</p>
      <pre><code>{create}</code></pre>

      <h2>Authentication</h2>
      <pre><code>Authorization: Bearer bk-live-YOUR_KEY</code></pre>
      <p className="mute">Server-side only. Browser requests are rejected.</p>

      <h2>Endpoints</h2>
      <div className="card">
        <table>
          <thead><tr><th>Method</th><th>Path</th><th>Description</th></tr></thead>
          <tbody>
            <tr><td>GET</td><td><code>/api/backend/v1</code></td><td>Overview</td></tr>
            <tr><td>GET</td><td><code>/api/backend/v1/:collection</code></td><td>List documents</td></tr>
            <tr><td>POST</td><td><code>/api/backend/v1/:collection</code></td><td>Create a document</td></tr>
            <tr><td>GET</td><td><code>/api/backend/v1/:collection/:id</code></td><td>Get a document</td></tr>
            <tr><td>PATCH</td><td><code>/api/backend/v1/:collection/:id</code></td><td>Update fields</td></tr>
            <tr><td>PUT</td><td><code>/api/backend/v1/:collection/:id</code></td><td>Replace a document</td></tr>
            <tr><td>DELETE</td><td><code>/api/backend/v1/:collection/:id</code></td><td>Delete a document</td></tr>
          </tbody>
        </table>
        <p className="mute" style={{ marginBottom: 0 }}>Collection names: a-z, 0-9, _ and -, up to 40 characters.</p>
      </div>

      <h2>Examples</h2>
      <b>curl</b><pre><code>{read}</code></pre>
      <b>Node.js</b><pre><code>{node}</code></pre>

      <h2>Errors</h2>
      <div className="card">
        <table>
          <thead><tr><th>Status</th><th>Meaning</th></tr></thead>
          <tbody>
            <tr><td>400</td><td>Invalid request</td></tr>
            <tr><td>401</td><td>Invalid or revoked key</td></tr>
            <tr><td>403</td><td>Not allowed for this key</td></tr>
            <tr><td>404</td><td>Not found</td></tr>
            <tr><td>413</td><td>Document too large (64 KB max)</td></tr>
            <tr><td>429</td><td>Rate limit reached</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
