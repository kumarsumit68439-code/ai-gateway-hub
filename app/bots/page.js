import Link from 'next/link';
import BotsManager from '@/components/BotsManager';

export const metadata = { title: 'Bots | AI Gateway' };

export default function Bots() {
  return (
    <div className="wrap">
      <h1>Bots</h1>
      <p className="mute">Create a bot, copy its token and host it anywhere. <Link href="/docs/bots">Hosting guide</Link></p>
      <BotsManager />
    </div>
  );
}
