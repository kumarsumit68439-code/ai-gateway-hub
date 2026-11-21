import Link from 'next/link';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'API Docs | AI Gateway Hub' };

export default function Docs() {
  const host = headers().get('host') || 'YOUR-DOMAIN';
  const base = 'https://' + host;

  const curl = `curl ${base}/api/v1/chat/completions \\
  -H "Authorization: Bearer sk-gw-YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "groq/llama-3.3-70b-versatile",
    "messages": [{"role": "user", "content": "Say hello in one line"}]
  }'`;

  const py = `from openai import OpenAI

client = OpenAI(base_url="${base}/api/v1", api_key="sk-gw-YOUR_KEY")
r = client.chat.completions.create(
    model="openrouter/meta-llama/llama-3.3-70b-instruct:free",
    messages=[{"role": "user", "content": "Hello"}],
)
print(r.choices[0].message.content)`;

  const js = `const res = await fetch("${base}/api/v1/chat/completions", {
  method: "POST",
  headers: { Authorization: "Bearer sk-gw-YOUR_KEY", "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "gemini/gemini-2.0-flash",
    messages: [{ role: "user", content: "Hello" }],
  }),
});
console.log((await res.json()).choices[0].message.content);`;

  return (
    <div className="wrap">
      <h1>API Docs</h1>
      <p className="mute">An OpenAI-compatible API. Any OpenAI SDK works by changing the base URL and key.</p>

      <h2>1. Get a key</h2>
      <p>Create an account, then open <Link href="/dashboard">API Keys</Link> and press <b>Create key</b>. The key looks like <code>sk-gw-...</code> and is shown only once.</p>

      <h2>2. Authentication</h2>
      <pre><code>Authorization: Bearer sk-gw-YOUR_KEY</code></pre>

      <h2>3. Endpoints</h2>
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

      <h2>4. Model names</h2>
      <p>Use <code>provider/model</code>. Examples:</p>
      <pre><code>{`groq/llama-3.3-70b-versatile
openrouter/meta-llama/llama-3.3-70b-instruct:free
gemini/gemini-2.0-flash
openai/gpt-4o-mini`}</code></pre>
      <p className="mute">Groq, OpenRouter and Gemini accept only models in the live free list. OpenRouter is limited to models with $0 pricing. The full list is on the <Link href="/models">Models</Link> page.</p>

      <h2>5. Examples</h2>
      <b>curl</b><pre><code>{curl}</code></pre>
      <b>Python</b><pre><code>{py}</code></pre>
      <b>JavaScript</b><pre><code>{js}</code></pre>

      <h2>6. Limits and errors</h2>
      <div className="card">
        <table>
          <thead><tr><th>Status</th><th>Meaning</th></tr></thead>
          <tbody>
            <tr><td>400</td><td>Bad request (missing model/messages, wrong model format)</td></tr>
            <tr><td>401</td><td>Missing, invalid or revoked key</td></tr>
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
