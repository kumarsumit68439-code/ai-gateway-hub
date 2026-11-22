import { getAllModels } from '@/lib/providers';
import ModelBrowser from '@/components/ModelBrowser';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Models | AI Gateway' };

export default async function Models() {
  const all = await getAllModels();
  const groups = all
    .filter((g) => g.models.length)
    .map((g) => ({ provider: g.provider, models: g.models.map((m) => ({ id: m.id, context: m.context })) }));

  return (
    <div className="wrap">
      <h1>Models</h1>
      {groups.length ? <ModelBrowser groups={groups} /> : <p className="mute">No models available right now.</p>}
    </div>
  );
}
