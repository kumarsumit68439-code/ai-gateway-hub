import Link from 'next/link';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Backend docs | AI Gateway' };

export default function BackendDocs() {
  const host = headers().get('host') || 'YOUR-DOMAIN';
  const base = `https://${host}/api/backend/v1`;

  const create = `curl -X POST ${base}/users \\
  -H "Authorization: Bearer $BACKEND_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Aman","plan":"pro"}'

# 201 Created
{"id":"3f1c...","data":{"name":"Aman","plan":"pro"},"created_at":"...","updated_at":"..."}`;

  const read = `# list (newest first, ?limit=1..100&offset=0)
curl "${base}/users?limit=20" -H "Authorization: Bearer $BACKEND_API_KEY"

# one document
curl ${base}/users/DOC_ID -H "Authorization: Bearer $BACKEND_API_KEY"

# update only some fields (merge)
curl -X PATCH ${base}/users/DOC_ID \\
  -H "Authorization: Bearer $BACKEND_API_KEY" -H "Content-Type: application/json" \\
  -d '{"plan":"free"}'

# replace the whole document
curl -X PUT ${base}/users/DOC_ID \\
  -H "Authorization: Bearer $BACKEND_API_KEY" -H "Content-Type: application/json" \\
  -d '{"name":"Aman","plan":"team"}'

# delete
curl -X DELETE ${base}/users/DOC_ID -H "Authorization: Bearer $BACKEND_API_KEY"`;

  const node = `// Your server only (Express, Next.js route, etc.). Never in browser code.
const API = "${base}";
const headers = {
  Authorization: "Bearer " + process.env.BACKEND_API_KEY,
  "Content-Type": "application/json",
};

export async function saveOrder(order) {
  const r = await fetch(API + "/orders", { method: "POST", headers, body: JSON.stringify(order) });
  if (!r.ok) throw new Error((await r.json()).error.message);
  return r.json(); // { id, data, created_at, updated_at }
}

export async function listOrders() {
  const r = await fetch(API + "/orders?limit=50", { headers });
  return (await r.json()).data;
}`;

  return (
    <div className="wrap">
      <h1>Backend docs</h1>
      <p className="mute">
        A private JSON data store for your own website&apos;s backend. Data lives in the storage engine you picked when you created the key:
        <b> Supabase (Postgres)</b> or <b>MongoDB</b>. The endpoints are identical for both.
      </p>

      <h2>1. Get a backend key</h2>
      <p>Verify your email on the <Link href="/account">Account page</Link>, then open <Link href="/backend-keys">Backend API keys</Link>, choose a name and an engine, and press <b>Create backend key</b>. The key starts with <code>bk-live-</code> and is shown once. If it leaks, press <b>Regenerate</b>: the old key dies instantly and your data is kept.</p>

      <h2>2. Authentication</h2>
      <pre><code>Authorization: Bearer bk-live-YOUR_KEY</code></pre>

      <h2>3. Endpoints</h2>
      <div className="card">
        <table>
          <thead><tr><th>Method</th><th>Path</th><th>What it does</th></tr></thead>
          <tbody>
            <tr><td>GET</td><td><code>/api/backend/v1</code></td><td>Ping: engine, collections with counts, limits</td></tr>
            <tr><td>GET</td><td><code>/api/backend/v1/:collection</code></td><td>List documents (<code>limit</code>, <code>offset</code>)</td></tr>
            <tr><td>POST</td><td><code>/api/backend/v1/:collection</code></td><td>Create a document (the JSON body is the document)</td></tr>
            <tr><td>GET</td><td><code>/api/backend/v1/:collection/:id</code></td><td>Read one document</td></tr>
            <tr><td>PATCH</td><td><code>/api/backend/v1/:collection/:id</code></td><td>Update given fields (merge)</td></tr>
            <tr><td>PUT</td><td><code>/api/backend/v1/:collection/:id</code></td><td>Replace the whole document</td></tr>
            <tr><td>DELETE</td><td><code>/api/backend/v1/:collection/:id</code></td><td>Delete a document</td></tr>
          </tbody>
        </table>
        <p className="mute" style={{ marginBottom: 0 }}>A collection is just a name you choose (<code>users</code>, <code>orders</code>...). It is created automatically on first write. Names use <code>a-z 0-9 _ -</code>, up to 40 characters.</p>
      </div>

      <h2>4. Examples</h2>
      <b>Create</b><pre><code>{create}</code></pre>
      <b>Read, update, delete</b><pre><code>{read}</code></pre>
      <b>Node.js (server)</b><pre><code>{node}</code></pre>

      <h2>5. Keep it safe</h2>
      <div className="card">
        <ol style={{ marginTop: 0 }}>
          <li>Backend keys are <b>server-only</b>. Requests that come from a browser are rejected with 403.</li>
          <li>Keep the key in an environment variable. Your frontend calls <b>your own</b> server, and your server calls this API.</li>
          <li>Every key is a separate private store. One key can never read another key&apos;s data.</li>
          <li>Optional: lock the key to your server&apos;s IP addresses in <b>Security</b> on the Backend keys page.</li>
          <li>Stored data cannot be read from the browser or with the public Supabase key; only your key reaches it through the server.</li>
          <li><b>Delete</b> on the Backend keys page removes the key and permanently erases its data.</li>
        </ol>
      </div>

      <h2>6. Limits and errors</h2>
      <div className="card">
        <table>
          <thead><tr><th>Status</th><th>Meaning</th></tr></thead>
          <tbody>
            <tr><td>400</td><td>Bad JSON, bad collection name, bad id, or field names with <code>.</code> or starting with <code>$</code></td></tr>
            <tr><td>401</td><td>Missing, invalid, revoked or regenerated (old) key</td></tr>
            <tr><td>403</td><td>Browser request, IP not allowed, or storage limit reached</td></tr>
            <tr><td>404</td><td>Document not found</td></tr>
            <tr><td>413</td><td>Document larger than 64 KB</td></tr>
            <tr><td>429</td><td>60 requests/minute or 5000 requests/day per key</td></tr>
            <tr><td>502</td><td>Storage engine unreachable. Retry.</td></tr>
          </tbody>
        </table>
        <p className="mute" style={{ marginBottom: 0 }}>Limits: 64 KB per document, 10,000 documents per key, 100 documents per page, nesting up to 6 levels.</p>
      </div>
    </div>
  );
}
