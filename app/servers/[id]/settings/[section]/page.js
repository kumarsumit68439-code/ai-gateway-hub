import ServerSettings from '@/components/ServerSettings';

export const metadata = { title: 'Server settings | AI Gateway' };

export default function SettingsSection({ params }) {
  return <ServerSettings id={params.id} section={params.section} />;
}
