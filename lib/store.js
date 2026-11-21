import { ObjectId } from 'mongodb';
import { admin } from '@/lib/supabase';
import { getMongo, mongoConfigured } from '@/lib/mongo';

// One storage API, two engines: Supabase (Postgres) or MongoDB.
// Every document is scoped to a backend key (key.id), so projects never see each other's data.

export const MAX_DOCS = 10000;
export const validId = (engine, id) =>
  engine === 'mongodb' ? /^[0-9a-f]{24}$/i.test(id) : /^[0-9a-f-]{36}$/i.test(id);

const COLS = 'id,data,created_at,updated_at';
const shape = (d) => ({ id: d._id.toString(), data: d.data, created_at: d.created_at, updated_at: d.updated_at });
const mc = async () => (await getMongo()).collection('backend_docs');
const sbt = () => admin().from('backend_docs');
const ok = (r) => { if (r.error) throw new Error(r.error.message); return r.data; };
const isMongo = (key) => key.engine === 'mongodb';

export async function count(key) {
  if (isMongo(key)) return (await mc()).countDocuments({ key_id: key.id });
  const r = await sbt().select('id', { count: 'exact', head: true }).eq('key_id', key.id);
  if (r.error) throw new Error(r.error.message);
  return r.count || 0;
}

export async function collections(key) {
  if (isMongo(key)) {
    const rows = await (await mc()).aggregate([
      { $match: { key_id: key.id } },
      { $group: { _id: '$collection', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]).toArray();
    return rows.map((r) => ({ name: r._id, count: r.count }));
  }
  const data = ok(await admin().rpc('backend_collections', { p_key: key.id }));
  return (data || []).map((r) => ({ name: r.collection, count: Number(r.doc_count) }));
}

export async function list(key, col, limit, offset) {
  if (isMongo(key)) {
    const rows = await (await mc()).find({ key_id: key.id, collection: col }).sort({ created_at: -1 }).skip(offset).limit(limit).toArray();
    return rows.map(shape);
  }
  return ok(await sbt().select(COLS).eq('key_id', key.id).eq('collection', col).order('created_at', { ascending: false }).range(offset, offset + limit - 1));
}

export async function insert(key, col, data) {
  if (isMongo(key)) {
    const now = new Date();
    const r = await (await mc()).insertOne({ key_id: key.id, collection: col, data, created_at: now, updated_at: now });
    return { id: r.insertedId.toString(), data, created_at: now, updated_at: now };
  }
  return ok(await sbt().insert({ key_id: key.id, collection: col, data }).select(COLS).single());
}

export async function get(key, col, id) {
  if (isMongo(key)) {
    const d = await (await mc()).findOne({ _id: new ObjectId(id), key_id: key.id, collection: col });
    return d ? shape(d) : null;
  }
  return ok(await sbt().select(COLS).eq('id', id).eq('key_id', key.id).eq('collection', col).maybeSingle());
}

export async function replace(key, col, id, data) {
  if (isMongo(key)) {
    const d = await (await mc()).findOneAndUpdate(
      { _id: new ObjectId(id), key_id: key.id, collection: col },
      { $set: { data, updated_at: new Date() } },
      { returnDocument: 'after' }
    );
    return d ? shape(d) : null;
  }
  return ok(await sbt().update({ data, updated_at: new Date().toISOString() }).eq('id', id).eq('key_id', key.id).eq('collection', col).select(COLS).maybeSingle());
}

// Shallow merge: fields you send overwrite, other fields stay.
export async function merge(key, col, id, data) {
  const cur = await get(key, col, id);
  if (!cur) return null;
  return replace(key, col, id, { ...cur.data, ...data });
}

export async function remove(key, col, id) {
  if (isMongo(key)) {
    const r = await (await mc()).deleteOne({ _id: new ObjectId(id), key_id: key.id, collection: col });
    return r.deletedCount > 0;
  }
  const rows = ok(await sbt().delete().eq('id', id).eq('key_id', key.id).eq('collection', col).select('id'));
  return (rows || []).length > 0;
}

// Deletes every stored document of a key (used when a project is deleted).
export async function purgeKey(key) {
  await sbt().delete().eq('key_id', key.id);
  if (isMongo(key) && mongoConfigured()) await (await mc()).deleteMany({ key_id: key.id });
}
