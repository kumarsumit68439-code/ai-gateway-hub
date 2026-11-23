import Link from 'next/link';
import ServerCheck from '@/components/ServerCheck';

export const metadata = { title: 'Server check | AI Gateway' };

export default function ServerCheckPage({ params }) {
  return (
    <div className="wrap">
      <p style={{ margin: 0 }}><Link href={'/servers/' + params.id}>Back to server</Link></p>
      <h1>Server check</h1>
      <ServerCheck id={params.id} />
    </div>
  );
}
