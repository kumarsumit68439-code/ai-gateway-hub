import { MongoClient } from 'mongodb';

let cached;

export const mongoConfigured = () => !!process.env.MONGODB_URI;

// Lazily connects once per server instance and reuses the connection.
export function getMongo() {
  if (!mongoConfigured()) return Promise.reject(new Error('MongoDB is not configured'));
  if (!cached) {
    const client = new MongoClient(process.env.MONGODB_URI, { maxPoolSize: 5, serverSelectionTimeoutMS: 8000 });
    cached = client
      .connect()
      .then((c) => {
        const db = c.db(process.env.MONGODB_DB || 'ai_gateway');
        db.collection('backend_docs').createIndex({ key_id: 1, collection: 1, created_at: -1 }).catch(() => {});
        return db;
      })
      .catch((e) => { cached = null; throw e; });
  }
  return cached;
}
