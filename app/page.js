import Link from 'next/link';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

export default function Home() {
  const host = headers().get('host') || 'YOUR-DOMAIN';
  return (
    <div className="wrap">
      <h1>One API key. Real AI models.</h1>
      <p className="mute">
        Sign up, create your own API key and call live models from <b>Groq, OpenRouter, Gemini and OpenAI</b> through a
        single OpenAI-compatible endpoint.
      </p>
      <div className="row">
        <Link className="btn" href="/login">Get your API key</Link>
        <Link className="btn ghost" href="/docs" style={{ border: '1px solid var(--line)', background: 'transparent', color: 'var(--text)' }}>Read the docs</Link>
        <Link href="/models">Browse live models</Link>
      </div>
      <div className="card">
        <b>Quick start</b>
        <pre><code>{`curl https://${host}/api/v1/chat/completions \\
  -H "Authorization: Bearer sk-gw-YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"groq/llama-3.3-70b-versatile","messages":[{"role":"user","content":"Hello!"}]}'`}</code></pre>
      </div>
    </div>
  );
}
