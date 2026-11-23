import Link from 'next/link';
import BotEditor from '@/components/BotEditor';

export const metadata = { title: 'Bot | AI Gateway' };

export default function BotPage({ params }) {
  return (
    <div className="wrap">
      <p style={{ margin: 0 }}><Link href="/bots">Back to bots</Link></p>
      <BotEditor id={params.id} />
    </div>
  );
}
