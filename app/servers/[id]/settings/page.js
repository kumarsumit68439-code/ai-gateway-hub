import ServerSettings from '@/components/ServerSettings';

export const metadata = { title: 'Server settings | AI Gateway' };

export default function SettingsHome({ params }) {
  return <ServerSettings id={params.id} />;
}
