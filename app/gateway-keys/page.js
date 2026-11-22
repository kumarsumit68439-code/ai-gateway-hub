import Link from 'next/link';
import KeyManager from '@/components/KeyManager';
import { ProviderStrip } from '@/components/Icons';

export const metadata = { title: 'AI Gateway keys | AI Gateway' };

export default function GatewayKeys() {
  return (
    <div className="wrap">
      <h1>AI Gateway keys</h1>
      <p className="mute">Call AI models from your server. <Link href="/docs">Docs</Link></p>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <ProviderStrip ids={['groq', 'openrouter', 'gemini', 'openai']} />
        <Link className="btn" href="/playground/ai">Open playground</Link>
      </div>
      <KeyManager />
    </div>
  );
}
