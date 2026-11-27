import NitroStore from '@/components/NitroStore';

export const metadata = { title: 'Nitro | AI Gateway' };

export default function NitroPage() {
  return (
    <div className="wrap">
      <h1>Nitro</h1>
      <NitroStore />
    </div>
  );
}
