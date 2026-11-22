import Link from 'next/link';
import { headers } from 'next/headers';
import { Icon } from '@/components/Icons';
import { NAMES } from '@/lib/names';

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
    "messages": [{"role": "user", "content": "Hello"}]
  }'`;

  const py = `import os
from openai import OpenAI

client = OpenAI(base_url="${base}/api/v1", api_key=os.environ["GATEWAY_API_KEY"])
r = client.chat.completions.create(
    model="groq/llama-3.3-70b-versatile",
    messages=[{"role": "user", "content": "Hello"}],
)
print(r.choices[0].message.content)`;

  const js = `const res = await fetch("${base}/api/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: "Bearer " + process.env.GATEWAY_API_KEY,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "groq/llama-3.3-70b-versatile",
    messages: [{ role: "user", content: "Hello" }],
  }),
});
console.log((await res.json()).choices[0].message.content);`;

  const providers = [
    ['groq', 'groq/llama-3.3-70b-versatile'],
    ['openrouter', 'openrouter/meta-llama/llama-3.3-70b-instruct:free'],
    ['gemini', 'gemini/gemini-2.0-flash'],
    ['openai', 'openai/gpt-4o-mini'],
  ];

  return (
    <div className="wrap">
      <h1>API Docs</h1>
      <p className="mute">OpenAI-compatible. Works with any OpenAI SDK. Need storage? See the <Link href="/docs/backend">Backend docs</Link>.</p>

      <h2>Quick start</h2>
      <p>Create a key in <Link href="/gateway-keys">AI Gateway keys</Link>, then call:</p>
      <pre><code>{curl}</code></pre>

      <h2>Authentication</h2>
      <pre><code>Authorization: Bearer sk-gw-YOUR_KEY</code></pre>
      <p className="mute">Use your key on your server only.</p>

      <h2>Endpoints</h2>
      <div className="card">
        <table>
          <thead><tr><th>Method</th><th>Path</th><th>Description</th></tr></thead>
          <tbody>
            <tr><td>POST</td><td><code>/api/v1/chat/completions</code></td><td>Chat completion, supports <code>stream: true</code></td></tr>
            <tr><td>GET</td><td><code>/api/v1/models</code></td><td>List models</td></tr>
            <tr><td>GET</td><td><code>/api/v1/providers</code></td><td>List providers</td></tr>
          </tbody>
        </table>
      </div>

      <h2>Models</h2>
      <p className="mute">Use <code>provider/model</code>. Browse all on the <Link href="/models">Models</Link> page.</p>
      <div className="card">
        <table>
          <thead><tr><th>Provider</th><th>Example</th></tr></thead>
          <tbody>
            {providers.map(([id, ex]) => (
              <tr key={id}>
                <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Icon id={id} size={24} />{NAMES[id]}</span></td>
                <td><code>{ex}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Examples</h2>
      <b>Python</b><pre><code>{py}</code></pre>
      <b>Node.js</b><pre><code>{js}</code></pre>

      <h2>Errors</h2>
      <div className="card">
        <table>
          <thead><tr><th>Status</th><th>Meaning</th></tr></thead>
          <tbody>
            <tr><td>400</td><td>Invalid request</td></tr>
            <tr><td>401</td><td>Invalid or revoked key</td></tr>
            <tr><td>403</td><td>Not allowed for this key</td></tr>
            <tr><td>404</td><td>Model not found</td></tr>
            <tr><td>429</td><td>Rate limit reached</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
