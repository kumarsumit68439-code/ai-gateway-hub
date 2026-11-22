import Link from 'next/link';
import KeyManager from '@/components/KeyManager';
import { ProviderStrip } from '@/components/Icons';

export const metadata = { title: 'AI Gateway keys | AI Gateway' };

export default function GatewayKeys() {
  return (
    <div className="wrap">
      <h1>AI Gateway API keys</h1>
      <p className="mute">
        Keys that start with <code>sk-gw-</code> let your server call Groq, OpenRouter, Gemini and OpenAI models through this gateway.
        See the <Link href="/docs">API Docs</Link>. To store your website&apos;s data, use <Link href="/backend-keys">Backend API keys</Link> instead.
      </p>
      <ProviderStrip ids={['groq', 'openrouter', 'gemini', 'openai']} />
      <KeyManager />
    </div>
  );
}
