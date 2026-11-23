import InviteBot from '@/components/InviteBot';

export const metadata = { title: 'Add bot | AI Gateway' };

export default function InviteBotPage({ params }) {
  return (
    <div className="wrap" style={{ maxWidth: 640 }}>
      <h1>Add bot</h1>
      <InviteBot clientId={params.clientId} />
    </div>
  );
}
