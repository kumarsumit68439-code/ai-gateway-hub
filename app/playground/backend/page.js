import Link from 'next/link';
import BackendPlayground from '@/components/BackendPlayground';

export const metadata = { title: 'Backend Playground | AI Gateway' };

export default function BackendPlaygroundPage() {
  return (
    <div className="wrap">
      <h1>Backend Playground</h1>
      <p className="mute">Read and write your real data with your backend key. <Link href="/backend-keys">Get a key</Link></p>
      <BackendPlayground />
    </div>
  );
}
