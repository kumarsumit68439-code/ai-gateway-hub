import Link from 'next/link';
import BackendKeyManager from '@/components/BackendKeyManager';

export const metadata = { title: 'Backend keys | AI Gateway' };

export default function BackendKeys() {
  return (
    <div className="wrap">
      <h1>Backend API keys</h1>
      <p className="mute">
        Keys that start with <code>bk-live-</code> give your own server a private, key-protected data store (users, orders, anything JSON),
        saved in <b>Supabase</b>, <b>MongoDB</b> or <b>Firebase</b>. Your frontend never sees the key, so your website and its data stay safe.
        A Cloudflare captcha is asked only when you create a key.
        Read the <Link href="/docs/backend">Backend docs</Link>. For AI model calls use <Link href="/gateway-keys">AI Gateway keys</Link>.
      </p>
      <BackendKeyManager />
    </div>
  );
}
