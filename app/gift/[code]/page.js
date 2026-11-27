import GiftRedeem from '@/components/GiftRedeem';

export const metadata = { title: 'Nitro gift | AI Gateway' };

export default function GiftPage({ params }) {
  return (
    <div className="wrap" style={{ maxWidth: 520 }}>
      <h1>Nitro gift</h1>
      <GiftRedeem code={params.code} />
    </div>
  );
}
