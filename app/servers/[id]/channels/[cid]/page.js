import ServerShell from '@/components/ServerShell';

export const metadata = { title: 'Channel | AI Gateway' };

// Every channel has its own page. It exists the moment the channel is created.
export default function ChannelPage({ params }) {
  return <ServerShell id={params.id} channelId={params.cid} />;
}
