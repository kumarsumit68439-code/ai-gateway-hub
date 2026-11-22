import Link from 'next/link';
import BackendKeyManager from '@/components/BackendKeyManager';
import { ProviderStrip } from '@/components/Icons';

export const metadata = { title: 'Backend keys | AI Gateway' };

export default function BackendKeys() {
  return (
    <div className="wrap">
      <h1>Backend keys</h1>
      <p className="mute">Store your app data privately. <Link href="/docs/backend">Docs</Link></p>
      <ProviderStrip ids={['supabase', 'mongodb', 'firebase']} />
      <BackendKeyManager />
    </div>
  );
}
