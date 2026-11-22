import Link from 'next/link';
import AIPlayground from '@/components/AIPlayground';

export const metadata = { title: 'AI Playground | AI Gateway' };

export default function AIPlaygroundPage() {
  return (
    <div className="wrap">
      <h1>AI Playground</h1>
      <p className="mute">Test your key with real models and real responses. <Link href="/gateway-keys">Get a key</Link></p>
      <AIPlayground />
    </div>
  );
}
