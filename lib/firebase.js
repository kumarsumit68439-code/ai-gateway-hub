import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// FIREBASE_SERVICE_ACCOUNT = the full service-account JSON (one line) from Firebase console.
export const firebaseConfigured = () => !!process.env.FIREBASE_SERVICE_ACCOUNT;

export function fdb() {
  if (!firebaseConfigured()) throw new Error('Firebase is not configured');
  if (!getApps().length) {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    if (sa.private_key) sa.private_key = sa.private_key.replace(/\\n/g, '\n');
    initializeApp({ credential: cert(sa) });
  }
  return getFirestore();
}
