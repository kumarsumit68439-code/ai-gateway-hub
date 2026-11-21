import crypto from 'node:crypto';

export const hashKey = (k) => crypto.createHash('sha256').update(k).digest('hex');

export function newKey() {
  const key = 'sk-gw-' + crypto.randomBytes(32).toString('base64url');
  return { key, prefix: key.slice(0, 12) + '…' };
}
