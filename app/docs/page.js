import Link from 'next/link';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'API Docs | AI Gateway' };

export default function Docs() {
  const host = headers().get('host') || 'YOUR-DOMAIN';
  const base = 'https://' + host;

  const curl = `curl ${base}/api/v1/chat/completions \\
  -H "Authorization: Bearer $GATEWAY_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "groq/llama-3.3-70b-versatile",
    "messages": [{"role": "user", "content": "Say hello in one line"}]
  }'`;

  const py = `import os
from openai import OpenAI

client = OpenAI(base_url="${base}/api/v1", api_key=os.environ["GATEWAY_API_KEY"])
r = client.chat.completions.create(
    model="openrouter/meta-llama/llama-3.3-70b-instruct:free",
    messages=[{"role": "user", "content": "Hello"}],
)
print(r.choices[0].message.content)`;

  const js = `// Node.js server code (Express, Next.js route, etc.)
const res = await fetch("${base}/api/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: "Bearer " + process.env.GATEWAY_API_KEY,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "gemini/gemini-2.0-flash",
    messages: [{ role: "user", content: "Hello" }],
  }),
});
console.log((await res.json()).choices[0].message.content);`;

  const proxy = `// Your own backend endpoint. Your website's frontend calls THIS,
// and the gateway key stays hidden on your server.
// app/api/ask/route.js (Next.js example)
export async function POST(req) {
  const { question } = await req.json();
  const r = await fetch("${base}/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + process.env.GATEWAY_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "groq/llama-3.3-70b-versatile",
      messages: [{ role: "user", content: String(question).slice(0, 2000) }],
    }),
  });
  const j = await r.json();
  return Response.json({ answer: j.choices?.[0]?.message?.content ?? null });
}`;

  return (
    <div className="wrap">
      <h1>AI API Docs</h1>
      <p className="mute">An OpenAI-compatible API. Any OpenAI SDK works by changing the base URL and key. To store your website&apos;s data instead, see the <Link href="/docs/backend">Backend docs</Link>.</p>

      <h2>1. Get a key</h2>
      <p>Verify your email on the <Link href="/account">Account page</Link>, then open <Link href="/gateway-keys">AI Gateway API keys</Link> and press <b>Create key</b>. The key looks like <code>sk-gw-...</code> and is shown only once. If it is ever lost or leaked, press <b>Regenerate</b>: the old key stops working immediately and a new one is shown.</p>

      <h2>2. Authentication</h2>
      <pre><code>Authorization: Bearer sk-gw-YOUR_KEY</code></pre>

      <h2>3. Keep your website safe (backend use)</h2>
      <div className="card">
        <p style={{ marginTop: 0 }}>Gateway keys are <b>server-side secrets</b>. Follow these rules:</p>
        <ol>
          <li>Store the key in an environment variable on your server, for example <code>GATEWAY_API_KEY</code>. Never put it in frontend code, a public repo or a mobile app.</li>
          <li>Your frontend calls <b>your own backend endpoint</b>; your backend calls this API (example below).</li>
          <li>Browser requests are <b>blocked by default</b>. If a key is ever used from a browser, the request is rejected.</li>
          <li>Optional: lock a key to your server&apos;s IP addresses in <b>Security</b> on the AI Gateway keys page.</li>
          <li>Use one key per project, so you can regenerate one without breaking the others.</li>
          <li>Rotate keys regularly and immediately if you suspect a leak.</li>
        </ol>
        <p className="mute" style={{ marginBottom: 0 }}>This gateway stores only request metadata (provider, model, status, time, token counts). Your prompts and the AI responses are not saved.</p>
      </div>
      <b>Backend proxy example</b><pre><code>{proxy}</code></pre>

      <h2>4. Endpoints</h2>
      <div className="card">
        <table>
          <thead><tr><th>Method</th><th>Path</th><th>Auth</th><th>What it does</th></tr></thead>
          <tbody>
            <tr><td>POST</td><td><code>/api/v1/chat/completions</code></td><td>Key</td><td>Chat completion (supports <code>stream: true</code>)</td></tr>
            <tr><td>GET</td><td><code>/api/v1/models</code></td><td>None</td><td>Live model list. Optional <code>?provider=groq|openrouter|gemini|openai</code></td></tr>
            <tr><td>GET</td><td><code>/api/v1/providers</code></td><td>None</td><td>Providers and how many models each has</td></tr>
          </tbody>
        </table>
      </div>

      <h2>5. Model names</h2>
      <p>Use <code>provider/model</code>. Examples:</p>
      <pre><code>{`groq/llama-3.3-70b-versatile
openrouter/meta-llama/llama-3.3-70b-instruct:free
gemini/gemini-2.0-flash
openai/gpt-4o-mini`}</code></pre>
      <p className="mute">Groq, OpenRouter and Gemini accept only models in the live free list. OpenRouter is limited to models with $0 pricing. The full list is on the <Link href="/models">Models</Link> page.</p>

      <h2>6. Examples (server side)</h2>
      <b>curl</b><pre><code>{curl}</code></pre>
      <b>Python</b><pre><code>{py}</code></pre>
      <b>Node.js</b><pre><code>{js}</code></pre>

      <h2>7. Limits and errors</h2>
      <div className="card">
        <table>
          <thead><tr><th>Status</th><th>Meaning</th></tr></thead>
          <tbody>
            <tr><td>400</td><td>Bad request (missing model/messages, wrong model format)</td></tr>
            <tr><td>401</td><td>Missing, invalid, revoked or regenerated (old) key</td></tr>
            <tr><td>403</td><td>Request came from a browser origin or an IP that this key does not allow</td></tr>
            <tr><td>404</td><td>Model not in the live free list</td></tr>
            <tr><td>429</td><td>30 requests/minute or 1000 requests/day per key exceeded</td></tr>
            <tr><td>502/503</td><td>Provider unreachable or not configured on the server</td></tr>
          </tbody>
        </table>
        <p className="mute">Max output is capped at 4096 tokens per request. Provider-side rate limits also apply.</p>
      </div>
    </div>
  );
}
