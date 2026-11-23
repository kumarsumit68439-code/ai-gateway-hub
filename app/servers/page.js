import ServerList from '@/components/ServerList';

export const metadata = { title: 'Servers | AI Gateway' };

export default function Servers() {
  return (
    <div className="wrap">
      <h1>Servers</h1>
      <ServerList />
    </div>
  );
}
